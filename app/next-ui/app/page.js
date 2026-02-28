"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { buildSystemPrompt } from './aiSystemPrompt';
import './AIChat.css';

// Monaco wrapper that loads the editor entirely at runtime to avoid Turbopack
// trying to resolve the CDN URL inside @monaco-editor/loader as a filesystem path.
const Editor = dynamic(() => import('./MonacoEditor'), { ssr: false });

const ParticleVisualization = dynamic(() => import('./ParticleVisualization'), {
  ssr: false,
});

const formatSize = (bytes) => {
  if (!bytes || bytes <= 0) return 'Unknown';
  const tb = bytes / (1024 ** 4);
  if (tb >= 1) return `${tb.toFixed(1)} TB`;
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 ** 2);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
};

// --- SVG Icons ---
const IconBrowse = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const IconFolder = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const IconFile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
    <polyline points="13 2 13 9 20 9"></polyline>
  </svg>
);

const IconActivity = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const IconDownloadsManager = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="8 12 12 16 16 12"></polyline>
    <line x1="12" y1="8" x2="12" y2="16"></line>
  </svg>
);

const IconPause = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const IconPlay = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const IconCpu = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
    <rect x="9" y="9" width="6" height="6"></rect>
    <line x1="9" y1="1" x2="9" y2="4"></line>
    <line x1="15" y1="1" x2="15" y2="4"></line>
    <line x1="9" y1="20" x2="9" y2="23"></line>
    <line x1="15" y1="20" x2="15" y2="23"></line>
    <line x1="20" y1="9" x2="23" y2="9"></line>
    <line x1="20" y1="14" x2="23" y2="14"></line>
    <line x1="1" y1="9" x2="4" y2="9"></line>
    <line x1="1" y1="14" x2="4" y2="14"></line>
  </svg>
);

const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const IconDatabase = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
  </svg>
);

const IconSidebarClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="15" y1="3" x2="15" y2="21"></line>
    <line x1="8" y1="9" x2="12" y2="12"></line>
    <line x1="12" y1="12" x2="8" y2="15"></line>
  </svg>
);

const Logo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);

const IconAI = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"></path>
    <path d="M6 10a6 6 0 0 0 12 0"></path>
    <line x1="12" y1="16" x2="12" y2="22"></line>
    <path d="M8 22h8"></path>
    <circle cx="6" cy="6" r="1"></circle>
    <circle cx="18" cy="6" r="1"></circle>
  </svg>
);

const AI_SUGGESTIONS = [
  'Analyze my processed data and find interesting physics',
  'Explain the Higgs boson decay to two photons',
  'What cuts should I use for Z→μμ?',
];

// OAuth PKCE helpers
const CLAUDE_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const CLAUDE_AUTH_URL = 'https://claude.ai/oauth/authorize';

function generateCodeVerifier() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


// Simple markdown renderer for AI responses
function renderAIMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeLines = [];
  let codeLang = '';
  let key = 0;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={key++} style={{ background: '#0d0d12', border: '1px solid #1e1e28', borderRadius: '8px', padding: '14px 16px', margin: '10px 0', overflowX: 'auto', fontSize: '13px', lineHeight: 1.5 }}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }
    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h4 key={key++} style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6', margin: '14px 0 6px' }}>{line.slice(4)}</h4>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={key++} style={{ fontSize: '15px', fontWeight: 600, color: '#f3f4f6', margin: '16px 0 8px' }}>{line.slice(3)}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={key++} style={{ fontSize: '16px', fontWeight: 700, color: '#f3f4f6', margin: '18px 0 10px' }}>{line.slice(2)}</h2>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<div key={key++} style={{ paddingLeft: '16px', margin: '2px 0' }}>• {renderInlineMarkdown(line.slice(2))}</div>);
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      elements.push(<div key={key++} style={{ paddingLeft: '16px', margin: '2px 0' }}>{match[1]}. {renderInlineMarkdown(match[2])}</div>);
    } else if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: '8px' }} />);
    } else {
      elements.push(<p key={key++} style={{ margin: '4px 0', lineHeight: 1.65 }}>{renderInlineMarkdown(line)}</p>);
    }
  }

  if (inCodeBlock && codeLines.length) {
    elements.push(
      <pre key={key++} style={{ background: '#0d0d12', border: '1px solid #1e1e28', borderRadius: '8px', padding: '14px 16px', margin: '10px 0', overflowX: 'auto', fontSize: '13px' }}>
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
  }

  return elements;
}

function renderInlineMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} style={{ color: '#f9fafb', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} style={{ background: '#0d0d12', color: '#a5f3fc', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontFamily: "var(--font-geist-mono), 'SF Mono', monospace" }}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export default function App() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [downloaded, setDownloaded] = useState([]);
  const [downloading, setDownloading] = useState({});
  const [processing, setProcessing] = useState({});
  const [filePicker, setFilePicker] = useState(null); // { dataset, selectedFiles: Set }
  const [activeTab, setActiveTab] = useState('browse');
  const [experiment, setExperiment] = useState('All');
  const [showDownloads, setShowDownloads] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDatasets, setTotalDatasets] = useState(0);
  const [visualizeFile, setVisualizeFile] = useState(null);
  
  // Inspector states
  const [expandedFiles, setExpandedFiles] = useState({});
  const [inspectingFile, setInspectingFile] = useState(null);
  const [inspectorData, setInspectorData] = useState(null);
  const [inspectorPage, setInspectorPage] = useState(1);
  const [loadingInspector, setLoadingInspector] = useState(false);
  const editorRef = useRef(null);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState([]);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiTokens, setAiTokens] = useState('');
  const [aiTotalTokens, setAiTotalTokens] = useState(0);
  const [aiInputValue, setAiInputValue] = useState('');
  const [aiShowSettings, setAiShowSettings] = useState(false);
  const [aiConfig, setAiConfig] = useState({ apiKey: '', model: 'claude-3-7-sonnet-20250219' });
  const [aiModels, setAiModels] = useState([]);
  const [aiError, setAiError] = useState('');
  const [activeToolExecution, setActiveToolExecution] = useState(null); // Tracks currently running real-world tool execution
  const aiMessagesEndRef = useRef(null);
  const aiAbortRef = useRef(null);
  const aiTextareaRef = useRef(null);

  // Load AI config from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('opencern-ai-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAiConfig(prev => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  // Fetch models from Anthropic when API key changes
  const DEFAULT_MODELS = [
    { id: 'claude-sonnet-4-20250514', display_name: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250514', display_name: 'Claude Opus 4' },
    { id: 'claude-haiku-4-5-20251001', display_name: 'Claude Haiku 3.5' },
  ];

  useEffect(() => {
    if (!aiConfig.apiKey) { setAiModels(DEFAULT_MODELS); return; }
    setAiModels(DEFAULT_MODELS); // show defaults immediately
    let cancelled = false;
    fetch(`/api/ai/models?apiKey=${encodeURIComponent(aiConfig.apiKey)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data?.data) return;
        const models = data.data
          .filter(m => m.id && m.id.startsWith('claude'))
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        if (models.length > 0) setAiModels(models);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [aiConfig.apiKey]);

  // Auto-scroll AI messages
  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiTokens]);

  const saveAiConfig = useCallback((newConfig) => {
    setAiConfig(newConfig);
    try {
      localStorage.setItem('opencern-ai-config', JSON.stringify(newConfig));
    } catch {}
  }, []);

  const buildContext = useCallback(() => {
    return {
      downloadedDatasets: downloaded.map(d => d.title || d.name || d),
      totalEvents: inspectorData?.totalEvents,
      experiment: selected?.experiment,
    };
  }, [downloaded, inspectorData, selected]);

  const isAiAuthed = !!aiConfig.apiKey;



  const sendAiMessage = useCallback(async (content) => {
    if (!content.trim() || aiStreaming) return;
    if (!isAiAuthed) {
      setAiError('Connect your account or add an API key in settings.');
      return;
    }
    setAiError('');

    const userMsg = { role: 'user', content: content.trim(), timestamp: new Date().toISOString() };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInputValue('');
    setAiStreaming(true);
    setAiTokens('');

    // Pre-process messages to flatten tool invocations into the correct Anthropic format
    const allMessages = [...aiMessages, userMsg].map(m => {
      // If it's a standard text message
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content };
      }
      // If it's a complex array (tool_use / tool_result)
      return { role: m.role, content: m.content };
    });

    const systemPrompt = buildSystemPrompt(buildContext()) + "\n\nYou have access to tools. ALWAYS use them if the user asks you to analyze data, run bash commands, or interact with opencern. DO NOT refuse to run code.";

    try {
      aiAbortRef.current = new AbortController();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          systemPrompt,
          model: aiConfig.model,
          apiKey: aiConfig.apiKey,
        }),
        signal: aiAbortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to get response');
      }

      const processStream = async (res) => {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        let toolInvocations = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === 'token') {
                fullText += evt.text;
                setAiTokens(fullText);
              } else if (evt.type === 'tool_use') {
                toolInvocations.push(evt);
              } else if (evt.type === 'done') {
                setAiTotalTokens(prev => prev + (evt.usage?.totalTokens || 0));
              } else if (evt.type === 'error') {
                throw new Error(evt.error);
              }
            } catch {}
          }
        }

        let finalContent = fullText;
        if (toolInvocations.length > 0) {
          // If tools were used, the content array must contain both the text (if any) and the tool_use blocks
          finalContent = [];
          if (fullText.trim()) {
            finalContent.push({ type: 'text', text: fullText.trim() });
          }
          finalContent.push(...toolInvocations.map(t => ({
            type: 'tool_use',
            id: t.id,
            name: t.name,
            input: t.input,
            status: 'pending' // UI state: pending human approval
          })));
        }

        return finalContent;
      };

      const finalContent = await processStream(res);
      setAiMessages(prev => [...prev, { role: 'assistant', content: finalContent, timestamp: new Date().toISOString() }]);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setAiMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${err.message}`, timestamp: new Date().toISOString(), isError: true }]);
      }
    } finally {
      setAiStreaming(false);
      setAiTokens('');
    }
  }, [aiConfig, aiMessages, aiStreaming, buildContext, isAiAuthed]);

  // Handle execution of a pending tool
  const handleToolAction = useCallback(async (msgIndex, toolIndex, toolObj, action) => {
    // 1. Mark in UI
    const updatedMessages = [...aiMessages];
    const msg = updatedMessages[msgIndex];
    if (Array.isArray(msg.content)) {
      msg.content[toolIndex].status = action === 'approve' ? 'running' : 'denied';
    }
    setAiMessages(updatedMessages);

    if (action === 'deny') {
      // Immediately tell anthropic we denied it
      const toolResultMsg = {
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolObj.id,
          content: 'The user denied the execution of this tool for security reasons.',
          is_error: true
        }],
        timestamp: new Date().toISOString()
      };
      // Send background followup without putting the deny message in the UI explicitly (just the card update)
      sendAiMessageFollowUp([...updatedMessages, toolResultMsg]);
      return;
    }

    // Run execution
    setActiveToolExecution(toolObj.id);
    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: toolObj.name,
          toolInput: toolObj.input
        })
      });
      const data = await res.json();
      
      const updatedMessagesPost = [...aiMessages];
      const msgPost = updatedMessagesPost[msgIndex];
      if (Array.isArray(msgPost.content)) {
        msgPost.content[toolIndex].status = data.success ? 'success' : 'failed';
        msgPost.content[toolIndex].output = data.output;
        if (data.images?.length > 0) msgPost.content[toolIndex].images = data.images;
      }
      setAiMessages(updatedMessagesPost);

      // Tell Anthropic the result so it can summarize
      let resultText = data.output;
      if (data.images?.length > 0) {
        resultText += '\n\n[System: The tool generated images. They have been displayed to the user natively.]';
      }

      const toolResultMsg = {
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolObj.id,
          content: resultText,
          is_error: !data.success
        }],
        timestamp: new Date().toISOString()
      };
      
      sendAiMessageFollowUp([...updatedMessagesPost, toolResultMsg]);

    } catch (err) {
      // Network failure
      const updatedMessagesPost = [...aiMessages];
      const msgPost = updatedMessagesPost[msgIndex];
      if (Array.isArray(msgPost.content)) {
         msgPost.content[toolIndex].status = 'failed';
         msgPost.content[toolIndex].output = err.message;
      }
      setAiMessages(updatedMessagesPost);

      sendAiMessageFollowUp([...updatedMessagesPost, {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: toolObj.id, content: err.message, is_error: true }],
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setActiveToolExecution(null);
    }
  }, [aiMessages]);

  const sendAiMessageFollowUp = async (messagesHistory) => {
    setAiStreaming(true);
    setAiTokens('Analyzing execution results...');
    
    try {
      aiAbortRef.current = new AbortController();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesHistory,
          systemPrompt: buildSystemPrompt(buildContext()),
          model: aiConfig.model,
          apiKey: aiConfig.apiKey,
        }),
        signal: aiAbortRef.current.signal,
      });

      if (!res.ok) throw new Error('Follow-up failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === 'token') {
              // Clear 'Analyzing...' on first real token
              if (fullText === '') setAiTokens(''); 
              fullText += evt.text;
              setAiTokens(fullText);
            } else if (evt.type === 'done') {
              setAiTotalTokens(prev => prev + (evt.usage?.totalTokens || 0));
            }
          } catch {}
        }
      }

      setAiMessages(prev => {
        // Find existing history, append the new assistant response
        return [...messagesHistory, { role: 'assistant', content: fullText, timestamp: new Date().toISOString() }];
      });
    } catch(err) {
      if (err.name !== 'AbortError') console.error('Follow-up error:', err);
    } finally {
      setAiStreaming(false);
      setAiTokens('');
    }
  };

  const stopAiStream = useCallback(() => {
    aiAbortRef.current?.abort();
    setAiStreaming(false);
    if (aiTokens) {
      setAiMessages(prev => [...prev, { role: 'assistant', content: aiTokens + '\n\n*[Response stopped]*', timestamp: new Date().toISOString() }]);
      setAiTokens('');
    }
  }, [aiTokens]);

  const clearAiChat = useCallback(() => {
    setAiMessages([]);
    setAiTotalTokens(0);
  }, []);

  const maskApiKey = (key) => {
    if (!key || key.length < 12) return key || '';
    return key.slice(0, 7) + '••••••••' + key.slice(-4);
  };

  const saveProcessedFile = async (filename) => {
     if (!editorRef.current) return;
     const val = editorRef.current.getValue();
     try {
        const parsed = JSON.parse(val);
        await axios.put(`http://localhost:8080/process/data/${filename}?page=${parsed.page}&limit=${parsed.limit}`, parsed);
        alert('Saved cleanly to disk!');
     } catch(e) {
        alert('Invalid JSON structure! Unable to save.');
     }
  };

  const deleteProcessedFile = async (filename) => {
     try {
        await axios.delete(`http://localhost:8080/process/data/${filename}`);
        setInspectingFile(null);
        setInspectorData(null);
        
        // Re-fetch local cache
        const files = await axios.get('http://localhost:8080/files');
        setDownloaded(files.data);
     } catch(e) {
        console.error(e);
     }
  };

  const triggerDownloadAnimation = (e) => {
    if (!e) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const el = document.createElement('div');
    el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
    el.style.position = 'fixed';
    el.style.left = `${rect.left + rect.width / 2 - 10}px`;
    el.style.top = `${rect.top + rect.height / 2 - 10}px`;
    el.style.zIndex = '9999';
    el.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);

    const targetEl = document.getElementById('download-manager-btn');
    if (targetEl) {
      const targetRect = targetEl.getBoundingClientRect();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.left = `${targetRect.left + targetRect.width / 2 - 10}px`;
          el.style.top = `${targetRect.top + targetRect.height / 2 - 10}px`;
          el.style.transform = 'scale(0.2)';
          el.style.opacity = '0.5';
        });
      });
    }
    
    setTimeout(() => {
      document.body.removeChild(el);
      if (targetEl) {
        targetEl.style.transform = 'scale(1.05)';
        targetEl.style.background = '#1e1e24';
        setTimeout(() => {
          targetEl.style.transform = 'scale(1)';
          targetEl.style.background = 'transparent';
        }, 150);
      }
    }, 600);
  };

  const pauseDownload = async (filename) => {
    try {
      await axios.post(`http://localhost:8080/download/pause?filename=${filename}`);
      setDownloading(prev => prev[filename] ? { ...prev, [filename]: { ...prev[filename], status: 'paused' } } : prev);
    } catch (e) { console.error(e); }
  };

  const resumeDownload = async (filename) => {
    try {
      await axios.post(`http://localhost:8080/download/resume?filename=${filename}`);
      setDownloading(prev => prev[filename] ? { ...prev, [filename]: { ...prev[filename], status: 'downloading' } } : prev);
    } catch (e) { console.error(e); }
  };

  const cancelDownload = async (filename) => {
    try {
      await axios.post(`http://localhost:8080/download/cancel?filename=${filename}`);
      setDownloading(prev => { const n = { ...prev }; delete n[filename]; return n; });
    } catch (e) { console.error(e); }
  };

  const deleteFile = async (filename) => {
    try {
      await axios.delete(`http://localhost:8080/files/${filename}`);
      const files = await axios.get('http://localhost:8080/files');
      setDownloaded(files.data);
    } catch (e) { console.error(e); }
  };

  const revealFile = async (filename) => {
    try {
      await axios.get(`http://localhost:8080/files/${filename}/reveal`);
    } catch (e) { console.error(e); }
  };

  const processFile = async (filename) => {
    setProcessing(prev => ({ ...prev, [filename]: 'processing' }));
    try {
      // Detect if this is a folder (dataset with multiple ROOT files)
      const fileEntry = downloaded.find(f => f.filename === filename);
      const isFolder = fileEntry && fileEntry.type === 'folder';

      if (isFolder) {
        await axios.post(`http://localhost:8080/process/folder?folder=${encodeURIComponent(filename)}`);
      } else {
        await axios.post(`http://localhost:8080/process?filename=${encodeURIComponent(filename)}`);
      }
      
      const interval = setInterval(async () => {
        try {
          const res = await axios.get(`http://localhost:8080/process/status?filename=${encodeURIComponent(filename)}`);
          const status = res.data.status;
          setProcessing(prev => ({ ...prev, [filename]: status }));
          if (status === 'processed' || status === 'error') {
            clearInterval(interval);
          }
        } catch (e) {
          clearInterval(interval);
          setProcessing(prev => ({ ...prev, [filename]: 'error' }));
        }
      }, 1000);
    } catch (e) { 
      setProcessing(prev => ({ ...prev, [filename]: 'error' }));
      console.error(e); 
    }
  };

  const toggleExpand = (filename) => {
    setExpandedFiles(prev => ({ ...prev, [filename]: !prev[filename] }));
  };

  const openInspector = async (filename, page = 1) => {
    setInspectingFile(filename);
    setInspectorPage(page);
    setLoadingInspector(true);
    try {
      const res = await axios.get(`http://127.0.0.1:9002/process/data?filename=${filename}&page=${page}&limit=5`);
      setInspectorData(res.data);
    } catch (e) {
      console.error(e);
      setInspectorData({ error: 'Failed to load data.' });
    } finally {
      setLoadingInspector(false);
    }
  };

  const closeInspector = () => {
    setInspectingFile(null);
    setInspectorData(null);
  };

  useEffect(() => {
    if (activeTab === 'downloaded' && downloaded.length > 0) {
      downloaded.forEach(async (f) => {
        try {
          const res = await axios.get(`http://localhost:8080/process/status?filename=${f.filename}`);
          setProcessing(prev => ({ ...prev, [f.filename]: res.data.status }));
        } catch (e) {}
      });
    }
  }, [activeTab, downloaded]);

  useEffect(() => {
    // Add custom LM Studio-like scrollbar styles globally (only once)
    let style = document.getElementById('lm-studio-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'lm-studio-styles';
      style.innerHTML = `
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }
        body { user-select: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes slideIn { 
          from { transform: translateX(20px); opacity: 0; } 
          to { transform: translateX(0); opacity: 1; } 
        }
      `;
      document.head.appendChild(style);
    }

    setLoading(true);
    // Fetch depending on the selected experiment with pagination
    if (experiment === 'All') {
      Promise.all([
        axios.get(`http://localhost:8080/datasets?experiment=ALICE&page=${page}&size=20`),
        axios.get('http://localhost:8080/datasets?experiment=CMS')
      ])
        .then(([resAlice, resCms]) => {
          const aliceData = resAlice.data.datasets || resAlice.data;
          const cmsData = resCms.data.datasets || resCms.data;
          setDatasets([...aliceData, ...cmsData]);
          setTotalPages(resAlice.data.pages || 1);
          setTotalDatasets((resAlice.data.total || 0) + (cmsData.length || 0));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      const expParam = experiment === 'Alice' ? 'ALICE' : experiment;
      axios.get(`http://localhost:8080/datasets?experiment=${expParam}&page=${page}&size=20`)
        .then(r => {
          const data = r.data;
          setDatasets(data.datasets || data);
          setTotalPages(data.pages || 1);
          setTotalDatasets(data.total || (data.datasets || data).length);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }

    axios.get('http://localhost:8080/files')
      .then(r => setDownloaded(r.data))
      .catch(() => {});
      
  }, [experiment, page]);

  const handleDownload = async (dataset, e) => {
    if (e) triggerDownloadAnimation(e);
    
    // Multi-file dataset: open file picker
    if (dataset.files.length > 1) {
      setFilePicker({ dataset, selectedFiles: new Set(dataset.files) });
      return;
    }
    
    // Single file: download directly
    const file = dataset.files[0];
    const filename = file.split('/').pop();
    setDownloading(prev => ({ ...prev, [filename]: { progress: 0, status: 'downloading', dataset } }));

    try {
      await axios.post(`http://localhost:8080/download?file_url=${encodeURIComponent(file)}&filename=${filename}`);
    } catch (e) {
      console.error(e);
    }

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`http://localhost:8080/download/status?filename=${filename}`);
        const { status, progress } = res.data;
        if (status === 'canceled') {
          clearInterval(interval);
          setDownloading(prev => { const n = { ...prev }; delete n[filename]; return n; });
          return;
        }
        setDownloading(prev => {
          if (!prev[filename]) return prev;
          return { ...prev, [filename]: { ...prev[filename], progress, status } };
        });
        if (status === 'done' || status === 'error') {
          clearInterval(interval);
          if (status === 'done') {
            const files = await axios.get('http://localhost:8080/files');
            setDownloaded(files.data);
          }
          setDownloading(prev => { const n = { ...prev }; delete n[filename]; return n; });
        }
      } catch (e) {
        // tracking error
      }
    }, 500);
  };

  const handleMultiDownload = async () => {
    if (!filePicker) return;
    const { dataset, selectedFiles } = filePicker;
    const files = Array.from(selectedFiles);
    setFilePicker(null);

    try {
      const res = await axios.post('http://localhost:8080/download/multi', {
        dataset_title: dataset.title,
        files: files,
      });
      const folder = res.data.folder;
      for (const f of res.data.files) {
        setDownloading(prev => ({
          ...prev,
          [f.track_key]: { progress: 0, status: 'downloading', dataset }
        }));
        // Track individual file progress
        const trackKey = f.track_key;
        const interval = setInterval(async () => {
          try {
            const r = await axios.get(`http://localhost:8080/download/status?filename=${trackKey}`);
            setDownloading(prev => {
              if (!prev[trackKey]) return prev;
              return { ...prev, [trackKey]: { ...prev[trackKey], progress: r.data.progress, status: r.data.status } };
            });
            if (r.data.status === 'done' || r.data.status === 'error') {
              clearInterval(interval);
              setDownloading(prev => { const n = { ...prev }; delete n[trackKey]; return n; });
              const files = await axios.get('http://localhost:8080/files');
              setDownloaded(files.data);
            }
          } catch (e) {}
        }, 500);
      }
    } catch (e) {
      console.error('Multi-download failed:', e);
    }
  };

  const toggleFileInPicker = (url) => {
    if (!filePicker) return;
    const newSet = new Set(filePicker.selectedFiles);
    if (newSet.has(url)) newSet.delete(url);
    else newSet.add(url);
    setFilePicker({ ...filePicker, selectedFiles: newSet });
  };

  const isDownloaded = (dataset) => {
    const filename = dataset.files[0]?.split('/').pop();
    return downloaded.some(f => f.filename === filename);
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      background: '#0e0e11', /* Deepest dark */
      color: '#d1d5db',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>

      {/* Sidebar - Ultra Minimal */}
      <div style={{
        width: '240px',
        background: '#131317', /* Slightly lighter than main bg */
        borderRight: '1px solid #232328',
        display: 'flex',
        flexDirection: 'column',
        WebkitAppRegion: 'drag', /* Electron drag region */
      }}>
        {/* Branding */}
        <div style={{ padding: '32px 24px', display: 'flex', alignItems: 'center', gap: '12px', WebkitAppRegion: 'no-drag' }}>
          <div style={{ color: '#ffffff' }}>
            <Logo />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6', letterSpacing: '0.5px' }}>
              OpenCERN
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
              Local Data Explorer
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px', WebkitAppRegion: 'no-drag' }}>
          {[
            { id: 'browse', label: 'Models & Data', icon: <IconBrowse /> },
            { id: 'downloaded', label: 'Local Storage', icon: <IconFolder /> },
            { id: 'workspace', label: 'IDE Workspace', icon: <IconFile /> },
            { id: 'visualize', label: 'Visualization', icon: <IconEye /> },
            { id: 'ai', label: 'AI Analysis', icon: <IconAI /> },
            { id: 'about', label: 'About', icon: <IconInfo /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                textAlign: 'left',
                color: activeTab === tab.id ? '#ffffff' : '#9ca3af',
                background: activeTab === tab.id ? '#1e1e24' : 'transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#e5e7eb';
                  e.currentTarget.style.background = '#18181d';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#9ca3af';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', opacity: activeTab === tab.id ? 1 : 0.7 }}>
                {tab.icon}
              </span>
              {tab.label}
              {tab.id === 'downloaded' && downloaded.length > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  color: '#9ca3af',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  {downloaded.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} /> {/* Spacer */}

        {/* Download Manager Button */}
        <div style={{ position: 'relative', padding: '0 12px', marginBottom: '8px', WebkitAppRegion: 'no-drag' }}>
          <button
            id="download-manager-btn"
            onClick={() => setShowDownloads(!showDownloads)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              textAlign: 'left',
              color: showDownloads ? '#ffffff' : '#9ca3af',
              background: showDownloads ? '#1e1e24' : 'transparent',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!showDownloads) {
                e.currentTarget.style.color = '#e5e7eb';
                e.currentTarget.style.background = '#18181d';
              }
            }}
            onMouseLeave={(e) => {
              if (!showDownloads) {
                e.currentTarget.style.color = '#9ca3af';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', opacity: showDownloads ? 1 : 0.7 }}>
              <IconDownloadsManager />
            </span>
            Downloads
            {Object.keys(downloading).length > 0 && (
              <div style={{ width: 6, height: 6, background: '#3b82f6', borderRadius: '50%', marginLeft: 'auto', boxShadow: '0 0 4px #3b82f6' }} />
            )}
          </button>
          
          {/* Flyout */}
          {showDownloads && (
             <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '20px',
                width: '320px',
                background: '#18181f',
                border: '1px solid #2d2d34',
                borderRadius: '8px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                padding: '16px',
                zIndex: 1000,
                marginBottom: '8px'
             }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  Download Manager
                  <button onClick={() => setShowDownloads(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><IconX /></button>
                </div>
                {Object.keys(downloading).length === 0 ? (
                   <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '16px 0' }}>No active downloads</div>
                ) : (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                     {Object.entries(downloading).map(([fname, info]) => (
                        <div key={fname} style={{ background: '#131317', padding: '12px', borderRadius: '6px', border: '1px solid #232328' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                             <div style={{ fontSize: '12px', color: '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={info.dataset.title}>
                               {info.dataset.title}
                             </div>
                             <div style={{ fontSize: '11px', color: '#9ca3af' }}>{info.progress.toFixed(0)}%</div>
                           </div>
                           <div style={{ height: '4px', background: '#232328', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
                             <div style={{ height: '100%', width: `${info.progress}%`, background: info.status === 'paused' ? '#f59e0b' : '#3b82f6', transition: 'width 0.2s linear' }} />
                           </div>
                           <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                             {info.status === 'paused' ? (
                               <button onClick={() => resumeDownload(fname)} style={{ background: '#232328', border: '1px solid #374151', color: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                 <IconPlay />
                               </button>
                             ) : (
                               <button onClick={() => pauseDownload(fname)} style={{ background: '#232328', border: '1px solid #374151', color: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                 <IconPause />
                               </button>
                             )}
                             <button onClick={() => cancelDownload(fname)} style={{ background: '#232328', border: '1px solid #374151', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                               <IconX />
                             </button>
                           </div>
                        </div>
                     ))}
                   </div>
                )}
             </div>
          )}
        </div>

        {/* Status indicator at bottom */}
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid #232328', WebkitAppRegion: 'no-drag' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)' }} />
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>Engine Connected</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', WebkitAppRegion: 'no-drag' }}>

        {/* Top Header */}
        <div style={{
          height: '60px',
          padding: '0 32px',
          borderBottom: '1px solid #1f1f26',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end', /* Pushing content to right, title implied by nav */
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: '#6b7280', background: '#131317', padding: '4px 10px', borderRadius: '4px', border: '1px solid #232328', fontWeight: 500 }}>
              v0.1.3 — base pipeline complete
            </div>
            <SignedOut>
              <div style={{ background: '#2563eb', color: '#f8fafc', padding: '4px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'opacity 0.2s', border: '1px solid #1d4ed8' }} onMouseEnter={(e) => e.target.style.opacity = '0.9'} onMouseLeave={(e) => e.target.style.opacity = '1'}>
                <SignInButton />
              </div>
            </SignedOut>
            <SignedIn>
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-7 h-7" } }} />
            </SignedIn>
          </div>
        </div>

        {/* Main Scrollable View */}
        <div style={{ flex: 1, overflowY: 'overlay', padding: '32px 48px' }}>
          
          {/* Browse Tab */}
          {activeTab === 'browse' && (
            <div style={{ maxWidth: '960px', margin: '0 auto' }}>
              <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#f3f4f6', margin: '0 0 8px 0' }}>Discover Datasets</h1>
                  <p style={{ fontSize: '14px', margin: 0, color: '#9ca3af' }}>Explore and download open particle physics data from CERN.</p>
                </div>

                {/* Experiment Filter */}
                <div style={{ display: 'flex', background: '#131317', padding: '4px', borderRadius: '8px', border: '1px solid #232328' }}>
                  {['All', 'CMS', 'Alice', 'ATLAS'].map(exp => (
                    <button
                      key={exp}
                      onClick={() => { setExperiment(exp); setPage(1); }}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        background: experiment === exp ? '#232328' : 'transparent',
                        color: experiment === exp ? '#f3f4f6' : '#9ca3af',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div style={{ color: '#6b7280', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '40px' }}>
                  <div className="spinner" style={{ 
                    width: '16px', height: '16px', border: '2px solid #232328', 
                    borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' 
                  }} />
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  Loading remote registry...
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '12px' }}>
                  {datasets.map(d => {
                    const filename = d.files[0]?.split('/').pop();
                    const isDown = isDownloaded(d);
                    const dlInfo = downloading[filename];
                    const progress = dlInfo ? dlInfo.progress : undefined;
                    const status = dlInfo ? dlInfo.status : undefined;
                    const isSelected = selected?.id === d.id;

                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelected(d)}
                        style={{
                          background: isSelected ? '#18181f' : '#131317',
                          border: `1px solid ${isSelected ? '#3f3f4e' : '#232328'}`,
                          borderRadius: '8px',
                          padding: '24px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = '#16161a';
                            e.currentTarget.style.borderColor = '#2d2d34';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = '#131317';
                            e.currentTarget.style.borderColor = '#232328';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, paddingRight: '32px' }}>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>
                              {d.title}
                            </div>
                            <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: 1.6 }}>
                              {d.description}
                            </div>
                          </div>
                          
                          <div style={{ width: '130px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px' }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, fontFamily: 'var(--font-geist-mono), monospace' }}>
                              {formatSize(parseInt(d.size))}
                            </div>
                            
                            {isDown ? (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', borderRadius: '4px',
                                fontSize: '12px', fontWeight: 500,
                                color: '#10b981', background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                              }}>
                                <IconCheck /> Ready
                              </div>
                            ) : progress !== undefined ? (
                              <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#f3f4f6', marginBottom: '8px', fontWeight: 500 }}>
                                  <span style={{ color: status === 'paused' ? '#f59e0b' : '#9ca3af' }}>{status === 'paused' ? 'Paused' : 'Pulling'}</span>
                                  <span>{progress.toFixed(0)}%</span>
                                </div>
                                <div style={{ height: '3px', background: '#232328', borderRadius: '1.5px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${progress}%`, background: status === 'paused' ? '#f59e0b' : '#3b82f6', borderRadius: '1.5px', transition: 'width 0.2s linear' }} />
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDownload(d, e); }}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                  width: '100%', padding: '8px 0', borderRadius: '4px',
                                  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                                  color: '#ffffff', background: '#2563eb', border: 'none',
                                  transition: 'background 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                              >
                                <IconDownload /> Download
                              </button>
                            )}
                          </div>
                        </div>

                        {/* File Tags */}
                        {isSelected && (
                          <div style={{ marginTop: '4px', paddingTop: '20px', borderTop: '1px solid #232328', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {d.files.map((f, i) => (
                              <div key={i} style={{
                                fontSize: '11px', color: '#9ca3af', background: '#0e0e11',
                                padding: '4px 10px', borderRadius: '4px',
                                fontFamily: 'var(--font-geist-mono), monospace', border: '1px solid #1f1f26'
                              }}>
                                {f.split('/').pop()}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {!loading && totalPages > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '16px', marginTop: '32px', paddingTop: '24px',
                  borderTop: '1px solid #1f1f26'
                }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    style={{
                      padding: '8px 20px', borderRadius: '6px', border: '1px solid #232328',
                      cursor: page <= 1 ? 'not-allowed' : 'pointer',
                      fontSize: '13px', fontWeight: 500,
                      color: page <= 1 ? '#4b5563' : '#f3f4f6',
                      background: page <= 1 ? '#131317' : '#1e1e24',
                      opacity: page <= 1 ? 0.5 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ← Previous
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>
                      Page {page} of {totalPages}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      ({totalDatasets} datasets)
                    </span>
                  </div>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{
                      padding: '8px 20px', borderRadius: '6px', border: '1px solid #232328',
                      cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '13px', fontWeight: 500,
                      color: page >= totalPages ? '#4b5563' : '#f3f4f6',
                      background: page >= totalPages ? '#131317' : '#1e1e24',
                      opacity: page >= totalPages ? 0.5 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Downloaded Tab */}
          {activeTab === 'downloaded' && (
            <div style={{ display: 'flex', gap: '24px', height: '100%', width: '100%' }}>
              <div style={{ flex: 1, maxWidth: inspectingFile ? 'calc(100% - 424px)' : '960px', margin: inspectingFile ? '0' : '0 auto', transition: 'max-width 0.3s ease', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '32px', flexShrink: 0 }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#f3f4f6', margin: '0 0 8px 0' }}>Local Storage</h1>
                  <p style={{ fontSize: '14px', margin: 0, color: '#9ca3af' }}>Manage files currently downloaded to disk.</p>
                </div>

                {downloaded.length === 0 ? (
                  <div style={{ 
                    color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '64px 0',
                    border: '1px dashed #232328', borderRadius: '8px', flexShrink: 0
                  }}>
                    No local files found.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingBottom: '32px', paddingRight: '12px' }}>
                    {downloaded.map(f => {
                      const pStatus = processing[f.filename] || 'idle';
                      const isExpanded = expandedFiles[f.filename];
                      return (
                      <div key={f.filename} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{
                          background: '#131317', border: '1px solid #232328', borderRadius: '6px',
                          padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#18181f'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#131317'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {pStatus === 'processed' ? (
                               <button 
                                 onClick={() => toggleExpand(f.filename)}
                                 style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                                 title={isExpanded ? "Collapse" : "Expand Processed Data"}
                               >
                                 {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
                               </button>
                             ) : (
                               <div style={{ width: '14px' }}></div>
                             )}
                            <div style={{ color: '#6b7280' }}><IconFile /></div>
                            <div style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', color: '#d1d5db' }}>
                              {f.filename}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'var(--font-geist-mono), monospace' }}>
                              {formatSize(f.size)}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                onClick={() => (pStatus === 'idle' || pStatus === 'error') ? processFile(f.filename) : null}
                                disabled={pStatus === 'processing' || pStatus === 'processed' || pStatus.startsWith?.('processing ') || pStatus === 'merging' || pStatus === 'extracting'}
                                style={{ 
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                  background: pStatus === 'processed' ? '#059669' : 
                                              pStatus === 'error' ? '#dc2626' : 
                                              (pStatus === 'processing' || pStatus.startsWith?.('processing ') || pStatus === 'merging' || pStatus === 'extracting') ? '#3b82f6' : 'transparent',
                                  border: `1px solid ${pStatus === 'idle' ? '#374151' : 'transparent'}`,
                                  color: pStatus === 'idle' ? '#d1d5db' : '#ffffff', 
                                  padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                  cursor: (pStatus === 'processing' || pStatus === 'processed' || pStatus.startsWith?.('processing ') || pStatus === 'merging') ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.15s ease',
                                  opacity: (pStatus === 'processing' || pStatus.startsWith?.('processing ') || pStatus === 'merging') ? 0.8 : 1
                                }}
                              >
                                {(pStatus === 'processing' || pStatus.startsWith?.('processing ') || pStatus === 'merging' || pStatus === 'extracting') ? (
                                  <>
                                    <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                       <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                                       <path d="M12 2a10 10 0 0 1 10 10" stroke="#ffffff"></path>
                                    </svg>
                                    {pStatus === 'merging' ? 'MERGING' : pStatus === 'extracting' ? 'EXTRACTING' : pStatus.startsWith?.('processing ') ? pStatus.split(':')[0].toUpperCase() : 'PROCESSING'}
                                  </>
                                ) : pStatus === 'processed' ? (
                                  <>
                                    <IconCheck /> PROCESSED
                                  </>
                                ) : pStatus === 'error' ? (
                                  <>
                                    <IconX /> RETRY
                                  </>
                                ) : (
                                  <>
                                    <IconCpu /> {f.type === 'folder' ? 'PROCESS ALL' : 'PROCESS'}
                                  </>
                                )}
                              </button>
                              
                              <div style={{ width: '1px', height: '16px', background: '#374151', margin: '0 4px' }} />

                              <button onClick={() => revealFile(f.filename)} style={{ 
                                background: 'transparent', border: '1px solid #374151', color: '#d1d5db', 
                                padding: '4px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#232328'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                Reveal in Finder
                              </button>
                              <button onClick={() => deleteFile(f.filename)} style={{ 
                                background: 'transparent', border: '1px solid #7f1d1d', color: '#ef4444', 
                                padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }} title="Delete File"
                              onMouseEnter={(e) => e.currentTarget.style.background = '#450a0a'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Processed Data Sub-folder */}
                        {isExpanded && pStatus === 'processed' && (
                          <div style={{
                            marginLeft: '44px', background: '#18181f', border: '1px solid #232328', borderRadius: '6px',
                            padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            cursor: 'pointer', transition: 'background 0.15s ease',
                            borderLeft: '2px solid #3b82f6',
                            animation: 'slideIn 0.2s ease-out'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#1e1e24'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#18181f'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => openInspector(f.filename, 1)}>
                              <div style={{ color: '#3b82f6' }}><IconDatabase /></div>
                              <div style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', color: '#d1d5db' }}>
                                {f.filename.replace('.root', '.json')}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVisualizeFile(f.filename.replace('.root', '.json'));
                                  setActiveTab('visualize');
                                }}
                                style={{ background: '#00d4ff', border: 'none', color: '#080b14', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                Visualize 3D
                              </button>
                              <div style={{ fontSize: '10px', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.5px' }}>
                                PROCESSED DATA
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                )}
              </div>

              {/* Inspector Sidebar */}
              {inspectingFile && (
                <div style={{ 
                  width: '400px', flexShrink: 0, background: '#131317', border: '1px solid #232328', borderRadius: '8px', 
                  display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%',
                  animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                  {/* Header */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #232328', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#18181f' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ color: '#3b82f6' }}><IconDatabase /></div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6', fontFamily: 'var(--font-geist-mono), monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                        {inspectingFile.replace('.root', '.json')}
                      </div>
                    </div>
                    <button onClick={closeInspector} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px', transition: 'all 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#232328'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} title="Close Inspector">
                      <IconSidebarClose />
                    </button>
                  </div>
                  
                  {/* Content */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#0e0e11' }}>
                    {loadingInspector ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#6b7280', gap: '8px', fontSize: '12px' }}>
                         <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="#3b82f6"></path></svg>
                         Loading Data...
                      </div>
                    ) : inspectorData?.error ? (
                      <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                        {inspectorData.error}
                      </div>
                    ) : inspectorData ? (
                      <div>
                        {/* Meta Info */}
                        <div style={{ marginBottom: '20px', padding: '12px', background: '#131317', border: '1px solid #232328', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.5px' }}>METADATA</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                             <span style={{ color: '#6b7280' }}>Total Events:</span>
                             <span style={{ color: '#d1d5db', fontFamily: 'var(--font-geist-mono), monospace' }}>{inspectorData.metadata?.filtered_events || inspectorData.total_events}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                             <span style={{ color: '#6b7280' }}>Avg Particles:</span>
                             <span style={{ color: '#d1d5db', fontFamily: 'var(--font-geist-mono), monospace' }}>{inspectorData.metadata?.avg_particles_per_event}</span>
                          </div>
                        </div>

                        {/* JSON Data Render */}
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.5px' }}>DATA CHUNK (PAGE {inspectorData.page}/{inspectorData.total_pages})</div>
                        <div style={{ height: '400px', width: '100%', background: '#131317', border: '1px solid #232328', borderRadius: '6px', overflow: 'hidden' }}>
                          <Editor
                            height="100%"
                            defaultLanguage="json"
                            theme="vs-dark"
                            value={JSON.stringify(inspectorData.events, null, 2)}
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              scrollBeyondLastLine: false,
                              fontSize: 11,
                              fontFamily: 'var(--font-geist-mono), Consolas, monospace',
                              padding: { top: 12, bottom: 12 },
                              folding: true,
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Pagination Footer */}
                  {inspectorData && !loadingInspector && !inspectorData.error && inspectorData.total_pages > 0 && (
                    <div style={{ padding: '12px 20px', borderTop: '1px solid #232328', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#18181f' }}>
                       <button 
                         disabled={inspectorData.page <= 1}
                         onClick={() => openInspector(inspectingFile, inspectorData.page - 1)}
                         style={{ background: '#232328', border: '1px solid #374151', color: inspectorData.page <= 1 ? '#6b7280' : '#d1d5db', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', cursor: inspectorData.page <= 1 ? 'not-allowed' : 'pointer', fontWeight: 500 }}
                       >
                         Previous
                       </button>
                       <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                         Page <span style={{ color: '#f3f4f6', fontWeight: 600 }}>{inspectorData.page}</span> of {inspectorData.total_pages}
                       </div>
                       <button 
                         disabled={inspectorData.page >= inspectorData.total_pages}
                         onClick={() => openInspector(inspectingFile, inspectorData.page + 1)}
                         style={{ background: '#232328', border: '1px solid #374151', color: inspectorData.page >= inspectorData.total_pages ? '#6b7280' : '#d1d5db', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', cursor: inspectorData.page >= inspectorData.total_pages ? 'not-allowed' : 'pointer', fontWeight: 500 }}
                       >
                         Next
                       </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* IDE Workspace Tab */}
          {activeTab === 'workspace' && (
             <div style={{ display: 'flex', height: 'calc(100vh - 128px)', borderRadius: '8px', border: '1px solid #232328', overflow: 'hidden' }}>
                {/* Workspace Sidebar */}
                <div style={{ width: '250px', background: '#131317', borderRight: '1px solid #232328', display: 'flex', flexDirection: 'column' }}>
                   <div style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.5px', borderBottom: '1px solid #1A1A1A' }}>
                      EXPLORER
                   </div>
                   <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                      {downloaded.length === 0 ? (
                         <div style={{ padding: '16px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>No datasets available</div>
                      ) : (
                         downloaded.filter(f => processing[f.filename] === 'processed').map(f => (
                            <div key={f.filename}>
                               <div style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#d1d5db', cursor: 'default' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</span>
                               </div>
                               <div 
                                  onClick={() => {
                                     setInspectingFile(f.filename);
                                     openInspector(f.filename, 1);
                                  }}
                                  style={{ 
                                     padding: '4px 16px 4px 36px', 
                                     display: 'flex', 
                                     alignItems: 'center', 
                                     gap: '8px', 
                                     fontSize: '12px', 
                                     color: inspectingFile === f.filename ? '#ffffff' : '#9ca3af', 
                                     cursor: 'pointer',
                                     background: inspectingFile === f.filename ? '#094771' : 'transparent',
                                     borderLeft: inspectingFile === f.filename ? '2px solid #3b82f6' : '2px solid transparent'
                                  }}
                                  onMouseEnter={(e) => !inspectingFile === f.filename && (e.currentTarget.style.color = '#d1d5db')}
                                  onMouseLeave={(e) => !inspectingFile === f.filename && (e.currentTarget.style.color = '#9ca3af')}
                               >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbcb41" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                  <span style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>{f.filename.replace('.root', '.json')}</span>
                               </div>
                            </div>
                         ))
                      )}
                   </div>
                </div>

                {/* Main Monaco Editor Terminal */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000000', position: 'relative' }}>
                   {!inspectingFile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>
                         <Logo />
                         <div style={{ marginTop: '24px', fontSize: '13px' }}>Select a dataset from the Explorer to begin reading telemetry.</div>
                      </div>
                   ) : loadingInspector ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#6b7280', gap: '12px', fontSize: '13px' }}>
                         <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="#3b82f6"></path></svg>
                         Mounting IDE...
                      </div>
                   ) : inspectorData?.error ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#ef4444', fontSize: '13px' }}>
                         {inspectorData.error}
                      </div>
                   ) : inspectorData ? (
                      <>
                         {/* Editor Header Path & Controls */}
                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: '#000000', borderBottom: '1px solid #1A1A1A', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontFamily: 'var(--font-geist-mono), monospace' }}>
                               workspace <span style={{ color: '#4b5563' }}>/</span> telemetry <span style={{ color: '#4b5563' }}>/</span> <span style={{ color: '#e5e7eb' }}>{inspectingFile.replace('.root', '.json')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <button onClick={() => saveProcessedFile(inspectingFile)} style={{ background: '#007acc', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Save File</button>
                               <button onClick={() => deleteProcessedFile(inspectingFile)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Delete</button>
                            </div>
                         </div>
                         
                         {/* Raw Monaco Editor Inject */}
                         <div style={{ flex: 1, position: 'relative' }}>
                            <Editor
                              onMount={(editor) => editorRef.current = editor}
                              height="100%"
                              defaultLanguage="json"
                              theme="vs-dark"
                              value={JSON.stringify(inspectorData, null, 2)}
                              options={{
                                readOnly: false,
                                minimap: { enabled: true, renderCharacters: false },
                                scrollBeyondLastLine: false,
                                fontSize: 13,
                                fontFamily: 'var(--font-geist-mono), Consolas, monospace',
                                padding: { top: 24, bottom: 24 },
                                matchBrackets: 'always',
                                folding: true,
                                renderLineHighlight: 'all',
                              }}
                            />
                         </div>

                         {/* Workspace Status Bar */}
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 16px', background: '#007acc', color: '#ffffff', fontSize: '11px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                               <span>JSON Dataset</span>
                               <span>{inspectorData.total_events} events</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                               <button 
                                 disabled={inspectorData.page <= 1}
                                 onClick={() => openInspector(inspectingFile, inspectorData.page - 1)}
                                 style={{ background: 'transparent', border: 'none', color: inspectorData.page <= 1 ? 'rgba(255,255,255,0.5)' : '#ffffff', cursor: inspectorData.page <= 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                               >
                                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                 Prev
                               </button>
                               <span>Page {inspectorData.page} / {inspectorData.total_pages}</span>
                               <button 
                                 disabled={inspectorData.page >= inspectorData.total_pages}
                                 onClick={() => openInspector(inspectingFile, inspectorData.page + 1)}
                                 style={{ background: 'transparent', border: 'none', color: inspectorData.page >= inspectorData.total_pages ? 'rgba(255,255,255,0.5)' : '#ffffff', cursor: inspectorData.page >= inspectorData.total_pages ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                               >
                                 Next
                                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                               </button>
                               <span style={{ marginLeft: '8px' }}>UTF-8</span>
                            </div>
                         </div>
                      </>
                   ) : null}
                </div>
             </div>
          )}

          {/* Visualize Tab */}
          {activeTab === 'visualize' && (
            <div style={{ height: 'calc(100% - 60px)' }}>
              {visualizeFile ? (
                <ParticleVisualization filename={visualizeFile} />
              ) : (
                <div style={{ position: 'relative', width: '100%', height: '100%', background: '#080b14', borderRadius: '8px', border: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '13px' }}>
                  Please select a processed JSON dataset from the Local Storage tab to visualize.
                </div>
              )}
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'ai' && (
            <div className="ai-chat-container" style={{ height: 'calc(100vh - 60px)', margin: '-32px -48px', padding: 0 }}>
              {/* Gear icon, top right */}
              <button className="ai-chat-gear-btn" onClick={() => setAiShowSettings(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>

              {/* Empty state — centered input */}
              {aiMessages.length === 0 && !aiStreaming ? (
                <div className="ai-chat-welcome">
                  <svg className="ai-chat-welcome-icon" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                    <polyline points="2 17 12 22 22 17"/>
                    <polyline points="2 12 12 17 22 12"/>
                  </svg>

                  <div className="ai-chat-input-centered">
                    <div className="ai-chat-input-box">
                      <textarea
                        ref={aiTextareaRef}
                        className="ai-chat-textarea"
                        value={aiInputValue}
                        onChange={(e) => {
                          setAiInputValue(e.target.value);
                          setAiError('');
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendAiMessage(aiInputValue);
                          }
                        }}
                        placeholder="Ask about your physics data..."
                        rows={1}
                      />
                      <div className="ai-chat-input-toolbar">
                        <div className="ai-chat-toolbar-left">
                          <select
                            className="ai-chat-model-select"
                            value={aiConfig.model}
                            onChange={(e) => saveAiConfig({ ...aiConfig, model: e.target.value })}
                          >
                            {aiModels.map(m => (
                              <option key={m.id} value={m.id}>{m.display_name || m.id}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          className="ai-chat-send-btn"
                          onClick={() => sendAiMessage(aiInputValue)}
                          disabled={!aiInputValue.trim()}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                      </div>
                    </div>

                    {aiError && (
                      <div className="ai-chat-inline-error">{aiError}</div>
                    )}

                    <div className="ai-chat-suggestions">
                      {AI_SUGGESTIONS.map((s, i) => (
                        <button key={i} className="ai-chat-suggestion" onClick={() => sendAiMessage(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Conversation mode */
                <>
                  <div className="ai-chat-messages">
                    {aiMessages.map((msg, i) => {
                      // Filter out user tool_result blocks so they don't render ugly JSON in chat
                      if (msg.role === 'user' && Array.isArray(msg.content) && msg.content[0]?.type === 'tool_result') {
                        return null;
                      }
                      
                      return (
                        <div key={i} className={`ai-chat-message ai-chat-message-\${msg.role}`}>
                          <div className={`ai-chat-bubble ai-chat-bubble-\${msg.role}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {Array.isArray(msg.content) ? (
                              msg.content.map((block, j) => {
                                if (block.type === 'text') {
                                  return <div key={j}>{renderAIMarkdown(block.text)}</div>;
                                } else if (block.type === 'tool_use') {
                                  // RENDER TOOL EXECUTION CARD
                                  let codeStr = '';
                                  if (block.name === 'execute_python') codeStr = block.input.code;
                                  else if (block.name === 'execute_bash') codeStr = block.input.command;
                                  else if (block.name === 'opencern_cli') codeStr = 'opencern ' + block.input.args;
                                  
                                  const getStatusColor = (s) => {
                                    if (s === 'success') return '#10b981';
                                    if (s === 'failed' || s === 'denied') return '#ef4444';
                                    if (s === 'running') return '#3b82f6';
                                    return '#f59e0b';
                                  };

                                  return (
                                    <div key={j} style={{ background: '#08080a', border: '1px solid #232328', borderRadius: '8px', overflow: 'hidden' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#131317', borderBottom: '1px solid #232328' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#9ca3af', fontFamily: 'var(--font-geist-mono), monospace' }}>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                                          {block.name}
                                        </div>
                                        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', color: getStatusColor(block.status) }}>
                                          {block.status?.toUpperCase() || 'PENDING APPROVAL'}
                                        </div>
                                      </div>
                                      
                                      <div style={{ padding: '12px', overflowX: 'auto', background: '#000', fontSize: '12px', fontFamily: 'var(--font-geist-mono), Consolas, monospace', color: '#d1d5db', whiteSpace: 'pre-wrap' }}>
                                        {codeStr}
                                      </div>

                                      {block.status === 'pending' && (
                                        <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', background: '#131317', borderTop: '1px solid #232328' }}>
                                          <button 
                                            onClick={() => handleToolAction(i, j, block, 'approve')}
                                            style={{ flex: 1, background: '#10b981', color: '#000', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                          >
                                            Approve & Run
                                          </button>
                                          <button 
                                            onClick={() => handleToolAction(i, j, block, 'deny')}
                                            style={{ flex: 1, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                          >
                                            Deny
                                          </button>
                                        </div>
                                      )}

                                      {(block.status === 'success' || block.status === 'failed') && block.output && (
                                        <div style={{ padding: '8px 12px', background: '#0a0a0c', borderTop: '1px solid #232328', fontSize: '11px', fontFamily: 'var(--font-geist-mono), monospace', color: block.status === 'success' ? '#9ca3af' : '#ef4444', maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                                          {block.output}
                                        </div>
                                      )}

                                      {/* Inline image rendering from executed scripts */}
                                      {block.images && block.images.map((imgSrc, imgIdx) => (
                                        <div key={imgIdx} style={{ padding: '12px', background: '#fff', borderTop: '1px solid #232328' }}>
                                          <img src={imgSrc} alt="Generated output" style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }} />
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              })
                            ) : (
                              msg.role === 'assistant' ? renderAIMarkdown(msg.content) : msg.content
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {aiStreaming && aiTokens && (
                      <div className="ai-chat-message ai-chat-message-assistant">
                        <div className="ai-chat-bubble ai-chat-bubble-assistant">
                          {renderAIMarkdown(aiTokens)}
                          <span className="ai-chat-cursor"></span>
                        </div>
                      </div>
                    )}

                    {aiStreaming && !aiTokens && (
                      <div className="ai-chat-message ai-chat-message-assistant">
                        <div className="ai-chat-thinking">
                          <div className="ai-chat-thinking-dots">
                            <div className="ai-chat-thinking-dot"></div>
                            <div className="ai-chat-thinking-dot"></div>
                            <div className="ai-chat-thinking-dot"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={aiMessagesEndRef} />
                  </div>

                  {aiStreaming && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
                      <button className="ai-chat-stop-btn" onClick={stopAiStream}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                        Stop
                      </button>
                    </div>
                  )}

                  <div className="ai-chat-input-bottom">
                    <div className="ai-chat-input-centered">
                      <div className="ai-chat-input-box">
                        <textarea
                          ref={aiTextareaRef}
                          className="ai-chat-textarea"
                          value={aiInputValue}
                          onChange={(e) => {
                            setAiInputValue(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendAiMessage(aiInputValue);
                            }
                          }}
                          placeholder="Ask a follow-up..."
                          rows={1}
                          disabled={aiStreaming}
                        />
                        <div className="ai-chat-input-toolbar">
                          <div className="ai-chat-toolbar-left">
                            <select
                              className="ai-chat-model-select"
                              value={aiConfig.model}
                              onChange={(e) => saveAiConfig({ ...aiConfig, model: e.target.value })}
                            >
                              {aiModels.map(m => (
                                <option key={m.id} value={m.id}>{m.display_name || m.id}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            className="ai-chat-send-btn"
                            onClick={() => sendAiMessage(aiInputValue)}
                            disabled={!aiInputValue.trim() || aiStreaming}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                          </button>
                        </div>
                      </div>
                      <div className="ai-chat-input-footer">
                        <span style={{ color: '#444', fontSize: '11px' }}>Shift+Enter for new line</span>
                        <button
                          onClick={clearAiChat}
                          style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '11px' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#777'}
                          onMouseLeave={e => e.currentTarget.style.color = '#444'}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Settings Panel */}
              {aiShowSettings && (
                <div className="ai-chat-settings-overlay" onClick={() => setAiShowSettings(false)}>
                  <div className="ai-chat-settings-panel" onClick={e => e.stopPropagation()}>
                    <div className="ai-chat-settings-header">
                      <h3>Settings</h3>
                      <button className="ai-chat-settings-close" onClick={() => setAiShowSettings(false)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>

                    <div className="ai-chat-settings-body">
                        <div className="ai-chat-settings-group">
                          <label>API Key</label>
                          <input
                            className="ai-chat-settings-input"
                            type="password"
                            value={aiConfig.apiKey}
                            onChange={(e) => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="sk-ant-api03-..."
                            autoComplete="off"
                          />
                          <div className="ai-chat-hint">
                            Pay-per-token. <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">Get a key →</a>
                          </div>
                        </div>
                    </div>

                    <div className="ai-chat-settings-footer">
                      <button className="ai-chat-settings-save" onClick={() => { saveAiConfig(aiConfig); setAiShowSettings(false); }}>
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div style={{ maxWidth: '640px', margin: '40px auto 0 auto', background: '#131317', padding: '48px', borderRadius: '12px', border: '1px solid #232328', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: '#f3f4f6', marginBottom: '24px' }}>
                <Logo />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#f3f4f6', margin: '0 0 16px 0' }}>OpenCERN Local Explorer</h1>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', display: 'inline-block', padding: '4px 12px', borderRadius: '999px', marginBottom: '32px' }}>
                Version 0.1.3 — base pipeline complete
              </div>
              <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: 1.6, margin: '0 0 32px 0' }}>
                OpenCERN provides researchers and enthusiasts with streamlined, native access to high-energy physics datasets from the CERN Open Data Portal. Developed for efficiency, built for the future.
              </p>
              
              <div style={{ borderTop: '1px solid #232328', paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
                <div>Built with Next.js, Electron, and Python FastAPI.</div>
                <div>&copy; {new Date().getFullYear()} OpenCERN Project. All rights reserved.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Picker Modal */}
      {filePicker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setFilePicker(null)}>
          <div style={{
            background: '#18181b', border: '1px solid #2a2a2e', borderRadius: '12px',
            width: '560px', maxHeight: '70vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #232328' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f3f4f6', fontWeight: 600 }}>
                Select Files to Download
              </h3>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#9ca3af' }}>
                {filePicker.dataset.title}
              </p>
            </div>

            {/* Controls */}
            <div style={{
              padding: '12px 24px', display: 'flex', gap: '12px', fontSize: '12px',
              borderBottom: '1px solid #1f1f26',
            }}>
              <button onClick={() => setFilePicker({ ...filePicker, selectedFiles: new Set(filePicker.dataset.files) })}
                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px' }}>
                Select All
              </button>
              <button onClick={() => setFilePicker({ ...filePicker, selectedFiles: new Set() })}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '12px' }}>
                Select None
              </button>
              <span style={{ marginLeft: 'auto', color: '#6b7280' }}>
                {filePicker.selectedFiles.size} of {filePicker.dataset.files.length} selected
              </span>
            </div>

            {/* File List */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
              {filePicker.dataset.files.map((url, i) => {
                const name = url.split('/').pop();
                const isChecked = filePicker.selectedFiles.has(url);
                return (
                  <div key={i}
                    onClick={() => toggleFileInPicker(url)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 24px', cursor: 'pointer',
                      background: isChecked ? 'rgba(59,130,246,0.08)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isChecked ? 'rgba(59,130,246,0.12)' : '#1f1f26'}
                    onMouseLeave={e => e.currentTarget.style.background = isChecked ? 'rgba(59,130,246,0.08)' : 'transparent'}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                      border: isChecked ? '2px solid #3b82f6' : '2px solid #4b5563',
                      background: isChecked ? '#3b82f6' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {isChecked && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{
                      fontSize: '13px', color: '#e5e7eb',
                      fontFamily: 'var(--font-geist-mono), monospace',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}>
                      {name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #232328',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px',
            }}>
              <button onClick={() => setFilePicker(null)}
                style={{
                  padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                  border: '1px solid #232328', background: '#131317', color: '#9ca3af', cursor: 'pointer',
                }}>
                Cancel
              </button>
              <button onClick={handleMultiDownload}
                disabled={filePicker.selectedFiles.size === 0}
                style={{
                  padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                  border: 'none', cursor: filePicker.selectedFiles.size === 0 ? 'not-allowed' : 'pointer',
                  background: filePicker.selectedFiles.size === 0 ? '#1e1e24' : '#2563eb',
                  color: filePicker.selectedFiles.size === 0 ? '#4b5563' : '#fff',
                  transition: 'all 0.15s',
                }}>
                Download {filePicker.selectedFiles.size} File{filePicker.selectedFiles.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
