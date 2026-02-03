/**
 * Predictive Swing Trading Service
 * ================================
 * Advanced trading signal generator based on Pine Script "Advanced Predictive Swing System"
 * 
 * Features:
 * - Linear Regression Price Prediction with confidence bands
 * - Multi-timeframe EMA analysis (21/50/200)
 * - Momentum & Acceleration analysis (ROC)
 * - Volatility-adjusted predictions (ATR-based)
 * - Fibonacci projections
 * - RSI Divergence detection
 * - MACD Histogram momentum analysis
 * - ADX Trend strength measurement
 * - Volume Price Trend (VPT) analysis
 * - Composite buy/sell scoring (0-100)
 * - Dynamic entry/target/stop-loss calculation
 */

const historicalService = require('./historicalService');
const stockService = require('./stockService');
const advancedTechnicalService = require('./advancedTechnicalService');

class PredictiveSwingService {
  constructor() {
    // Default configuration matching Pine Script parameters
    this.config = {
      // Risk parameters
      riskReward: 2.0,
      atrMultiplier: 1.5,
      
      // Prediction parameters
      predictionBars: 10,
      regressionLength: 20,
      confidenceLevel: 0.68,
      
      // EMA periods
      ema21Period: 21,
      ema50Period: 50,
      ema200Period: 200,
      
      // Signal thresholds
      strongSignalThreshold: 70,
      moderateSignalThreshold: 50,
      
      // Minimum data requirements
      minDataPoints: 50
    };

    // Stock universe for scanning
    this.watchlist = [
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
      'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'ITC',
      'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'SUNPHARMA',
      'TITAN', 'BAJFINANCE', 'NESTLEIND', 'WIPRO', 'ULTRACEMCO',
      'TATAMOTORS', 'TATASTEEL', 'POWERGRID', 'NTPC', 'ONGC',
      'M&M', 'ADANIENT', 'ADANIPORTS', 'COALINDIA', 'JSWSTEEL',
      'HCLTECH', 'TECHM', 'DRREDDY', 'CIPLA', 'APOLLOHOSP',
      'BAJAJFINSV', 'EICHERMOT', 'GRASIM', 'INDUSINDBK', 'BRITANNIA',
      'TATACONSUM', 'DIVISLAB', 'HEROMOTOCO', 'SBILIFE', 'BAJAJ-AUTO'
    ];
  }

  // ========================================
  // CORE INDICATOR CALCULATIONS
  // ========================================

  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(data, period) {
    if (data.length < period) return data[data.length - 1] || 0;
    
    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  /**
   * Calculate EMA series (for historical tracking)
   */
  calculateEMASeries(data, period) {
    const emaSeries = [];
    const multiplier = 2 / (period + 1);
    
    if (data.length < period) return data.map(() => null);
    
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = 0; i < period; i++) emaSeries.push(null);
    emaSeries[period - 1] = ema;
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
      emaSeries.push(ema);
    }
    return emaSeries;
  }

  /**
   * Calculate Average True Range (ATR)
   */
  calculateATR(highs, lows, closes, period = 14) {
    const trueRanges = [];
    
    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }
    
    if (trueRanges.length < period) return 0;
    
    const atr = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
    return atr;
  }

  /**
   * Calculate ATR Percentage
   */
  calculateATRPercent(atr, close) {
    return (atr / close) * 100;
  }

  // ========================================
  // LINEAR REGRESSION PREDICTION
  // ========================================

  /**
   * Calculate Linear Regression parameters
   */
  calculateLinearRegression(data) {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: data[0] || 0, value: data[0] || 0 };
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const value = intercept + slope * (n - 1);
    
    return { slope, intercept, value };
  }

  /**
   * Calculate Standard Deviation
   */
  calculateStdDev(data) {
    const n = data.length;
    if (n < 2) return 0;
    
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    return Math.sqrt(variance);
  }

  /**
   * Calculate Variance
   */
  calculateVariance(data) {
    const n = data.length;
    if (n < 2) return 0;
    
    const mean = data.reduce((a, b) => a + b, 0) / n;
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  }

  /**
   * Calculate Price Prediction using Linear Regression
   * Returns predicted price with confidence bands
   */
  calculatePrediction(closes, predictionBars = 10, regressionLength = 20, confidenceLevel = 0.68) {
    if (closes.length < regressionLength) {
      return null;
    }
    
    const recentCloses = closes.slice(-regressionLength);
    const { slope, intercept, value } = this.calculateLinearRegression(recentCloses);
    
    // Predicted price
    const predictedPrice = value + (slope * predictionBars);
    
    // Confidence interval calculation
    const stdDev = this.calculateStdDev(recentCloses);
    const variance = this.calculateVariance(recentCloses);
    
    // Z-score for confidence level
    const zScore = confidenceLevel >= 0.99 ? 2.58 : 
                   confidenceLevel >= 0.95 ? 1.96 : 
                   confidenceLevel >= 0.90 ? 1.645 : 1.0;
    
    // Prediction error (grows with distance from data)
    const predictionError = stdDev * Math.sqrt(1 + (1/regressionLength) + 
                           Math.pow(predictionBars, 2) / (variance || 1));
    
    const upperPrediction = predictedPrice + (zScore * predictionError);
    const lowerPrediction = predictedPrice - (zScore * predictionError);
    
    const currentPrice = closes[closes.length - 1];
    const predictedChange = ((predictedPrice - currentPrice) / currentPrice) * 100;
    
    return {
      predictedPrice: Math.round(predictedPrice * 100) / 100,
      upperBand: Math.round(upperPrediction * 100) / 100,
      lowerBand: Math.round(lowerPrediction * 100) / 100,
      slope: Math.round(slope * 1000) / 1000,
      predictedChange: Math.round(predictedChange * 100) / 100,
      confidence: Math.round(confidenceLevel * 100),
      direction: predictedPrice > currentPrice ? 'bullish' : 'bearish',
      regressionValue: Math.round(value * 100) / 100
    };
  }

  // ========================================
  // MOMENTUM & ACCELERATION ANALYSIS
  // ========================================

  /**
   * Calculate Rate of Change (ROC)
   */
  calculateROC(closes, period) {
    if (closes.length <= period) return 0;
    const current = closes[closes.length - 1];
    const past = closes[closes.length - 1 - period];
    return ((current - past) / past) * 100;
  }

  /**
   * Calculate Momentum Acceleration (2nd derivative)
   */
  calculateMomentumAcceleration(closes) {
    const roc5 = this.calculateROC(closes, 5);
    const roc5_past = this.calculateROC(closes.slice(0, -5), 5);
    return roc5 - roc5_past;
  }

  /**
   * Calculate Weighted Momentum Score (-100 to +100)
   */
  calculateMomentumScore(closes) {
    const roc5 = this.calculateROC(closes, 5);
    const roc10 = this.calculateROC(closes, 10);
    const roc20 = this.calculateROC(closes, 20);
    
    return (roc5 * 0.5) + (roc10 * 0.3) + (roc20 * 0.2);
  }

  // ========================================
  // VOLATILITY-ADJUSTED PREDICTION
  // ========================================

  /**
   * Determine volatility regime and adjust prediction
   */
  calculateVolatilityAdjustedPrediction(closes, highs, lows, predictedPrice) {
    const currentPrice = closes[closes.length - 1];
    const atr = this.calculateATR(highs, lows, closes);
    
    // Calculate average ATR over 50 periods
    let atrSum = 0;
    for (let i = Math.max(0, closes.length - 50); i < closes.length; i++) {
      const periodATR = this.calculateATR(
        highs.slice(0, i + 1), 
        lows.slice(0, i + 1), 
        closes.slice(0, i + 1)
      );
      atrSum += periodATR;
    }
    const avgATR = atrSum / Math.min(50, closes.length);
    
    // Volatility regime detection
    const highVolRegime = atr > avgATR * 1.2;
    const lowVolRegime = atr < avgATR * 0.8;
    
    // Adjust prediction based on volatility regime
    const volAdjustment = highVolRegime ? 1.2 : lowVolRegime ? 0.8 : 1.0;
    const adjustedPrediction = currentPrice + ((predictedPrice - currentPrice) * volAdjustment);
    
    return {
      adjustedPrediction: Math.round(adjustedPrediction * 100) / 100,
      volatilityRegime: highVolRegime ? 'HIGH' : lowVolRegime ? 'LOW' : 'NORMAL',
      volAdjustment,
      atr: Math.round(atr * 100) / 100,
      atrPercent: Math.round((atr / currentPrice) * 10000) / 100
    };
  }

  // ========================================
  // FIBONACCI PROJECTION
  // ========================================

  /**
   * Calculate Fibonacci levels from recent swing
   */
  calculateFibonacciProjection(highs, lows, currentPrice) {
    const swingHigh = Math.max(...highs.slice(-20));
    const swingLow = Math.min(...lows.slice(-20));
    const swingRange = swingHigh - swingLow;
    
    return {
      swingHigh: Math.round(swingHigh * 100) / 100,
      swingLow: Math.round(swingLow * 100) / 100,
      swingRange: Math.round(swingRange * 100) / 100,
      fib618Up: Math.round((currentPrice + swingRange * 0.618) * 100) / 100,
      fib382Up: Math.round((currentPrice + swingRange * 0.382) * 100) / 100,
      fib382Down: Math.round((currentPrice - swingRange * 0.382) * 100) / 100,
      fib618Down: Math.round((currentPrice - swingRange * 0.618) * 100) / 100
    };
  }

  // ========================================
  // RSI DIVERGENCE DETECTION
  // ========================================

  /**
   * Calculate RSI
   */
  calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    
    let gains = 0, losses = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate RSI Series for divergence detection
   */
  calculateRSISeries(closes, period = 14) {
    const rsiSeries = [];
    for (let i = period + 1; i <= closes.length; i++) {
      rsiSeries.push(this.calculateRSI(closes.slice(0, i), period));
    }
    return rsiSeries;
  }

  /**
   * Detect RSI Divergence
   */
  detectRSIDivergence(closes, highs, lows) {
    const rsi = this.calculateRSI(closes);
    const rsiSeries = this.calculateRSISeries(closes);
    
    if (rsiSeries.length < 10) return { divergence: null, rsi };
    
    const recentRSI = rsiSeries.slice(-10);
    const recentHighs = highs.slice(-10);
    const recentLows = lows.slice(-10);
    
    // Price making higher high but RSI making lower high = bearish divergence
    const priceHH = recentHighs[recentHighs.length - 1] > Math.max(...recentHighs.slice(0, -1));
    const rsiLH = recentRSI[recentRSI.length - 1] < Math.max(...recentRSI.slice(0, -1));
    const bearishDiv = priceHH && rsiLH && rsi > 60;
    
    // Price making lower low but RSI making higher low = bullish divergence
    const priceLL = recentLows[recentLows.length - 1] < Math.min(...recentLows.slice(0, -1));
    const rsiHL = recentRSI[recentRSI.length - 1] > Math.min(...recentRSI.slice(0, -1));
    const bullishDiv = priceLL && rsiHL && rsi < 40;
    
    return {
      rsi: Math.round(rsi * 100) / 100,
      divergence: bearishDiv ? 'bearish' : bullishDiv ? 'bullish' : null,
      description: bearishDiv ? 'Bearish RSI Divergence - Potential reversal down' :
                   bullishDiv ? 'Bullish RSI Divergence - Potential reversal up' : null
    };
  }

  // ========================================
  // MACD HISTOGRAM ANALYSIS
  // ========================================

  /**
   * Calculate MACD with histogram momentum analysis
   */
  calculateMACDAnalysis(closes) {
    if (closes.length < 35) {
      return { macd: 0, signal: 0, histogram: 0, trend: 'neutral' };
    }
    
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macdLine = ema12 - ema26;
    
    // Calculate MACD series for signal line
    const macdSeries = [];
    for (let i = 26; i <= closes.length; i++) {
      const e12 = this.calculateEMA(closes.slice(0, i), 12);
      const e26 = this.calculateEMA(closes.slice(0, i), 26);
      macdSeries.push(e12 - e26);
    }
    
    const signalLine = this.calculateEMA(macdSeries, 9);
    const histogram = macdLine - signalLine;
    
    // Get previous values for crossover detection
    const prevMACD = macdSeries.length > 1 ? macdSeries[macdSeries.length - 2] : macdLine;
    const prevSignal = this.calculateEMA(macdSeries.slice(0, -1), 9);
    const prevHistogram = prevMACD - prevSignal;
    
    // MACD momentum analysis
    const macdIncreasing = histogram > prevHistogram && 
                          (macdSeries.length > 2 ? prevHistogram > macdSeries[macdSeries.length - 3] - this.calculateEMA(macdSeries.slice(0, -2), 9) : false);
    const macdDecreasing = histogram < prevHistogram &&
                          (macdSeries.length > 2 ? prevHistogram < macdSeries[macdSeries.length - 3] - this.calculateEMA(macdSeries.slice(0, -2), 9) : false);
    
    // Zero line cross detection
    const macdBullCross = prevMACD < prevSignal && macdLine > signalLine;
    const macdBearCross = prevMACD > prevSignal && macdLine < signalLine;
    
    return {
      macd: Math.round(macdLine * 100) / 100,
      signal: Math.round(signalLine * 100) / 100,
      histogram: Math.round(histogram * 100) / 100,
      macdIncreasing,
      macdDecreasing,
      crossover: macdBullCross ? 'bullish' : macdBearCross ? 'bearish' : null,
      trend: macdLine > signalLine ? 'bullish' : 'bearish',
      histogramMomentum: macdIncreasing ? 'accelerating' : macdDecreasing ? 'decelerating' : 'stable'
    };
  }

  // ========================================
  // ADX TREND STRENGTH
  // ========================================

  /**
   * Calculate ADX with DI+ and DI-
   */
  calculateADXAnalysis(highs, lows, closes, period = 14) {
    if (closes.length < period * 2) {
      return { adx: 0, diPlus: 0, diMinus: 0, trendStrength: 'weak' };
    }
    
    const plusDM = [];
    const minusDM = [];
    const tr = [];
    
    for (let i = 1; i < closes.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
      
      const trueRange = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      tr.push(trueRange);
    }
    
    // Calculate smoothed values
    const smoothedPlusDM = plusDM.slice(-period).reduce((a, b) => a + b, 0);
    const smoothedMinusDM = minusDM.slice(-period).reduce((a, b) => a + b, 0);
    const smoothedTR = tr.slice(-period).reduce((a, b) => a + b, 0);
    
    const diPlus = (smoothedPlusDM / smoothedTR) * 100;
    const diMinus = (smoothedMinusDM / smoothedTR) * 100;
    const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus + 0.001) * 100;
    const adx = dx; // Simplified - actual ADX uses smoothed DX
    
    const strongTrend = adx > 25;
    const veryStrongTrend = adx > 35;
    
    return {
      adx: Math.round(adx * 100) / 100,
      diPlus: Math.round(diPlus * 100) / 100,
      diMinus: Math.round(diMinus * 100) / 100,
      strongTrend,
      veryStrongTrend,
      trendStrength: veryStrongTrend ? 'VERY STRONG' : strongTrend ? 'STRONG' : 'WEAK',
      trendDirection: diPlus > diMinus ? 'bullish' : 'bearish'
    };
  }

  // ========================================
  // VOLUME ANALYSIS
  // ========================================

  /**
   * Calculate Volume Analysis with VPT
   */
  calculateVolumeAnalysis(closes, volumes) {
    if (volumes.length < 20) {
      return { volRatio: 1, vptBullish: false, volumeSignal: 'neutral' };
    }
    
    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentVol = volumes[volumes.length - 1];
    const volRatio = currentVol / avgVol;
    
    const highVolume = volRatio > 1.5;
    const veryHighVolume = volRatio > 2.0;
    
    // Volume Price Trend (VPT)
    let vpt = 0;
    for (let i = 1; i < closes.length; i++) {
      const priceChange = (closes[i] - closes[i - 1]) / closes[i - 1];
      vpt += priceChange * volumes[i];
    }
    
    // VPT Moving Average
    const vptValues = [];
    let runningVPT = 0;
    for (let i = 1; i < closes.length; i++) {
      const priceChange = (closes[i] - closes[i - 1]) / closes[i - 1];
      runningVPT += priceChange * volumes[i];
      vptValues.push(runningVPT);
    }
    
    const vptMA = vptValues.length >= 20 ? 
                  vptValues.slice(-20).reduce((a, b) => a + b, 0) / 20 : 
                  vptValues[vptValues.length - 1];
    
    const vptBullish = vpt > vptMA;
    
    return {
      volRatio: Math.round(volRatio * 100) / 100,
      highVolume,
      veryHighVolume,
      vptBullish,
      volumeSignal: veryHighVolume ? 'VERY HIGH' : highVolume ? 'HIGH' : 'NORMAL',
      vpt: Math.round(vpt),
      vptMA: Math.round(vptMA)
    };
  }

  // ========================================
  // COMPOSITE SIGNAL SCORING (0-100)
  // ========================================

  /**
   * Calculate comprehensive Buy Score
   */
  calculateBuyScore(data) {
    const { closes, highs, lows, volumes, currentPrice } = data;
    
    let trendScore = 0;
    let momScore = 0;
    let strengthScore = 0;
    let volScore = 0;
    let predScore = 0;
    
    // Calculate EMAs
    const ema21 = this.calculateEMA(closes, 21);
    const ema50 = this.calculateEMA(closes, 50);
    const ema200 = closes.length >= 200 ? this.calculateEMA(closes, 200) : ema50;
    
    // Trend Score (0-30)
    if (currentPrice > ema21) trendScore += 10;
    if (currentPrice > ema50) trendScore += 10;
    if (currentPrice > ema200) trendScore += 10;
    
    // MACD Analysis
    const macd = this.calculateMACDAnalysis(closes);
    
    // Momentum Score (0-25)
    if (macd.trend === 'bullish') momScore += 10;
    if (macd.macdIncreasing) momScore += 5;
    
    const momentumAccel = this.calculateMomentumAcceleration(closes);
    if (momentumAccel > 0) momScore += 5;
    
    const rsi = this.calculateRSI(closes);
    if (rsi > 50 && rsi < 70) momScore += 5;
    
    // ADX Analysis
    const adx = this.calculateADXAnalysis(highs, lows, closes);
    
    // Strength Score (0-20)
    if (adx.strongTrend && adx.diPlus > adx.diMinus) strengthScore += 10;
    if (adx.veryStrongTrend) strengthScore += 10;
    
    // Volume Analysis
    const volume = this.calculateVolumeAnalysis(closes, volumes);
    
    // Volume Score (0-15)
    if (volume.highVolume) volScore += 5;
    if (volume.veryHighVolume) volScore += 5;
    if (volume.vptBullish) volScore += 5;
    
    // Prediction Analysis
    const prediction = this.calculatePrediction(closes);
    
    // Prediction Score (0-10)
    if (prediction && prediction.predictedPrice > currentPrice) predScore += 5;
    if (prediction && prediction.slope > 0) predScore += 5;
    
    const totalScore = trendScore + momScore + strengthScore + volScore + predScore;
    
    return {
      total: Math.min(100, totalScore),
      components: {
        trend: trendScore,
        momentum: momScore,
        strength: strengthScore,
        volume: volScore,
        prediction: predScore
      },
      details: {
        ema21, ema50, ema200,
        macd,
        adx,
        volume,
        prediction,
        rsi,
        momentumAccel
      }
    };
  }

  /**
   * Calculate comprehensive Sell Score
   */
  calculateSellScore(data) {
    const { closes, highs, lows, volumes, currentPrice } = data;
    
    let trendScore = 0;
    let momScore = 0;
    let strengthScore = 0;
    let volScore = 0;
    let predScore = 0;
    
    // Calculate EMAs
    const ema21 = this.calculateEMA(closes, 21);
    const ema50 = this.calculateEMA(closes, 50);
    const ema200 = closes.length >= 200 ? this.calculateEMA(closes, 200) : ema50;
    
    // Bear Trend Score (0-30) - inverse of buy trend
    if (currentPrice < ema21) trendScore += 10;
    if (currentPrice < ema50) trendScore += 10;
    if (currentPrice < ema200) trendScore += 10;
    
    // MACD Analysis
    const macd = this.calculateMACDAnalysis(closes);
    
    // Bear Momentum Score (0-25)
    if (macd.trend === 'bearish') momScore += 10;
    if (macd.macdDecreasing) momScore += 5;
    
    const momentumAccel = this.calculateMomentumAcceleration(closes);
    if (momentumAccel < 0) momScore += 5;
    
    const rsi = this.calculateRSI(closes);
    if (rsi < 50 && rsi > 30) momScore += 5;
    
    // ADX Analysis
    const adx = this.calculateADXAnalysis(highs, lows, closes);
    
    // Bear Strength Score (0-20)
    if (adx.strongTrend && adx.diMinus > adx.diPlus) strengthScore += 10;
    if (adx.veryStrongTrend) strengthScore += 10;
    
    // Volume Analysis
    const volume = this.calculateVolumeAnalysis(closes, volumes);
    
    // Bear Volume Score (0-15)
    if (volume.highVolume) volScore += 5;
    if (volume.veryHighVolume) volScore += 5;
    if (!volume.vptBullish) volScore += 5;
    
    // Prediction Analysis
    const prediction = this.calculatePrediction(closes);
    
    // Bear Prediction Score (0-10)
    if (prediction && prediction.predictedPrice < currentPrice) predScore += 5;
    if (prediction && prediction.slope < 0) predScore += 5;
    
    const totalScore = trendScore + momScore + strengthScore + volScore + predScore;
    
    return {
      total: Math.min(100, totalScore),
      components: {
        trend: trendScore,
        momentum: momScore,
        strength: strengthScore,
        volume: volScore,
        prediction: predScore
      }
    };
  }

  // ========================================
  // TRADE SETUP CALCULATION
  // ========================================

  /**
   * Calculate Entry, Target, and Stop Loss
   */
  calculateTradeSetup(data, signal) {
    const { closes, highs, lows, currentPrice } = data;
    const { riskReward, atrMultiplier } = this.config;
    
    const atr = this.calculateATR(highs, lows, closes);
    const prediction = this.calculatePrediction(closes);
    const volatility = this.calculateVolatilityAdjustedPrediction(
      closes, highs, lows, 
      prediction ? prediction.predictedPrice : currentPrice
    );
    
    if (signal === 'BUY') {
      // Long position setup
      const structureStop = Math.min(...lows.slice(-10)) - (atr * 0.5);
      const atrStop = currentPrice - (atr * atrMultiplier);
      const stopLoss = Math.max(structureStop, atrStop);
      
      const risk = currentPrice - stopLoss;
      const target = Math.max(
        volatility.adjustedPrediction,
        currentPrice + (risk * riskReward)
      );
      
      return {
        entry: Math.round(currentPrice * 100) / 100,
        target: Math.round(target * 100) / 100,
        stopLoss: Math.round(stopLoss * 100) / 100,
        risk: Math.round(risk * 100) / 100,
        riskPercent: Math.round((risk / currentPrice) * 10000) / 100,
        reward: Math.round((target - currentPrice) * 100) / 100,
        rewardPercent: Math.round(((target - currentPrice) / currentPrice) * 10000) / 100,
        riskRewardRatio: Math.round((target - currentPrice) / risk * 10) / 10,
        atr: Math.round(atr * 100) / 100
      };
    } else {
      // Short position setup
      const structureStop = Math.max(...highs.slice(-10)) + (atr * 0.5);
      const atrStop = currentPrice + (atr * atrMultiplier);
      const stopLoss = Math.min(structureStop, atrStop);
      
      const risk = stopLoss - currentPrice;
      const target = Math.min(
        volatility.adjustedPrediction,
        currentPrice - (risk * riskReward)
      );
      
      return {
        entry: Math.round(currentPrice * 100) / 100,
        target: Math.round(target * 100) / 100,
        stopLoss: Math.round(stopLoss * 100) / 100,
        risk: Math.round(risk * 100) / 100,
        riskPercent: Math.round((risk / currentPrice) * 10000) / 100,
        reward: Math.round((currentPrice - target) * 100) / 100,
        rewardPercent: Math.round(((currentPrice - target) / currentPrice) * 10000) / 100,
        riskRewardRatio: Math.round((currentPrice - target) / risk * 10) / 10,
        atr: Math.round(atr * 100) / 100
      };
    }
  }

  // ========================================
  // COMPREHENSIVE STOCK ANALYSIS
  // ========================================

  /**
   * Analyze a single stock with full predictive swing analysis
   */
  async analyzeStock(symbol) {
    try {
      // Fetch current price
      const priceData = await stockService.getStockPrice(symbol);
      if (!priceData || priceData.price <= 0) {
        throw new Error('No price data available');
      }
      
      // Fetch historical data
      const historicalData = await historicalService.getHistoricalData(symbol, '3mo');
      if (!historicalData?.history || historicalData.history.length < this.config.minDataPoints) {
        throw new Error('Insufficient historical data');
      }
      
      const history = historicalData.history;
      const closes = history.map(d => d.close).filter(c => c != null);
      const highs = history.map(d => d.high).filter(h => h != null);
      const lows = history.map(d => d.low).filter(l => l != null);
      const volumes = history.map(d => d.volume).filter(v => v != null);
      const currentPrice = priceData.price;
      
      const data = { closes, highs, lows, volumes, currentPrice };
      
      // Calculate scores
      const buyScore = this.calculateBuyScore(data);
      const sellScore = this.calculateSellScore(data);
      
      // Determine signal
      const dominantSignal = buyScore.total > sellScore.total ? 'BUY' : 'SELL';
      const signalScore = Math.max(buyScore.total, sellScore.total);
      const strongSignal = signalScore >= this.config.strongSignalThreshold;
      
      // Calculate additional analysis
      const rsiDivergence = this.detectRSIDivergence(closes, highs, lows);
      const fibonacci = this.calculateFibonacciProjection(highs, lows, currentPrice);
      const prediction = this.calculatePrediction(closes, this.config.predictionBars, this.config.regressionLength);
      const volatility = prediction ? 
        this.calculateVolatilityAdjustedPrediction(closes, highs, lows, prediction.predictedPrice) :
        null;
      
      // Determine trend
      const ema21 = this.calculateEMA(closes, 21);
      const ema50 = this.calculateEMA(closes, 50);
      const uptrend = currentPrice > ema21 && ema21 > ema50;
      const downtrend = currentPrice < ema21 && ema21 < ema50;
      const trend = uptrend ? 'UPTREND' : downtrend ? 'DOWNTREND' : 'SIDEWAYS';
      
      // Calculate trade setup
      const tradeSetup = this.calculateTradeSetup(data, dominantSignal);
      
      // Generate signal strength description
      let signalStrength = 'WEAK';
      if (signalScore >= 80) signalStrength = 'VERY STRONG';
      else if (signalScore >= 70) signalStrength = 'STRONG';
      else if (signalScore >= 60) signalStrength = 'MODERATE';
      else if (signalScore >= 50) signalStrength = 'DEVELOPING';
      
      return {
        symbol,
        name: priceData.name || symbol,
        currentPrice,
        change: priceData.change,
        percentChange: priceData.percentChange,
        
        // Primary Signal
        signal: dominantSignal,
        signalScore,
        signalStrength,
        strongSignal,
        
        // Scores
        buyScore: buyScore.total,
        sellScore: sellScore.total,
        scoreComponents: dominantSignal === 'BUY' ? buyScore.components : sellScore.components,
        
        // Trend
        trend,
        ema21: Math.round(ema21 * 100) / 100,
        ema50: Math.round(ema50 * 100) / 100,
        
        // Trade Setup
        entry: tradeSetup.entry,
        target: tradeSetup.target,
        stopLoss: tradeSetup.stopLoss,
        riskPercent: tradeSetup.riskPercent,
        rewardPercent: tradeSetup.rewardPercent,
        riskRewardRatio: tradeSetup.riskRewardRatio,
        
        // Prediction
        prediction: prediction ? {
          price: prediction.predictedPrice,
          change: prediction.predictedChange,
          direction: prediction.direction,
          confidence: prediction.confidence,
          upperBand: prediction.upperBand,
          lowerBand: prediction.lowerBand
        } : null,
        
        // Volatility
        volatilityRegime: volatility?.volatilityRegime,
        atr: tradeSetup.atr,
        
        // RSI Divergence
        rsi: rsiDivergence.rsi,
        rsiDivergence: rsiDivergence.divergence,
        
        // Technical Details
        technicals: buyScore.details,
        
        // Fibonacci
        fibonacci,
        
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error.message);
      return null;
    }
  }

  // ========================================
  // BATCH SCANNING
  // ========================================

  /**
   * Scan multiple stocks and return signals
   */
  async scanForSignals(customWatchlist = null, minScore = 50) {
    const stocks = customWatchlist || this.watchlist;
    const signals = [];
    const errors = [];
    
    console.log(`🔮 Predictive Swing Scanner: Analyzing ${stocks.length} stocks...`);
    
    for (const symbol of stocks) {
      try {
        const analysis = await this.analyzeStock(symbol);
        if (analysis && analysis.signalScore >= minScore) {
          signals.push(analysis);
        }
      } catch (error) {
        errors.push({ symbol, error: error.message });
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 150));
    }
    
    // Sort by signal strength
    signals.sort((a, b) => b.signalScore - a.signalScore);
    
    // Separate strong buy and sell signals
    const strongBuys = signals.filter(s => s.signal === 'BUY' && s.strongSignal);
    const strongSells = signals.filter(s => s.signal === 'SELL' && s.strongSignal);
    const moderateBuys = signals.filter(s => s.signal === 'BUY' && !s.strongSignal);
    const moderateSells = signals.filter(s => s.signal === 'SELL' && !s.strongSignal);
    
    return {
      timestamp: new Date().toISOString(),
      scannedCount: stocks.length,
      totalSignals: signals.length,
      summary: {
        strongBuys: strongBuys.length,
        strongSells: strongSells.length,
        moderateBuys: moderateBuys.length,
        moderateSells: moderateSells.length
      },
      signals: {
        strongBuys,
        strongSells,
        moderateBuys,
        moderateSells,
        all: signals
      },
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Get only strong signals (score >= 70)
   */
  async getStrongSignals(watchlist = null) {
    return this.scanForSignals(watchlist, this.config.strongSignalThreshold);
  }

  /**
   * Quick analysis summary for a stock
   */
  async getQuickAnalysis(symbol) {
    const analysis = await this.analyzeStock(symbol);
    if (!analysis) return null;
    
    return {
      symbol: analysis.symbol,
      price: analysis.currentPrice,
      signal: analysis.signal,
      score: analysis.signalScore,
      strength: analysis.signalStrength,
      trend: analysis.trend,
      entry: analysis.entry,
      target: analysis.target,
      stopLoss: analysis.stopLoss,
      rr: analysis.riskRewardRatio,
      prediction: analysis.prediction?.change
    };
  }
}

module.exports = new PredictiveSwingService();
