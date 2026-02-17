import { useState, useEffect } from 'react';
import Icon from './Icon';

const API_BASE = '/api';

export default function MLPredictions({ symbol, onAddToWatchlist }) {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState(null);

  useEffect(() => {
    if (symbol) {
      fetchPrediction();
    }
  }, [symbol]);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/ml/predict/${symbol}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setPrediction(null);
      } else {
        setPrediction(data);
      }
    } catch (err) {
      setError(err.message);
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  const trainModel = async () => {
    setTrainingStatus('Training...');
    try {
      const response = await fetch(`${API_BASE}/ml/train/${symbol}`, { method: 'POST' });
      const data = await response.json();
      
      if (data.error) {
        setTrainingStatus(`Error: ${data.error}`);
      } else {
        setTrainingStatus(`Trained with ${data.samples} samples, error: ${data.error.toFixed(4)}`);
        // Refresh prediction after training
        setTimeout(fetchPrediction, 1000);
      }
    } catch (err) {
      setTrainingStatus(`Error: ${err.message}`);
    }
  };

  const getPredictionColor = (pred) => {
    if (pred === 'BULLISH') return 'text-green-600 bg-green-50';
    if (pred === 'BEARISH') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getPredictionIcon = (pred) => {
    if (pred === 'BULLISH') return '📈';
    if (pred === 'BEARISH') return '📉';
    return '➡️';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 75) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Analyzing {symbol} with ML...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">❌ {error}</p>
          <button
            onClick={trainModel}
            disabled={trainingStatus === 'Training...'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {trainingStatus === 'Training...' ? '🧠 Training Model...' : '🧠 Train Model for ' + symbol}
          </button>
          {trainingStatus && trainingStatus !== 'Training...' && (
            <p className="mt-3 text-sm text-gray-600">{trainingStatus}</p>
          )}
        </div>
      </div>
    );
  }

  if (!prediction) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">🤖</div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">ML Prediction</h3>
            <p className="text-sm text-gray-500">{symbol}</p>
          </div>
        </div>
        <button
          onClick={fetchPrediction}
          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
          title="Refresh"
        >
          <Icon name="refresh" className="w-5 h-5" />
        </button>
      </div>

      {/* Main Prediction */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${getPredictionColor(prediction.prediction)}`}>
          <div className="text-center">
            <div className="text-4xl mb-2">{getPredictionIcon(prediction.prediction)}</div>
            <p className="text-sm font-medium mb-1">Prediction</p>
            <p className="text-2xl font-bold">{prediction.prediction}</p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-blue-50">
          <div className="text-center">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-sm font-medium text-gray-600 mb-1">Confidence</p>
            <p className={`text-2xl font-bold ${getConfidenceColor(prediction.confidence)}`}>
              {prediction.confidence}%
            </p>
          </div>
        </div>
      </div>

      {/* Probabilities */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Probability Distribution</p>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-red-600">Bearish</span>
              <span className="font-medium">{prediction.probabilities.bearish}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${prediction.probabilities.bearish}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Neutral</span>
              <span className="font-medium">{prediction.probabilities.neutral}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${prediction.probabilities.neutral}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-green-600">Bullish</span>
              <span className="font-medium">{prediction.probabilities.bullish}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${prediction.probabilities.bullish}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Prediction */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Current</p>
          <p className="text-lg font-bold text-gray-800">₹{prediction.currentPrice.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Target</p>
          <p className="text-lg font-bold text-blue-600">₹{prediction.targetPrice.toFixed(2)}</p>
        </div>
        <div className={`p-3 rounded-lg ${prediction.expectedMove >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-xs text-gray-500 mb-1">Expected</p>
          <p className={`text-lg font-bold ${prediction.expectedMove >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {prediction.expectedMove >= 0 ? '+' : ''}{prediction.expectedMove.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Model Info */}
      <div className="border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Model Information</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Trained At</p>
            <p className="font-medium text-gray-800">
              {new Date(prediction.modelInfo.trainedAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Training Samples</p>
            <p className="font-medium text-gray-800">{prediction.modelInfo.samples}</p>
          </div>
          <div>
            <p className="text-gray-500">Model Error</p>
            <p className="font-medium text-gray-800">{prediction.modelInfo.error.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-gray-500">Volatility</p>
            <p className="font-medium text-gray-800">{prediction.volatility.toFixed(2)}%</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={trainModel}
          disabled={trainingStatus === 'Training...'}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
        >
          {trainingStatus === 'Training...' ? '🧠 Training...' : '🧠 Retrain Model'}
        </button>
        {onAddToWatchlist && (
          <button
            onClick={() => onAddToWatchlist(symbol)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            ➕ Add to Watchlist
          </button>
        )}
      </div>

      {trainingStatus && (
        <p className="mt-3 text-xs text-center text-gray-600">{trainingStatus}</p>
      )}
    </div>
  );
}
