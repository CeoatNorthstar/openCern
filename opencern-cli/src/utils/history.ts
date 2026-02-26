import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HISTORY_FILE = join(homedir(), '.opencern', 'history.json');
const MAX_ENTRIES = 1000;

// Commands containing these substrings are not saved
const SENSITIVE_PATTERNS = ['--set ai-key', '--set quantum-key', '--set aws', 'password', 'token'];

interface HistoryEntry {
  command: string;
  timestamp: string;
}

let _history: HistoryEntry[] = [];
let _cursor = -1;
let _loaded = false;

function load(): void {
  if (_loaded) return;
  _loaded = true;
  if (!existsSync(HISTORY_FILE)) {
    _history = [];
    return;
  }
  try {
    _history = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
  } catch {
    _history = [];
  }
}

function persist(): void {
  try {
    writeFileSync(HISTORY_FILE, JSON.stringify(_history, null, 2));
  } catch { /* ignore write errors */ }
}

function isSensitive(command: string): boolean {
  const lower = command.toLowerCase();
  return SENSITIVE_PATTERNS.some(p => lower.includes(p));
}

export function add(command: string): void {
  load();
  const trimmed = command.trim();
  if (!trimmed || isSensitive(trimmed)) return;
  // Deduplicate consecutive
  if (_history.length > 0 && _history[0].command === trimmed) return;
  _history.unshift({ command: trimmed, timestamp: new Date().toISOString() });
  if (_history.length > MAX_ENTRIES) _history = _history.slice(0, MAX_ENTRIES);
  _cursor = -1;
  persist();
}

export function getAll(): HistoryEntry[] {
  load();
  return _history;
}

export function search(query: string): string[] {
  load();
  const q = query.toLowerCase();
  return _history
    .filter(e => e.command.toLowerCase().includes(q))
    .map(e => e.command);
}

export function getPrevious(): string | null {
  load();
  if (_history.length === 0) return null;
  _cursor = Math.min(_cursor + 1, _history.length - 1);
  return _history[_cursor]?.command ?? null;
}

export function getNext(): string | null {
  load();
  if (_cursor <= 0) {
    _cursor = -1;
    return null;
  }
  _cursor -= 1;
  return _cursor >= 0 ? _history[_cursor].command : null;
}

export function resetCursor(): void {
  _cursor = -1;
}

export function clear(): void {
  _history = [];
  _cursor = -1;
  persist();
}

export const history = { add, getAll, search, getPrevious, getNext, resetCursor, clear };
export default history;
