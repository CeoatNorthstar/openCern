"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const formatSize = (bytes) => {
  if (!bytes) return 'Unknown';
  const mb = bytes / (1024 * 1024);
  return mb > 1000 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
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

const Logo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);

export default function App() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [downloaded, setDownloaded] = useState([]);
  const [downloading, setDownloading] = useState({});
  const [activeTab, setActiveTab] = useState('browse');
  const [experiment, setExperiment] = useState('All');

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
      `;
      document.head.appendChild(style);
    }

    setLoading(true);
    // Fetch depending on the selected experiment
    if (experiment === 'All') {
      Promise.all([
        axios.get('http://localhost:8080/datasets?experiment=ALICE'),
        axios.get('http://localhost:8080/datasets?experiment=CMS')
      ])
        .then(([resAlice, resCms]) => {
          setDatasets([...resAlice.data, ...resCms.data]);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      const expParam = experiment === 'Alice' ? 'ALICE' : experiment;
      axios.get(`http://localhost:8080/datasets?experiment=${expParam}`)
        .then(r => { setDatasets(r.data); setLoading(false); })
        .catch(() => setLoading(false));
    }

    axios.get('http://localhost:8080/files')
      .then(r => setDownloaded(r.data))
      .catch(() => {});
      
  }, [experiment]);

  const handleDownload = async (dataset) => {
    const file = dataset.files[0];
    const filename = file.split('/').pop();
    setDownloading(prev => ({ ...prev, [filename]: 0 }));

    try {
      await axios.post(`http://localhost:8080/download?file_url=${encodeURIComponent(file)}&filename=${filename}`);
    } catch (e) {
      console.error(e);
    }

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`http://localhost:8080/download/status?filename=${filename}`);
        const { status, progress } = res.data;
        setDownloading(prev => ({ ...prev, [filename]: progress }));
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
            { id: 'visualize', label: 'Visualization', icon: <IconEye /> }
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
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#6b7280', 
              background: '#131317', 
              padding: '4px 10px', 
              borderRadius: '4px', 
              border: '1px solid #232328',
              fontWeight: 500
            }}>
              v1.0.0 (Apple Silicon)
            </div>
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
                  {['All', 'CMS', 'Alice'].map(exp => (
                    <button
                      key={exp}
                      onClick={() => setExperiment(exp)}
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
                    const progress = downloading[filename];
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
                                  <span style={{ color: '#9ca3af' }}>Pulling</span>
                                  <span>{progress.toFixed(0)}%</span>
                                </div>
                                <div style={{ height: '3px', background: '#232328', borderRadius: '1.5px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${progress}%`, background: '#3b82f6', borderRadius: '1.5px', transition: 'width 0.2s linear' }} />
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDownload(d); }}
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
            </div>
          )}

          {/* Downloaded Tab */}
          {activeTab === 'downloaded' && (
            <div style={{ maxWidth: '960px', margin: '0 auto' }}>
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#f3f4f6', margin: '0 0 8px 0' }}>Local Storage</h1>
                <p style={{ fontSize: '14px', margin: 0, color: '#9ca3af' }}>Manage files currently downloaded to disk.</p>
              </div>

              {downloaded.length === 0 ? (
                <div style={{ 
                  color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '64px 0',
                  border: '1px dashed #232328', borderRadius: '8px' 
                }}>
                  No local files found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {downloaded.map(f => (
                    <div key={f.filename} style={{
                      background: '#131317', border: '1px solid #232328', borderRadius: '6px',
                      padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#18181f'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#131317'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ color: '#6b7280' }}><IconFile /></div>
                        <div style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', color: '#d1d5db' }}>
                          {f.filename}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'var(--font-geist-mono), monospace' }}>
                          {formatSize(f.size)}
                        </div>
                        <button style={{ 
                          background: 'transparent', border: '1px solid #374151', color: '#d1d5db', 
                          padding: '4px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' 
                        }}>
                          Reveal in Finder
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Visualize Tab */}
          {activeTab === 'visualize' && (
            <div style={{ height: 'calc(100% - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', maxWidth: '360px' }}>
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                  <IconActivity />
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#f3f4f6', margin: '0 0 12px 0' }}>
                  Visualization Tools Unavailable
                </div>
                <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: 1.6 }}>
                  The OpenGL rendering pipeline is not configured in this build. Wait for future updates to access the particle visualizer.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
