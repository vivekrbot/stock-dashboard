import { useState, useEffect } from 'react';
import Icon from './Icon';

const API_BASE = '/api';

/**
 * Compact Swing Analysis Badge
 * Shows quick predictive swing signal for a stock
 * Can be embedded in other components like StockCard
 */
function SwingIndicator({ symbol, compact = true, showDetails = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQuickAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/swing/quick/${symbol}`);
      if (!response.ok) throw new Error('Analysis failed');
      
      const result = await response.json();
      if (result.signalScore > 0) {
        setData(result);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (symbol) {
      fetchQuickAnalysis();
    }
  }, [symbol]);

  if (loading) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        fontSize: '0.7rem',
        color: 'var(--text-muted)'
      }}>
        <div className="spinner" style={{ width: '12px', height: '12px' }}></div>
        <span>Analyzing...</span>
      </div>
    );
  }

  if (error || !data) {
    return null; // Don't show anything if no signal
  }

  const getSignalColor = (signal, score) => {
    if (signal === 'BUY') {
      return score >= 70 ? '#22C55E' : '#4ADE80';
    }
    return score >= 70 ? '#EF4444' : '#FB7185';
  };

  const getSignalBg = (signal, score) => {
    if (signal === 'BUY') {
      return score >= 70 ? '#DCFCE7' : '#D1FAE5';
    }
    return score >= 70 ? '#FEE2E2' : '#FECACA';
  };

  if (compact) {
    return (
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 10px',
          background: getSignalBg(data.signal, data.score),
          borderRadius: '12px',
          fontSize: '0.7rem',
          fontWeight: '600',
          color: getSignalColor(data.signal, data.score),
          cursor: 'pointer'
        }}
        title={`Swing: ${data.signal} | Score: ${data.score} | R:R ${data.rr}:1 | Prediction: ${data.prediction > 0 ? '+' : ''}${data.prediction?.toFixed(1)}%`}
      >
        <Icon 
          name={data.signal === 'BUY' ? 'trending_up' : 'trending_down'} 
          size={12} 
        />
        <span>{data.signal}</span>
        <span style={{ 
          background: getSignalColor(data.signal, data.score), 
          color: 'white',
          padding: '1px 6px',
          borderRadius: '8px',
          fontSize: '0.65rem'
        }}>
          {data.score}
        </span>
      </div>
    );
  }

  // Full details view
  return (
    <div style={{
      padding: '12px',
      background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid #DDD6FE',
      marginTop: '12px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ 
            fontSize: '0.7rem', 
            color: '#7C3AED',
            fontWeight: '600'
          }}>
            🔮 SWING SIGNAL
          </span>
          <span style={{
            padding: '3px 10px',
            background: getSignalBg(data.signal, data.score),
            color: getSignalColor(data.signal, data.score),
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '700'
          }}>
            {data.signal} ({data.score})
          </span>
        </div>
        <span style={{
          padding: '3px 8px',
          background: '#8B5CF6',
          color: 'white',
          borderRadius: '8px',
          fontSize: '0.65rem',
          fontWeight: '600'
        }}>
          {data.strength}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        fontSize: '0.75rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Entry</div>
          <div style={{ fontWeight: '600' }}>₹{data.entry?.toFixed(0)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#16A34A', fontSize: '0.65rem' }}>Target</div>
          <div style={{ fontWeight: '600', color: '#16A34A' }}>₹{data.target?.toFixed(0)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#DC2626', fontSize: '0.65rem' }}>Stop</div>
          <div style={{ fontWeight: '600', color: '#DC2626' }}>₹{data.stopLoss?.toFixed(0)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>R:R</div>
          <div style={{ fontWeight: '600' }}>{data.rr}:1</div>
        </div>
      </div>

      {data.prediction && (
        <div style={{
          marginTop: '8px',
          padding: '6px 10px',
          background: data.prediction >= 0 ? '#DCFCE7' : '#FEE2E2',
          borderRadius: '6px',
          fontSize: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Prediction (10 bars):</span>
          <span style={{ 
            fontWeight: '700',
            color: data.prediction >= 0 ? '#16A34A' : '#DC2626'
          }}>
            {data.prediction >= 0 ? '+' : ''}{data.prediction?.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default SwingIndicator;
