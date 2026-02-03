import { useState, useEffect, useCallback } from 'react';
import StockCard from './components/StockCard';
import AnalysisModal from './components/AnalysisModal';
import SplashScreen from './components/SplashScreen';
import MarketStatus from './components/MarketStatus';
import StockChart from './components/StockChart';
import WatchlistManager from './components/WatchlistManager';
import TradingOpportunities from './components/TradingOpportunities';
import MarketIntelligence from './components/MarketIntelligence';
import PremiumSignals from './components/PremiumSignals';
import PredictiveSwingPanel from './components/PredictiveSwingPanel';
import RiskCalculator from './components/RiskCalculator';
import { useToast } from './components/Toast';
import Icon from './components/Icon';

const API_BASE = '/api';
const CARDS_PER_PAGE = 10;
const SECTORS = ['IT', 'Banking', 'Auto', 'Pharma', 'Energy', 'FMCG', 'Metals', 'Telecom', 'Cement', 'Finance'];
const DEFAULT_WATCHLIST = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK'];

const TABS = [
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', description: 'Screener & Watchlist' },
  { id: 'swing', icon: 'insights', label: 'Swing Signals', description: 'Predictive Analysis' },
  { id: 'signals', icon: 'star', label: 'Premium Signals', description: 'AI High-Quality Picks' },
  { id: 'intelligence', icon: 'psychology', label: 'Market Intel', description: 'Sentiment & Analysis' },
  { id: 'risk', icon: 'calculate', label: 'Risk Calculator', description: 'Position Sizing' }
];

function App() {
  const toast = useToast();
  
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [visibleCards, setVisibleCards] = useState(CARDS_PER_PAGE);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Watchlist state
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('stock-dashboard-watchlists');
    if (saved) {
      const watchlists = JSON.parse(saved);
      return watchlists['default']?.stocks || DEFAULT_WATCHLIST;
    }
    return DEFAULT_WATCHLIST;
  });
  
  // Form state
  const [newSymbol, setNewSymbol] = useState('');
  
  // Modal state
  const [selectedStock, setSelectedStock] = useState(null);
  const [chartStock, setChartStock] = useState(null);
  
  // Risk Calculator prefill state
  const [riskCalcPrefill, setRiskCalcPrefill] = useState(null);
  
  // Screener state
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [strategy, setStrategy] = useState('balanced');
  const [strategyDetails, setStrategyDetails] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showStrategyDetails, setShowStrategyDetails] = useState(false);
  
  // Filter state
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
    premiumSignals: { data: null, timestamp: null, loading: false },
    predictiveSwing: { data: null, timestamp: null, loading: false },
    opportunities: { data: null, timestamp: null, loading: false, scanType: 'all' },
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
    setActiveTab('risk');
    toast.success(`${stockData.symbol} added to Risk Calculator`, 'Trade Setup');
  }, [toast]);

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
      {/* Header */}
      <header className="header">
        <h1><Icon name="analytics" size={28} /> Advanced Stock Screener</h1>
        <p>Strategy-Based Analysis • Pattern Recognition • Sector Intelligence</p>
      </header>

      {/* Market Status */}
      <MarketStatus />

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <div><Icon name={tab.icon} size={18} /> {tab.label}</div>
            <div className="nav-tab-desc">{tab.description}</div>
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      {activeTab === 'swing' && (
        <PredictiveSwingPanel 
          onAddToWatchlist={handleAddToWatchlist}
          onAddToRiskCalc={handleAddToRiskCalc}
          cachedData={dataCache.predictiveSwing}
          onUpdateCache={(updates) => updateCache('predictiveSwing', updates)}
        />
      )}

      {activeTab === 'signals' && (
        <PremiumSignals 
          onAddToWatchlist={handleAddToWatchlist}
          onAddToRiskCalc={handleAddToRiskCalc}
          cachedData={dataCache.premiumSignals}
          onUpdateCache={(updates) => updateCache('premiumSignals', updates)}
        />
      )}

      {activeTab === 'intelligence' && (
        <MarketIntelligence 
          cachedData={dataCache.marketIntelligence}
          onUpdateCache={(updates) => updateCache('marketIntelligence', updates)}
        />
      )}

      {activeTab === 'risk' && (
        <RiskCalculator 
          prefillData={riskCalcPrefill}
          onClearPrefill={() => setRiskCalcPrefill(null)}
        />
      )}

      {activeTab === 'dashboard' && (
        <>
          {/* AI Trading Opportunities */}
          <TradingOpportunities 
            watchlist={watchlist}
            onAddToWatchlist={handleAddToWatchlist}
            onAddToRiskCalc={handleAddToRiskCalc}
            cachedData={dataCache.opportunities}
            onUpdateCache={(updates) => updateCache('opportunities', updates)}
          />

          {/* Watchlist Manager */}
          <WatchlistManager 
            currentStocks={watchlist}
            onWatchlistChange={handleWatchlistChange}
            onStocksChange={handleStocksChange}
          />

          {/* Add Stock Form */}
          <form onSubmit={handleAddStock} className="add-stock-form">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="Enter stock symbol (e.g., WIPRO)"
            />
            <button type="submit">Add Stock</button>
          </form>

          {/* Strategy Selector */}
          <section className="card" style={{ marginBottom: '20px' }}>
            <div className="strategy-row">
              <label className="strategy-label">Trading Strategy</label>
              <select 
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="strategy-select"
              >
                <option value="short-term">Short-Term (1-7 days) - 80% Technical</option>
                <option value="balanced">Balanced (1-4 weeks) - 60% Technical</option>
                <option value="long-term">Long-Term (3-12 months) - 40% Technical</option>
              </select>
              <button
                type="button"
                onClick={() => setShowStrategyDetails(!showStrategyDetails)}
                className="btn-secondary"
              >
                {showStrategyDetails ? 'Hide Details' : 'View Details'}
              </button>
            </div>

            {showStrategyDetails && strategyDetails && (
              <div className="strategy-details">
                <h3>{strategyDetails.name}</h3>
                <p>{strategyDetails.description}</p>
                <div className="strategy-grid">
                  <div className="strategy-card">
                    <span className="label">Weights</span>
                    <div>Technical: <strong className="text-green">{(strategyDetails.weights.technical * 100).toFixed(0)}%</strong></div>
                    <div>Fundamental: <strong className="text-blue">{(strategyDetails.weights.fundamental * 100).toFixed(0)}%</strong></div>
                  </div>
                  <div className="strategy-card">
                    <span className="label">Min Confidence</span>
                    <strong className="text-orange text-xl">{strategyDetails.minConfidence}+</strong>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Advanced Filters */}
          <section style={{ marginBottom: '20px' }}>
            <button 
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="btn-filter-toggle"
            >
              <span>{showFilters ? '▾' : '▸'}</span>
              {showFilters ? 'Hide Filters' : 'Advanced Filters'}
            </button>

            {showFilters && (
              <div className="filters-panel">
                <div className="filters-grid">
                  <div className="filter-group">
                    <label>Market Cap</label>
                    <select 
                      value={filters.capSize}
                      onChange={(e) => updateFilter('capSize', e.target.value)}
                    >
                      <option value="all">All Caps</option>
                      <option value="largeCap">Large Cap</option>
                      <option value="midCap">Mid Cap</option>
                      <option value="smallCap">Small Cap</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Sector</label>
                    <select 
                      value={filters.sector}
                      onChange={(e) => updateFilter('sector', e.target.value)}
                    >
                      <option value="all">All Sectors</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Min Price (₹)</label>
                    <input
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) => updateFilter('minPrice', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="filter-group">
                    <label>Max Price (₹)</label>
                    <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => updateFilter('maxPrice', e.target.value)}
                      placeholder="No limit"
                    />
                  </div>
                </div>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.sectorLeadersOnly}
                    onChange={(e) => updateFilter('sectorLeadersOnly', e.target.checked)}
                  />
                  <span>Sector Leaders Only</span>
                </label>
              </div>
            )}
          </section>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button 
              onClick={handleFindOpportunities}
              disabled={scanning}
              className="btn-primary btn-large"
            >
              {scanning ? 'Scanning...' : 'Find Opportunities'}
            </button>
            <button onClick={handleRefresh} className="btn-secondary">
              Refresh
            </button>
            <button onClick={handleReset} className="btn-danger">
              Reset
            </button>
          </div>

          {/* Scan Results Summary */}
          {scanResults?.strategy && (
            <div className="scan-results">
              <div>
                <span className="label">Scan Results</span>
                <div className="scan-count">
                  Found <span className="text-green">{scanResults.totalFound}</span> opportunities
                </div>
              </div>
              <div className="scan-meta">
                <div>Scanned {scanResults.totalScanned} stocks</div>
                <div>Strategy: {scanResults.strategy.name}</div>
              </div>
            </div>
          )}

          {/* Scanning Indicator */}
          {scanning && (
            <div className="scanning-indicator">
              <div className="spinner"></div>
              <div className="scanning-title">Scanning with {strategyDetails?.name || 'Balanced'} strategy</div>
              <div className="scanning-subtitle">This may take 30-60 seconds</div>
            </div>
          )}

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
                    onRisk={(stockData) => {
                      // Calculate smart SL and target from stock data
                      const price = stockData.price || 0;
                      const low = stockData.low || price * 0.98;
                      const suggestedSL = Math.min(low * 0.995, price * 0.98);
                      const risk = price - suggestedSL;
                      const suggestedTarget = price + (risk * 2);
                      
                      // Prefill RiskCalculator and switch to risk tab
                      setRiskCalcPrefill({
                        symbol: stockData.symbol,
                        entry: Math.round(price * 100) / 100,
                        stopLoss: Math.round(suggestedSL * 100) / 100,
                        target: Math.round(suggestedTarget * 100) / 100,
                        action: stockData.percentChange >= 0 ? 'BUY' : 'WATCH',
                        confidence: 75
                      });
                      setActiveTab('risk');
                      toast.success(`${stockData.symbol} loaded into Risk Calculator`);
                    }}
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
              <div className="empty-subtitle">Select a strategy and click "Find Opportunities"</div>
            </div>
          )}

          {/* Modals */}
          {selectedStock && (
            <AnalysisModal symbol={selectedStock} onClose={() => setSelectedStock(null)} />
          )}

          {chartStock && (
            <StockChart symbol={chartStock} onClose={() => setChartStock(null)} />
          )}
        </>
      )}
    </div>
  );
}

export default App;
