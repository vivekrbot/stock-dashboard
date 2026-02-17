import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './Toast';
import Icon from './Icon';
import LastUpdated from './LastUpdated';

const API_BASE = '/api';
const CARDS_PER_PAGE = 10;

const STOCK_UNIVERSE_OPTIONS = [
  { id: 'all', label: 'All NSE Stocks', description: 'Scan entire NSE universe' },
  { id: 'nifty50', label: 'Nifty 50', description: 'Top 50 large-cap index stocks' },
  { id: 'largeCap', label: 'Large Cap', description: 'Large-cap stocks' },
  { id: 'midCap', label: 'Mid Cap', description: 'Mid-cap stocks' },
  { id: 'smallCap', label: 'Small Cap', description: 'Small-cap stocks' },
];

/**
 * AI Stock Showcase - Unified component merging Trading Opportunities + Premium Signals
 * Includes integrated search, advanced filters, stock universe selector, and progress tracking
 */
function AIStockShowcase({ watchlist = [], onAddToWatchlist, onAddToRiskCalc, cachedData = {}, onUpdateCache = () => {} }) {
  const toast = useToast();
  
  // Use cached data if available
  const opportunities = cachedData?.data?.opportunities || [];
  const scanStats = cachedData?.data?.scanStats || null;
  const summary = cachedData?.data?.summary || null;
  const loading = cachedData?.loading ?? false;
  const lastUpdated = cachedData?.timestamp || null;
  const cachedScanType = cachedData?.scanType || 'all';
  
  const [error, setError] = useState(null);
  const [scanType, setScanType] = useState(cachedScanType);
  const [expandedCard, setExpandedCard] = useState(null);
  const [visibleCount, setVisibleCount] = useState(CARDS_PER_PAGE);
  const [localLoading, setLocalLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stock universe selector - restore from sessionStorage
  const [stockUniverse, setStockUniverse] = useState(() => {
    try { return sessionStorage.getItem('showcase_universe') || 'nifty50'; } catch { return 'nifty50'; }
  });
  
  // Advanced indicator filters - shown by default for filter-first discovery
  const [showFilters, setShowFilters] = useState(true);
  const [indicatorFilters, setIndicatorFilters] = useState(() => {
    try {
      const saved = sessionStorage.getItem('showcase_filters');
      return saved ? JSON.parse(saved) : {
        minRSI: '', maxRSI: '', minPrice: '', maxPrice: '',
        priceAboveSMA: false, bullishMACD: false, positiveMomentum: false,
        highADX: false, bollingerSqueeze: false, highVolume: false,
      };
    } catch {
      return {
        minRSI: '', maxRSI: '', minPrice: '', maxPrice: '',
        priceAboveSMA: false, bullishMACD: false, positiveMomentum: false,
        highADX: false, bollingerSqueeze: false, highVolume: false,
      };
    }
  });

  // Temp cache: stores scan results per scanType+universe key to avoid re-fetching on tab switch
  const tempCacheRef = useRef({});

  // Progress tracking
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const progressIntervalRef = useRef(null);

  // Simulated progress tracking for long-running scans
  const startProgress = useCallback((universe) => {
    setProgress(0);
    const isAllScan = universe === 'all';
    const totalSteps = isAllScan ? 60 : 30;
    let step = 0;
    const messages = isAllScan
      ? ['Initializing AI scan engine...', 'Fetching stock universe data...', 'Analyzing technical indicators...', 'Running MACD & RSI calculations...', 'Evaluating Bollinger Bands & ADX...', 'Computing VWAP & volume analysis...', 'Detecting candlestick patterns...', 'Running premium signal analysis...', 'Merging & ranking results...', 'Finalizing results...']
      : ['Initializing scan...', 'Fetching stock data...', 'Analyzing indicators...', 'Computing signals...', 'Ranking results...'];
    
    progressIntervalRef.current = setInterval(() => {
      step++;
      const pct = Math.min(Math.round((step / totalSteps) * 90), 90);
      setProgress(pct);
      const msgIdx = Math.min(Math.floor((step / totalSteps) * messages.length), messages.length - 1);
      setProgressMessage(messages[msgIdx]);
      if (step >= totalSteps) {
        clearInterval(progressIntervalRef.current);
      }
    }, 500);
  }, []);

  const stopProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(100);
    setProgressMessage('Complete!');
    setTimeout(() => {
      setProgress(0);
      setProgressMessage('');
    }, 1000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Persist universe and filter preferences to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem('showcase_universe', stockUniverse); } catch { /* ignore */ }
  }, [stockUniverse]);

  useEffect(() => {
    try { sessionStorage.setItem('showcase_filters', JSON.stringify(indicatorFilters)); } catch { /* ignore */ }
  }, [indicatorFilters]);

  // Helper to build a cache key for temp store
  const getCacheKey = (type, universe) => `${type}_${universe}`;

  const scanForOpportunities = async (type = scanType, universe = stockUniverse) => {
    setLocalLoading(true);
    onUpdateCache({ loading: true });
    setError(null);
    startProgress(universe);
    
    try {
      let endpoint = `${API_BASE}/ai/stock-showcase?limit=30&universe=${universe}`;
      let options = { method: 'GET' };

      if (type === 'bullish') {
        endpoint = `${API_BASE}/ai/stock-showcase?filter=bullish&limit=30&universe=${universe}`;
      } else if (type === 'bearish') {
        endpoint = `${API_BASE}/ai/stock-showcase?filter=bearish&limit=30&universe=${universe}`;
      } else if (type === 'premium') {
        endpoint = `${API_BASE}/ai/stock-showcase?filter=premium&limit=30&universe=${universe}`;
      } else if (type === 'watchlist' && watchlist.length > 0) {
        endpoint = `${API_BASE}/ai/analyze-watchlist`;
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: watchlist })
        };
      }

      const response = await fetch(endpoint, options);
      if (!response.ok) throw new Error('Failed to fetch stock showcase');
      
      const data = await response.json();
      const stats = {
        scanned: data.scannedCount,
        found: data.opportunitiesFound,
        total: data.totalFound || data.opportunitiesFound,
        premiumCount: data.premiumCount || 0,
        timestamp: data.timestamp
      };
      
      const cachePayload = {
        data: { 
          opportunities: data.opportunities || [], 
          scanStats: stats,
          summary: data.summary || null
        },
        timestamp: new Date().toISOString(),
        loading: false,
        scanType: type
      };

      // Save to temp cache for instant tab switching
      tempCacheRef.current[getCacheKey(type, universe)] = cachePayload;

      // Update parent cache
      onUpdateCache(cachePayload);
      
      setVisibleCount(CARDS_PER_PAGE);
      stopProgress();
      
      if (data.opportunities?.length > 0) {
        toast.success(`Found ${data.opportunities.length} AI picks across ${universe === 'all' ? 'all NSE' : universe} stocks`, 'Scan Complete');
      }
    } catch (err) {
      setError(err.message);
      onUpdateCache({ loading: false });
      stopProgress();
      toast.error(err.message, 'Scan Failed');
    }
    setLocalLoading(false);
  };

  // Track whether user has initiated at least one scan
  const hasData = opportunities.length > 0 || scanStats;
  const [hasScanned, setHasScanned] = useState(hasData);

  // Handle explicit scan button click
  const handleScan = (universe = stockUniverse) => {
    setHasScanned(true);
    scanForOpportunities(scanType, universe);
  };

  // Handle "Scan All" button - scans entire NSE universe
  const handleScanAll = () => {
    setStockUniverse('all');
    setHasScanned(true);
    scanForOpportunities(scanType, 'all');
  };

  // Handle scan type tab change - use temp cache if available, otherwise just switch
  const handleScanTypeChange = (type) => {
    setScanType(type);
    const key = getCacheKey(type, stockUniverse);
    const cached = tempCacheRef.current[key];
    if (cached) {
      // Restore from temp cache without re-fetching
      onUpdateCache(cached);
    }
    // If no cache, just switch tab - user can click Scan to fetch
  };

  // Handle universe change - just update selection, don't auto-scan
  const handleUniverseChange = (universe) => {
    setStockUniverse(universe);
    // Check if we have cached results for this universe + current scanType
    const key = getCacheKey(scanType, universe);
    const cached = tempCacheRef.current[key];
    if (cached) {
      onUpdateCache(cached);
    }
    // Don't auto-scan - user clicks Scan when ready
  };

  // Apply client-side search and indicator filters
  const getFilteredOpportunities = () => {
    let filtered = opportunities;
    
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(opp =>
        opp.symbol?.toLowerCase().includes(q) ||
        opp.name?.toLowerCase().includes(q) ||
        opp.companyName?.toLowerCase().includes(q)
      );
    }
    
    // RSI filters
    if (indicatorFilters.minRSI !== '') {
      const minRSI = parseFloat(indicatorFilters.minRSI);
      if (!isNaN(minRSI)) {
        filtered = filtered.filter(opp => {
          const rsi = opp.rsi || opp.technicals?.rsi;
          return rsi !== undefined && rsi >= minRSI;
        });
      }
    }
    if (indicatorFilters.maxRSI !== '') {
      const maxRSI = parseFloat(indicatorFilters.maxRSI);
      if (!isNaN(maxRSI)) {
        filtered = filtered.filter(opp => {
          const rsi = opp.rsi || opp.technicals?.rsi;
          return rsi !== undefined && rsi <= maxRSI;
        });
      }
    }
    
    // Price range filters
    if (indicatorFilters.minPrice !== '') {
      const minPrice = parseFloat(indicatorFilters.minPrice);
      if (!isNaN(minPrice)) {
        filtered = filtered.filter(opp => {
          const price = opp.currentPrice || opp.entry;
          return price !== undefined && price >= minPrice;
        });
      }
    }
    if (indicatorFilters.maxPrice !== '') {
      const maxPrice = parseFloat(indicatorFilters.maxPrice);
      if (!isNaN(maxPrice)) {
        filtered = filtered.filter(opp => {
          const price = opp.currentPrice || opp.entry;
          return price !== undefined && price <= maxPrice;
        });
      }
    }
    
    // Boolean indicator filters
    if (indicatorFilters.priceAboveSMA) {
      filtered = filtered.filter(opp => {
        return opp.sma20 && opp.currentPrice && opp.currentPrice > opp.sma20;
      });
    }
    if (indicatorFilters.bullishMACD) {
      filtered = filtered.filter(opp => {
        const macd = opp.technicals?.macd;
        if (macd) return macd.signal === 'bullish' || macd.histogram > 0;
        return opp.action === 'BUY' && opp.type === 'bullish';
      });
    }
    if (indicatorFilters.positiveMomentum) {
      filtered = filtered.filter(opp => {
        return opp.percentChange > 0 || opp.type === 'bullish' || opp.action === 'BUY';
      });
    }
    if (indicatorFilters.highADX) {
      filtered = filtered.filter(opp => {
        const adx = opp.technicals?.adx?.adx;
        return adx !== undefined && adx >= 25;
      });
    }
    if (indicatorFilters.highVolume) {
      filtered = filtered.filter(opp => {
        return opp.volumeRatio !== undefined && opp.volumeRatio >= 1.2;
      });
    }
    
    return filtered;
  };

  const filteredOpportunities = getFilteredOpportunities();

  const isLoading = loading || localLoading;

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return '#22C55E';
    if (confidence >= 70) return 'var(--accent-green)';
    if (confidence >= 60) return 'var(--accent-orange)';
    return 'var(--text-muted)';
  };

  const getQualityBadge = (score) => {
    if (score >= 80) return { label: 'A+', color: '#22C55E' };
    if (score >= 70) return { label: 'A', color: '#86EFAC' };
    if (score >= 60) return { label: 'B', color: '#F97316' };
    return { label: 'C', color: '#9CA3AF' };
  };

  const getTypeIcon = (type) => {
    return type === 'bullish' ? <Icon name="trending_up" size={16} /> : <Icon name="trending_down" size={16} />;
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
      boxShadow: 'var(--shadow-lg)'
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
            <Icon name="star" size={20} style={{ color: 'var(--accent-orange)' }} filled /> AI Stock Showcase
            <span style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: 'white',
              borderRadius: 'var(--radius-full)',
              fontWeight: '600'
            }}>
              {STOCK_UNIVERSE_OPTIONS.find(o => o.id === stockUniverse)?.label || 'ALL NSE STOCKS'}
            </span>
            {lastUpdated && <LastUpdated timestamp={lastUpdated} variant="badge" />}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            AI-powered analysis with advanced indicators, search & filtering
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Stock Universe Dropdown */}
          <select
            value={stockUniverse}
            onChange={(e) => handleUniverseChange(e.target.value)}
            disabled={isLoading}
            className="showcase-select"
          >
            {STOCK_UNIVERSE_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>

          {/* Scan Type Selector */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-full)',
            padding: '4px'
          }}>
            {[
              { id: 'all', label: 'All', icon: null },
              { id: 'premium', label: 'Premium', icon: 'star' },
              { id: 'bullish', label: 'Buy', icon: 'trending_up' },
              { id: 'bearish', label: 'Sell', icon: 'trending_down' },
              ...(watchlist.length > 0 ? [{ id: 'watchlist', label: 'Watchlist', icon: 'bookmark' }] : [])
            ].map(type => {
              const hasCached = !!tempCacheRef.current[getCacheKey(type.id, stockUniverse)];
              return (
              <button
                key={type.id}
                onClick={() => handleScanTypeChange(type.id)}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  background: scanType === type.id ? 'var(--bg-card)' : 'transparent',
                  color: scanType === type.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: scanType === type.id ? '600' : '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  boxShadow: scanType === type.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                {type.label}
                {hasCached && scanType !== type.id && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--accent-green)'
                  }} title="Cached results available" />
                )}
              </button>
              );
            })}
          </div>

          {/* Scan Selected Index Button */}
          <button
            onClick={() => handleScan()}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              background: isLoading ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: isLoading ? 'var(--text-muted)' : 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem'
            }}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                Scanning...
              </>
            ) : (
              <><Icon name="gps_fixed" size={16} /> Scan {STOCK_UNIVERSE_OPTIONS.find(o => o.id === stockUniverse)?.label || 'Selected'}</>
            )}
          </button>

          {/* Scan All Button */}
          {stockUniverse !== 'all' && (
            <button
              onClick={handleScanAll}
              disabled={isLoading}
              style={{
                padding: '10px 16px',
                background: isLoading ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #6366F1, #4F46E5)',
                color: isLoading ? 'var(--text-muted)' : 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem'
              }}
            >
              <Icon name="select_all" size={16} /> Scan All
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="showcase-search-bar">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`showcase-filter-toggle ${showFilters ? 'active' : ''}`}
          style={{ order: -1 }}
        >
          <Icon name="tune" size={18} /> Smart Filters {showFilters ? '▲' : '▼'}
        </button>
        <div className="search-input-wrapper">
          <Icon name="search" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Optional: narrow by symbol or name..."
            className="ai-search-input"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="clear-search-btn"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Indicator Filters */}
      {showFilters && (
        <div className="showcase-filters">
          <div className="showcase-filters-grid">
            <div className="filter-item">
              <label><Icon name="show_chart" size={16} /> RSI Range</label>
              <div className="filter-range">
                <input
                  type="number"
                  value={indicatorFilters.minRSI}
                  onChange={(e) => setIndicatorFilters(prev => ({...prev, minRSI: e.target.value}))}
                  placeholder="Min (e.g. 30)"
                />
                <span>to</span>
                <input
                  type="number"
                  value={indicatorFilters.maxRSI}
                  onChange={(e) => setIndicatorFilters(prev => ({...prev, maxRSI: e.target.value}))}
                  placeholder="Max (e.g. 70)"
                />
              </div>
            </div>
            <div className="filter-item">
              <label><Icon name="currency_rupee" size={16} /> Price Range (₹)</label>
              <div className="filter-range">
                <input
                  type="number"
                  value={indicatorFilters.minPrice}
                  onChange={(e) => setIndicatorFilters(prev => ({...prev, minPrice: e.target.value}))}
                  placeholder="Min (e.g. 100)"
                />
                <span>to</span>
                <input
                  type="number"
                  value={indicatorFilters.maxPrice}
                  onChange={(e) => setIndicatorFilters(prev => ({...prev, maxPrice: e.target.value}))}
                  placeholder="Max (e.g. 5000)"
                />
              </div>
            </div>
            <div className="filter-item-checks">
              <label className="checkbox-filter">
                <input
                  type="checkbox"
                  checked={indicatorFilters.priceAboveSMA}
                  onChange={(e) => setIndicatorFilters(prev => ({...prev, priceAboveSMA: e.target.checked}))}
                />
                <Icon name="trending_up" size={16} /> Price Above SMA
              </label>
              <label className="checkbox-filter">
                <input
                  type="checkbox"
                  checked={indicatorFilters.bullishMACD}
                  onChange={(e) => setIndicatorFilters(prev => ({...prev, bullishMACD: e.target.checked}))}
                />
                <Icon name="analytics" size={16} /> Bullish MACD
              </label>
              <label className="checkbox-filter">
                <input
                  type="checkbox"
                  checked={indicatorFilters.positiveMomentum}
                  onChange={(e) => setIndicatorFilters(prev => ({...prev, positiveMomentum: e.target.checked}))}
                />
                <Icon name="rocket_launch" size={16} /> Positive Momentum
              </label>
              <label className="checkbox-filter">
                <input
                  type="checkbox"
                  checked={indicatorFilters.highADX}
                  onChange={(e) => setIndicatorFilters(prev => ({...prev, highADX: e.target.checked}))}
                />
                <Icon name="speed" size={16} /> Strong Trend (ADX≥25)
              </label>
              <label className="checkbox-filter">
                <input
                  type="checkbox"
                  checked={indicatorFilters.highVolume}
                  onChange={(e) => setIndicatorFilters(prev => ({...prev, highVolume: e.target.checked}))}
                />
                <Icon name="bar_chart" size={16} /> High Volume
              </label>
            </div>
          </div>
          {(searchQuery || Object.values(indicatorFilters).some(v => v === true || (v !== '' && v !== false))) && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-light)'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Icon name="filter_list" size={16} /> Showing {filteredOpportunities.length} of {opportunities.length} results
              </span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIndicatorFilters({
                    minRSI: '', maxRSI: '', minPrice: '', maxPrice: '', priceAboveSMA: false, bullishMACD: false,
                    positiveMomentum: false, highADX: false, bollingerSqueeze: false, highVolume: false,
                  });
                }}
                style={{
                  padding: '6px 14px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <Icon name="clear_all" size={14} /> Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {isLoading && progress > 0 && (
        <div className="showcase-progress">
          <div className="showcase-progress-bar">
            <div 
              className="showcase-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="showcase-progress-info">
            <span className="showcase-progress-message">{progressMessage}</span>
            <span className="showcase-progress-percent">{progress}%</span>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {summary && !isLoading && (
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

      {/* Scan Stats */}
      {scanStats && !summary && (
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
          <span><Icon name="analytics" size={16} /> Scanned: <strong style={{ color: 'var(--text-primary)' }}>{scanStats.scanned}</strong> stocks</span>
          <span><Icon name="gps_fixed" size={16} /> {scanStats.total > scanStats.found 
            ? <>Showing: <strong style={{ color: 'var(--accent-green)' }}>{scanStats.found}</strong> of <strong>{scanStats.total}</strong> opportunities</>
            : <>Found: <strong style={{ color: 'var(--accent-green)' }}>{scanStats.found}</strong> opportunities</>
          }</span>
          {scanStats.premiumCount > 0 && (
            <span><Icon name="star" size={16} /> Premium: <strong style={{ color: 'var(--accent-orange)' }}>{scanStats.premiumCount}</strong></span>
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
          <Icon name="warning" size={16} /> {error}
          <button 
            onClick={() => handleScan()}
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
      {isLoading && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p>Analyzing {STOCK_UNIVERSE_OPTIONS.find(o => o.id === stockUniverse)?.label || 'NSE'} stocks with AI-powered indicators...</p>
          <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
            Using MACD, RSI, Bollinger, Stochastic, ADX, VWAP & pattern analysis
          </p>
        </div>
      )}

      {/* Opportunities Grid */}
      {!isLoading && filteredOpportunities.length > 0 && (
        <>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px'
        }}>
          {filteredOpportunities.slice(0, visibleCount).map((opp, idx) => {
            const quality = getQualityBadge(opp.qualityScore || opp.confidence);
            
            return (
            <div
              key={opp.symbol}
              style={{
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                border: `${opp.isPremium ? '2px' : '1px'} solid ${expandedCard === idx ? 'var(--accent-orange)' : opp.isPremium ? 'var(--accent-orange)' : 'var(--border-light)'}`,
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

              {/* Quality Badge */}
              <div style={{
                position: 'absolute',
                top: '-10px',
                right: '16px',
                background: quality.color,
                color: 'white',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {opp.isPremium && <Icon name="star" size={12} filled />}
                {quality.label}
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
                      background: (opp.type === 'bullish' || opp.action === 'BUY') ? '#DCFCE7' : '#FEE2E2',
                      color: (opp.type === 'bullish' || opp.action === 'BUY') ? 'var(--accent-green)' : 'var(--accent-red)'
                    }}>
                      {getTypeIcon(opp.type || (opp.action === 'BUY' ? 'bullish' : 'bearish'))} {opp.action}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {opp.name}
                  </div>
                </div>
                
                {/* Confidence Circle */}
                <div style={{
                  width: '55px',
                  height: '55px',
                  borderRadius: '50%',
                  border: `4px solid ${getConfidenceColor(opp.confidence)}`,
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
                    {opp.confidence}%
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
                  {opp.percentChange >= 0 ? '▲' : '▼'} {Math.abs(opp.percentChange || 0).toFixed(2)}%
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

              {/* Risk/Reward & Indicator Alignment */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Risk/Reward: <strong style={{ color: 'var(--text-primary)' }}>1:{opp.riskRewardRatio || opp.riskReward}</strong>
                </span>
                {opp.indicatorAlignment && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {opp.indicatorAlignment} indicators aligned
                  </span>
                )}
                <span style={{ color: 'var(--accent-green)' }}>
                  +{opp.potentialGain} potential
                </span>
              </div>

              {/* Expanded Details */}
              {expandedCard === idx && (
                <div style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px dashed var(--border-light)'
                }}>
                  {/* Bullish Indicators (from Premium) */}
                  {opp.bullishIndicators?.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        BULLISH SIGNALS
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {opp.bullishIndicators.map((ind, i) => (
                          <span key={i} style={{
                            padding: '4px 10px',
                            background: '#DCFCE7',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            color: '#16A34A'
                          }}>
                            {ind.signal || ind.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bearish Indicators (from Premium) */}
                  {opp.bearishIndicators?.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        BEARISH SIGNALS
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {opp.bearishIndicators.map((ind, i) => (
                          <span key={i} style={{
                            padding: '4px 10px',
                            background: '#FEE2E2',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            color: '#DC2626'
                          }}>
                            {ind.signal || ind.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Patterns (from Opportunities) */}
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
                            {typeof pattern === 'string' ? pattern : pattern.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Signals (from Opportunities) */}
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

                  {/* Pre-Trade Checklist (from Premium) */}
                  {opp.checklistItems && (
                    <div style={{
                      background: 'var(--bg-secondary)',
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '12px'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        PRE-TRADE CHECKLIST
                      </div>
                      {opp.checklistItems.map((item, i) => (
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
                            <Icon name={item.status === 'pass' ? 'check' : item.status === 'warning' ? 'warning' : 'close'} size={14} />
                          </span>
                        </div>
                      ))}
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
                      lineHeight: '1.5',
                      marginBottom: '12px'
                    }}>
                      <Icon name="lightbulb" size={16} style={{ color: 'var(--accent-orange)' }} /> {opp.reasoning}
                    </div>
                  )}

                  {/* Technical Levels */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    marginBottom: '12px',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ color: 'var(--text-muted)' }}>
                      RSI: <strong style={{ color: (opp.rsi || opp.technicals?.rsi) < 30 ? 'var(--accent-green)' : (opp.rsi || opp.technicals?.rsi) > 70 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                        {(opp.rsi || opp.technicals?.rsi)?.toFixed?.(1) || 'N/A'}
                      </strong>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Support: <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(opp.support)}</strong>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Resistance: <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(opp.resistance)}</strong>
                    </div>
                    {opp.technicals?.adx?.adx && (
                      <div style={{ color: 'var(--text-muted)' }}>
                        ADX: <strong>{opp.technicals.adx.adx}</strong>
                      </div>
                    )}
                    {opp.technicals?.atr?.atrPercent && (
                      <div style={{ color: 'var(--text-muted)' }}>
                        ATR: <strong>{opp.technicals.atr.atrPercent}%</strong>
                      </div>
                    )}
                    {opp.sma20 && (
                      <div style={{ color: 'var(--text-muted)' }}>
                        SMA 20: <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(opp.sma20)}</strong>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '16px',
                    flexWrap: 'wrap'
                  }}>
                    {onAddToRiskCalc && opp.entry && opp.stopLoss && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToRiskCalc({
                            symbol: opp.symbol,
                            entry: opp.entry,
                            target: opp.target,
                            stopLoss: opp.stopLoss,
                            action: opp.action,
                            confidence: opp.confidence
                          });
                        }}
                        style={{
                          flex: 1,
                          minWidth: '140px',
                          padding: '10px',
                          background: 'linear-gradient(135deg, var(--accent-orange), #ff6b35)',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          color: 'white',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Icon name="calculate" size={16} /> Calculate Risk
                      </button>
                    )}
                    {onAddToWatchlist && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToWatchlist(opp.symbol);
                        }}
                        style={{
                          flex: 1,
                          minWidth: '140px',
                          padding: '10px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Icon name="bookmark_add" size={16} /> Add to Watchlist
                      </button>
                    )}
                    <a
                      href={`https://www.tradingview.com/chart/?symbol=NSE:${opp.symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        minWidth: '140px',
                        padding: '10px',
                        background: 'var(--accent-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Icon name="show_chart" size={16} /> View Chart
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
        
        {/* Load More Button */}
        {visibleCount < filteredOpportunities.length && (
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
              className="load-more-btn"
            >
              Load More ({filteredOpportunities.length - visibleCount} remaining)
            </button>
          </div>
        )}
        </>
      )}

      {/* Empty State / Welcome State */}
      {!isLoading && filteredOpportunities.length === 0 && !error && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          {!hasScanned ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.6 }}><Icon name="rocket_launch" size={48} /></div>
              <p style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                Select an index and click Scan to start
              </p>
              <p style={{ fontSize: '0.9rem', marginTop: '8px', maxWidth: '500px', margin: '8px auto 0' }}>
                Choose an NSE index above (Nifty 50, Large Cap, Mid Cap, Small Cap) and hit <strong>Scan</strong> to discover AI-powered trading opportunities. 
                Use <strong>Smart Filters</strong> to find stocks matching specific technical criteria.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                <button
                  onClick={() => handleScan()}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.95rem'
                  }}
                >
                  <Icon name="gps_fixed" size={18} /> Scan {STOCK_UNIVERSE_OPTIONS.find(o => o.id === stockUniverse)?.label}
                </button>
                <button
                  onClick={handleScanAll}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.95rem'
                  }}
                >
                  <Icon name="select_all" size={18} /> Scan All NSE
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}><Icon name="search" size={48} /></div>
              <p style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
                {opportunities.length > 0 ? 'No results match your filters' : 'No opportunities found for this selection'}
              </p>
              <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                {opportunities.length > 0 ? 'Try adjusting your filter criteria above' : 'Try a different index or click Scan to refresh'}
              </p>
            </>
          )}
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
        <Icon name="info" size={14} /> AI predictions are based on advanced technical analysis using multiple indicators across all NSE stocks. 
        Always verify with your own research. This is not financial advice.
      </div>
    </div>
  );
}

export default AIStockShowcase;
