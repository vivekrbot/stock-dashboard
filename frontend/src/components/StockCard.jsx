import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Fallback mock data for when API is unavailable
const MOCK_STOCKS = {
  'RELIANCE': { price: 1395.40, change: 4.40, percentChange: 0.32, high: 1398, low: 1378.5, open: 1382.6, previousClose: 1391 },
  'TCS': { price: 3850.25, change: -12.50, percentChange: -0.32, high: 3875, low: 3840, open: 3860, previousClose: 3862.75 },
  'INFY': { price: 1580.60, change: 8.20, percentChange: 0.52, high: 1590, low: 1570, open: 1575, previousClose: 1572.40 },
  'HDFCBANK': { price: 1625.80, change: -5.30, percentChange: -0.32, high: 1640, low: 1620, open: 1635, previousClose: 1631.10 },
  'WIPRO': { price: 285.45, change: 2.15, percentChange: 0.76, high: 288, low: 283, open: 284, previousClose: 283.30 },
  'ICICIBANK': { price: 1095.20, change: 7.80, percentChange: 0.72, high: 1100, low: 1085, open: 1088, previousClose: 1087.40 },
  'SBIN': { price: 785.60, change: -3.20, percentChange: -0.41, high: 792, low: 782, open: 790, previousClose: 788.80 },
  'BHARTIARTL': { price: 1520.30, change: 15.40, percentChange: 1.02, high: 1528, low: 1505, open: 1510, previousClose: 1504.90 },
};

function StockCard({ symbol, onAnalyze, onRemove }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    fetchStock();
  }, [symbol]);

  const fetchStock = async () => {
    setLoading(true);
    setUsingMock(false);
    
    try {
      const response = await fetch(`${API_BASE}/api/stock/${symbol}`, {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const stockData = await response.json();
      
      if (stockData.error) {
        throw new Error(stockData.error);
      }
      
      setData(stockData);
    } catch (error) {
      console.warn(`API failed for ${symbol}, using mock data:`, error.message);
      
      // Use mock data as fallback
      if (MOCK_STOCKS[symbol]) {
        setData({ symbol, ...MOCK_STOCKS[symbol], source: 'Mock Data' });
        setUsingMock(true);
      } else {
        // Generate random mock data for unknown symbols
        const basePrice = 500 + Math.random() * 2000;
        const change = (Math.random() - 0.5) * 20;
        setData({
          symbol,
          price: basePrice,
          change: change,
          percentChange: (change / basePrice) * 100,
          high: basePrice * 1.02,
          low: basePrice * 0.98,
          open: basePrice * 0.99,
          previousClose: basePrice - change,
          source: 'Mock Data'
        });
        setUsingMock(true);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="stock-card">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isPositive = data.percentChange >= 0;

  return (
    <div className="stock-card">
      <div className="stock-header">
        <div>
          <div className="stock-symbol">{symbol}</div>
          <div className="stock-exchange">
            NSE {usingMock && <span style={{color: '#f59e0b', fontSize: '0.7rem'}}>(Demo)</span>}
          </div>
        </div>
        <button onClick={() => onRemove(symbol)} className="remove-btn">×</button>
      </div>

      <div className="stock-price">₹{data.price?.toFixed(2) || 'N/A'}</div>
      
      <div className={`stock-change ${isPositive ? 'positive' : 'negative'}`}>
        <span>{isPositive ? '↑' : '↓'}</span>
        <span>{data.change?.toFixed(2)} ({data.percentChange?.toFixed(2)}%)</span>
      </div>

      <div className="stock-details">
        <div>High: <span>₹{data.high?.toFixed(2)}</span></div>
        <div>Low: <span>₹{data.low?.toFixed(2)}</span></div>
        <div>Open: <span>₹{data.open?.toFixed(2)}</span></div>
        <div>Prev: <span>₹{data.previousClose?.toFixed(2)}</span></div>
      </div>

      <button onClick={() => onAnalyze(symbol)} className="analyze-btn">
        Analyze Stock
      </button>
    </div>
  );
}

export default StockCard;