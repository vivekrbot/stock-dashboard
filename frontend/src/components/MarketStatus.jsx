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
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 24px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '16px',
      border: '1px solid var(--border-light)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-sm)',
          background: status.isOpen ? '#DCFCE7' : 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem'
        }}>
          {getStatusIcon()}
        </div>
        <div>
          <div style={{ 
            fontWeight: '700', 
            color: 'var(--text-primary)',
            fontSize: '1rem',
            marginBottom: '2px'
          }}>
            NSE/BSE {status.status === 'OPEN' ? 'Live' : status.status.replace('_', ' ')}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {status.message}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        {status.isOpen ? (
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closes at</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{formatTime(status.nextEvent)}</div>
          </div>
        ) : (
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opens</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
              {formatDate(status.nextEvent)} {formatTime(status.nextEvent)}
            </div>
          </div>
        )}

        <div className={`live-badge ${status.isOpen ? 'is-live' : 'is-closed'}`}>
          {status.isOpen && <span className="live-dot"></span>}
          <span>{status.isOpen ? 'Live' : 'Closed'}</span>
        </div>
      </div>
    </div>
  );
}

export default MarketStatus;
