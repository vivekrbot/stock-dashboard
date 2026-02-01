import { useState, useEffect } from 'react';

const API_BASE = '/api';

function SplashScreen({ onReady }) {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('initializing');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let currentLogs = [];

    const addLog = (message, type = 'info') => {
      if (!isMounted) return;
      const timestamp = new Date().toLocaleTimeString();
      currentLogs = [...currentLogs, { message, type, timestamp }];
      setLogs([...currentLogs]);
    };

    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    const initializeApp = async () => {
      try {
        addLog('🚀 Initializing Stock Dashboard...', 'info');
        setProgress(10);
        await delay(400);
        if (!isMounted) return;

        addLog('📡 Connecting to backend server...', 'info');
        setProgress(30);
        
        try {
          const response = await fetch(`${API_BASE}/health`, {
            signal: AbortSignal.timeout(5000)
          });
          if (response.ok) {
            const data = await response.json();
            addLog(`✅ Backend connected: ${data.message}`, 'success');
          } else {
            addLog('⚠️ Backend returned error', 'warning');
          }
        } catch (err) {
          addLog('⚠️ Backend not available - continuing anyway', 'warning');
        }

        if (!isMounted) return;
        setProgress(60);
        await delay(300);

        addLog('🎨 Loading frontend components...', 'info');
        setProgress(80);
        await delay(300);
        if (!isMounted) return;
        addLog('✅ Frontend loaded', 'success');

        addLog('📊 Initializing services...', 'info');
        setProgress(100);
        await delay(300);
        if (!isMounted) return;
        addLog('🎉 All systems ready!', 'success');
        
        await delay(400);
        if (!isMounted) return;
        
        setStatus('ready');
        addLog('', 'welcome');
        
        await delay(1500);
        if (isMounted && onReady) {
          onReady();
        }

      } catch (error) {
        console.error('Splash error:', error);
        addLog(`❌ Error: ${error.message}`, 'error');
        await delay(2000);
        if (isMounted && onReady) {
          onReady();
        }
      }
    };

    initializeApp();
    
    return () => { isMounted = false; };
  }, [onReady]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      color: '#fff',
      padding: '20px'
    }}>
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          margin: 0,
          background: 'linear-gradient(90deg, #00d4ff, #7c3aed)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          📈 Stock Dashboard
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '10px', fontSize: '1.1rem' }}>
          Advanced NSE Stock Analysis & Screener
        </p>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '500px',
        height: '8px',
        background: '#1e293b',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '30px'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #00d4ff, #7c3aed)',
          transition: 'width 0.3s ease-out'
        }} />
      </div>

      <div style={{
        width: '100%',
        maxWidth: '600px',
        background: '#0d1117',
        borderRadius: '12px',
        padding: '20px',
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        fontSize: '0.9rem',
        border: '1px solid #30363d',
        minHeight: '200px'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '15px',
          paddingBottom: '10px',
          borderBottom: '1px solid #21262d'
        }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />
          <span style={{ marginLeft: '10px', color: '#8b949e', fontSize: '0.8rem' }}>Terminal</span>
        </div>

        {logs.map((log, idx) => (
          log.type === 'welcome' ? (
            <div key={idx} style={{
              textAlign: 'center',
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(124,58,237,0.1))',
              borderRadius: '8px',
              marginTop: '15px'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>👋</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#00d4ff' }}>
                Welcome Mr. Vivek!
              </div>
              <div style={{ color: '#94a3b8', marginTop: '8px', fontSize: '0.85rem' }}>
                Your stock dashboard is ready
              </div>
            </div>
          ) : (
            <div key={idx} style={{
              marginBottom: '8px',
              display: 'flex',
              gap: '10px',
              color: log.type === 'success' ? '#22c55e' : 
                     log.type === 'error' ? '#ef4444' : 
                     log.type === 'warning' ? '#f59e0b' : '#e6edf3'
            }}>
              <span style={{ color: '#6e7681', minWidth: '70px' }}>{log.timestamp}</span>
              <span>{log.message}</span>
            </div>
          )
        ))}
        
        {status === 'initializing' && logs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00d4ff', marginTop: '8px' }}>
            <span style={{ color: '#6e7681' }}>{new Date().toLocaleTimeString()}</span>
            <span style={{ animation: 'blink 1s infinite' }}>█</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default SplashScreen;
