import { useState, useEffect } from 'react';

const API_BASE = '/api';
const CARDS_PER_PAGE = 10;

function TradingOpportunities({ watchlist = [], onAddToWatchlist }) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanType, setScanType] = useState('all'); // all, bullish, bearish, watchlist
  const [lastScan, setLastScan] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [scanStats, setScanStats] = useState(null);
  const [visibleCount, setVisibleCount] = useState(CARDS_PER_PAGE);

  const scanForOpportunities = async (type = scanType) => {
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = `${API_BASE}/ai/opportunities`;
      let options = { method: 'GET' };

      if (type === 'bullish') {
        endpoint = `${API_BASE}/ai/opportunities/bullish?limit=15`;
      } else if (type === 'bearish') {
        endpoint = `${API_BASE}/ai/opportunities/bearish?limit=15`;
      } else if (type === 'watchlist' && watchlist.length > 0) {
        endpoint = `${API_BASE}/ai/analyze-watchlist`;
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: watchlist })
        };
      }

      const response = await fetch(endpoint, options);
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      
      const data = await response.json();
      setOpportunities(data.opportunities || []);
      setScanStats({
        scanned: data.scannedCount,
        found: data.opportunitiesFound,
        total: data.totalFound || data.opportunitiesFound,
        timestamp: data.timestamp
      });
      setLastScan(new Date());
      setVisibleCount(CARDS_PER_PAGE); // Reset pagination on new scan
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Auto-scan on mount
    scanForOpportunities();
  }, []);

  const getConfidenceColor = (confidence) => {
    if (confidence >= 75) return 'var(--accent-green)';
    if (confidence >= 60) return 'var(--accent-orange)';
    return 'var(--text-muted)';
  };

  const getTypeIcon = (type) => {
    return type === 'bullish' ? '📈' : '📉';
  };

  const getActionColor = (action) => {
    return action === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)';
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      marginBottom: '24px',
      border: '1px solid var(--border-light)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.3rem', 
            fontWeight: '700',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            🎯 AI Trading Opportunities
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Pattern-based predictions with entry, target & stop-loss
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Scan Type Selector */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-full)',
            padding: '4px'
          }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'bullish', label: '📈 Buy' },
              { id: 'bearish', label: '📉 Sell' },
              ...(watchlist.length > 0 ? [{ id: 'watchlist', label: '⭐ Watchlist' }] : [])
            ].map(type => (
              <button
                key={type.id}
                onClick={() => {
                  setScanType(type.id);
                  scanForOpportunities(type.id);
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  background: scanType === type.id ? 'var(--bg-card)' : 'transparent',
                  color: scanType === type.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: scanType === type.id ? '600' : '500',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  boxShadow: scanType === type.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Scan Button */}
          <button
            onClick={() => scanForOpportunities()}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? 'var(--bg-secondary)' : 'var(--accent-primary)',
              color: loading ? 'var(--text-muted)' : 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem'
            }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                Scanning...
              </>
            ) : (
              <>🔍 Scan Now</>
            )}
          </button>
        </div>
      </div>

      {/* Scan Stats */}
      {scanStats && (
        <div style={{
          display: 'flex',
          gap: '24px',
          padding: '12px 16px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '20px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          <span>📊 Scanned: <strong style={{ color: 'var(--text-primary)' }}>{scanStats.scanned}</strong> stocks</span>
          <span>🎯 {scanStats.total > scanStats.found 
            ? <>Showing: <strong style={{ color: 'var(--accent-green)' }}>{scanStats.found}</strong> of <strong>{scanStats.total}</strong> opportunities</>
            : <>Found: <strong style={{ color: 'var(--accent-green)' }}>{scanStats.found}</strong> opportunities</>
          }</span>
          {lastScan && (
            <span style={{ marginLeft: 'auto' }}>
              Last scan: {lastScan.toLocaleTimeString('en-IN')}
            </span>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          padding: '20px',
          background: '#FEF2F2',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-red)',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          ⚠️ {error}
          <button 
            onClick={() => scanForOpportunities()}
            style={{
              marginLeft: '12px',
              padding: '6px 12px',
              background: 'var(--accent-red)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p>Analyzing patterns across stocks...</p>
          <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>This may take a minute</p>
        </div>
      )}

      {/* Opportunities Grid */}
      {!loading && opportunities.length > 0 && (
        <>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px'
        }}>
          {opportunities.slice(0, visibleCount).map((opp, idx) => (
            <div
              key={opp.symbol}
              style={{
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                border: `1px solid ${expandedCard === idx ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}
            >
              {/* Rank Badge */}
              <div style={{
                position: 'absolute',
                top: '-8px',
                left: '16px',
                background: idx < 3 ? 'var(--accent-orange)' : 'var(--text-muted)',
                color: 'white',
                padding: '2px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}>
                #{idx + 1}
              </div>

              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {opp.symbol}
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: opp.type === 'bullish' ? '#DCFCE7' : '#FEE2E2',
                      color: opp.type === 'bullish' ? 'var(--accent-green)' : 'var(--accent-red)'
                    }}>
                      {getTypeIcon(opp.type)} {opp.action}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {opp.name}
                  </div>
                </div>
                
                {/* Confidence Circle */}
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  border: `3px solid ${getConfidenceColor(opp.confidence)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <span style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: getConfidenceColor(opp.confidence)
                  }}>
                    {opp.confidence}
                  </span>
                </div>
              </div>

              {/* Current Price */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <span style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  {formatPrice(opp.currentPrice)}
                </span>
                <span style={{
                  color: opp.percentChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  fontWeight: '600'
                }}>
                  {opp.percentChange >= 0 ? '▲' : '▼'} {Math.abs(opp.percentChange).toFixed(2)}%
                </span>
              </div>

              {/* Trade Setup */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <div style={{
                  background: 'var(--bg-card)',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    ENTRY
                  </div>
                  <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {formatPrice(opp.entry)}
                  </div>
                </div>
                <div style={{
                  background: '#DCFCE7',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginBottom: '2px' }}>
                    TARGET
                  </div>
                  <div style={{ fontWeight: '700', color: 'var(--accent-green)', fontSize: '0.9rem' }}>
                    {formatPrice(opp.target)}
                  </div>
                </div>
                <div style={{
                  background: '#FEE2E2',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-red)', marginBottom: '2px' }}>
                    STOP LOSS
                  </div>
                  <div style={{ fontWeight: '700', color: 'var(--accent-red)', fontSize: '0.9rem' }}>
                    {formatPrice(opp.stopLoss)}
                  </div>
                </div>
              </div>

              {/* Risk/Reward */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Risk/Reward: <strong style={{ color: 'var(--text-primary)' }}>1:{opp.riskRewardRatio}</strong>
                </span>
                <span style={{ color: 'var(--accent-green)' }}>
                  +{opp.potentialGain} potential
                </span>
              </div>

              {/* Expanded Details */}
              {expandedCard === idx && (
                <div style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-light)'
                }}>
                  {/* Patterns */}
                  {opp.patterns && opp.patterns.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        DETECTED PATTERNS
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {opp.patterns.map((pattern, i) => (
                          <span key={i} style={{
                            padding: '4px 10px',
                            background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.8rem',
                            color: 'var(--text-primary)'
                          }}>
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Signals */}
                  {opp.signals && opp.signals.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        KEY SIGNALS
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {opp.signals.slice(0, 5).map((signal, i) => (
                          <span key={i} style={{
                            padding: '4px 10px',
                            background: signal.type === 'bullish' ? '#DCFCE7' : '#FEE2E2',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            color: signal.type === 'bullish' ? 'var(--accent-green)' : 'var(--accent-red)'
                          }}>
                            {signal.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reasoning */}
                  {opp.reasoning && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5'
                    }}>
                      💡 {opp.reasoning}
                    </div>
                  )}

                  {/* Technical Levels */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginTop: '12px',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ color: 'var(--text-muted)' }}>
                      RSI: <strong style={{ color: opp.rsi < 30 ? 'var(--accent-green)' : opp.rsi > 70 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{opp.rsi?.toFixed(1)}</strong>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Support: <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(opp.support)}</strong>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      SMA 20: <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(opp.sma20)}</strong>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Resistance: <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(opp.resistance)}</strong>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '16px'
                  }}>
                    {onAddToWatchlist && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToWatchlist(opp.symbol);
                        }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        ⭐ Add to Watchlist
                      </button>
                    )}
                    <a
                      href={`https://www.tradingview.com/chart/?symbol=NSE:${opp.symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'var(--accent-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        textAlign: 'center'
                      }}
                    >
                      📈 View Chart
                    </a>
                  </div>
                </div>
              )}

              {/* Expand Indicator */}
              <div style={{
                textAlign: 'center',
                marginTop: '8px',
                color: 'var(--text-muted)',
                fontSize: '0.75rem'
              }}>
                {expandedCard === idx ? '▲ Click to collapse' : '▼ Click for details'}
              </div>
            </div>
          ))}
        </div>
        
        {/* Load More Button */}
        {visibleCount < opportunities.length && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button
              onClick={() => setVisibleCount(prev => prev + CARDS_PER_PAGE)}
              style={{
                padding: '12px 32px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'var(--accent-primary)'}
              onMouseOut={(e) => e.target.style.background = 'var(--bg-secondary)'}
            >
              Load More ({opportunities.length - visibleCount} remaining)
            </button>
          </div>
        )}
        </>
      )}

      {/* Empty State */}
      {!loading && opportunities.length === 0 && !error && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>🔍</div>
          <p style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>No opportunities found</p>
          <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
            Try scanning again or change the filter type
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        marginTop: '20px',
        padding: '12px 16px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}>
        ⚠️ AI predictions are based on technical pattern analysis and historical data. 
        This is not financial advice. Always do your own research before trading.
      </div>
    </div>
  );
}

export default TradingOpportunities;
