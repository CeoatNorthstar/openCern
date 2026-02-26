import { setKey, getKey, hasKey, maskKey } from '../utils/keystore.js';
import { config } from '../utils/config.js';
import axios from 'axios';

export interface ConfigItem {
  key: string;
  label: string;
  description: string;
  type: 'secret' | 'choice' | 'boolean' | 'string';
  choices?: string[];
  required?: boolean;
  current?: string;
}

export function getConfigItems(): ConfigItem[] {
  return [
    {
      key: 'anthropic-key',
      label: 'Anthropic API Key',
      description: 'Required for /ask and /opask AI analysis',
      type: 'secret',
      required: true,
      current: hasKey('anthropic') ? maskKey(getKey('anthropic') || '') : 'Not set',
    },
    {
      key: 'ibm-quantum-key',
      label: 'IBM Quantum API Key',
      description: 'Optional — for real quantum hardware via IBM',
      type: 'secret',
      required: false,
      current: hasKey('ibm-quantum') ? maskKey(getKey('ibm-quantum') || '') : 'Not set',
    },
    {
      key: 'defaultModel',
      label: 'Default AI Model',
      description: 'Claude model for analysis',
      type: 'choice',
      choices: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001'],
      current: config.get('defaultModel'),
    },
    {
      key: 'quantumBackend',
      label: 'Quantum Backend',
      description: 'Default quantum computing backend',
      type: 'choice',
      choices: ['local', 'ibm', 'braket'],
      current: config.get('quantumBackend'),
    },
    {
      key: 'dataDir',
      label: 'Data Directory',
      description: 'Where downloaded datasets are stored',
      type: 'string',
      current: config.get('dataDir'),
    },
    {
      key: 'autoStartDocker',
      label: 'Auto-start Docker',
      description: 'Automatically start containers on launch',
      type: 'boolean',
      current: String(config.get('autoStartDocker')),
    },
    {
      key: 'apiBaseUrl',
      label: 'API Base URL',
      description: 'OpenCERN API endpoint (default: http://localhost:8080)',
      type: 'string',
      current: config.get('apiBaseUrl'),
    },
  ];
}

export async function setConfigValue(
  key: string,
  value: string
): Promise<{ success: boolean; error?: string }> {
  switch (key) {
    case 'anthropic-key': {
      try {
        await axios.get('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': value, 'anthropic-version': '2023-06-01' },
          timeout: 8000,
        });
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          return { success: false, error: 'Invalid Anthropic API key' };
        }
        // Accept anyway on network error
      }
      setKey('anthropic', value);
      return { success: true };
    }

    case 'ibm-quantum-key':
      setKey('ibm-quantum', value);
      return { success: true };

    case 'defaultModel':
      config.set('defaultModel', value);
      return { success: true };

    case 'quantumBackend':
      config.set('quantumBackend', value as 'local' | 'ibm' | 'braket');
      return { success: true };

    case 'dataDir':
      config.set('dataDir', value);
      return { success: true };

    case 'apiBaseUrl':
      config.set('apiBaseUrl', value);
      return { success: true };

    case 'autoStartDocker':
      config.set('autoStartDocker', value === 'true' || value === 'yes' || value === '1');
      return { success: true };

    default:
      return { success: false, error: `Unknown config key: ${key}` };
  }
}

export function showConfig(): string[] {
  const items = getConfigItems();
  const lines: string[] = ['', '  Current Configuration', '  ─────────────────────────────────────'];
  for (const item of items) {
    lines.push(`  ${item.label.padEnd(25)} ${item.current || 'Not set'}`);
  }
  lines.push('');
  return lines;
}

export function resetConfig(): void {
  config.reset();
}
