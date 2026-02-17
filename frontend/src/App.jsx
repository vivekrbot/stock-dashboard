import { useState, useCallback } from 'react';
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

const CARDS_PER_PAGE = 10;
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
    watchlist: false
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
  
  // Modal state
  const [selectedStock, setSelectedStock] = useState(null);
  const [chartStock, setChartStock] = useState(null);
  
  // Risk Calculator prefill state
  const [riskCalcPrefill, setRiskCalcPrefill] = useState(null);

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

  // Toggle section visibility
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Show splash screen
  if (isLoading) {
    return <SplashScreen onReady={() => setIsLoading(false)} />;
  }

  // Handlers
  const handleRemoveStock = (symbol) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
    toast.info(`${symbol} removed from watchlist`);
  };

  const handleWatchlistChange = () => {
    setRefreshKey(prev => prev + 1);
    setVisibleCards(CARDS_PER_PAGE);
  };

  const handleStocksChange = (stocks) => {
    setWatchlist(stocks);
    setRefreshKey(prev => prev + 1);
    setVisibleCards(CARDS_PER_PAGE);
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
