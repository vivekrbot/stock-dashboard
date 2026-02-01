import { useState, useEffect, useRef } from 'react';

const API_BASE = '/api';

function StockCard({ symbol, onAnalyze, onRemove, onChart }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    fetchStock();
    
    // Check market status and setup auto-refresh
    checkMarketAndSetupRefresh();
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [symbol]);

  const checkMarketAndSetupRefresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/market/status`);
      if (res.ok) {
        const status = await res.json();
        setIsLive(status.isOpen);
        
        // If market is open, refresh every 30 seconds
        if (status.isOpen) {
          refreshIntervalRef.current = setInterval(() => {
            fetchStock(true); // silent refresh
          }, 30000);
        }
      }
    } catch (e) {
      console.error('Market status check failed:', e);
    }
  };

  const fetchStock = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/stock/${symbol}`, {
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const stockData = await response.json();
      
      if (stockData.error) {
        throw new Error(stockData.error);
      }
      
      setData(stockData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(`Failed to fetch ${symbol}:`, err.message);
      if (!silent) setError(err.message);
    }
    if (!silent) setLoading(false);
  };

  if (loading) {
    return (
      <div className="stock-card">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stock-card">
        <div className="stock-header">
          <div className="stock-symbol">{symbol}</div>
          <button onClick={() => onRemove(symbol)} className="remove-btn">×</button>
        </div>
        <div style={{ color: 'var(--accent-red)', padding: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
          {error}
        </div>
        <button onClick={fetchStock} className="analyze-btn">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const isPositive = data.percentChange >= 0;

  return (
    <div className="stock-card">
      <div className="stock-header">
        <div>
          <div className="stock-symbol">{symbol}</div>
          <div className="stock-exchange">
            NSE
            {isLive && (
              <span className="live-badge is-live" style={{ marginLeft: '8px' }}>
                <span className="live-dot"></span>
                Live
              </span>
            )}
          </div>
        </div>
        <button onClick={() => onRemove(symbol)} className="remove-btn">×</button>
      </div>

      <div className="stock-price">₹{data.price?.toFixed(2) || 'N/A'}</div>
      
      <div className={`stock-change ${isPositive ? 'positive' : 'negative'}`}>
        <span>{isPositive ? '▲' : '▼'}</span>
        <span>{Math.abs(data.change)?.toFixed(2)} ({Math.abs(data.percentChange)?.toFixed(2)}%)</span>
      </div>

      <div className="stock-details">
        <div>High <span>₹{data.high?.toFixed(2)}</span></div>
        <div>Low <span>₹{data.low?.toFixed(2)}</span></div>
        <div>Open <span>₹{data.open?.toFixed(2)}</span></div>
        <div>Prev <span>₹{data.previousClose?.toFixed(2)}</span></div>
      </div>

      <div className="card-actions">
        <button 
          onClick={() => onChart && onChart(symbol)} 
          className="btn-secondary"
        >
          📈 Chart
        </button>
        <button 
          onClick={() => onAnalyze(symbol)} 
          className="btn-primary"
        >
          Analyze
        </button>
      </div>

      {lastRefresh && (
        <div style={{ 
          fontSize: '0.7rem', 
          color: 'var(--text-muted)', 
          textAlign: 'center',
          marginTop: '12px'
        }}>
          Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

export default StockCard;
