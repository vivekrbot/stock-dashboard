import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import Icon from './Icon';
import LastUpdated from './LastUpdated';

const API_BASE = '/api';

/**
 * Market Intelligence Dashboard
 * Shows market sentiment, sector rotation, and trading conditions
 * Now uses centralized cache - data persists across tab switches
 */
function MarketIntelligence({ cachedData = {}, onUpdateCache = () => {} }) {
  const toast = useToast();
  
  // Use cached data if available, with fallbacks
  const sentiment = cachedData?.data?.sentiment || null;
  const conditions = cachedData?.data?.conditions || null;
  const fearGreed = cachedData?.data?.fearGreed || null;
  const loading = cachedData?.loading ?? false;
  const lastUpdated = cachedData?.timestamp || null;
  
  const [sectors, setSectors] = useState(null);
  const [error, setError] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  // Check if we have actual data loaded
  const hasData = sentiment || conditions || fearGreed;

  // Only fetch on initial mount if no cached data exists
  useEffect(() => {
    if (!hasData && !loading && !localLoading) {
      fetchMarketData();
    }
  }, []);

  const fetchMarketData = async () => {
    setLocalLoading(true);
    onUpdateCache({ loading: true });
    setError(null);
    
    try {
      const [sentimentRes, conditionsRes, fearGreedRes] = await Promise.all([
        fetch(`${API_BASE}/market/sentiment`),
        fetch(`${API_BASE}/market/trading-conditions`),
        fetch(`${API_BASE}/market/fear-greed`)
      ]);

      let sentimentData = null;
      let conditionsData = null;
      let fearGreedData = null;

      if (sentimentRes.ok) {
        sentimentData = await sentimentRes.json();
      }

      if (conditionsRes.ok) {
        conditionsData = await conditionsRes.json();
      }

      if (fearGreedRes.ok) {
        fearGreedData = await fearGreedRes.json();
      }

      // Update cache with fetched data
      onUpdateCache({ 
        data: { sentiment: sentimentData, conditions: conditionsData, fearGreed: fearGreedData },
        timestamp: new Date().toISOString(),
        loading: false 
      });

      toast.success('Market data updated', 'Refresh Complete');
    } catch (err) {
      setError(err.message);
      onUpdateCache({ loading: false });
      toast.error('Failed to fetch market data');
    }
    setLocalLoading(false);
  };

  const fetchSectorData = async () => {
    try {
      const res = await fetch(`${API_BASE}/market/sectors`);
      if (res.ok) {
        const data = await res.json();
        setSectors(data);
        toast.info('Sector data loaded');
      }
    } catch (err) {
      toast.error('Failed to load sector data');
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'very_bullish': return '#22C55E';
      case 'bullish': return '#86EFAC';
      case 'neutral': return '#9CA3AF';
      case 'bearish': return '#FCA5A5';
      case 'very_bearish': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'very_bullish': return <Icon name="rocket_launch" size={32} style={{ color: '#22C55E' }} />;
      case 'bullish': return <Icon name="trending_up" size={32} style={{ color: '#86EFAC' }} />;
      case 'neutral': return <Icon name="trending_flat" size={32} style={{ color: '#9CA3AF' }} />;
      case 'bearish': return <Icon name="trending_down" size={32} style={{ color: '#FCA5A5' }} />;
      case 'very_bearish': return <Icon name="arrow_downward" size={32} style={{ color: '#EF4444' }} />;
      default: return <Icon name="help" size={32} style={{ color: '#9CA3AF' }} />;
    }
  };

  const getFearGreedColor = (index) => {
    if (index >= 75) return '#EF4444'; // Extreme Greed
    if (index >= 55) return '#F97316'; // Greed
    if (index >= 45) return '#9CA3AF'; // Neutral
    if (index >= 25) return '#3B82F6'; // Fear
    return '#1E40AF'; // Extreme Fear
  };

  const isLoading = loading || localLoading;

  // Show loading state
  if (isLoading && !hasData) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        border: '1px solid var(--border-light)'
      }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p>Analyzing market conditions...</p>
        </div>
      </div>
    );
  }

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
        marginBottom: '20px'
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
            <Icon name="psychology" size={24} style={{ color: 'var(--accent-blue)' }} /> Market Intelligence
            {lastUpdated && <LastUpdated timestamp={lastUpdated} variant="badge" />}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Real-time market analysis and trading conditions
          </p>
        </div>
        <button
          onClick={fetchMarketData}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? <><Icon name="refresh" size={16} /> Loading...</> : <><Icon name="refresh" size={16} /> Refresh</>}
        </button>
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {/* Market Sentiment Card */}
        {sentiment && (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: `2px solid ${getSentimentColor(sentiment.sentiment)}`
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              MARKET SENTIMENT
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '2.5rem' }}>{getSentimentIcon(sentiment.sentiment)}</span>
              <div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: getSentimentColor(sentiment.sentiment),
                  textTransform: 'uppercase'
                }}>
                  {sentiment.sentiment?.replace('_', ' ')}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Score: {sentiment.sentimentScore}/100
                </div>
              </div>
            </div>

            {/* Advance/Decline */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '12px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--accent-green)', fontWeight: '700', fontSize: '1.2rem' }}>
                  {sentiment.advancing}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Advancing</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '1.2rem' }}>
                  {sentiment.unchanged}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unchanged</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--accent-red)', fontWeight: '700', fontSize: '1.2rem' }}>
                  {sentiment.declining}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Declining</div>
              </div>
            </div>

            {/* Recommendation */}
            {sentiment.recommendation && (
              <div style={{
                padding: '12px',
                background: sentiment.recommendation.action === 'BUY' ? '#DCFCE7' : 
                           sentiment.recommendation.action === 'SELL' ? '#FEE2E2' : '#F3F4F6',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem'
              }}>
                <strong>{sentiment.recommendation.action}</strong>: {sentiment.recommendation.message}
              </div>
            )}
          </div>
        )}

        {/* Fear & Greed Index */}
        {fearGreed && (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '20px',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              FEAR & GREED INDEX
            </div>
            
            {/* Gauge */}
            <div style={{
              position: 'relative',
              height: '100px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '120px',
                height: '60px',
                borderRadius: '60px 60px 0 0',
                background: `conic-gradient(from 180deg, 
                  #1E40AF 0deg, 
                  #3B82F6 45deg, 
                  #9CA3AF 90deg, 
                  #F97316 135deg, 
                  #EF4444 180deg)`,
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '50%',
                  transform: `translateX(-50%) rotate(${(fearGreed.index / 100) * 180 - 90}deg)`,
                  transformOrigin: 'bottom center',
                  width: '4px',
                  height: '50px',
                  background: 'var(--text-primary)',
                  borderRadius: '2px'
                }}></div>
              </div>
              <div style={{
                marginTop: '8px',
                fontSize: '2rem',
                fontWeight: '700',
                color: getFearGreedColor(fearGreed.index)
              }}>
                {fearGreed.index}
              </div>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: getFearGreedColor(fearGreed.index)
              }}>
                {fearGreed.label}
              </div>
            </div>

            <div style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              padding: '12px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)'
            }}>
              {fearGreed.interpretation}
            </div>
          </div>
        )}

        {/* Trading Conditions */}
        {conditions && (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '20px',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              TRADING CONDITIONS
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: conditions.isFavorable ? '#DCFCE7' : '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                {conditions.isFavorable ? <Icon name="check_circle" size={24} filled /> : <Icon name="warning" size={24} />}
              </div>
              <div>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: conditions.isFavorable ? 'var(--accent-green)' : 'var(--accent-red)'
                }}>
                  {conditions.isFavorable ? 'FAVORABLE' : 'UNFAVORABLE'}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Score: {conditions.score}/{conditions.maxScore}
                </div>
              </div>
            </div>

            {/* Factors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {conditions.factors?.map((factor, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem'
                }}>
                  <span>{factor.factor}</span>
                  <span style={{
                    color: factor.status === 'positive' ? 'var(--accent-green)' :
                           factor.status === 'warning' ? 'var(--accent-orange)' : 'var(--accent-red)',
                    fontWeight: '600'
                  }}>
                    <Icon name={factor.status === 'positive' ? 'check' : factor.status === 'warning' ? 'warning' : 'close'} size={16} />
                  </span>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '12px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic'
            }}>
              {conditions.summary}
            </div>
          </div>
        )}
      </div>

      {/* Top Movers */}
      {sentiment && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginTop: '16px'
        }}>
          {/* Top Gainers */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ 
              fontSize: '0.85rem', 
              fontWeight: '600',
              color: 'var(--accent-green)',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Icon name="trending_up" size={16} /> Top Gainers
            </div>
            {sentiment.topGainers?.map((stock, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: idx < sentiment.topGainers.length - 1 ? '1px solid var(--border-light)' : 'none'
              }}>
                <span style={{ fontWeight: '600' }}>{stock.symbol}</span>
                <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>+{stock.change}</span>
              </div>
            ))}
          </div>

          {/* Top Losers */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ 
              fontSize: '0.85rem', 
              fontWeight: '600',
              color: 'var(--accent-red)',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Icon name="trending_down" size={16} /> Top Losers
            </div>
            {sentiment.topLosers?.map((stock, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: idx < sentiment.topLosers.length - 1 ? '1px solid var(--border-light)' : 'none'
              }}>
                <span style={{ fontWeight: '600' }}>{stock.symbol}</span>
                <span style={{ color: 'var(--accent-red)', fontWeight: '600' }}>{stock.change}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Update */}
      {lastUpdated && (
        <div style={{
          marginTop: '16px',
          textAlign: 'center'
        }}>
          <LastUpdated timestamp={lastUpdated} variant="inline" />
        </div>
      )}
    </div>
  );
}

export default MarketIntelligence;
