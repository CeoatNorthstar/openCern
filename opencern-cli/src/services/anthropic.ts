import Anthropic from '@anthropic-ai/sdk';
import { getKey } from '../utils/keystore.js';
import { config } from '../utils/config.js';

export interface SessionContext {
  downloadedDatasets?: string[];
  processedFiles?: string[];
  lastResults?: Record<string, unknown>;
  experiment?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

let _client: Anthropic | null = null;
let _history: Message[] = [];
let _totalTokens = 0;
let _context: SessionContext = {};

const SYSTEM_PROMPT = `You are a particle physics analysis assistant integrated into OpenCERN, 
an open-source CERN data analysis platform. You have deep expertise in:
- Particle physics: Standard Model, LHC experiments (CMS, ATLAS, ALICE, LHCb)
- Data formats: ROOT files, HEP data formats, CERN Open Data Portal
- Analysis techniques: event selection, kinematic variables (pT, eta, phi, HT), invariant mass
- Quantum computing applications in HEP: VQC classifiers, quantum ML for event classification
- Statistics: significance, p-values, systematic uncertainties

When analyzing data, use proper physics notation and terminology.
Reference real papers and CERN documentation when relevant.
Suggest concrete next analysis steps.
Be concise but technically precise.`;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = getKey('anthropic');
    if (!apiKey) {
      throw new Error('Anthropic API key not configured. Run /config to set it up.');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

function buildSystemPrompt(): string {
  let system = SYSTEM_PROMPT;
  if (_context.experiment) {
    system += `\n\nCurrent session context:\n- Experiment: ${_context.experiment}`;
  }
  if (_context.downloadedDatasets?.length) {
    system += `\n- Downloaded datasets: ${_context.downloadedDatasets.join(', ')}`;
  }
  if (_context.processedFiles?.length) {
    system += `\n- Processed files: ${_context.processedFiles.join(', ')}`;
  }
  if (_context.lastResults) {
    const r = _context.lastResults;
    system += `\n- Last processing results: ${JSON.stringify(r, null, 2)}`;
  }
  return system;
}

export const anthropicService = {
  initClient(apiKey: string): void {
    _client = new Anthropic({ apiKey });
  },

  async streamMessage(
    userMessage: string,
    onToken: (token: string) => void,
    signal?: AbortSignal
  ): Promise<{ totalTokens: number }> {
    const client = getClient();
    const model = config.get('defaultModel');

    _history.push({ role: 'user', content: userMessage });

    const messages = _history.map(m => ({ role: m.role, content: m.content }));

    let fullResponse = '';

    const stream = await client.messages.stream({
      model,
      max_tokens: 4096,
      system: buildSystemPrompt(),
      messages,
    });

    for await (const chunk of stream) {
      if (signal?.aborted) {
        stream.controller.abort();
        break;
      }
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        onToken(chunk.delta.text);
        fullResponse += chunk.delta.text;
      }
    }

    const finalMessage = await stream.finalMessage();
    const tokens = finalMessage.usage.input_tokens + finalMessage.usage.output_tokens;
    _totalTokens += tokens;

    _history.push({ role: 'assistant', content: fullResponse });

    return { totalTokens: tokens };
  },

  addContext(ctx: Partial<SessionContext>): void {
    _context = { ..._context, ...ctx };
  },

  getContext(): SessionContext {
    return _context;
  },

  getUsage(): number {
    return _totalTokens;
  },

  clearHistory(): void {
    _history = [];
    _totalTokens = 0;
  },

  getHistory(): Message[] {
    return _history;
  },
};

export default anthropicService;
