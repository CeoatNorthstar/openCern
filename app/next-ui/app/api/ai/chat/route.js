// Next.js API Route — Streaming proxy to Anthropic Claude API
// POST /api/ai/chat
// Supports both API key and OAuth token authentication.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { messages, systemPrompt, model, apiKey } = await request.json();

    if (!apiKey) {
      return Response.json(
        { error: 'No API key provided. Add an API key in settings.' },
        { status: 400 }
      );
    }

    if (!messages || messages.length === 0) {
      return Response.json({ error: 'No messages provided.' }, { status: 400 });
    }

    // Build the Anthropic API request
    const anthropicMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Different headers depending on auth method
    const headers = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt || '',
        messages: anthropicMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = 'Anthropic API error';
      try {
        const parsed = JSON.parse(errorBody);
        errorMessage = parsed.error?.message || errorMessage;
      } catch {}

      if (response.status === 401) {
        errorMessage = 'Invalid API key. Check your Anthropic API key in Settings.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limited. Please wait a moment and try again.';
      }

      return Response.json({ error: errorMessage }, { status: response.status });
    }

    // Stream the response back to the client as SSE
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader();
        let buffer = '';
        let inputTokens = 0;
        let outputTokens = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const event = JSON.parse(data);

                if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'token', text: event.delta.text })}\n\n`)
                  );
                }

                if (event.type === 'message_start' && event.message?.usage) {
                  inputTokens = event.message.usage.input_tokens || 0;
                }

                if (event.type === 'message_delta' && event.usage) {
                  outputTokens = event.usage.output_tokens || 0;
                }

                if (event.type === 'message_stop') {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'done',
                      usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens }
                    })}\n\n`)
                  );
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
