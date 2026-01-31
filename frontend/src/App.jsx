import { useState, useEffect } from 'react';
import StockCard from './components/StockCard';
import AnalysisModal from './components/AnalysisModal';
import SplashScreen from './components/SplashScreen';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const defaultWatchlist = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK'];
  const [watchlist, setWatchlist] = useState(defaultWatchlist);
  const [newSymbol, setNewSymbol] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showStrategyDetails, setShowStrategyDetails] = useState(false);
  
  // Filter states
  const [strategy, setStrategy] = useState('balanced');
  const [strategyDetails, setStrategyDetails] = useState(null);
  const [capSize, setCapSize] = useState('all');
  const [sector, setSector] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sectorLeadersOnly, setSectorLeadersOnly] = useState(false);
  
  const [scanResults, setScanResults] = useState(null);

  // Show splash screen first
  if (isLoading) {
    return <SplashScreen onReady={() => setIsLoading(false)} />;
  }

  // Fetch strategy details when strategy changes
  useEffect(() => {
    if (strategy) {
      fetch(`${API_BASE}/api/screener/strategies/${strategy}`)
        .then(res => res.json())
        .then(data => setStrategyDetails(data))
        .catch(err => console.error('Error fetching strategy:', err));
    }
  }, [strategy]);

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

    const response = await fetch(`${API_BASE}/api/screener/find-opportunities`, {
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
      const symbols = data.opportunities.map(o => o.symbol);
      setWatchlist(symbols);
    } else {
      alert('⚠️ No opportunities found. This could be due to:\n- Strict filters\n- NSE API rate limiting\n- Market conditions\n\nTry adjusting your criteria or wait a few minutes.');
    }
  } catch (error) {
    console.error('Error finding opportunities:', error);
    alert(`❌ REAL DATA ERROR:\n\n${error.message}\n\nNSE may be blocking requests or experiencing downtime. Please try again in a few minutes.`);
  }
  setScanning(false);
};

  const refreshWatchlist = () => {
    setRefreshKey(prev => prev + 1);
  };

  const resetToDefault = () => {
    setWatchlist(defaultWatchlist);
    setRefreshKey(prev => prev + 1);
    setScanResults(null);
  };

  const sectors = [
    'IT', 'Banking', 'Auto', 'Pharma', 'Energy', 'FMCG', 
    'Metals', 'Telecom', 'Cement', 'Finance'
  ];

  return (
    <div className="container">
      <div className="header">
        <h1>📊 Advanced Stock Screener</h1>
        <p>Strategy-Based Analysis • Pattern Recognition • Sector Intelligence</p>
      </div>

      <form onSubmit={addStock} className="add-stock-form">
        <input
          type="text"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Enter stock symbol (e.g., WIPRO)"
        />
        <button type="submit">Add Stock</button>
      </form>

      {/* STRATEGY SELECTOR */}
      <div style={{ marginBottom: '20px', padding: '20px', background: '#1e293b', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', minWidth: '150px' }}>
            📈 Trading Strategy:
          </label>
          <select 
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '6px', background: '#334155', color: 'white', border: 'none', fontSize: '1rem' }}
          >
            <option value="short-term">⚡ Short-Term (1-7 days) - 80% Technical</option>
            <option value="balanced">⚖️ Balanced (1-4 weeks) - 60% Technical</option>
            <option value="long-term">📊 Long-Term (3-12 months) - 40% Technical</option>
          </select>
          
          <button
            onClick={() => setShowStrategyDetails(!showStrategyDetails)}
            style={{ padding: '10px 20px', borderRadius: '6px', background: '#475569', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            {showStrategyDetails ? '▼ Hide Details' : '▶ Show Details'}
          </button>
        </div>

        {/* STRATEGY DETAILS */}
        {showStrategyDetails && strategyDetails && (
          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', marginTop: '15px' }}>
            <h3 style={{ marginTop: 0, color: '#60a5fa' }}>
              {strategyDetails.name}
            </h3>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
              {strategyDetails.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div>
                <strong>⚖️ Scoring Weights:</strong>
                <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                  <div>Technical: <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{(strategyDetails.weights.technical * 100).toFixed(0)}%</span></div>
                  <div>Fundamental: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{(strategyDetails.weights.fundamental * 100).toFixed(0)}%</span></div>
                </div>
              </div>

              <div>
                <strong>📊 RSI Thresholds:</strong>
                <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>
                  <div>Large Cap: {strategyDetails.rsi.largeCap.min}-{strategyDetails.rsi.largeCap.max}</div>
                  <div>Mid Cap: {strategyDetails.rsi.midCap.min}-{strategyDetails.rsi.midCap.max}</div>
                  <div>Small Cap: {strategyDetails.rsi.smallCap.min}-{strategyDetails.rsi.smallCap.max}</div>
                </div>
              </div>

              <div>
                <strong>🎯 Min Confidence:</strong>
                <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                  <span style={{ color: '#eab308', fontWeight: 'bold', fontSize: '1.2rem' }}>{strategyDetails.minConfidence}+</span>
                </div>
              </div>

              <div>
                <strong>📈 Pattern Detection:</strong>
                <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                  {strategyDetails.requirePatterns ? (
                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>✅ Required</span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Optional</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADVANCED FILTERS */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          style={{ padding: '12px 24px', background: '#334155', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%', fontSize: '1rem' }}
        >
          {showFilters ? '▼ Hide Advanced Filters' : '▶ Show Advanced Filters'}
        </button>

        {showFilters && (
          <div style={{ marginTop: '15px', padding: '20px', background: '#1e293b', borderRadius: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Market Cap
                </label>
                  <select 
                    value={capSize}
                    onChange={(e) => setCapSize(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#334155', color: 'white', border: 'none' }}
                  >
                  <option value="all">All Caps</option>
                  <option value="largeCap">🔵 Large Cap</option>
                  <option value="midCap">🟡 Mid Cap</option>
                  <option value="smallCap">🔴 Small Cap</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Sector
                </label>
                <select 
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#334155', color: 'white', border: 'none' }}
                >
                  <option value="all">All Sectors</option>
                  {sectors.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Min Price (₹)
                </label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0"
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#334155', color: 'white', border: 'none' }}
                  />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Max Price (₹)
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="No limit"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#334155', color: 'white', border: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sectorLeadersOnly}
                  onChange={(e) => setSectorLeadersOnly(e.target.checked)}
                  style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>🏆 Sector Leaders Only</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <button 
          onClick={findOpportunities}
          disabled={scanning}
          style={{ flex: 2, padding: '15px', background: scanning ? '#475569' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: scanning ? 'not-allowed' : 'pointer' }}
        >
          {scanning ? '🔍 Scanning...' : '🎯 Find Opportunities'}
        </button>
        
        <button 
          onClick={refreshWatchlist}
          style={{ flex: 1, padding: '15px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🔄 Refresh
        </button>
        
        <button 
          onClick={resetToDefault}
          style={{ flex: 1, padding: '15px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🏠 Reset
        </button>
      </div>

      {/* SCAN RESULTS */}
      {scanResults && scanResults.strategy && (
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <strong>📊 Scan Results:</strong> Found <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{scanResults.totalFound}</span> opportunities from <span style={{ color: '#94a3b8' }}>{scanResults.totalScanned}</span> stocks
          </div>
          <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>
            Strategy: {scanResults.strategy.name} | 
            Weights: Tech {(scanResults.strategy.weights.technical*100).toFixed(0)}% / Fund {(scanResults.strategy.weights.fundamental*100).toFixed(0)}%
          </div>
          {scanResults.sectorAverages && Object.keys(scanResults.sectorAverages).length > 0 && (
            <div style={{ fontSize: '0.9rem', marginTop: '10px' }}>
              <strong>📈 Top Sectors:</strong>{' '}
              {Object.entries(scanResults.sectorAverages)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([sec, avg]) => (
                  <span key={sec} style={{ marginRight: '15px' }}>
                    {sec}: <span style={{ color: avg > 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                      {avg > 0 ? '+' : ''}{avg.toFixed(2)}%
                    </span>
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      {/* SCANNING INDICATOR */}
      {scanning && (
        <div style={{ textAlign: 'center', padding: '40px', background: '#1e293b', borderRadius: '8px', marginBottom: '20px' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '10px' }}>
            Scanning with {strategyDetails?.name || 'Balanced'} strategy...
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            This may take 30-60 seconds
          </div>
        </div>
      )}

      {/* STOCK CARDS */}
      {watchlist.length > 0 ? (
        <div className="watchlist-grid">
          {watchlist.map((symbol) => (
            <StockCard
              key={`${symbol}-${refreshKey}`}
              symbol={symbol}
              onAnalyze={setSelectedStock}
              onRemove={removeStock}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>Your watchlist is empty</div>
          <div>Select a strategy and click "Find Opportunities"</div>
        </div>
      )}

      {selectedStock && (
        <AnalysisModal
          symbol={selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
}

export default App;