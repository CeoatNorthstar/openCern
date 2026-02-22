use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use futures_util::SinkExt;
use serde_json::Value;
use std::fs;

#[tokio::main]
async fn main() {
    let addr = "127.0.0.1:9001";
    let listener = TcpListener::bind(addr).await.expect("Failed to bind");
    println!("OpenCERN Streamer running on ws://{}", addr);

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(async move {
            let ws_stream = accept_async(stream)
                .await
                .expect("WebSocket handshake failed");

            let (mut sender, _receiver) = futures_util::StreamExt::split(ws_stream);

            // Read processed JSON file
            let home = std::env::var("HOME").unwrap();
            let processed_dir = format!("{}/opencern-datasets/processed/", home);

            // Find first JSON file
            let entries = fs::read_dir(&processed_dir).expect("Cannot read processed dir");
            let mut json_file: Option<String> = None;

            for entry in entries {
                let entry = entry.unwrap();
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    json_file = Some(path.to_str().unwrap().to_string());
                    break;
                }
            }

            if let Some(filepath) = json_file {
                println!("Streaming {}", filepath);
                let content = fs::read_to_string(&filepath).expect("Cannot read file");
                let data: Value = serde_json::from_str(&content).expect("Invalid JSON");

                if let Some(events) = data["events"].as_array() {
                    println!("Streaming {} events", events.len());
                    for event in events {
                        let msg = serde_json::to_string(event).unwrap();
                        if sender.send(Message::Text(msg.into())).await.is_err() {
                            break;
                        }
                        // Stream one event every 100ms
                        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    }
                }
            } else {
                println!("No processed files found in {}", processed_dir);
            }
        });
    }
}
