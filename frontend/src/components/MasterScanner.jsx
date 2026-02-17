import { useState } from 'react';
import Icon from './Icon';

const API_BASE = '/api';

const STRATEGIES = [
  { id: 'INTRADAY', name: 'Intraday', emoji: '⚡' },
  { id: 'SWING', name: 'Swing', emoji: '🎯' },
  { id: 'SHORT_TERM', name: 'Short-term', emoji: '📊' },
  { id: 'LONG_TERM', name: 'Long-term', emoji: '📈' }
];

export default function MasterScanner({ onSelectStock }) {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    strategies: ['SWING', 'SHORT_TERM'],
    minScore: 70,
    maxResults: 20
  });

  const startMasterScan = async () => {
    setScanning(true);
    setError(null);
    setResults(null);
    
    try {
      const response = await fetch(`${API_BASE}/trading/master-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const toggleStrategy = (strategyId) => {
    setFilters(prev => ({
      ...prev,
      strategies: prev.strategies.includes(strategyId)
        ? prev.strategies.filter(s => s !== strategyId)
        : [...prev.strategies, strategyId]
    }));
  };

  const getSourceBadges = (sources) => {
    const badges = {
      TRADING: { label: 'Strategy', color: 'bg-blue-100 text-blue-700' },
      ML: { label: 'ML', color: 'bg-purple-100 text-purple-700' },
      EARLY: { label: 'Early', color: 'bg-green-100 text-green-700' }
    };
    
    return sources.map(source => badges[source] || { label: source, color: 'bg-gray-100 text-gray-700' });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🔍 Master Market Scanner</h2>
        <p className="text-gray-600">Find opportunities across ALL strategies with AI detection</p>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="font-medium text-gray-700 mb-3">Scan Settings</p>
        
        {/* Strategy Selection */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Strategies to Scan</p>
          <div className="flex flex-wrap gap-2">
            {STRATEGIES.map(strategy => (
              <button
                key={strategy.id}
                onClick={() => toggleStrategy(strategy.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filters.strategies.includes(strategy.id)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                {strategy.emoji} {strategy.name}
              </button>
            ))}
          </div>
        </div>

        {/* Other Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Min Score</label>
            <input
              type="number"
              value={filters.minScore}
              onChange={(e) => setFilters(prev => ({ ...prev, minScore: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Max Results</label>
            <input
              type="number"
              value={filters.maxResults}
              onChange={(e) => setFilters(prev => ({ ...prev, maxResults: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="5"
              max="50"
            />
          </div>
        </div>
      </div>

      {/* Scan Button */}
      <button
        onClick={startMasterScan}
        disabled={scanning || filters.strategies.length === 0}
        className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 transition-all font-bold text-lg shadow-lg mb-6"
      >
        {scanning ? (
          <span className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            Scanning Market...
          </span>
        ) : (
          '🚀 Start Master Scan'
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div>
          {/* Summary */}
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-800">{results.scannedCount}</p>
                <p className="text-sm text-gray-600">Scanned</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{results.topCount}</p>
                <p className="text-sm text-gray-600">Opportunities</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{results.summary?.byStrategy ? Object.keys(results.summary.byStrategy).length : 0}</p>
                <p className="text-sm text-gray-600">Strategies</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-600">{results.scanTime}</p>
                <p className="text-sm text-gray-600">Scan Time</p>
              </div>
            </div>
          </div>

          {/* Market Context */}
          {results.marketContext && !results.marketContext.error && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="font-medium text-purple-800 mb-2">📊 Market Context</p>
              {results.marketContext.sentiment && (
                <div className="mb-2">
                  <span className="text-sm text-gray-600">Overall Sentiment: </span>
                  <span className={`font-medium ${results.marketContext.sentiment.overall === 'BULLISH' ? 'text-green-600' : results.marketContext.sentiment.overall === 'BEARISH' ? 'text-red-600' : 'text-gray-600'}`}>
                    {results.marketContext.sentiment.overall}
                  </span>
                </div>
              )}
              {results.marketContext.hotSectors && results.marketContext.hotSectors.length > 0 && (
                <div>
                  <span className="text-sm text-gray-600">Hot Sectors: </span>
                  <span className="font-medium text-purple-700">
                    {results.marketContext.hotSectors.map(s => s.sector).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Opportunities List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-gray-800">Top Opportunities</h3>
              <p className="text-sm text-gray-500">{results.opportunities.length} found</p>
            </div>

            {results.opportunities.map((opp, idx) => (
              <div
                key={idx}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onSelectStock && onSelectStock(opp.symbol)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-bold text-lg text-gray-800">{opp.symbol}</h4>
                      {opp.signal === 'BUY' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          📈 {opp.signal}
                        </span>
                      )}
                      {opp.signal === 'SELL' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                          📉 {opp.signal}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      ₹{opp.currentPrice?.toFixed(2) || 'N/A'} 
                      {opp.changePercent != null && (
                        <span className={`ml-2 ${opp.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {opp.changePercent >= 0 ? '+' : ''}{opp.changePercent.toFixed(2)}%
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${
                      opp.finalScore >= 80 ? 'text-green-600' : 
                      opp.finalScore >= 70 ? 'text-blue-600' : 
                      'text-yellow-600'
                    }`}>
                      {opp.finalScore || opp.score}
                    </p>
                    <p className="text-xs text-gray-500">Score</p>
                  </div>
                </div>

                {/* Strategy & Sources */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {opp.strategy && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {opp.strategy}
                    </span>
                  )}
                  {opp.sources && opp.sources.map((source, i) => {
                    const badge = getSourceBadges([source])[0];
                    return (
                      <span key={i} className={`px-2 py-1 text-xs font-medium rounded ${badge.color}`}>
                        {badge.label}
                      </span>
                    );
                  })}
                </div>

                {/* Trade Setup */}
                {opp.entry && opp.target && opp.stopLoss && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Entry</p>
                      <p className="font-bold">₹{opp.entry.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Target</p>
                      <p className="font-bold text-green-600">₹{opp.target.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">SL</p>
                      <p className="font-bold text-red-600">₹{opp.stopLoss.toFixed(2)}</p>
                    </div>
                  </div>
                )}

                {/* Reason/Signals */}
                {(opp.reason || opp.signals) && (
                  <div className="mt-2 text-xs text-gray-600">
                    {opp.reason && <p>💡 {opp.reason}</p>}
                    {opp.earlySignals && (
                      <p className="mt-1">⚡ {opp.earlySignals.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary by Strategy */}
          {results.summary?.byStrategy && Object.keys(results.summary.byStrategy).length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-700 mb-3">By Strategy</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(results.summary.byStrategy).map(([strategy, data]) => (
                  <div key={strategy} className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">{strategy}</p>
                    <p className="text-lg font-bold text-gray-800">{data.count}</p>
                    <p className="text-xs text-gray-500">Avg: {data.avgScore}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
