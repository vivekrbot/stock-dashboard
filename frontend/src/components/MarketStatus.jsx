import { useState, useEffect } from 'react';

const API_BASE = '/api';

function MarketStatus() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/market/status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        setError('Unable to fetch market status');
      }
    };

    fetchStatus();
    // Refresh every minute
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (error || !status) return null;

  const getStatusColor = () => {
    switch (status.status) {
      case 'OPEN': return '#22c55e';
      case 'PRE_MARKET': return '#eab308';
      case 'HOLIDAY': return '#f97316';
      default: return '#ef4444';
    }
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'OPEN': return '🟢';
      case 'PRE_MARKET': return '🟡';
      case 'HOLIDAY': return '🏖️';
      default: return '🔴';
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', { 
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kolkata'
    });
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px',
      border: `1px solid ${getStatusColor()}33`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.5rem' }}>{getStatusIcon()}</span>
        <div>
          <div style={{ 
            fontWeight: 'bold', 
            color: getStatusColor(),
            fontSize: '1.1rem'
          }}>
            NSE/BSE {status.status === 'OPEN' ? 'LIVE' : status.status.replace('_', '-')}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            {status.message}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        {status.isOpen ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Closes at</div>
            <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>{formatTime(status.nextEvent)}</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Opens</div>
            <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>
              {formatDate(status.nextEvent)} {formatTime(status.nextEvent)}
            </div>
          </div>
        )}

        <div style={{ 
          background: status.isOpen ? '#22c55e22' : '#ef444422',
          padding: '8px 16px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: getStatusColor(),
            animation: status.isOpen ? 'pulse 2s infinite' : 'none'
          }} />
          <span style={{ 
            color: getStatusColor(), 
            fontWeight: 'bold',
            fontSize: '0.85rem'
          }}>
            {status.isOpen ? 'LIVE DATA' : 'LAST CLOSE'}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default MarketStatus;
