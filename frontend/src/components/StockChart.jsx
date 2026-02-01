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
    ctx.fillStyle = '#FFFFFF';
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
    const lineColor = isUp ? '#10B981' : '#EF4444';
    const fillColor = isUp ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';

    // Draw grid
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines and price labels
    const gridLines = 5;
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#6B7280';
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
    ctx.fillStyle = '#6B7280';
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
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-light)'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: '700' }}>{symbol}</h2>
            {stats && (
              <div style={{ 
                color: stats.isUp ? 'var(--accent-green)' : 'var(--accent-red)',
                fontSize: '0.9rem',
                marginTop: '4px',
                fontWeight: '600'
              }}>
                {stats.isUp ? '▲' : '▼'} ₹{Math.abs(stats.change).toFixed(2)} ({stats.percentChange.toFixed(2)}%)
                <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontWeight: '400' }}>
                  {ranges.find(r => r.value === range)?.description}
                </span>
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
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
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--bg-primary)'
        }}>
          {ranges.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                border: range === r.value ? 'none' : '1px solid var(--border-light)',
                background: range === r.value ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: range === r.value ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: range === r.value ? '600' : '500',
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
              color: 'var(--accent-green)',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--accent-green)',
                animation: 'pulse 2s infinite'
              }} />
              LIVE
            </div>
          )}
        </div>

        {/* Chart Area */}
        <div style={{ padding: '20px', background: 'var(--bg-card)' }}>
          {loading ? (
            <div style={{
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}>
              Loading chart data...
            </div>
          ) : error ? (
            <div style={{
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-red)'
            }}>
              {error}
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '400px',
                borderRadius: 'var(--radius-sm)',
                background: '#fff'
              }}
            />
          )}
        </div>

        {/* Market Status Footer */}
        {chartData?.marketStatus && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-light)',
            background: 'var(--bg-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Market: <span style={{ 
                color: chartData.marketStatus.isOpen ? 'var(--accent-green)' : 'var(--accent-red)',
                fontWeight: '600'
              }}>
                {chartData.marketStatus.status}
              </span>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
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
