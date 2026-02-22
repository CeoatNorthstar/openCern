"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

const ParticleVisualization = () => {
  const mountRef = useRef(null);
  const wsRef = useRef(null);
  const sceneRef = useRef(null);
  const particlesGroupRef = useRef(null);
  
  const [stats, setStats] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;
    
    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(45, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 100000);
    camera.position.set(0, 50, 100);
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    
    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Detector Cylinder (CMS style wireframe)
    const geometry = new THREE.CylinderGeometry(20, 20, 40, 32, 1, true);
    const material = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.15 });
    const cylinder = new THREE.Mesh(geometry, material);
    scene.add(cylinder);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(100, 20, 0x232328, 0x131317);
    scene.add(gridHelper);
    
    const particlesGroup = new THREE.Group();
    scene.add(particlesGroup);
    particlesGroupRef.current = particlesGroup;

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      
      // Fade in particles
      if (particlesGroupRef.current) {
        particlesGroupRef.current.children.forEach(child => {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => { if (m.opacity < 1) m.opacity += 0.05; });
          } else if (child.material && child.material.opacity < 1) {
            child.material.opacity += 0.05;
          }
        });
      }
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, []);

  useEffect(() => {
    let ws = new WebSocket('ws://127.0.0.1:9001');
    wsRef.current = ws;
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        renderEvent(data);
      } catch(e) { console.error(e); }
    };
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  useEffect(() => {
    // Send play/pause depending on isPlaying state
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(isPlaying ? 'play' : 'pause');
    }
  }, [isPlaying]);

  const renderEvent = (data) => {
    setStats({
      index: data.index,
      ht: data.ht,
      met: data.met,
      counts: data.particles.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1;
        return acc;
      }, {})
    });

    const group = particlesGroupRef.current;
    if (!group) return;

    // Clear old
    while(group.children.length > 0){ 
      const child = group.children[0];
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) {
         child.material.forEach(m => m.dispose());
      } else if (child.material) {
         child.material.dispose();
      }
    }

    // Add new particles
    data.particles.forEach(p => {
      // px, py, pz are momentum vectors, scale them for visual length
      const vec = new THREE.Vector3(p.px, p.py, p.pz).multiplyScalar(2.0);
      const length = vec.length();
      const dir = vec.clone().normalize();
      
      let colorNum = parseInt(p.color.replace('#', '0x'), 16);
      
      if (p.type === 'jet') {
        const coneGeom = new THREE.ConeGeometry(0.5, Math.min(length, 40), 8);
        coneGeom.translate(0, Math.min(length, 40)/2, 0);
        coneGeom.rotateX(Math.PI / 2);
        
        const coneMat = new THREE.MeshBasicMaterial({ color: colorNum, transparent: true, opacity: 0 });
        const mesh = new THREE.Mesh(coneGeom, coneMat);
        
        // Orient the cone along the momentum vector
        const target = vec.clone().add(new THREE.Vector3(0,0,0));
        mesh.lookAt(target);
        group.add(mesh);
      } else {
        const points = [new THREE.Vector3(0,0,0), vec];
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ color: colorNum, transparent: true, opacity: 0, linewidth: 2 });
        const line = new THREE.Line(lineGeom, lineMat);
        group.add(line);
      }
    });
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#080b14', borderRadius: '8px', overflow: 'hidden', border: '1px solid #1f2937' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Stats Overlay */}
      <div style={{ position: 'absolute', top: '24px', left: '24px', background: 'rgba(19, 19, 23, 0.8)', backdropFilter: 'blur(8px)', border: '1px solid #232328', borderRadius: '8px', padding: '16px', minWidth: '240px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6', margin: '0 0 12px 0', fontFamily: 'var(--font-geist-mono), monospace' }}>
          EVENT {stats ? stats.index : '---'} <span style={{ color: '#6b7280', fontSize: '11px' }}>/ 5000</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '12px' }}>
          <div>
            <div style={{ color: '#9ca3af', marginBottom: '2px' }}>HT</div>
            <div style={{ color: '#d1d5db', fontFamily: 'var(--font-geist-mono), monospace' }}>{stats ? stats.ht.toFixed(1) : '---'}</div>
          </div>
          <div>
            <div style={{ color: '#9ca3af', marginBottom: '2px' }}>MET</div>
            <div style={{ color: '#d1d5db', fontFamily: 'var(--font-geist-mono), monospace' }}>{stats ? stats.met.toFixed(1) : '---'}</div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #232328', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
          {stats ? Object.entries(stats.counts).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af', textTransform: 'capitalize' }}>{type}s</span>
              <span style={{ color: '#d1d5db', fontFamily: 'var(--font-geist-mono), monospace' }}>{count}</span>
            </div>
          )) : <div style={{ color: '#6b7280' }}>Waiting for data stream...</div>}
        </div>
      </div>

      {/* Controls Overlay */}
      <button onClick={togglePlay} style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '999px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s', zIndex: 10 }}>
        {isPlaying ? <IconPause /> : <IconPlay />}
      </button>
    </div>
  );
};

export default function App() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [downloaded, setDownloaded] = useState([]);
  const [downloading, setDownloading] = useState({});
  const [processing, setProcessing] = useState({});
  const [activeTab, setActiveTab] = useState('browse');
  const [experiment, setExperiment] = useState('All');
  const [showDownloads, setShowDownloads] = useState(false);
  
  // Inspector states
  const [expandedFiles, setExpandedFiles] = useState({});
  const [inspectingFile, setInspectingFile] = useState(null);
  const [inspectorData, setInspectorData] = useState(null);
  const [inspectorPage, setInspectorPage] = useState(1);
  const [loadingInspector, setLoadingInspector] = useState(false);

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
      await axios.post(`http://localhost:8080/process?filename=${filename}`);
      
      const interval = setInterval(async () => {
        try {
          const res = await axios.get(`http://localhost:8080/process/status?filename=${filename}`);
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

  const handleDownload = async (dataset, e) => {
    if (e) triggerDownloadAnimation(e);
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
            { id: 'visualize', label: 'Visualization', icon: <IconEye /> },
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
              v0.1.1 (Apple Silicon)
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
                                disabled={pStatus === 'processing' || pStatus === 'processed'}
                                style={{ 
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                  background: pStatus === 'processed' ? '#059669' : 
                                              pStatus === 'error' ? '#dc2626' : 
                                              pStatus === 'processing' ? '#3b82f6' : 'transparent',
                                  border: `1px solid ${pStatus === 'idle' ? '#374151' : 'transparent'}`,
                                  color: pStatus === 'idle' ? '#d1d5db' : '#ffffff', 
                                  padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                  cursor: (pStatus === 'processing' || pStatus === 'processed') ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.15s ease',
                                  opacity: pStatus === 'processing' ? 0.8 : 1
                                }}
                              >
                                {pStatus === 'processing' ? (
                                  <>
                                    <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                       <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                                       <path d="M12 2a10 10 0 0 1 10 10" stroke="#ffffff"></path>
                                    </svg>
                                    PROCESSING
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
                                    <IconCpu /> PROCESS
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
                          onClick={() => openInspector(f.filename, 1)}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#1e1e24'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#18181f'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ color: '#3b82f6' }}><IconDatabase /></div>
                              <div style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', color: '#d1d5db' }}>
                                {f.filename.replace('.root', '.json')}
                              </div>
                            </div>
                            <div style={{ fontSize: '10px', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.5px' }}>
                              PROCESSED DATA
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
                        <pre style={{ 
                          background: '#131317', border: '1px solid #232328', borderRadius: '6px', padding: '16px', 
                          overflowX: 'auto', fontSize: '10.5px', color: '#a7c080', fontFamily: 'var(--font-geist-mono), monospace',
                          margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: '1.5'
                        }}>
                          {JSON.stringify(inspectorData.events, null, 2)}
                        </pre>
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

          {/* Visualize Tab */}
          {activeTab === 'visualize' && (
            <div style={{ height: 'calc(100% - 60px)' }}>
              <ParticleVisualization />
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div style={{ maxWidth: '640px', margin: '40px auto 0 auto', background: '#131317', padding: '48px', borderRadius: '12px', border: '1px solid #232328', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: '#f3f4f6', marginBottom: '24px' }}>
                <Logo />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#f3f4f6', margin: '0 0 16px 0' }}>OpenCERN Local Explorer</h1>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', display: 'inline-block', padding: '4px 12px', borderRadius: '999px', marginBottom: '32px' }}>
                Version 0.1.1
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
    </div>
  );
}
