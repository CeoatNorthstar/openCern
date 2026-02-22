use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use std::fs;
use tokio::sync::mpsc;
use warp::Filter;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct PaginationQuery {
    filename: String,
    page: Option<usize>,
    limit: Option<usize>,
}

#[derive(Serialize)]
struct PaginatedResponse {
    metadata: Value,
    events: Vec<Value>,
    total_events: usize,
    page: usize,
    limit: usize,
    total_pages: usize,
}

#[tokio::main]
async fn main() {
    let ws_addr = "127.0.0.1:9001";
    let api_addr = ([127, 0, 0, 1], 9002);

    println!("OpenCERN Streamer starting...");
    
    // WS Streaming loop
    let ws_task = tokio::spawn(async move {
        let listener = TcpListener::bind(ws_addr).await.expect("Failed to bind WS");
        println!("WebSocket Streamer running on ws://{}", ws_addr);

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

                let home = std::env::var("HOME").unwrap();
                let processed_dir = format!("{}/opencern-datasets/processed/", home);

                let entries = fs::read_dir(&processed_dir).expect("Cannot read processed dir");
                let mut json_file: Option<String> = None;

                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        if path.extension().and_then(|s| s.to_str()) == Some("json") {
                            json_file = Some(path.to_str().unwrap().to_string());
                            break;
                        }
                    }
                }

                if let Some(filepath) = json_file {
                    println!("Streaming {}", filepath);
                    let content = fs::read_to_string(&filepath).expect("Cannot read file");
                    let data: Value = serde_json::from_str(&content).expect("Invalid JSON");

                    if let Some(events) = data["events"].as_array() {
                        let mut is_playing = true;
                        let mut event_idx = 0;

                        loop {
                            while let Ok(cmd) = rx.try_recv() {
                                if cmd == "pause" {
                                    is_playing = false;
                                } else if cmd == "play" {
                                    is_playing = true;
                                }
                            }

                            if is_playing {
                                if event_idx < events.len() {
                                    let msg = serde_json::to_string(&events[event_idx]).unwrap();
                                    if sender.send(Message::Text(msg.into())).await.is_err() {
                                        break; // Client disconnected
                                    }
                                    event_idx += 1;
                                } else {
                                    // Loop back to start for endless streaming 
                                    event_idx = 0;
                                }
                            }
                            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                        }
                    }
                }
            });
        }
    });

    // CORS for Warp API
    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "DELETE", "OPTIONS"])
        .allow_headers(vec!["*"]);

    // Process Data API
    let process_data = warp::path!("process" / "data")
        .and(warp::query::<PaginationQuery>())
        .map(|q: PaginationQuery| {
            let home = std::env::var("HOME").unwrap();
            let stem = q.filename.strip_suffix(".root").unwrap_or(&q.filename);
            let filepath = format!("{}/opencern-datasets/processed/{}.json", home, stem);
            
            let page = q.page.unwrap_or(1);
            let limit = q.limit.unwrap_or(5);

            match fs::read_to_string(&filepath) {
                Ok(content) => {
                    if let Ok(data) = serde_json::from_str::<Value>(&content) {
                        let events = data["events"].as_array().cloned().unwrap_or_default();
                        let total_events = events.len();
                        
                        let start = (page.saturating_sub(1)) * limit;
                        let end = (start + limit).min(total_events);
                        
                        let sliced_events = if start < total_events {
                            events[start..end].to_vec()
                        } else {
                            vec![]
                        };

                        let total_pages = if limit > 0 {
                            (total_events + limit - 1) / limit
                        } else {
                            0
                        };

                        let resp = PaginatedResponse {
                            metadata: data["metadata"].clone(),
                            events: sliced_events,
                            total_events,
                            page,
                            limit,
                            total_pages,
                        };
                        
                        warp::reply::json(&resp)
                    } else {
                        warp::reply::json(&serde_json::json!({ "error": "Invalid output JSON file" }))
                    }
                }
                Err(_) => {
                    warp::reply::json(&serde_json::json!({ "error": "Processed data not found" }))
                }
            }
        })
        .with(cors);

    println!("HTTP API running on http://127.0.0.1:{}", api_addr.1);
    let api_task = tokio::spawn(async move {
        warp::serve(process_data).run(api_addr).await;
    });

    let _ = tokio::join!(ws_task, api_task);
}
