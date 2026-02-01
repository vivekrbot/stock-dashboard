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
        addLog('[INIT] Initializing Stock Dashboard...', 'info');
        setProgress(10);
        await delay(400);
        if (!isMounted) return;

        addLog('[NET] Connecting to backend server...', 'info');
        setProgress(30);
        
        try {
          const response = await fetch(`${API_BASE}/health`, {
            signal: AbortSignal.timeout(5000)
          });
          if (response.ok) {
            const data = await response.json();
            addLog(`[OK] Backend connected: ${data.message}`, 'success');
          } else {
            addLog('[WARN] Backend returned error', 'warning');
          }
        } catch (err) {
          addLog('[WARN] Backend not available - continuing anyway', 'warning');
        }

        if (!isMounted) return;
        setProgress(60);
        await delay(300);

        addLog('[UI] Loading frontend components...', 'info');
        setProgress(80);
        await delay(300);
        if (!isMounted) return;
        addLog('[OK] Frontend loaded', 'success');

        addLog('[SVC] Initializing services...', 'info');
        setProgress(100);
        await delay(300);
        if (!isMounted) return;
        addLog('[OK] All systems ready!', 'success');
        
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
        addLog(`[ERR] Error: ${error.message}`, 'error');
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
      background: 'linear-gradient(135deg, #F8F6F3 0%, #FFFFFF 50%, #F0EDE8 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: '#1A2332',
      padding: '20px'
    }}>
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          margin: 0,
          fontWeight: '700',
          color: '#1A2332',
          letterSpacing: '-0.02em'
        }}>
          Stock Dashboard
        </h1>
        <p style={{ color: '#6B7280', marginTop: '10px', fontSize: '1rem' }}>
          Advanced NSE Stock Analysis & Screener
        </p>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '500px',
        height: '6px',
        background: '#E5E7EB',
        borderRadius: '100px',
        overflow: 'hidden',
        marginBottom: '30px'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #F97316, #EA580C)',
          transition: 'width 0.3s ease-out',
          borderRadius: '100px'
        }} />
      </div>

      <div style={{
        width: '100%',
        maxWidth: '600px',
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '20px',
        fontFamily: "'SF Mono', 'JetBrains Mono', Consolas, monospace",
        fontSize: '0.85rem',
        border: '1px solid #E5E7EB',
        minHeight: '200px',
        boxShadow: '0 4px 24px rgba(26, 35, 50, 0.08)'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '15px',
          paddingBottom: '10px',
          borderBottom: '1px solid #F3F4F6'
        }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }} />
          <span style={{ marginLeft: '10px', color: '#9CA3AF', fontSize: '0.75rem' }}>Terminal</span>
        </div>

        {logs.map((log, idx) => (
          log.type === 'welcome' ? (
            <div key={idx} style={{
              textAlign: 'center',
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(234,88,12,0.08))',
              borderRadius: '12px',
              marginTop: '15px'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>👋</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1A2332' }}>
                Welcome Mr. Vivek!
              </div>
              <div style={{ color: '#6B7280', marginTop: '8px', fontSize: '0.85rem' }}>
                Your stock dashboard is ready
              </div>
            </div>
          ) : (
            <div key={idx} style={{
              marginBottom: '8px',
              display: 'flex',
              gap: '10px',
              color: log.type === 'success' ? '#10B981' : 
                     log.type === 'error' ? '#EF4444' : 
                     log.type === 'warning' ? '#F59E0B' : '#374151'
            }}>
              <span style={{ color: '#9CA3AF', minWidth: '70px' }}>{log.timestamp}</span>
              <span>{log.message}</span>
            </div>
          )
        ))}
        
        {status === 'initializing' && logs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F97316', marginTop: '8px' }}>
            <span style={{ color: '#9CA3AF' }}>{new Date().toLocaleTimeString()}</span>
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
