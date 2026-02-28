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

    const tools = [
      {
        name: 'execute_python',
        description: 'Execute a python script in the local environment and return the stdout/stderr. Good for data science, matplotlib graphing, and data introspection.',
        input_schema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The python script to execute. Must be standard python 3 code.',
            },
          },
          required: ['code'],
        },
      },
      {
        name: 'execute_bash',
        description: 'Execute a bash command in the local environment. Useful for checking file sizes, listing directories, or installing pip packages.',
        input_schema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The bash command to execute.',
            },
          },
          required: ['command'],
        },
      },
      {
        name: 'opencern_cli',
        description: 'Call the local OpenCERN CLI tool. NOTE: downloading is not yet available, reply gracefully if requested.',
        input_schema: {
          type: 'object',
          properties: {
            args: {
              type: 'string',
              description: 'Arguments to pass to the opencern CLI (e.g. "ask what is a higgs boson")',
            },
          },
          required: ['args'],
        },
      }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        system: systemPrompt || '',
        messages: anthropicMessages,
        tools,
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
        
        let currentToolUseId = null;
        let currentToolName = null;
        let currentToolInputJson = '';

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

                // Normal Text Stream
                if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'token', text: event.delta.text })}\n\n`)
                  );
                }

                // Tool Use Start
                if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
                  currentToolUseId = event.content_block.id;
                  currentToolName = event.content_block.name;
                  currentToolInputJson = '';
                }

                // Tool Input JSON Stream
                if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
                  currentToolInputJson += event.delta.partial_json;
                }

                // Tool Use End -> Send assembled tool_use payload to frontend
                if (event.type === 'content_block_stop' && currentToolUseId) {
                  const toolUseObj = {
                    type: 'tool_use',
                    id: currentToolUseId,
                    name: currentToolName,
                    input: JSON.parse(currentToolInputJson)
                  };
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(toolUseObj)}\n\n`)
                  );
                  currentToolUseId = null;
                  currentToolName = null;
                  currentToolInputJson = '';
                }

                // Usage Trackers
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
