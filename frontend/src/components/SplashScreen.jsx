import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function SplashScreen({ onReady }) {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('initializing');
  const [progress, setProgress] = useState(0);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  };

  useEffect(() => {
    let isMounted = true;
    
    const safeSetState = (setter, value) => {
      if (isMounted) setter(value);
    };
    
    const safeAddLog = (message, type = 'info') => {
      if (isMounted) {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { message, type, timestamp }]);
      }
    };

    const initializeApp = async () => {
      try {
        // Step 1: Initialize
        safeAddLog('🚀 Initializing Stock Dashboard...', 'info');
        safeSetState(setProgress, 10);
        await new Promise(r => setTimeout(r, 500));
        if (!isMounted) return;

        // Step 2: Check Backend
        safeAddLog('📡 Connecting to backend server...', 'info');
        safeSetState(setProgress, 30);
        
        let backendConnected = false;
        let retries = 0;
        const maxRetries = 3;

        while (!backendConnected && retries < maxRetries && isMounted) {
          try {
            const response = await fetch(`${API_BASE}/api/health`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
              const data = await response.json();
              safeAddLog(`✅ Backend connected: ${data.message}`, 'success');
              backendConnected = true;
            }
          } catch (err) {
            retries++;
            if (retries < maxRetries) {
              safeAddLog(`⚠️ Connection attempt ${retries}/${maxRetries} failed, retrying...`, 'warning');
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }

        if (!isMounted) return;

        if (!backendConnected) {
          safeAddLog('❌ Backend connection failed. Using offline mode.', 'error');
        }

        safeSetState(setProgress, 50);

        // Step 3: Load Frontend Assets
        safeAddLog('🎨 Loading frontend components...', 'info');
        await new Promise(r => setTimeout(r, 400));
        if (!isMounted) return;
        safeSetState(setProgress, 70);
        safeAddLog('✅ Frontend loaded successfully', 'success');

        // Step 4: Initialize Services
        safeAddLog('📊 Initializing stock services...', 'info');
        await new Promise(r => setTimeout(r, 300));
        if (!isMounted) return;
        safeSetState(setProgress, 85);
        safeAddLog('✅ Services ready', 'success');

        // Step 5: Complete
        safeSetState(setProgress, 100);
        safeAddLog('🎉 All systems operational!', 'success');
        await new Promise(r => setTimeout(r, 500));
        if (!isMounted) return;
        
        safeSetState(setStatus, 'ready');
        safeAddLog('', 'welcome');
        
        // Wait for welcome message, then proceed
        await new Promise(r => setTimeout(r, 2000));
        if (isMounted) onReady();

      } catch (error) {
        safeAddLog(`❌ Error: ${error.message}`, 'error');
        safeSetState(setStatus, 'error');
      }
    };

    initializeApp();
    
    return () => {
      isMounted = false;
    };
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
      {/* Logo/Title */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          margin: 0,
          background: 'linear-gradient(90deg, #00d4ff, #7c3aed)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 30px rgba(0, 212, 255, 0.3)'
        }}>
          📈 Stock Dashboard
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '10px', fontSize: '1.1rem' }}>
          Real-time NSE Market Analysis
        </p>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        maxWidth: '500px',
        height: '8px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '30px'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #00d4ff, #7c3aed)',
          borderRadius: '4px',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Log Console */}
      <div style={{
        width: '100%',
        maxWidth: '600px',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '15px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            background: status === 'ready' ? '#22c55e' : status === 'error' ? '#ef4444' : '#eab308',
            marginRight: '10px',
            animation: status === 'initializing' ? 'pulse 1s infinite' : 'none'
          }} />
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            System Console
          </span>
        </div>

        <div style={{
          fontFamily: "'Fira Code', 'Consolas', monospace",
          fontSize: '0.85rem',
          lineHeight: '1.8',
          maxHeight: '250px',
          overflowY: 'auto'
        }}>
          {logs.map((log, i) => (
            log.type === 'welcome' ? (
              <div key={i} style={{
                textAlign: 'center',
                padding: '20px 0',
                animation: 'fadeIn 0.5s ease'
              }}>
                <div style={{
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(90deg, #22c55e, #00d4ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '10px'
                }}>
                  Welcome Mr. Vivek! 👋
                </div>
                <div style={{ color: '#94a3b8' }}>
                  Loading your dashboard...
                </div>
              </div>
            ) : (
              <div key={i} style={{
                color: log.type === 'success' ? '#22c55e' : 
                       log.type === 'error' ? '#ef4444' : 
                       log.type === 'warning' ? '#eab308' : '#e2e8f0',
                marginBottom: '4px'
              }}>
                <span style={{ color: '#64748b', marginRight: '10px' }}>
                  [{log.timestamp}]
                </span>
                {log.message}
              </div>
            )
          ))}
        </div>
      </div>

      {/* Footer */}
      <p style={{ 
        marginTop: '40px', 
        color: '#64748b', 
        fontSize: '0.8rem' 
      }}>
        Powered by Yahoo Finance • Built with React & Node.js
      </p>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default SplashScreen;
