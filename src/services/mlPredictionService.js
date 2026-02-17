/**
 * Machine Learning Prediction Service
 * Uses neural networks and ensemble methods for price prediction
 */

const { Architect, Trainer } = require('synaptic');
const { SMA, EMA, RSI, MACD, BollingerBands, ATR, Stochastic } = require('technicalindicators');
const stats = require('simple-statistics');
const realTimeDataService = require('./realTimeDataService');
const historicalService = require('./historicalService');

class MLPredictionService {
  constructor() {
    this.models = new Map(); // Symbol -> trained model
    this.predictions = new Map(); // Symbol -> latest prediction
    this.modelConfig = {
      inputSize: 15,  // 15 technical indicators as input
      hiddenLayers: [20, 15, 10],  // 3 hidden layers
      outputSize: 3,  // [bearish, neutral, bullish]
      learningRate: 0.01,
      iterations: 1000
    };
    
    console.log('✓ ML Prediction Service initialized');
  }

  /**
   * Extract features from historical data
   */
  extractFeatures(history) {
    const closes = history.map(d => d.close);
    const highs = history.map(d => d.high);
    const lows = history.map(d => d.low);
    const volumes = history.map(d => d.volume);
    
    if (closes.length < 50) {
      throw new Error('Insufficient data for feature extraction');
    }

    // Technical indicators as features
    const rsi14 = RSI.calculate({ values: closes, period: 14 });
    const sma20 = SMA.calculate({ values: closes, period: 20 });
    const sma50 = SMA.calculate({ values: closes, period: 50 });
    const ema12 = EMA.calculate({ values: closes, period: 12 });
    const ema26 = EMA.calculate({ values: closes, period: 26 });
    const macd = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    const bb = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
    const atr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const stoch = Stochastic.calculate({ high: highs, low: lows, close: closes, period: 14, signalPeriod: 3 });

    // Get the latest values (last element)
    const latest = {
      rsi: rsi14[rsi14.length - 1] / 100,  // Normalize to 0-1
      sma20: closes[closes.length - 1] / sma20[sma20.length - 1],  // Price/SMA ratio
      sma50: sma50.length > 0 ? closes[closes.length - 1] / sma50[sma50.length - 1] : 1,
      ema12: closes[closes.length - 1] / ema12[ema12.length - 1],
      ema26: closes[closes.length - 1] / ema26[ema26.length - 1],
      macdValue: macd.length > 0 ? macd[macd.length - 1].MACD / closes[closes.length - 1] : 0,
      macdSignal: macd.length > 0 ? macd[macd.length - 1].signal / closes[closes.length - 1] : 0,
      macdHist: macd.length > 0 ? macd[macd.length - 1].histogram / closes[closes.length - 1] : 0,
      bbUpper: bb.length > 0 ? closes[closes.length - 1] / bb[bb.length - 1].upper : 1,
      bbMiddle: bb.length > 0 ? closes[closes.length - 1] / bb[bb.length - 1].middle : 1,
      bbLower: bb.length > 0 ? closes[closes.length - 1] / bb[bb.length - 1].lower : 1,
      atr: atr.length > 0 ? atr[atr.length - 1] / closes[closes.length - 1] : 0.02,  // ATR as % of price
      stochK: stoch.length > 0 ? stoch[stoch.length - 1].k / 100 : 0.5,
      stochD: stoch.length > 0 ? stoch[stoch.length - 1].d / 100 : 0.5,
      volumeRatio: volumes.length > 20 ? volumes[volumes.length - 1] / stats.mean(volumes.slice(-20)) : 1
    };

    return Object.values(latest);
  }

  /**
   * Prepare training data from historical price movements
   */
  prepareTrainingData(history) {
    const trainingSet = [];
    const windowSize = 5;  // Look ahead 5 days for outcome
    
    for (let i = 50; i < history.length - windowSize; i++) {
      const window = history.slice(i - 50, i);
      const features = this.extractFeatures(window);
      
      // Calculate future return
      const currentPrice = history[i].close;
      const futurePrice = history[i + windowSize].close;
      const returnPct = ((futurePrice - currentPrice) / currentPrice) * 100;
      
      // Classify outcome: bearish (<-2%), neutral (-2% to 2%), bullish (>2%)
      let output;
      if (returnPct < -2) {
        output = [1, 0, 0];  // Bearish
      } else if (returnPct > 2) {
        output = [0, 0, 1];  // Bullish
      } else {
        output = [0, 1, 0];  // Neutral
      }
      
      trainingSet.push({ input: features, output });
    }
    
    return trainingSet;
  }

  /**
   * Train model for a specific symbol
   */
  async trainModel(symbol) {
    console.log(`🧠 Training ML model for ${symbol}...`);
    
    // Get extended historical data (6 months for better training)
    const historicalData = await historicalService.getHistoricalData(symbol, '6mo');
    
    if (!historicalData?.history || historicalData.history.length < 100) {
      throw new Error(`Insufficient data for ${symbol}`);
    }
    
    // Prepare training data
    const trainingSet = this.prepareTrainingData(historicalData.history);
    
    if (trainingSet.length < 20) {
      throw new Error(`Not enough training samples for ${symbol}`);
    }
    
    // Create neural network
    const network = new Architect.Perceptron(
      this.modelConfig.inputSize,
      ...this.modelConfig.hiddenLayers,
      this.modelConfig.outputSize
    );
    
    // Train the network
    const trainer = new Trainer(network);
    const result = trainer.train(trainingSet, {
      rate: this.modelConfig.learningRate,
      iterations: this.modelConfig.iterations,
      error: 0.005,
      shuffle: true,
      log: 0,  // Disable logging
      cost: Trainer.cost.CROSS_ENTROPY
    });
    
    // Store the trained model
    this.models.set(symbol, {
      network,
      trainedAt: new Date().toISOString(),
      samples: trainingSet.length,
      error: result.error,
      iterations: result.iterations
    });
    
    console.log(`✓ Model trained for ${symbol}: ${result.iterations} iterations, error: ${result.error.toFixed(4)}`);
    
    return {
      symbol,
      trainedAt: new Date().toISOString(),
      samples: trainingSet.length,
      error: result.error,
      iterations: result.iterations
    };
  }

  /**
   * Get or train model for symbol
   */
  async getModel(symbol, maxAge = 24 * 60 * 60 * 1000) {
    const existing = this.models.get(symbol);
    
    // Return existing model if fresh enough
    if (existing) {
      const age = Date.now() - new Date(existing.trainedAt).getTime();
      if (age < maxAge) {
        return existing;
      }
    }
    
    // Train new model
    await this.trainModel(symbol);
    return this.models.get(symbol);
  }

  /**
   * Predict next move for a symbol
   */
  async predict(symbol) {
    // Get current data
    const historicalData = await historicalService.getHistoricalData(symbol, '3mo');
    
    if (!historicalData?.history || historicalData.history.length < 50) {
      throw new Error(`Insufficient data for prediction: ${symbol}`);
    }
    
    // Extract features from current data
    const features = this.extractFeatures(historicalData.history);
    
    // Get trained model
    const model = await this.getModel(symbol);
    
    // Make prediction
    const output = model.network.activate(features);
    
    // Interpret output
    const [bearish, neutral, bullish] = output;
    const maxProb = Math.max(bearish, neutral, bullish);
    
    let prediction;
    let confidence;
    
    if (bullish === maxProb) {
      prediction = 'BULLISH';
      confidence = bullish * 100;
    } else if (bearish === maxProb) {
      prediction = 'BEARISH';
      confidence = bearish * 100;
    } else {
      prediction = 'NEUTRAL';
      confidence = neutral * 100;
    }
    
    // Calculate predicted price range based on historical volatility
    const closes = historicalData.history.map(d => d.close);
    const currentPrice = closes[closes.length - 1];
    const volatility = stats.standardDeviation(closes.slice(-20).map((c, i, arr) => 
      i === 0 ? 0 : ((c - arr[i-1]) / arr[i-1]) * 100
    ));
    
    const expectedMove = prediction === 'BULLISH' ? volatility : prediction === 'BEARISH' ? -volatility : 0;
    const targetPrice = currentPrice * (1 + expectedMove / 100);
    
    const result = {
      symbol,
      prediction,
      confidence: Math.round(confidence),
      probabilities: {
        bearish: Math.round(bearish * 100),
        neutral: Math.round(neutral * 100),
        bullish: Math.round(bullish * 100)
      },
      currentPrice,
      targetPrice: Math.round(targetPrice * 100) / 100,
      expectedMove: Math.round(expectedMove * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      modelInfo: {
        trainedAt: model.trainedAt,
        samples: model.samples,
        error: model.error
      },
      timestamp: new Date().toISOString()
    };
    
    // Cache prediction
    this.predictions.set(symbol, result);
    
    return result;
  }

  /**
   * Batch predict for multiple symbols
   */
  async batchPredict(symbols) {
    const results = [];
    
    for (const symbol of symbols) {
      try {
        const prediction = await this.predict(symbol);
        results.push(prediction);
      } catch (error) {
        console.error(`Prediction failed for ${symbol}:`, error.message);
        results.push({
          symbol,
          error: error.message,
          prediction: 'ERROR',
          confidence: 0
        });
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(r => setTimeout(r, 100));
    }
    
    return results;
  }

  /**
   * Get model statistics
   */
  getStats() {
    return {
      modelsLoaded: this.models.size,
      predictionsCached: this.predictions.size,
      models: Array.from(this.models.entries()).map(([symbol, model]) => ({
        symbol,
        trainedAt: model.trainedAt,
        samples: model.samples,
        error: model.error
      }))
    };
  }

  /**
   * Clear all models and predictions
   */
  clear() {
    this.models.clear();
    this.predictions.clear();
    console.log('✓ ML models cleared');
  }
}

// Singleton instance
const mlPredictionService = new MLPredictionService();

module.exports = mlPredictionService;
