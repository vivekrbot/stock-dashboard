import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import Icon from './Icon';
import LastUpdated from './LastUpdated';

const API_BASE = '/api';
const CARDS_PER_PAGE = 10;

/**
 * Predictive Swing Panel Component
 * ================================
 * Based on Pine Script "Advanced Predictive Swing System"
 * 
 * Features:
 * - Linear Regression Price Prediction with confidence bands
 * - Composite Buy/Sell Scoring (0-100)
 * - Multi-indicator signal confirmation
 * - Entry/Target/Stop-Loss with dynamic R:R
 * - Volatility regime detection
 * - RSI Divergence alerts
 */
function PredictiveSwingPanel({ onAddToWatchlist, onAddToRiskCalc, cachedData = {}, onUpdateCache = () => {} }) {
  const toast = useToast();
  
  // Use cached data if available
  const signals = cachedData?.data?.signals?.all || [];
  const summary = cachedData?.data?.summary || null;
  const loading = cachedData?.loading ?? false;
  const lastUpdated = cachedData?.timestamp || null;
  
  const [error, setError] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [visibleCount, setVisibleCount] = useState(CARDS_PER_PAGE);
  const [localLoading, setLocalLoading] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, strongBuys, strongSells, buys, sells
  const [showTechnicals, setShowTechnicals] = useState(null);

  const fetchSignals = async () => {
    setLocalLoading(true);
    onUpdateCache({ loading: true });
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/swing/signals?minScore=50`);
      if (!response.ok) throw new Error('Failed to fetch predictive swing signals');
      
      const data = await response.json();
      
      onUpdateCache({ 
        data: { signals: data.signals, summary: data.summary },
        timestamp: new Date().toISOString(),
        loading: false 
      });
      
      setVisibleCount(CARDS_PER_PAGE);
      
      if (data.signals?.all?.length > 0) {
        toast.success(`Found ${data.signals.all.length} swing signals`, 'Scan Complete');
      } else {
        toast.info('No significant signals found at this time');
      }
    } catch (err) {
      setError(err.message);
      onUpdateCache({ loading: false });
      toast.error(err.message, 'Scan Failed');
    }
    setLocalLoading(false);
  };

  const hasData = signals.length > 0 || summary;

  useEffect(() => {
    if (!hasData && !loading && !localLoading) {
      fetchSignals();
    }
  }, []);

  const isLoading = loading || localLoading;

  // Filter signals based on selected filter
  const getFilteredSignals = () => {
    if (!cachedData?.data?.signals) return [];
    const s = cachedData.data.signals;
    
    switch (filterType) {
      case 'strongBuys': return s.strongBuys || [];
      case 'strongSells': return s.strongSells || [];
      case 'buys': return [...(s.strongBuys || []), ...(s.moderateBuys || [])];
      case 'sells': return [...(s.strongSells || []), ...(s.moderateSells || [])];
      default: return s.all || [];
    }
  };

  const filteredSignals = getFilteredSignals();

  // Score color based on value
  const getScoreColor = (score) => {
    if (score >= 80) return '#22C55E';
    if (score >= 70) return '#4ADE80';
    if (score >= 60) return '#F59E0B';
    if (score >= 50) return '#FB923C';
    return '#9CA3AF';
  };

  // Signal strength badge
  const getStrengthBadge = (strength) => {
    const badges = {
      'VERY STRONG': { color: '#22C55E', bg: '#DCFCE7' },
      'STRONG': { color: '#4ADE80', bg: '#D1FAE5' },
      'MODERATE': { color: '#F59E0B', bg: '#FEF3C7' },
      'DEVELOPING': { color: '#FB923C', bg: '#FFEDD5' },
      'WEAK': { color: '#9CA3AF', bg: '#F3F4F6' }
    };
    return badges[strength] || badges['WEAK'];
  };

  // Trend indicator
  const getTrendIcon = (trend) => {
    if (trend === 'UPTREND') return { icon: 'trending_up', color: '#22C55E' };
    if (trend === 'DOWNTREND') return { icon: 'trending_down', color: '#EF4444' };
    return { icon: 'trending_flat', color: '#9CA3AF' };
  };

  // Volatility badge
  const getVolatilityBadge = (regime) => {
    const styles = {
      'HIGH': { color: '#DC2626', bg: '#FEE2E2', label: '⚡ High Vol' },
      'LOW': { color: '#059669', bg: '#D1FAE5', label: '😴 Low Vol' },
      'NORMAL': { color: '#6B7280', bg: '#F3F4F6', label: '📊 Normal' }
    };
    return styles[regime] || styles['NORMAL'];
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
            <Icon name="insights" size={20} style={{ color: '#8B5CF6' }} /> 
            Predictive Swing System
            <span style={{
              fontSize: '0.65rem',
              padding: '2px 8px',
              background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
              color: 'white',
              borderRadius: 'var(--radius-full)',
              fontWeight: '600'
            }}>
              PINE SCRIPT
            </span>
            {lastUpdated && <LastUpdated timestamp={lastUpdated} variant="badge" />}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Advanced linear regression prediction • Multi-indicator scoring • Entry/Target/SL
          </p>
        </div>

        <button
          onClick={fetchSignals}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            background: isLoading ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #8B5CF6, #6366F1)',
            color: isLoading ? 'var(--text-muted)' : 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: '700',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isLoading ? (
            <><Icon name="refresh" size={16} /> Analyzing...</>
          ) : (
            <><Icon name="radar" size={16} /> Scan Signals</>
          )}
        </button>
      </div>

      {/* Summary Stats */}
      {summary && !isLoading && (
        <div style={{
          display: 'flex',
          gap: '16px',
          padding: '16px 20px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ textAlign: 'center', minWidth: '70px' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {signals.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
          </div>
          
          <div style={{ height: '40px', width: '1px', background: 'var(--border-light)' }} />
          
          <div 
            style={{ textAlign: 'center', cursor: 'pointer', minWidth: '80px' }}
            onClick={() => setFilterType('strongBuys')}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#22C55E' }}>
              🚀 {summary.strongBuys}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Strong BUY</div>
          </div>
          
          <div 
            style={{ textAlign: 'center', cursor: 'pointer', minWidth: '80px' }}
            onClick={() => setFilterType('strongSells')}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#EF4444' }}>
              🔻 {summary.strongSells}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Strong SELL</div>
          </div>
          
          <div style={{ height: '40px', width: '1px', background: 'var(--border-light)' }} />
          
          <div 
            style={{ textAlign: 'center', cursor: 'pointer', minWidth: '70px' }}
            onClick={() => setFilterType('buys')}
          >
            <div style={{ fontSize: '1.3rem', fontWeight: '600', color: '#4ADE80' }}>
              {summary.strongBuys + summary.moderateBuys}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>All Buys</div>
          </div>
          
          <div 
            style={{ textAlign: 'center', cursor: 'pointer', minWidth: '70px' }}
            onClick={() => setFilterType('sells')}
          >
            <div style={{ fontSize: '1.3rem', fontWeight: '600', color: '#FB7185' }}>
              {summary.strongSells + summary.moderateSells}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>All Sells</div>
          </div>

          {filterType !== 'all' && (
            <button
              onClick={() => setFilterType('all')}
              style={{
                marginLeft: 'auto',
                padding: '6px 12px',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Show All
            </button>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      {!isLoading && signals.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'all', label: 'All Signals', icon: 'list' },
            { id: 'strongBuys', label: '🚀 Strong Buys', color: '#22C55E' },
            { id: 'strongSells', label: '🔻 Strong Sells', color: '#EF4444' },
            { id: 'buys', label: 'All Buys', color: '#4ADE80' },
            { id: 'sells', label: 'All Sells', color: '#FB7185' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '6px 14px',
                background: filterType === tab.id ? (tab.color || '#8B5CF6') : 'var(--bg-secondary)',
                color: filterType === tab.id ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
          <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>
            Running Predictive Swing Analysis...
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Linear Regression • EMA Trend • MACD • RSI Divergence • ADX • Volume
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
          <Icon name="warning" size={16} /> {error}
          <button 
            onClick={fetchSignals} 
            style={{ 
              marginLeft: '12px',
              padding: '4px 12px',
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

      {/* Signals Grid */}
      {!isLoading && filteredSignals.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: '16px'
          }}>
            {filteredSignals.slice(0, visibleCount).map((signal, idx) => {
              const strengthBadge = getStrengthBadge(signal.signalStrength);
              const trendInfo = getTrendIcon(signal.trend);
              const volBadge = getVolatilityBadge(signal.volatilityRegime);
              const isExpanded = expandedCard === idx;
              
              return (
                <div
                  key={signal.symbol}
                  style={{
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    border: `2px solid ${isExpanded ? '#8B5CF6' : 'var(--border-light)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    boxShadow: isExpanded ? '0 4px 20px rgba(139, 92, 246, 0.15)' : 'none'
                  }}
                  onClick={() => setExpandedCard(isExpanded ? null : idx)}
                >
                  {/* Score Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '16px',
                    background: `linear-gradient(135deg, ${getScoreColor(signal.signalScore)}, ${getScoreColor(signal.signalScore)}dd)`,
                    color: 'white',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}>
                    Score: {signal.signalScore}
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
                        gap: '10px',
                        marginBottom: '6px'
                      }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{signal.symbol}</span>
                        
                        {/* Signal Badge */}
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: signal.signal === 'BUY' ? '#DCFCE7' : '#FEE2E2',
                          color: signal.signal === 'BUY' ? '#16A34A' : '#DC2626',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Icon 
                            name={signal.signal === 'BUY' ? 'arrow_upward' : 'arrow_downward'} 
                            size={14} 
                          />
                          {signal.signal}
                        </span>

                        {/* Strength Badge */}
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.65rem',
                          fontWeight: '600',
                          background: strengthBadge.bg,
                          color: strengthBadge.color
                        }}>
                          {signal.signalStrength}
                        </span>
                      </div>
                      
                      {/* Price & Change */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        fontSize: '0.9rem'
                      }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          ₹{signal.currentPrice?.toFixed(2)}
                        </span>
                        <span style={{ 
                          color: signal.percentChange >= 0 ? '#22C55E' : '#EF4444',
                          fontWeight: '500'
                        }}>
                          {signal.percentChange >= 0 ? '+' : ''}{signal.percentChange?.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Trend Indicator */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Icon name={trendInfo.icon} size={28} style={{ color: trendInfo.color }} />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {signal.trend}
                      </span>
                    </div>
                  </div>

                  {/* Trade Setup Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '10px',
                    marginBottom: '14px'
                  }}>
                    <div style={{
                      padding: '10px 8px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        ENTRY
                      </div>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        ₹{signal.entry?.toFixed(2)}
                      </div>
                    </div>
                    
                    <div style={{
                      padding: '10px 8px',
                      background: '#DCFCE7',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.65rem', color: '#16A34A', marginBottom: '4px' }}>
                        TARGET
                      </div>
                      <div style={{ fontWeight: '700', color: '#16A34A', fontSize: '0.95rem' }}>
                        ₹{signal.target?.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#22C55E' }}>
                        +{signal.rewardPercent?.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div style={{
                      padding: '10px 8px',
                      background: '#FEE2E2',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.65rem', color: '#DC2626', marginBottom: '4px' }}>
                        STOP LOSS
                      </div>
                      <div style={{ fontWeight: '700', color: '#DC2626', fontSize: '0.95rem' }}>
                        ₹{signal.stopLoss?.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#EF4444' }}>
                        -{signal.riskPercent?.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Row */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    marginBottom: '12px'
                  }}>
                    {/* Risk:Reward */}
                    <div style={{
                      padding: '4px 10px',
                      background: signal.riskRewardRatio >= 2 ? '#DCFCE7' : '#FEF3C7',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: signal.riskRewardRatio >= 2 ? '#16A34A' : '#D97706'
                    }}>
                      R:R {signal.riskRewardRatio}:1
                    </div>

                    {/* RSI */}
                    <div style={{
                      padding: '4px 10px',
                      background: signal.rsi > 70 ? '#FEE2E2' : signal.rsi < 30 ? '#DCFCE7' : '#F3F4F6',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: signal.rsi > 70 ? '#DC2626' : signal.rsi < 30 ? '#16A34A' : '#6B7280'
                    }}>
                      RSI: {signal.rsi?.toFixed(0)}
                    </div>

                    {/* Volatility */}
                    <div style={{
                      padding: '4px 10px',
                      background: volBadge.bg,
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: volBadge.color
                    }}>
                      {volBadge.label}
                    </div>

                    {/* RSI Divergence */}
                    {signal.rsiDivergence && (
                      <div style={{
                        padding: '4px 10px',
                        background: signal.rsiDivergence === 'bullish' ? '#DCFCE7' : '#FEE2E2',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: signal.rsiDivergence === 'bullish' ? '#16A34A' : '#DC2626'
                      }}>
                        ⚠️ {signal.rsiDivergence.toUpperCase()} DIV
                      </div>
                    )}
                  </div>

                  {/* Prediction Box */}
                  {signal.prediction && (
                    <div style={{
                      padding: '12px',
                      background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #DDD6FE',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            color: '#7C3AED',
                            fontWeight: '600'
                          }}>
                            🔮 PREDICTED PRICE (10 bars)
                          </span>
                          <div style={{ 
                            fontSize: '1.1rem', 
                            fontWeight: '700', 
                            color: '#5B21B6',
                            marginTop: '2px'
                          }}>
                            ₹{signal.prediction.price?.toFixed(2)}
                            <span style={{
                              fontSize: '0.85rem',
                              marginLeft: '8px',
                              color: signal.prediction.change >= 0 ? '#22C55E' : '#EF4444'
                            }}>
                              ({signal.prediction.change >= 0 ? '+' : ''}{signal.prediction.change?.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                        <div style={{
                          padding: '6px 12px',
                          background: signal.prediction.direction === 'bullish' ? '#22C55E' : '#EF4444',
                          color: 'white',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.7rem',
                          fontWeight: '700'
                        }}>
                          {signal.prediction.direction?.toUpperCase()}
                        </div>
                      </div>
                      
                      {/* Confidence Bands */}
                      <div style={{
                        display: 'flex',
                        gap: '16px',
                        marginTop: '8px',
                        fontSize: '0.75rem',
                        color: '#6B7280'
                      }}>
                        <span>Upper: ₹{signal.prediction.upperBand?.toFixed(2)}</span>
                        <span>Lower: ₹{signal.prediction.lowerBand?.toFixed(2)}</span>
                        <span>Conf: {signal.prediction.confidence}%</span>
                      </div>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={{
                      borderTop: '1px solid var(--border-light)',
                      paddingTop: '16px',
                      marginTop: '8px'
                    }}>
                      {/* Score Components */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '600', 
                          color: 'var(--text-muted)',
                          marginBottom: '8px'
                        }}>
                          SCORE COMPONENTS
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(5, 1fr)',
                          gap: '8px'
                        }}>
                          {signal.scoreComponents && Object.entries(signal.scoreComponents).map(([key, value]) => (
                            <div key={key} style={{
                              textAlign: 'center',
                              padding: '8px',
                              background: 'var(--bg-secondary)',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              <div style={{ 
                                fontSize: '1rem', 
                                fontWeight: '700',
                                color: getScoreColor(value * 3.33)
                              }}>
                                {value}
                              </div>
                              <div style={{ 
                                fontSize: '0.6rem', 
                                color: 'var(--text-muted)',
                                textTransform: 'capitalize'
                              }}>
                                {key}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Technical Details */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ 
                          padding: '10px', 
                          background: 'var(--bg-secondary)', 
                          borderRadius: 'var(--radius-sm)' 
                        }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>EMA 21</div>
                          <div style={{ fontWeight: '600' }}>₹{signal.ema21?.toFixed(2)}</div>
                        </div>
                        <div style={{ 
                          padding: '10px', 
                          background: 'var(--bg-secondary)', 
                          borderRadius: 'var(--radius-sm)' 
                        }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>EMA 50</div>
                          <div style={{ fontWeight: '600' }}>₹{signal.ema50?.toFixed(2)}</div>
                        </div>
                        <div style={{ 
                          padding: '10px', 
                          background: 'var(--bg-secondary)', 
                          borderRadius: 'var(--radius-sm)' 
                        }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ATR</div>
                          <div style={{ fontWeight: '600' }}>₹{signal.atr?.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Fibonacci Levels */}
                      {signal.fibonacci && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '600', 
                            color: 'var(--text-muted)',
                            marginBottom: '8px'
                          }}>
                            FIBONACCI LEVELS
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '6px',
                            fontSize: '0.75rem'
                          }}>
                            <div style={{ padding: '6px', background: '#DCFCE7', borderRadius: '4px', textAlign: 'center' }}>
                              <div style={{ color: '#16A34A', fontWeight: '600' }}>+61.8%</div>
                              <div>₹{signal.fibonacci.fib618Up?.toFixed(0)}</div>
                            </div>
                            <div style={{ padding: '6px', background: '#D1FAE5', borderRadius: '4px', textAlign: 'center' }}>
                              <div style={{ color: '#22C55E', fontWeight: '600' }}>+38.2%</div>
                              <div>₹{signal.fibonacci.fib382Up?.toFixed(0)}</div>
                            </div>
                            <div style={{ padding: '6px', background: '#FEE2E2', borderRadius: '4px', textAlign: 'center' }}>
                              <div style={{ color: '#DC2626', fontWeight: '600' }}>-38.2%</div>
                              <div>₹{signal.fibonacci.fib382Down?.toFixed(0)}</div>
                            </div>
                            <div style={{ padding: '6px', background: '#FECACA', borderRadius: '4px', textAlign: 'center' }}>
                              <div style={{ color: '#B91C1C', fontWeight: '600' }}>-61.8%</div>
                              <div>₹{signal.fibonacci.fib618Down?.toFixed(0)}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{
                        display: 'flex',
                        gap: '10px',
                        marginTop: '12px'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToWatchlist?.(signal.symbol);
                          }}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <Icon name="bookmark_add" size={16} /> Add to Watchlist
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToRiskCalc?.({
                              symbol: signal.symbol,
                              entry: signal.entry,
                              target: signal.target,
                              stopLoss: signal.stopLoss,
                              action: signal.signal,
                              confidence: signal.signalScore
                            });
                          }}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <Icon name="calculate" size={16} /> Risk Calculator
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expand indicator */}
                  <div style={{
                    textAlign: 'center',
                    marginTop: '8px',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem'
                  }}>
                    <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={18} />
                    {isExpanded ? 'Show less' : 'Show more details'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {filteredSignals.length > visibleCount && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setVisibleCount(prev => prev + CARDS_PER_PAGE)}
                style={{
                  padding: '12px 32px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Load More ({filteredSignals.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* No Signals State */}
      {!isLoading && !error && filteredSignals.length === 0 && hasData && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--text-muted)'
        }}>
          <Icon name="search_off" size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
          <p style={{ fontWeight: '600' }}>No signals match this filter</p>
          <p style={{ fontSize: '0.85rem' }}>Try selecting a different filter or scan again</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && !hasData && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-muted)'
        }}>
          <Icon name="insights" size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
          <p style={{ fontWeight: '600', marginBottom: '8px' }}>
            Ready to scan for predictive swing signals
          </p>
          <p style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
            Based on advanced linear regression, multi-indicator scoring, and volatility analysis
          </p>
          <button
            onClick={fetchSignals}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: '700'
            }}
          >
            <Icon name="radar" size={16} /> Start Scanning
          </button>
        </div>
      )}
    </div>
  );
}

export default PredictiveSwingPanel;
