import { useState, useEffect } from 'react';
import { useToast } from './Toast';

const API_BASE = '/api';
const CARDS_PER_PAGE = 10;

/**
 * Premium Signals Component
 * Shows only high-quality, verified trading signals
 */
function PremiumSignals({ onAddToWatchlist }) {
  const toast = useToast();
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [visibleCount, setVisibleCount] = useState(CARDS_PER_PAGE);

  const fetchPremiumSignals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/ai/premium-signals`);
      if (!response.ok) throw new Error('Failed to fetch premium signals');
      
      const data = await response.json();
      setSignals(data.signals || []);
      setSummary(data.summary);
      setVisibleCount(CARDS_PER_PAGE);
      
      if (data.signals?.length > 0) {
        toast.success(`Found ${data.signals.length} premium signals`, 'Scan Complete');
      } else {
        toast.info('No premium signals found at this time');
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message, 'Fetch Failed');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPremiumSignals();
  }, []);

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return '#22C55E';
    if (confidence >= 70) return '#86EFAC';
    if (confidence >= 60) return '#F97316';
    return '#9CA3AF';
  };

  const getQualityBadge = (score) => {
    if (score >= 80) return { label: 'A+', color: '#22C55E' };
    if (score >= 70) return { label: 'A', color: '#86EFAC' };
    if (score >= 60) return { label: 'B', color: '#F97316' };
    return { label: 'C', color: '#9CA3AF' };
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      border: '1px solid var(--border-light)',
      marginBottom: '24px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ 
            fontSize: '1.3rem', 
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⭐ Premium AI Signals
            <span style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: 'white',
              borderRadius: 'var(--radius-full)',
              fontWeight: '600'
            }}>
              HIGH ACCURACY
            </span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Only 70%+ confidence trades with verified indicator alignment
          </p>
        </div>

        <button
          onClick={fetchPremiumSignals}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: loading ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
            color: loading ? 'var(--text-muted)' : 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '700',
            fontSize: '0.9rem'
          }}
        >
          {loading ? '🔄 Scanning...' : '🎯 Scan for Signals'}
        </button>
      </div>

      {/* Summary Stats */}
      {summary && !loading && (
        <div style={{
          display: 'flex',
          gap: '24px',
          padding: '16px 20px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {summary.totalSignals}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quality Signals</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>
              {summary.bullishSignals}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bullish</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-red)' }}>
              {summary.bearishSignals}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bearish</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-orange)' }}>
              {summary.averageConfidence}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Confidence</div>
          </div>
          {summary.topPick && (
            <div style={{ 
              marginLeft: 'auto',
              padding: '8px 16px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              border: '2px solid var(--accent-orange)'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOP PICK</div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                {summary.topPick.symbol} ({summary.topPick.confidence}%)
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Analyzing 25 stocks with advanced indicators...</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Using MACD, RSI, Bollinger, Stochastic, ADX, VWAP & patterns
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          padding: '20px',
          background: '#FEF2F2',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-red)',
          textAlign: 'center'
        }}>
          ⚠️ {error}
          <button onClick={fetchPremiumSignals} style={{ marginLeft: '12px' }}>Retry</button>
        </div>
      )}

      {/* Signals Grid */}
      {!loading && signals.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '16px'
          }}>
            {signals.slice(0, visibleCount).map((signal, idx) => {
              const quality = getQualityBadge(signal.qualityScore);
              
              return (
                <div
                  key={signal.symbol}
                  style={{
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    border: `2px solid ${expandedCard === idx ? 'var(--accent-orange)' : 'var(--border-light)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}
                >
                  {/* Quality Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '16px',
                    background: quality.color,
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    fontWeight: '700'
                  }}>
                    Quality: {quality.label}
                  </div>

                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>{signal.symbol}</span>
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: signal.action === 'BUY' ? '#DCFCE7' : '#FEE2E2',
                          color: signal.action === 'BUY' ? '#16A34A' : '#DC2626'
                        }}>
                          {signal.action === 'BUY' ? '📈' : '📉'} {signal.action}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {signal.name}
                      </div>
                    </div>

                    {/* Confidence Circle */}
                    <div style={{
                      width: '55px',
                      height: '55px',
                      borderRadius: '50%',
                      border: `4px solid ${getConfidenceColor(signal.confidence)}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ 
                        fontWeight: '700', 
                        fontSize: '1rem',
                        color: getConfidenceColor(signal.confidence)
                      }}>
                        {signal.confidence}%
                      </span>
                    </div>
                  </div>

                  {/* Price & Trade Setup */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      padding: '10px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ENTRY</div>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        ₹{signal.entry?.toFixed(2)}
                      </div>
                    </div>
                    <div style={{
                      padding: '10px',
                      background: '#DCFCE7',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.7rem', color: '#16A34A' }}>TARGET</div>
                      <div style={{ fontWeight: '700', color: '#16A34A' }}>
                        ₹{signal.target?.toFixed(2)}
                      </div>
                    </div>
                    <div style={{
                      padding: '10px',
                      background: '#FEE2E2',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.7rem', color: '#DC2626' }}>STOP LOSS</div>
                      <div style={{ fontWeight: '700', color: '#DC2626' }}>
                        ₹{signal.stopLoss?.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Risk:Reward & Indicators */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      padding: '6px 12px',
                      background: signal.riskRewardRatio >= 2 ? '#DCFCE7' : '#FEF3C7',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      R:R = 1:{signal.riskRewardRatio}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {signal.indicatorAlignment} indicators aligned
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedCard === idx && (
                    <div style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px dashed var(--border-light)'
                    }}>
                      {/* Bullish Indicators */}
                      {signal.bullishIndicators?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                            BULLISH SIGNALS
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {signal.bullishIndicators.map((ind, i) => (
                              <span key={i} style={{
                                padding: '4px 10px',
                                background: '#DCFCE7',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.75rem',
                                color: '#16A34A'
                              }}>
                                {ind.signal}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bearish Indicators */}
                      {signal.bearishIndicators?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                            BEARISH SIGNALS
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {signal.bearishIndicators.map((ind, i) => (
                              <span key={i} style={{
                                padding: '4px 10px',
                                background: '#FEE2E2',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.75rem',
                                color: '#DC2626'
                              }}>
                                {ind.signal}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Technical Levels */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>RSI:</span>{' '}
                          <strong>{signal.technicals?.rsi?.toFixed(1)}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>ADX:</span>{' '}
                          <strong>{signal.technicals?.adx?.adx}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>ATR:</span>{' '}
                          <strong>{signal.technicals?.atr?.atrPercent}%</strong>
                        </div>
                      </div>

                      {/* Pre-Trade Checklist */}
                      {signal.checklistItems && (
                        <div style={{
                          background: 'var(--bg-secondary)',
                          padding: '12px',
                          borderRadius: 'var(--radius-sm)',
                          marginBottom: '12px'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            PRE-TRADE CHECKLIST
                          </div>
                          {signal.checklistItems.map((item, i) => (
                            <div key={i} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.8rem',
                              padding: '4px 0'
                            }}>
                              <span>{item.check}</span>
                              <span style={{
                                color: item.status === 'pass' ? '#16A34A' : 
                                       item.status === 'warning' ? '#F59E0B' : '#DC2626'
                              }}>
                                {item.status === 'pass' ? '✓' : item.status === 'warning' ? '!' : '✗'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reasoning */}
                      <div style={{
                        padding: '12px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '12px'
                      }}>
                        💡 {signal.reasoning}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {onAddToWatchlist && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToWatchlist(signal.symbol);
                            }}
                            style={{
                              flex: 1,
                              padding: '10px',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-light)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            ⭐ Add to Watchlist
                          </button>
                        )}
                        <a
                          href={`https://www.tradingview.com/chart/?symbol=NSE:${signal.symbol}`}
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
                    {expandedCard === idx ? '▲ Click to collapse' : '▼ Click for full analysis'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {visibleCount < signals.length && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                onClick={() => setVisibleCount(prev => prev + CARDS_PER_PAGE)}
                className="load-more-btn"
              >
                Load More ({signals.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && signals.length === 0 && !error && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>🔍</div>
          <p style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
            No premium signals found
          </p>
          <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
            Market may be choppy or no stocks meet the strict quality criteria
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
        ⚠️ Premium signals are based on advanced technical analysis using multiple indicators.
        Always verify with your own research. This is not financial advice.
      </div>
    </div>
  );
}

export default PremiumSignals;
