import { useState, useEffect } from 'react';
import StockCard from './components/StockCard';
import AnalysisModal from './components/AnalysisModal';
import SplashScreen from './components/SplashScreen';
import MarketStatus from './components/MarketStatus';
import StockChart from './components/StockChart';
import WatchlistManager from './components/WatchlistManager';
import TradingOpportunities from './components/TradingOpportunities';
import MarketIntelligence from './components/MarketIntelligence';
import PremiumSignals from './components/PremiumSignals';
import RiskCalculator from './components/RiskCalculator';

const API_BASE = '/api';
const CARDS_PER_PAGE = 10;

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCards, setVisibleCards] = useState(CARDS_PER_PAGE);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, signals, intelligence, risk
  const defaultWatchlist = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK'];
  
  // Initialize watchlist from localStorage if available
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('stock-dashboard-watchlists');
    if (saved) {
      const watchlists = JSON.parse(saved);
      const defaultWl = watchlists['default'];
      return defaultWl?.stocks || defaultWatchlist;
    }
    return defaultWatchlist;
  });
  const [activeWatchlistId, setActiveWatchlistId] = useState('default');
  const [newSymbol, setNewSymbol] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [chartStock, setChartStock] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showStrategyDetails, setShowStrategyDetails] = useState(false);
  
  const [strategy, setStrategy] = useState('balanced');
  const [strategyDetails, setStrategyDetails] = useState(null);
  const [capSize, setCapSize] = useState('all');
  const [sector, setSector] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sectorLeadersOnly, setSectorLeadersOnly] = useState(false);
  const [scanResults, setScanResults] = useState(null);

  useEffect(() => {
    if (!isLoading && strategy) {
      fetch(`${API_BASE}/screener/strategies/${strategy}`)
        .then(res => res.json())
        .then(data => setStrategyDetails(data))
        .catch(err => console.error('Failed to load strategy:', err));
    }
  }, [strategy, isLoading]);

  if (isLoading) {
    return <SplashScreen onReady={() => setIsLoading(false)} />;
  }

  const addStock = (e) => {
    e.preventDefault();
    if (newSymbol && !watchlist.includes(newSymbol.toUpperCase())) {
      setWatchlist([...watchlist, newSymbol.toUpperCase()]);
      setNewSymbol('');
    }
  };

  const removeStock = (symbol) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
  };

  const findOpportunities = async () => {
    setScanning(true);
    setScanResults(null);
    try {
      const filterPayload = {
        strategy,
        capSize,
        sector: sector === 'all' ? null : sector,
        maxResults: 8,
        signalType: 'BUY',
        minPrice: minPrice ? parseFloat(minPrice) : 0,
        maxPrice: maxPrice ? parseFloat(maxPrice) : 999999,
        sectorLeadersOnly
      };

      const response = await fetch(`${API_BASE}/screener/find-opportunities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filterPayload)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Screening failed');
      }

      const data = await response.json();
      setScanResults(data);
      
      if (data.opportunities && data.opportunities.length > 0) {
        setWatchlist(data.opportunities.map(o => o.symbol));
        setVisibleCards(CARDS_PER_PAGE); // Reset pagination
      } else {
        alert('No opportunities found. Try adjusting your filters.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    }
    setScanning(false);
  };

  const refreshWatchlist = () => setRefreshKey(prev => prev + 1);
  const resetToDefault = () => {
    setWatchlist(defaultWatchlist);
    setRefreshKey(prev => prev + 1);
    setScanResults(null);
    setVisibleCards(CARDS_PER_PAGE);
  };

  const handleWatchlistChange = (id) => {
    setActiveWatchlistId(id);
    setRefreshKey(prev => prev + 1);
    setScanResults(null);
    setVisibleCards(CARDS_PER_PAGE);
  };

  const handleStocksChange = (stocks) => {
    setWatchlist(stocks);
    setRefreshKey(prev => prev + 1);
    setVisibleCards(CARDS_PER_PAGE);
  };

  const sectors = ['IT', 'Banking', 'Auto', 'Pharma', 'Energy', 'FMCG', 'Metals', 'Telecom', 'Cement', 'Finance'];

  const handleAddToWatchlist = (symbol) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist([...watchlist, symbol]);
      setRefreshKey(prev => prev + 1);
    }
  };

  // Tab navigation configuration
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', description: 'Screener & Watchlist' },
    { id: 'signals', label: '⭐ Premium Signals', description: 'AI High-Quality Picks' },
    { id: 'intelligence', label: '🧠 Market Intel', description: 'Sentiment & Analysis' },
    { id: 'risk', label: '📊 Risk Calculator', description: 'Position Sizing' }
  ];

  return (
    <div className="container">
      <div className="header">
        <h1>📊 Advanced Stock Screener</h1>
        <p>Strategy-Based Analysis • Pattern Recognition • Sector Intelligence</p>
      </div>

      {/* Market Status Banner */}
      <MarketStatus />

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        padding: '8px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        overflowX: 'auto'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              flex: 1,
              minWidth: '150px',
              textAlign: 'center'
            }}
          >
            <div>{tab.label}</div>
            <div style={{ 
              fontSize: '0.7rem', 
              fontWeight: '400',
              opacity: activeTab === tab.id ? 0.9 : 0.7,
              marginTop: '2px'
            }}>
              {tab.description}
            </div>
          </button>
        ))}
      </div>

      {/* Premium Signals Tab */}
      {activeTab === 'signals' && (
        <PremiumSignals onAddToWatchlist={handleAddToWatchlist} />
      )}

      {/* Market Intelligence Tab */}
      {activeTab === 'intelligence' && (
        <MarketIntelligence />
      )}

      {/* Risk Calculator Tab */}
      {activeTab === 'risk' && (
        <RiskCalculator />
      )}

      {/* Dashboard Tab - Original Content */}
      {activeTab === 'dashboard' && (
        <>
          {/* AI Trading Opportunities */}
          <TradingOpportunities 
            watchlist={watchlist}
            onAddToWatchlist={handleAddToWatchlist}
          />

      {/* Watchlist Manager */}
      <WatchlistManager 
        currentStocks={watchlist}
        onWatchlistChange={handleWatchlistChange}
        onStocksChange={handleStocksChange}
      />

      <form onSubmit={addStock} className="add-stock-form">
        <input
          type="text"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Enter stock symbol (e.g., WIPRO)"
        />
        <button type="submit">Add Stock</button>
      </form>

      {/* Strategy Selector */}
      <div style={{ marginBottom: '20px', padding: '24px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '600', minWidth: '140px', color: 'var(--text-primary)' }}>Trading Strategy</label>
          <select 
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            style={{ flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', fontSize: '0.95rem', minWidth: '200px' }}
          >
            <option value="short-term">Short-Term (1-7 days) - 80% Technical</option>
            <option value="balanced">Balanced (1-4 weeks) - 60% Technical</option>
            <option value="long-term">Long-Term (3-12 months) - 40% Technical</option>
          </select>
          <button
            onClick={() => setShowStrategyDetails(!showStrategyDetails)}
            style={{ padding: '12px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', cursor: 'pointer', fontWeight: '500' }}
          >
            {showStrategyDetails ? 'Hide Details' : 'View Details'}
          </button>
        </div>

        {showStrategyDetails && strategyDetails && (
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-sm)', marginTop: '15px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)', fontWeight: '600', marginBottom: '8px' }}>{strategyDetails.name}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>{strategyDetails.description}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Weights</div>
                <div style={{ fontSize: '0.9rem' }}>
                  <div style={{ marginBottom: '4px' }}>Technical: <span style={{ color: 'var(--accent-green)', fontWeight: '700' }}>{(strategyDetails.weights.technical * 100).toFixed(0)}%</span></div>
                  <div>Fundamental: <span style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>{(strategyDetails.weights.fundamental * 100).toFixed(0)}%</span></div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Min Confidence</div>
                <span style={{ color: 'var(--accent-orange)', fontWeight: '700', fontSize: '1.5rem' }}>{strategyDetails.minConfidence}+</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          style={{ padding: '14px 24px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', width: '100%', fontSize: '0.95rem', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <span>{showFilters ? '▾' : '▸'}</span>
          {showFilters ? 'Hide Filters' : 'Advanced Filters'}
        </button>

        {showFilters && (
          <div style={{ marginTop: '12px', padding: '24px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Market Cap</label>
                <select 
                  value={capSize}
                  onChange={(e) => setCapSize(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
                >
                  <option value="all">All Caps</option>
                  <option value="largeCap">Large Cap</option>
                  <option value="midCap">Mid Cap</option>
                  <option value="smallCap">Small Cap</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sector</label>
                <select 
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
                >
                  <option value="all">All Sectors</option>
                  {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Min Price (₹)</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Max Price (₹)</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="No limit"
                  style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={sectorLeadersOnly}
                onChange={(e) => setSectorLeadersOnly(e.target.checked)}
                style={{ marginRight: '10px', width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
              />
              <span style={{ fontWeight: '500' }}>Sector Leaders Only</span>
            </label>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={findOpportunities}
          disabled={scanning}
          style={{ 
            flex: 2, 
            padding: '16px 24px', 
            background: scanning ? 'var(--bg-secondary)' : 'var(--accent-primary)', 
            color: scanning ? 'var(--text-muted)' : 'white', 
            border: 'none', 
            borderRadius: 'var(--radius-sm)', 
            fontSize: '1rem', 
            fontWeight: '600', 
            cursor: scanning ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {scanning ? 'Scanning...' : 'Find Opportunities'}
        </button>
        <button 
          onClick={refreshWatchlist}
          style={{ 
            flex: 1, 
            padding: '16px', 
            background: 'var(--bg-card)', 
            color: 'var(--text-primary)', 
            border: '1px solid var(--border-light)', 
            borderRadius: 'var(--radius-sm)', 
            fontSize: '0.95rem', 
            fontWeight: '600', 
            cursor: 'pointer' 
          }}
        >
          Refresh
        </button>
        <button 
          onClick={resetToDefault}
          style={{ 
            flex: 1, 
            padding: '16px', 
            background: 'var(--bg-card)', 
            color: 'var(--accent-red)', 
            border: '1px solid var(--border-light)', 
            borderRadius: 'var(--radius-sm)', 
            fontSize: '0.95rem', 
            fontWeight: '600', 
            cursor: 'pointer' 
          }}
        >
          Reset
        </button>
      </div>

      {/* Scan Results */}
      {scanResults && scanResults.strategy && (
        <div style={{ background: 'var(--bg-card)', padding: '20px 24px', borderRadius: 'var(--radius-md)', marginBottom: '24px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Scan Results</span>
            <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              Found <span style={{ color: 'var(--accent-green)' }}>{scanResults.totalFound}</span> opportunities
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            <div>Scanned {scanResults.totalScanned} stocks</div>
            <div>Strategy: {scanResults.strategy.name}</div>
          </div>
        </div>
      )}

      {/* Scanning Indicator */}
      {scanning && (
        <div style={{ textAlign: 'center', padding: '48px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', marginBottom: '24px', border: '1px solid var(--border-light)' }}>
          <div className="spinner" style={{ margin: '0 auto 24px' }}></div>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>Scanning with {strategyDetails?.name || 'Balanced'} strategy</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>This may take 30-60 seconds</div>
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
              onRemove={removeStock}
              onChart={setChartStock}
            />
          ))}
        </div>
        
        {/* Load More Button */}
        {visibleCards < watchlist.length && (
          <div style={{ textAlign: 'center', marginTop: '24px', marginBottom: '20px' }}>
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
          <div className="empty-icon">📈</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>Your watchlist is empty</div>
          <div>Select a strategy and click "Find Opportunities"</div>
        </div>
      )}

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
