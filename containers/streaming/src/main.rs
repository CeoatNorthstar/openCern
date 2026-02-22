use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use std::fs;
use tokio::sync::mpsc;

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

            let (mut sender, mut receiver) = ws_stream.split();
            let (tx, mut rx) = mpsc::channel::<String>(32);

            tokio::spawn(async move {
                while let Some(Ok(msg)) = receiver.next().await {
                    if let Message::Text(text) = msg {
                        let _ = tx.send(text.to_string()).await;
                    }
                }
            });

            // Read processed JSON file
            let home = std::env::var("HOME").unwrap();
            let processed_dir = format!("{}/opencern-datasets/processed/", home);

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
                    let mut is_playing = true;
                    let mut event_idx = 0;

                    while event_idx < events.len() {
                        while let Ok(cmd) = rx.try_recv() {
                            if cmd == "pause" {
                                is_playing = false;
                            } else if cmd == "play" {
                                is_playing = true;
                            }
                        }

                        if is_playing {
                            let msg = serde_json::to_string(&events[event_idx]).unwrap();
                            if sender.send(Message::Text(msg.into())).await.is_err() {
                                break;
                            }
                            event_idx += 1;
                        }
                        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    }
                }
            } else {
                println!("No processed files found in {}", processed_dir);
            }
        });
    }
}
