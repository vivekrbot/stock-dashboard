import { useState, useEffect, useRef } from 'react';

const API_BASE = '/api';

function StockChart({ symbol, onClose }) {
  const [chartData, setChartData] = useState(null);
  const [range, setRange] = useState('1mo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  const ranges = [
    { value: '1d', label: '1D', description: 'Intraday' },
    { value: '5d', label: '5D', description: '5 Days' },
    { value: '1mo', label: '1M', description: '1 Month' },
    { value: '3mo', label: '3M', description: '3 Months' },
    { value: '6mo', label: '6M', description: '6 Months' },
    { value: '1y', label: '1Y', description: '1 Year' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = range === '1d' 
          ? `${API_BASE}/stock/${symbol}/intraday`
          : `${API_BASE}/stock/${symbol}/history?range=${range}`;
        
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to fetch data');
        
        const data = await res.json();
        setChartData(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchData();
  }, [symbol, range]);

  useEffect(() => {
    if (!chartData?.history || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 60, bottom: 40, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const history = chartData.history;
    if (history.length < 2) return;

    // Calculate min/max
    const prices = history.map(d => d.close).filter(p => p != null);
    const minPrice = Math.min(...prices) * 0.995;
    const maxPrice = Math.max(...prices) * 1.005;
    const priceRange = maxPrice - minPrice;

    // Determine if up or down overall
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const isUp = lastPrice >= firstPrice;
    const lineColor = isUp ? '#22c55e' : '#ef4444';
    const fillColor = isUp ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

    // Draw grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines and price labels
    const gridLines = 5;
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight * i / gridLines);
      const price = maxPrice - (priceRange * i / gridLines);
      
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      ctx.fillText(`₹${price.toFixed(2)}`, width - 5, y + 4);
    }

    // Draw the line chart
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    history.forEach((point, i) => {
      if (point.close == null) return;
      
      const x = padding.left + (i / (history.length - 1)) * chartWidth;
      const y = padding.top + ((maxPrice - point.close) / priceRange) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw fill gradient
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Draw date labels
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    
    const labelCount = Math.min(6, history.length);
    const step = Math.floor(history.length / labelCount);
    
    for (let i = 0; i < history.length; i += step) {
      const point = history[i];
      const x = padding.left + (i / (history.length - 1)) * chartWidth;
      const date = new Date(point.date);
      
      let label;
      if (range === '1d') {
        label = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      } else if (range === '5d') {
        label = date.toLocaleDateString('en-IN', { weekday: 'short' });
      } else {
        label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }
      
      ctx.fillText(label, x, height - 10);
    }

    // Draw current price marker
    const lastPoint = history[history.length - 1];
    if (lastPoint && lastPoint.close != null) {
      const x = padding.left + chartWidth;
      const y = padding.top + ((maxPrice - lastPoint.close) / priceRange) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
      
      // Price tag
      ctx.fillStyle = lineColor;
      ctx.fillRect(width - padding.right + 5, y - 10, 50, 20);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`₹${lastPoint.close.toFixed(0)}`, width - padding.right + 10, y + 4);
    }

  }, [chartData, range]);

  const calculateChange = () => {
    if (!chartData?.history || chartData.history.length < 2) return null;
    
    const history = chartData.history;
    const first = history[0].close;
    const last = history[history.length - 1].close;
    const change = last - first;
    const percentChange = (change / first) * 100;
    
    return { change, percentChange, isUp: change >= 0 };
  };

  const stats = calculateChange();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: '#0f172a',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#f8fafc' }}>{symbol}</h2>
            {stats && (
              <div style={{ 
                color: stats.isUp ? '#22c55e' : '#ef4444',
                fontSize: '0.9rem',
                marginTop: '4px'
              }}>
                {stats.isUp ? '▲' : '▼'} ₹{Math.abs(stats.change).toFixed(2)} ({stats.percentChange.toFixed(2)}%)
                <span style={{ color: '#64748b', marginLeft: '8px' }}>
                  {ranges.find(r => r.value === range)?.description}
                </span>
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: 'none',
              color: '#94a3b8',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Range Selector */}
        <div style={{
          padding: '12px 20px',
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #1e293b'
        }}>
          {ranges.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: range === r.value ? '#3b82f6' : '#1e293b',
                color: range === r.value ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: range === r.value ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {r.label}
            </button>
          ))}
          
          {chartData?.isLive && (
            <div style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#22c55e',
              fontSize: '0.85rem'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22c55e',
                animation: 'pulse 2s infinite'
              }} />
              LIVE
            </div>
          )}
        </div>

        {/* Chart Area */}
        <div style={{ padding: '20px' }}>
          {loading ? (
            <div style={{
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b'
            }}>
              Loading chart data...
            </div>
          ) : error ? (
            <div style={{
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}>
              {error}
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '400px',
                borderRadius: '8px'
              }}
            />
          )}
        </div>

        {/* Market Status Footer */}
        {chartData?.marketStatus && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #1e293b',
            background: '#0f172a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem'
          }}>
            <span style={{ color: '#64748b' }}>
              Market: <span style={{ 
                color: chartData.marketStatus.isOpen ? '#22c55e' : '#ef4444',
                fontWeight: 'bold'
              }}>
                {chartData.marketStatus.status}
              </span>
            </span>
            <span style={{ color: '#64748b' }}>
              Data source: {chartData?.meta?.source || 'Unknown'}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default StockChart;
