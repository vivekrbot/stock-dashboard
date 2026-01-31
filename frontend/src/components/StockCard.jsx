import { useState, useEffect } from 'react';

function StockCard({ symbol, onAnalyze, onRemove }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStock();
  }, [symbol]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/stock/${symbol}`);
      const stockData = await response.json();
      setData(stockData);
    } catch (error) {
      console.error('Error fetching stock:', error);
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
          <div className="stock-exchange">NSE</div>
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