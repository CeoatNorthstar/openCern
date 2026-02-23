# Stage 1: Build the Rust binary
FROM rust:latest as builder

WORKDIR /usr/src/app
COPY . .

RUN cargo build --release

# Stage 2: Minimal runtime image
FROM debian:bookworm-slim

# Install CA certificates to make sure HTTPS/SSL works if needed
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Set up non-root user
RUN useradd -m -u 1000 appuser
WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /usr/src/app/target/release/streaming /app/streaming

# Change ownership
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 9001
EXPOSE 9002

CMD ["/app/streaming"]
