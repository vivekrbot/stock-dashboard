import { useState, useEffect } from 'react';
import Icon from './Icon';

const API_BASE = '/api';

const STRATEGIES = [
  { id: 'INTRADAY', name: 'Intraday', emoji: '⚡', colorClass: 'bg-purple-600' },
  { id: 'SWING', name: 'Swing', emoji: '🎯', colorClass: 'bg-blue-600' },
  { id: 'SHORT_TERM', name: 'Short-term', emoji: '📊', colorClass: 'bg-green-600' },
  { id: 'LONG_TERM', name: 'Long-term', emoji: '📈', colorClass: 'bg-indigo-600' }
];

export default function IntelligentTradingDashboard({ symbol, onClose }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState('SWING');

  useEffect(() => {
    if (symbol) {
      fetchAnalysis();
    }
  }, [symbol]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const strategies = STRATEGIES.map(s => s.id).join(',');
      const response = await fetch(`${API_BASE}/trading/analyze/${symbol}?strategies=${strategies}&capital=100000`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setAnalysis(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSignalColor = (signal) => {
    if (signal === 'BUY') return 'text-green-600 bg-green-50';
    if (signal === 'SELL') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getSignalIcon = (signal) => {
    if (signal === 'BUY') return '📈';
    if (signal === 'SELL') return '📉';
    return '⏸️';
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-lg text-gray-700">Analyzing {symbol} across all strategies...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full">
          <div className="text-center">
            <p className="text-xl mb-4">❌ {error}</p>
            <div className="flex gap-3">
              <button
                onClick={fetchAnalysis}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const currentStrategy = analysis.strategies[selectedStrategy];
  const recommendation = analysis.recommendation;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold mb-2">🤖 Intelligent Trading Analysis</h2>
              <p className="text-blue-100">{symbol}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <Icon name="close" className="w-6 h-6" />
            </button>
          </div>
          
          {/* Current Price */}
          <div className="mt-4 flex items-center space-x-4">
            <div>
              <p className="text-sm text-blue-100">Current Price</p>
              <p className="text-2xl font-bold">₹{analysis.currentPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-blue-100">Change</p>
              <p className={`text-xl font-bold ${analysis.changePercent >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {analysis.changePercent >= 0 ? '+' : ''}{analysis.changePercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* ML Prediction */}
          {analysis.mlPrediction && !analysis.mlPrediction.error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🧠</span>
                  <div>
                    <p className="font-medium text-gray-700">ML Prediction</p>
                    <p className="text-sm text-gray-500">Neural Network Analysis</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${analysis.mlPrediction.prediction === 'BULLISH' ? 'text-green-600' : analysis.mlPrediction.prediction === 'BEARISH' ? 'text-red-600' : 'text-gray-600'}`}>
                    {analysis.mlPrediction.prediction}
                  </p>
                  <p className="text-sm text-gray-600">{analysis.mlPrediction.confidence}% confidence</p>
                </div>
              </div>
            </div>
          )}

          {/* Best Recommendation */}
          {recommendation && (
            <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-300">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-3xl">⭐</span>
                <div>
                  <p className="text-xl font-bold text-gray-800">Best Strategy: {recommendation.strategy}</p>
                  <p className="text-sm text-gray-600">{recommendation.strategyDetails.name}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Signal</p>
                  <p className={`text-lg font-bold ${recommendation.signal === 'BUY' ? 'text-green-600' : recommendation.signal === 'SELL' ? 'text-red-600' : 'text-gray-600'}`}>
                    {getSignalIcon(recommendation.signal)} {recommendation.signal}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Confidence</p>
                  <p className={`text-lg font-bold ${getScoreColor(recommendation.score)}`}>
                    {recommendation.score}%
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Risk:Reward</p>
                  <p className="text-lg font-bold text-blue-600">{recommendation.riskReward || 'N/A'}</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Position Size</p>
                  <p className="text-lg font-bold text-indigo-600">{recommendation.positionSize || 'N/A'}</p>
                </div>
              </div>

              {recommendation.signal === 'BUY' && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Entry</p>
                    <p className="text-base font-bold text-gray-800">₹{recommendation.entry}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Target</p>
                    <p className="text-base font-bold text-green-600">₹{recommendation.target}</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Stop Loss</p>
                    <p className="text-base font-bold text-red-600">₹{recommendation.stopLoss}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Strategy Tabs */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {STRATEGIES.map(strategy => {
                const strategyData = analysis.strategies[strategy.id];
                if (!strategyData) return null;
                
                return (
                  <button
                    key={strategy.id}
                    onClick={() => setSelectedStrategy(strategy.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedStrategy === strategy.id
                        ? `${strategy.colorClass} text-white shadow-lg scale-105`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {strategy.emoji} {strategy.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Strategy Details */}
          {currentStrategy && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Signal & Score */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded-lg ${getSignalColor(currentStrategy.signal)}`}>
                      <p className="text-sm mb-1">Signal</p>
                      <p className="text-2xl font-bold">
                        {getSignalIcon(currentStrategy.signal)} {currentStrategy.signal}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50">
                      <p className="text-sm mb-1">Score</p>
                      <p className={`text-2xl font-bold ${getScoreColor(currentStrategy.score)}`}>
                        {currentStrategy.score}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trade Setup */}
                {currentStrategy.signal === 'BUY' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium text-gray-700 mb-3">Trade Setup</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Entry</span>
                        <span className="font-bold">₹{currentStrategy.entry}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">Target</span>
                        <span className="font-bold text-green-600">₹{currentStrategy.target}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Stop Loss</span>
                        <span className="font-bold text-red-600">₹{currentStrategy.stopLoss}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600">Expected Return</span>
                        <span className="font-bold text-green-600">+{currentStrategy.expectedReturn}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Risk</span>
                        <span className="font-bold text-red-600">-{currentStrategy.maxRisk}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Risk:Reward</span>
                        <span className="font-bold text-blue-600">{currentStrategy.riskReward}:1</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Strategy Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-700 mb-3">Strategy Details</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timeframe</span>
                      <span className="font-medium">{currentStrategy.strategyDetails.timeframe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Holding Period</span>
                      <span className="font-medium">{currentStrategy.holdingPeriod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Min Confidence</span>
                      <span className="font-medium">{currentStrategy.strategyDetails.minConfidence}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Bullish Signals */}
                {currentStrategy.signals && currentStrategy.signals.length > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="font-medium text-green-800 mb-2">✅ Bullish Signals</p>
                    <ul className="space-y-1 text-sm">
                      {currentStrategy.signals.map((signal, idx) => (
                        <li key={idx} className="text-green-700">• {signal}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {currentStrategy.warnings && currentStrategy.warnings.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="font-medium text-yellow-800 mb-2">⚠️ Warnings</p>
                    <ul className="space-y-1 text-sm">
                      {currentStrategy.warnings.map((warning, idx) => (
                        <li key={idx} className="text-yellow-700">• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Position Sizing */}
                {currentStrategy.positionSize && (
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <p className="font-medium text-indigo-800 mb-2">💼 Position Sizing</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recommended Quantity</span>
                        <span className="font-bold text-indigo-700">{currentStrategy.positionSize} shares</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Investment</span>
                        <span className="font-medium">₹{(currentStrategy.positionSize * currentStrategy.entry).toFixed(0)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Based on 2% max risk per trade</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={fetchAnalysis}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              🔄 Refresh Analysis
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
