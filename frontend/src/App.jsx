import { useState, useEffect, useCallback } from 'react';
import StockCard from './components/StockCard';
import AnalysisModal from './components/AnalysisModal';
import SplashScreen from './components/SplashScreen';
import MarketStatus from './components/MarketStatus';
import StockChart from './components/StockChart';
import WatchlistManager from './components/WatchlistManager';
import AIStockShowcase from './components/AIStockShowcase';
import MarketIntelligence from './components/MarketIntelligence';
import RiskCalculator from './components/RiskCalculator';
import { useToast } from './components/Toast';
import Icon from './components/Icon';

const API_BASE = '/api';
const CARDS_PER_PAGE = 10;
const SECTORS = ['IT', 'Banking', 'Auto', 'Pharma', 'Energy', 'FMCG', 'Metals', 'Telecom', 'Cement', 'Finance'];
const DEFAULT_WATCHLIST = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK'];

function App() {
  const toast = useToast();
  
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCards, setVisibleCards] = useState(CARDS_PER_PAGE);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // View state - control which section is expanded/visible
  const [expandedSections, setExpandedSections] = useState({
    intelligence: false,
    risk: false,
    watchlist: false,
    filters: false
  });
  
  // Watchlist state
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('stock-dashboard-watchlists');
    if (saved) {
      const watchlists = JSON.parse(saved);
      return watchlists['default']?.stocks || DEFAULT_WATCHLIST;
    }
    return DEFAULT_WATCHLIST;
  });
  
  // AI Search state - the primary interface
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Form state
  const [newSymbol, setNewSymbol] = useState('');
  
  // Modal state
  const [selectedStock, setSelectedStock] = useState(null);
  const [chartStock, setChartStock] = useState(null);
  
  // Risk Calculator prefill state
  const [riskCalcPrefill, setRiskCalcPrefill] = useState(null);
  
  // Indicator filters - all visible on screen
  const [indicatorFilters, setIndicatorFilters] = useState({
    minRSI: 30,
    maxRSI: 70,
    minVolume: 0,
    priceAboveSMA: false,
    bullishMACD: false,
    positiveMomentum: false
  });
  
  // Screener state
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [strategy, setStrategy] = useState('balanced');
  const [strategyDetails, setStrategyDetails] = useState(null);
  
  // Filter state - simplified for AI search
  const [filters, setFilters] = useState({
    capSize: 'all',
    sector: 'all',
    minPrice: '',
    maxPrice: '',
    sectorLeadersOnly: false
  });

  // ==========================================
  // CENTRALIZED DATA CACHE
  // Data is cached and only refreshed on explicit action (scan/refresh button)
  // ==========================================
  const [dataCache, setDataCache] = useState({
    stockShowcase: { data: null, timestamp: null, loading: false, scanType: 'all' },
    marketIntelligence: { data: null, timestamp: null, loading: false }
  });

  // Update cache helper
  const updateCache = useCallback((key, updates) => {
    setDataCache(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
  }, []);

  // Handlers defined before any conditional returns (Rules of Hooks)
  const handleAddToWatchlist = useCallback((symbol) => {
    if (watchlist.includes(symbol)) {
      toast.warning(`${symbol} is already in your watchlist`);
      return;
    }
    setWatchlist(prev => [...prev, symbol]);
    setRefreshKey(prev => prev + 1);
    toast.success(`${symbol} added to watchlist`, 'Stock Added');
  }, [watchlist, toast]);

  // Handler for adding stock to risk calculator with prefilled data
  const handleAddToRiskCalc = useCallback((stockData) => {
    setRiskCalcPrefill({
      symbol: stockData.symbol,
      entry: stockData.entry || stockData.currentPrice,
      stopLoss: stockData.stopLoss,
      target: stockData.target,
      action: stockData.action,
      confidence: stockData.confidence
    });
    setExpandedSections(prev => ({ ...prev, risk: true }));
    toast.success(`${stockData.symbol} added to Risk Calculator`, 'Trade Setup');
  }, [toast]);

  // AI Search Handler - Primary interface for finding stocks
  const handleAISearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      toast.warning('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    
    try {
      // Search across multiple endpoints based on query
      const response = await fetch(`${API_BASE}/ai/opportunities?limit=20`);
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      const results = data.opportunities || [];
      
      // Filter results based on search query (symbol or company name)
      const queryLower = query.toLowerCase();
      const filtered = results.filter(opp => 
        opp.symbol.toLowerCase().includes(queryLower) ||
        (opp.companyName && opp.companyName.toLowerCase().includes(queryLower))
      );
      
      setSearchResults(filtered);
      
      if (filtered.length === 0) {
        toast.warning(`No results found for "${query}"`);
      } else {
        toast.success(`Found ${filtered.length} matching stocks`, 'Search Complete');
      }
    } catch (error) {
      toast.error(error.message, 'Search Failed');
    }
    
    setIsSearching(false);
  };

  // Toggle section visibility
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch strategy details
  useEffect(() => {
    if (!isLoading && strategy) {
      fetch(`${API_BASE}/screener/strategies/${strategy}`)
        .then(res => res.json())
        .then(setStrategyDetails)
        .catch(() => toast.error('Failed to load strategy details'));
    }
  }, [strategy, isLoading]);

  // Show splash screen
  if (isLoading) {
    return <SplashScreen onReady={() => setIsLoading(false)} />;
  }

  // Handlers
  const handleAddStock = (e) => {
    e.preventDefault();
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) return;
    
    if (watchlist.includes(symbol)) {
      toast.warning(`${symbol} is already in your watchlist`);
      return;
    }
    
    setWatchlist(prev => [...prev, symbol]);
    setNewSymbol('');
    toast.success(`${symbol} added to watchlist`, 'Stock Added');
  };

  const handleRemoveStock = (symbol) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
    toast.info(`${symbol} removed from watchlist`);
  };

  const handleFindOpportunities = async () => {
    setScanning(true);
    setScanResults(null);
    
    try {
      const response = await fetch(`${API_BASE}/screener/find-opportunities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
          capSize: filters.capSize,
          sector: filters.sector === 'all' ? null : filters.sector,
          maxResults: 8,
          signalType: 'BUY',
          minPrice: filters.minPrice ? parseFloat(filters.minPrice) : 0,
          maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : 999999,
          sectorLeadersOnly: filters.sectorLeadersOnly
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Screening failed');
      }

      const data = await response.json();
      setScanResults(data);
      
      if (data.opportunities?.length > 0) {
        setWatchlist(data.opportunities.map(o => o.symbol));
        setVisibleCards(CARDS_PER_PAGE);
        toast.success(`Found ${data.totalFound} trading opportunities!`, 'Scan Complete');
      } else {
        toast.warning('No opportunities found. Try adjusting your filters.');
      }
    } catch (error) {
      toast.error(error.message, 'Scan Failed');
    }
    
    setScanning(false);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.info('Refreshing stock data...');
  };

  const handleReset = () => {
    setWatchlist(DEFAULT_WATCHLIST);
    setRefreshKey(prev => prev + 1);
    setScanResults(null);
    setVisibleCards(CARDS_PER_PAGE);
    toast.info('Watchlist reset to defaults');
  };

  const handleWatchlistChange = () => {
    setRefreshKey(prev => prev + 1);
    setScanResults(null);
    setVisibleCards(CARDS_PER_PAGE);
  };

  const handleStocksChange = (stocks) => {
    setWatchlist(stocks);
    setRefreshKey(prev => prev + 1);
    setVisibleCards(CARDS_PER_PAGE);
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container">
      {/* Minimal Header */}
      <header className="header-minimal">
        <div className="header-content">
          <h1><Icon name="candlestick_chart" size={32} /> AI Stock Dashboard</h1>
          <p className="header-subtitle">Intelligent Market Analysis & Trading Opportunities</p>
        </div>
        <MarketStatus />
      </header>

      {/* AI Search - Primary Interface */}
      <section className="ai-search-section">
        <form onSubmit={handleAISearch} className="ai-search-form">
          <div className="search-input-wrapper">
            <Icon name="search" size={24} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stocks by symbol or company name (e.g., RELIANCE, TCS)..."
              className="ai-search-input"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="clear-search-btn"
              >
                <Icon name="close" size={20} />
              </button>
            )}
          </div>
          <button type="submit" disabled={isSearching} className="btn-search">
            {isSearching ? (
              <>
                <span className="spinner-small"></span> Searching...
              </>
            ) : (
              <>
                <Icon name="psychology" size={20} /> AI Search
              </>
            )}
          </button>
        </form>

        {/* Indicator Filters - Always Visible */}
        <div className="indicator-filters">
          <div className="filters-header">
            <h3><Icon name="tune" size={20} /> Technical Indicators Filter</h3>
            <button 
              type="button"
              onClick={() => toggleSection('filters')}
              className="toggle-btn"
            >
              {expandedSections.filters ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {expandedSections.filters && (
            <div className="filters-grid-inline">
              <div className="filter-item">
                <label>
                  <Icon name="show_chart" size={16} /> RSI Range
                </label>
                <div className="filter-range">
                  <input
                    type="number"
                    value={indicatorFilters.minRSI}
                    onChange={(e) => setIndicatorFilters({...indicatorFilters, minRSI: e.target.value})}
                    placeholder="Min"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={indicatorFilters.maxRSI}
                    onChange={(e) => setIndicatorFilters({...indicatorFilters, maxRSI: e.target.value})}
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="filter-item-checks">
                <label className="checkbox-filter">
                  <input
                    type="checkbox"
                    checked={indicatorFilters.priceAboveSMA}
                    onChange={(e) => setIndicatorFilters({...indicatorFilters, priceAboveSMA: e.target.checked})}
                  />
                  <Icon name="trending_up" size={16} /> Price Above SMA
                </label>
                <label className="checkbox-filter">
                  <input
                    type="checkbox"
                    checked={indicatorFilters.bullishMACD}
                    onChange={(e) => setIndicatorFilters({...indicatorFilters, bullishMACD: e.target.checked})}
                  />
                  <Icon name="analytics" size={16} /> Bullish MACD
                </label>
                <label className="checkbox-filter">
                  <input
                    type="checkbox"
                    checked={indicatorFilters.positiveMomentum}
                    onChange={(e) => setIndicatorFilters({...indicatorFilters, positiveMomentum: e.target.checked})}
                  />
                  <Icon name="rocket_launch" size={16} /> Positive Momentum
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <h3>Search Results ({searchResults.length})</h3>
            <div className="results-grid">
              {searchResults.slice(0, visibleCards).map((result) => (
                <div key={result.symbol} className="result-card">
                  <div className="result-header">
                    <div>
                      <div className="result-symbol">{result.symbol}</div>
                      <div className="result-action">{result.action}</div>
                    </div>
                    <div className="result-confidence">
                      <div className="confidence-score">{result.confidence}%</div>
                      <div className="confidence-label">Confidence</div>
                    </div>
                  </div>
                  <div className="result-details">
                    <div className="detail-item">
                      <span>Entry:</span> <strong>₹{result.entry?.toFixed(2)}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Target:</span> <strong className="text-green">₹{result.target?.toFixed(2)}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Stop Loss:</span> <strong className="text-red">₹{result.stopLoss?.toFixed(2)}</strong>
                    </div>
                  </div>
                  <div className="result-actions">
                    <button onClick={() => handleAddToWatchlist(result.symbol)} className="btn-small btn-primary">
                      <Icon name="add" size={16} /> Watchlist
                    </button>
                    <button onClick={() => handleAddToRiskCalc(result)} className="btn-small btn-secondary">
                      <Icon name="calculate" size={16} /> Calculate
                    </button>
                    <button onClick={() => setSelectedStock(result.symbol)} className="btn-small btn-outline">
                      <Icon name="analytics" size={16} /> Analyze
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {visibleCards < searchResults.length && (
              <button
                onClick={() => setVisibleCards(prev => prev + CARDS_PER_PAGE)}
                className="load-more-btn"
              >
                Load More ({searchResults.length - visibleCards} remaining)
              </button>
            )}
          </div>
        )}
      </section>

      {/* AI Stock Showcase - Unified Trading Opportunities + Premium Signals */}
      <AIStockShowcase 
        watchlist={watchlist}
        onAddToWatchlist={handleAddToWatchlist}
        onAddToRiskCalc={handleAddToRiskCalc}
        cachedData={dataCache.stockShowcase}
        onUpdateCache={(updates) => updateCache('stockShowcase', updates)}
      />

      {/* Market Intelligence - Collapsible */}
      <section className="collapsible-section">
        <button 
          onClick={() => toggleSection('intelligence')}
          className="section-toggle"
        >
          <div className="section-toggle-title">
            <Icon name="psychology" size={24} />
            <span>Market Intelligence</span>
            <span className="section-badge">Sentiment & Analysis</span>
          </div>
          <Icon name={expandedSections.intelligence ? 'expand_less' : 'expand_more'} size={24} />
        </button>
        {expandedSections.intelligence && (
          <div className="section-content">
            <MarketIntelligence 
              cachedData={dataCache.marketIntelligence}
              onUpdateCache={(updates) => updateCache('marketIntelligence', updates)}
            />
          </div>
        )}
      </section>

      {/* Risk Calculator - Collapsible */}
      <section className="collapsible-section">
        <button 
          onClick={() => toggleSection('risk')}
          className="section-toggle"
        >
          <div className="section-toggle-title">
            <Icon name="calculate" size={24} />
            <span>Risk Calculator</span>
            <span className="section-badge">Position Sizing</span>
          </div>
          <Icon name={expandedSections.risk ? 'expand_less' : 'expand_more'} size={24} />
        </button>
        {expandedSections.risk && (
          <div className="section-content">
            <RiskCalculator 
              prefillData={riskCalcPrefill}
              onClearPrefill={() => setRiskCalcPrefill(null)}
            />
          </div>
        )}
      </section>

      {/* Watchlist Manager - Collapsible */}
      <section className="collapsible-section">
        <button 
          onClick={() => toggleSection('watchlist')}
          className="section-toggle"
        >
          <div className="section-toggle-title">
            <Icon name="bookmark" size={24} />
            <span>My Watchlist</span>
            <span className="section-badge">{watchlist.length} stocks</span>
          </div>
          <Icon name={expandedSections.watchlist ? 'expand_less' : 'expand_more'} size={24} />
        </button>
        {expandedSections.watchlist && (
          <div className="section-content">
            <WatchlistManager 
              currentStocks={watchlist}
              onWatchlistChange={handleWatchlistChange}
              onStocksChange={handleStocksChange}
            />

            {/* Stock Cards */}
            {watchlist.length > 0 ? (
              <>
                <div className="watchlist-grid">
                  {watchlist.slice(0, visibleCards).map((symbol) => (
                    <StockCard
                      key={`${symbol}-${refreshKey}`}
                      symbol={symbol}
                      onAnalyze={setSelectedStock}
                      onRemove={handleRemoveStock}
                      onChart={setChartStock}
                    />
                  ))}
                </div>
                
                {visibleCards < watchlist.length && (
                  <div className="load-more-container">
                    <button
                      onClick={() => setVisibleCards(prev => prev + CARDS_PER_PAGE)}
                      className="load-more-btn"
                    >
                      Load More ({watchlist.length - visibleCards} remaining)
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><Icon name="trending_up" size={48} /></div>
                <div className="empty-title">Your watchlist is empty</div>
                <div className="empty-subtitle">Use AI search to find stocks</div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modals */}
      {selectedStock && (
        <AnalysisModal symbol={selectedStock} onClose={() => setSelectedStock(null)} />
      )}

      {chartStock && (
        <StockChart symbol={chartStock} onClose={() => setChartStock(null)} />
      )}
    </div>
  );
}

export default App;
