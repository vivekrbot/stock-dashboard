import { useState, useEffect } from 'react';

const API_BASE = '/api';

function AnalysisModal({ symbol, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalysis();
  }, [symbol]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/stock/${symbol}/analyze`, {
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setAnalysis(data);
    } catch (err) {
      console.error(`Analysis failed for ${symbol}:`, err.message);
      setError(err.message);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{symbol} Analysis</h2>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
          <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>
            ❌ Failed to load analysis: {error}
          </div>
          <button onClick={fetchAnalysis} className="analyze-btn" style={{ margin: '0 20px 20px' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const getScoreClass = (score) => {
    if (score >= 70) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
  };

  const getSignalClass = (action) => {
    if (action === 'BUY') return 'signal-buy';
    if (action === 'SELL') return 'signal-sell';
    return 'signal-hold';
  };

  const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=NSE:${symbol}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{symbol} Analysis</h2>
            <div className="modal-timestamp">
              {new Date(analysis.timestamp).toLocaleString()}
            </div>
          </div>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-content">
          <div className="score-box">
            <div className="score-label">Confidence Score</div>
            <div className={`score-number ${getScoreClass(analysis.confidenceScore)}`}>
              {analysis.confidenceScore}
            </div>
            <div className="score-rating">{analysis.rating}</div>
          </div>

          <div className={`signal-box ${getSignalClass(analysis.signal.action)}`}>
            <div className="signal-header">
              <div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Signal</div>
                <div className="signal-action">
                  {analysis.signal.strength} {analysis.signal.action}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Risk Level</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {analysis.signal.riskLevel}
                </div>
              </div>
            </div>
            <div className="signal-details">
              <div><strong>Entry:</strong> {analysis.signal.entryZone}</div>
              <div><strong>Target:</strong> {analysis.signal.targetGain}</div>
              <div><strong>Reasoning:</strong> {analysis.signal.reasoning}</div>
            </div>
          </div>

          <div className="recommendation-box">
            <div className="label">💡 Recommendation</div>
            <div>{analysis.recommendation}</div>
          </div>

          <div className="chart-wrapper">
            <div className="chart-title-row">
              <h3>📈 View Live Chart</h3>
            </div>
            <a 
              href={tradingViewUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'block',
                background: '#2563eb',
                color: 'white',
                padding: '15px',
                borderRadius: '6px',
                textAlign: 'center',
                textDecoration: 'none',
                fontWeight: '600',
                marginBottom: '10px'
              }}
            >
              Open {symbol} on TradingView →
            </a>
          </div>

          <div className="analysis-section">
            <h3>
              Technical Analysis
              <span className={`section-score ${getScoreClass(analysis.technical.score)}`}>
                {analysis.technical.score}/100
              </span>
            </h3>

            <div className="indicators-grid">
              <div className="indicator-item">
                <div className="indicator-label">RSI</div>
                <div className="indicator-value">{analysis.technical.indicators.rsi}</div>
              </div>
              <div className="indicator-item">
                <div className="indicator-label">Momentum</div>
                <div className="indicator-value">{analysis.technical.indicators.momentum}</div>
              </div>
              <div className="indicator-item">
                <div className="indicator-label">SMA 20</div>
                <div className="indicator-value">₹{analysis.technical.indicators.sma20}</div>
              </div>
              <div className="indicator-item">
                <div className="indicator-label">SMA 50</div>
                <div className="indicator-value">₹{analysis.technical.indicators.sma50}</div>
              </div>
            </div>

            {analysis.technical.signals.map((signal, idx) => (
              <div key={idx} className="signal-item">
                <span className="signal-name">{signal.indicator}</span>
                <span className="signal-value">{signal.signal}</span>
                <span className={`signal-impact ${signal.impact.startsWith('+') ? 'positive' : 'negative'}`}>
                  {signal.impact}
                </span>
              </div>
            ))}
          </div>

          <div className="analysis-section">
            <h3>
              Fundamental Analysis
              <span className={`section-score ${getScoreClass(analysis.fundamental.score)}`}>
                {analysis.fundamental.score}/100
              </span>
            </h3>

            <div className="indicators-grid">
              <div className="indicator-item">
                <div className="indicator-label">P/E Ratio</div>
                <div className="indicator-value">{analysis.fundamental.metrics.peRatio}</div>
              </div>
              <div className="indicator-item">
                <div className="indicator-label">P/B Ratio</div>
                <div className="indicator-value">{analysis.fundamental.metrics.priceToBook}</div>
              </div>
              <div className="indicator-item">
                <div className="indicator-label">Sector</div>
                <div className="indicator-value" style={{ fontSize: '0.9rem' }}>
                  {analysis.fundamental.metrics.sector}
                </div>
              </div>
              <div className="indicator-item">
                <div className="indicator-label">Market Cap</div>
                <div className="indicator-value" style={{ fontSize: '0.9rem' }}>
                  {analysis.fundamental.metrics.marketCap !== 'N/A' 
                    ? `₹${(analysis.fundamental.metrics.marketCap / 10000000).toFixed(0)}Cr`
                    : 'N/A'}
                </div>
              </div>
            </div>

            {analysis.fundamental.signals.map((signal, idx) => (
              <div key={idx} className="signal-item">
                <span className="signal-name">{signal.metric}</span>
                <span className="signal-value">{signal.signal}</span>
                <span className={`signal-impact ${signal.impact.startsWith('+') ? 'positive' : 'negative'}`}>
                  {signal.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalysisModal;
