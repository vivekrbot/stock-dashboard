/**
 * Enhanced AI Prediction Engine
 * Combines multiple technical indicators for high-accuracy predictions
 * Target: 85%+ accuracy with proper risk management
 */

const advancedTechnicalService = require('./advancedTechnicalService');
const patternAnalysisService = require('./patternAnalysisService');
const historicalService = require('./historicalService');
const stockService = require('./stockService');
const nseFetcherService = require('./nseFetcherService');

class EnhancedPredictionEngine {
  constructor() {
    // Will be populated dynamically from NSE fetcher service (all NSE stocks)
    this.premiumWatchlist = null;

    // Minimum criteria for trade signals
    this.qualityThresholds = {
      minConfidence: 70,        // Minimum confidence score
      minRiskReward: 1.5,       // Minimum risk:reward ratio
      minIndicatorAlign: 3,     // Minimum indicators must agree
      maxATRPercent: 4,         // Max volatility for safer trades
      requireTrendConfirm: true // Trend must confirm signal
    };
  }

  /**
   * Get all NSE stocks dynamically from nseFetcherService
   */
  async getFullStockList() {
    if (this.premiumWatchlist) return this.premiumWatchlist;
    const stocks = await nseFetcherService.getAllNSEStocks();
    this.premiumWatchlist = [...new Set([...stocks.largeCap, ...stocks.midCap, ...stocks.smallCap])];
    return this.premiumWatchlist;
  }

  /**
   * Generate HIGH QUALITY trade signals only
   * These are the signals you can trust
   */
  async generatePremiumSignals() {
    const signals = [];
    const skipped = [];
    const errors = [];

    const stockList = await this.getFullStockList();
    console.log(`🎯 Generating PREMIUM signals with strict quality filters across ${stockList.length} stocks...`);

    for (const symbol of stockList) {
      try {
        const signal = await this.analyzeWithFullStack(symbol);
        
        if (signal) {
          if (this.meetsQualityStandards(signal)) {
            signals.push(signal);
            console.log(`✅ ${symbol}: ${signal.action} with ${signal.confidence}% confidence`);
          } else {
            skipped.push({
              symbol,
              reason: signal.skipReason || 'Did not meet quality standards',
              confidence: signal.confidence
            });
          }
        }
      } catch (error) {
        errors.push({ symbol, error: error.message });
      }
      
      await new Promise(r => setTimeout(r, 300)); // Rate limiting
    }

    // Sort by confidence and quality score
    signals.sort((a, b) => b.qualityScore - a.qualityScore);

    return {
      timestamp: new Date().toISOString(),
      totalScanned: stockList.length,
      qualitySignals: signals.length,
      signals: signals.slice(0, 10), // Top 10 only
      skipped: skipped.slice(0, 5),
      summary: this.generateSummary(signals)
    };
  }

  /**
   * Full-stack analysis using ALL indicators
   */
  async analyzeWithFullStack(symbol) {
    // Get price and historical data
    const [priceData, historicalData] = await Promise.all([
      stockService.getStockPrice(symbol),
      historicalService.getHistoricalData(symbol, '3mo')
    ]);

    if (!priceData || !historicalData?.history || historicalData.history.length < 50) {
      throw new Error('Insufficient data');
    }

    const currentPrice = priceData.price;
    const history = historicalData.history;

    // Extract OHLCV arrays
    const closes = history.map(d => d.close).filter(c => c != null);
    const highs = history.map(d => d.high).filter(h => h != null);
    const lows = history.map(d => d.low).filter(l => l != null);
    const volumes = history.map(d => d.volume).filter(v => v != null);

    // Run ALL technical analysis
    const technicals = advancedTechnicalService.getCompleteAnalysis(history);
    const patterns = patternAnalysisService.analyzePatterns(history, currentPrice);
    
    // Calculate additional indicators
    const rsi = patternAnalysisService.calculateRSI(closes);
    const sma20 = patternAnalysisService.calculateSMA(closes, 20);
    const sma50 = patternAnalysisService.calculateSMA(closes, 50);
    const sma200 = closes.length >= 200 ? patternAnalysisService.calculateSMA(closes, 200) : null;

    // Build comprehensive signal
    const indicatorSignals = this.analyzeIndicatorSignals(technicals, rsi, currentPrice, sma20, sma50, sma200, patterns);
    
    // Calculate confidence and quality
    const confidence = this.calculateConfidence(indicatorSignals);
    const qualityScore = this.calculateQualityScore(indicatorSignals, technicals);

    // Determine trade direction
    const { direction, action } = this.determineDirection(indicatorSignals);

    // Calculate optimal entry, target, stop-loss
    const tradeSetup = this.calculateOptimalSetup(
      currentPrice, 
      technicals, 
      patterns, 
      direction,
      indicatorSignals
    );

    return {
      symbol,
      name: priceData.name || symbol,
      currentPrice,
      change: priceData.change,
      percentChange: priceData.percentChange,
      
      // Signal
      action,
      direction,
      confidence,
      qualityScore,
      
      // Trade Setup
      entry: tradeSetup.entry,
      target: tradeSetup.target,
      target2: tradeSetup.target2,
      stopLoss: tradeSetup.stopLoss,
      riskRewardRatio: tradeSetup.riskReward,
      
      // Indicator Summary
      indicatorAlignment: indicatorSignals.alignment,
      bullishIndicators: indicatorSignals.bullish,
      bearishIndicators: indicatorSignals.bearish,
      
      // Key Technical Data
      technicals: {
        rsi,
        macd: technicals.macd,
        stochastic: technicals.stochastic,
        bollinger: technicals.bollinger,
        adx: technicals.adx,
        atr: technicals.atr,
        vwap: technicals.vwap
      },
      
      // Patterns
      patterns: patterns.patterns.map(p => p.name),
      trend: patterns.trend,
      
      // Support/Resistance
      support: patterns.supportResistance.nearestSupport,
      resistance: patterns.supportResistance.nearestResistance,
      pivots: technicals.pivots,
      fibonacci: technicals.fibonacci,
      
      // Reasoning
      reasoning: this.generateReasoning(indicatorSignals, patterns, technicals),
      checklistItems: this.generateChecklist(indicatorSignals, technicals),
      
      // Skip reason if not meeting standards
      skipReason: this.getSkipReason(indicatorSignals, tradeSetup, confidence)
    };
  }

  /**
   * Analyze all indicator signals
   */
  analyzeIndicatorSignals(technicals, rsi, price, sma20, sma50, sma200, patterns) {
    const bullish = [];
    const bearish = [];
    const neutral = [];

    // 1. MACD Signal (Weight: HIGH)
    if (technicals.macd.trend === 'bullish' || technicals.macd.crossover?.includes('Bullish')) {
      bullish.push({ indicator: 'MACD', signal: technicals.macd.crossover || 'Bullish', weight: 15 });
    } else if (technicals.macd.trend === 'bearish' || technicals.macd.crossover?.includes('Bearish')) {
      bearish.push({ indicator: 'MACD', signal: technicals.macd.crossover || 'Bearish', weight: 15 });
    }

    // 2. RSI Signal (Weight: MEDIUM)
    if (rsi < 30) {
      bullish.push({ indicator: 'RSI', signal: 'Oversold', value: rsi, weight: 12 });
    } else if (rsi > 70) {
      bearish.push({ indicator: 'RSI', signal: 'Overbought', value: rsi, weight: 12 });
    } else if (rsi < 40) {
      bullish.push({ indicator: 'RSI', signal: 'Near Oversold', value: rsi, weight: 6 });
    } else if (rsi > 60) {
      bearish.push({ indicator: 'RSI', signal: 'Near Overbought', value: rsi, weight: 6 });
    }

    // 3. Stochastic Signal (Weight: MEDIUM)
    if (technicals.stochastic.signal === 'bullish') {
      bullish.push({ indicator: 'Stochastic', signal: technicals.stochastic.crossover || 'Bullish', weight: 10 });
    } else if (technicals.stochastic.signal === 'bearish') {
      bearish.push({ indicator: 'Stochastic', signal: technicals.stochastic.crossover || 'Bearish', weight: 10 });
    }

    // 4. Bollinger Bands Signal (Weight: MEDIUM)
    if (technicals.bollinger.signal === 'bullish') {
      bullish.push({ indicator: 'Bollinger', signal: technicals.bollinger.description, weight: 10 });
    } else if (technicals.bollinger.signal === 'bearish') {
      bearish.push({ indicator: 'Bollinger', signal: technicals.bollinger.description, weight: 10 });
    }
    if (technicals.bollinger.squeeze) {
      neutral.push({ indicator: 'Bollinger Squeeze', signal: 'Big move imminent', weight: 5 });
    }

    // 5. Moving Average Alignment (Weight: HIGH)
    if (price > sma20 && sma20 > sma50) {
      bullish.push({ indicator: 'MA Alignment', signal: 'Price > SMA20 > SMA50', weight: 15 });
    } else if (price < sma20 && sma20 < sma50) {
      bearish.push({ indicator: 'MA Alignment', signal: 'Price < SMA20 < SMA50', weight: 15 });
    }
    
    if (sma200 && price > sma200) {
      bullish.push({ indicator: 'Long-term Trend', signal: 'Above 200 SMA', weight: 8 });
    } else if (sma200 && price < sma200) {
      bearish.push({ indicator: 'Long-term Trend', signal: 'Below 200 SMA', weight: 8 });
    }

    // 6. ADX Trend Strength (Weight: MEDIUM)
    if (technicals.adx.adx > 25) {
      if (technicals.adx.trendDirection === 'bullish') {
        bullish.push({ indicator: 'ADX', signal: `Strong Trend (${technicals.adx.adx})`, weight: 10 });
      } else if (technicals.adx.trendDirection === 'bearish') {
        bearish.push({ indicator: 'ADX', signal: `Strong Trend (${technicals.adx.adx})`, weight: 10 });
      }
    } else {
      neutral.push({ indicator: 'ADX', signal: 'Weak Trend', weight: 0 });
    }

    // 7. VWAP Signal (Weight: LOW)
    if (technicals.vwap.signal === 'bullish') {
      bullish.push({ indicator: 'VWAP', signal: 'Above VWAP', weight: 5 });
    } else if (technicals.vwap.signal === 'bearish') {
      bearish.push({ indicator: 'VWAP', signal: 'Below VWAP', weight: 5 });
    }

    // 8. Pattern Signals (Weight: HIGH)
    patterns.patterns.forEach(p => {
      if (p.type === 'bullish') {
        bullish.push({ indicator: 'Pattern', signal: p.name, weight: p.confidence * 0.15 });
      } else if (p.type === 'bearish') {
        bearish.push({ indicator: 'Pattern', signal: p.name, weight: p.confidence * 0.15 });
      }
    });

    // 9. Trend Confirmation (Weight: HIGH)
    if (patterns.trend.direction === 'bullish') {
      bullish.push({ indicator: 'Trend', signal: `Bullish (${patterns.trend.strength}%)`, weight: 12 });
    } else if (patterns.trend.direction === 'bearish') {
      bearish.push({ indicator: 'Trend', signal: `Bearish (${patterns.trend.strength}%)`, weight: 12 });
    }

    // Calculate totals
    const bullishScore = bullish.reduce((sum, s) => sum + s.weight, 0);
    const bearishScore = bearish.reduce((sum, s) => sum + s.weight, 0);

    return {
      bullish,
      bearish,
      neutral,
      bullishScore,
      bearishScore,
      alignment: Math.max(bullish.length, bearish.length),
      dominantDirection: bullishScore > bearishScore ? 'bullish' : 'bearish',
      conviction: Math.abs(bullishScore - bearishScore)
    };
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(signals) {
    const totalScore = signals.bullishScore + signals.bearishScore;
    const maxScore = signals.alignment * 15; // Maximum possible score
    
    const dominantScore = Math.max(signals.bullishScore, signals.bearishScore);
    const alignmentBonus = signals.alignment >= 5 ? 10 : signals.alignment >= 3 ? 5 : 0;
    
    // Confidence = (Dominant / Total) * (Dominant / MaxPossible) * 100
    let confidence = 50;
    
    if (totalScore > 0) {
      const dominanceRatio = dominantScore / totalScore;
      const strengthRatio = Math.min(dominantScore / 50, 1); // Cap at 50 points
      confidence = (dominanceRatio * 50) + (strengthRatio * 40) + alignmentBonus;
    }

    return Math.min(95, Math.max(30, Math.round(confidence)));
  }

  /**
   * Calculate quality score for trade
   */
  calculateQualityScore(signals, technicals) {
    let score = 0;

    // Factor 1: Indicator alignment (30 points)
    score += Math.min(30, signals.alignment * 5);

    // Factor 2: Conviction strength (25 points)
    score += Math.min(25, signals.conviction / 2);

    // Factor 3: Clear trend (20 points)
    if (technicals.adx.adx > 25) score += 20;
    else if (technicals.adx.adx > 20) score += 10;

    // Factor 4: Good volatility (not too high/low) (15 points)
    if (technicals.atr.atrPercent >= 1 && technicals.atr.atrPercent <= 3) {
      score += 15;
    } else if (technicals.atr.atrPercent < 4) {
      score += 8;
    }

    // Factor 5: Volume confirmation (10 points)
    if (technicals.vwap.signal !== 'neutral') score += 10;

    return Math.min(100, score);
  }

  /**
   * Determine trade direction
   */
  determineDirection(signals) {
    if (signals.bullishScore > signals.bearishScore + 10) {
      return { direction: 'bullish', action: 'BUY' };
    } else if (signals.bearishScore > signals.bullishScore + 10) {
      return { direction: 'bearish', action: 'SELL' };
    }
    return { direction: 'neutral', action: 'WAIT' };
  }

  /**
   * Calculate optimal trade setup
   */
  calculateOptimalSetup(price, technicals, patterns, direction, signals) {
    const atr = technicals.atr.atr;
    const support = patterns.supportResistance.nearestSupport;
    const resistance = patterns.supportResistance.nearestResistance;

    let entry, target, target2, stopLoss;

    if (direction === 'bullish') {
      entry = price;
      
      // Target 1: Nearest resistance or 2x ATR
      target = Math.max(resistance, price + (2 * atr));
      target = Math.round(target * 100) / 100;
      
      // Target 2: Fibonacci extension or 3x ATR
      target2 = technicals.fibonacci.extension1272 || price + (3 * atr);
      target2 = Math.round(target2 * 100) / 100;
      
      // Stop Loss: Below support or 1.5x ATR
      stopLoss = Math.max(support - (atr * 0.5), price - (1.5 * atr));
      stopLoss = Math.round(stopLoss * 100) / 100;
      
    } else if (direction === 'bearish') {
      entry = price;
      
      // Target 1: Nearest support or 2x ATR down
      target = Math.min(support, price - (2 * atr));
      target = Math.round(target * 100) / 100;
      
      // Target 2: 3x ATR down
      target2 = price - (3 * atr);
      target2 = Math.round(target2 * 100) / 100;
      
      // Stop Loss: Above resistance or 1.5x ATR
      stopLoss = Math.min(resistance + (atr * 0.5), price + (1.5 * atr));
      stopLoss = Math.round(stopLoss * 100) / 100;
      
    } else {
      return { entry: price, target: price, target2: price, stopLoss: price, riskReward: 0 };
    }

    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(target - entry);
    const riskReward = risk > 0 ? Math.round((reward / risk) * 10) / 10 : 0;

    return {
      entry: Math.round(entry * 100) / 100,
      target,
      target2,
      stopLoss,
      riskReward,
      potentialGain: `${((reward / entry) * 100).toFixed(1)}%`,
      potentialLoss: `${((risk / entry) * 100).toFixed(1)}%`
    };
  }

  /**
   * Check if signal meets quality standards
   */
  meetsQualityStandards(signal) {
    if (signal.action === 'WAIT') return false;
    if (signal.confidence < this.qualityThresholds.minConfidence) return false;
    if (signal.riskRewardRatio < this.qualityThresholds.minRiskReward) return false;
    if (signal.indicatorAlignment < this.qualityThresholds.minIndicatorAlign) return false;
    if (signal.technicals.atr.atrPercent > this.qualityThresholds.maxATRPercent) return false;
    
    return true;
  }

  /**
   * Get reason for skipping signal
   */
  getSkipReason(signals, setup, confidence) {
    const reasons = [];
    
    if (confidence < 70) reasons.push(`Low confidence (${confidence}%)`);
    if (setup.riskReward < 1.5) reasons.push(`Poor risk:reward (${setup.riskReward})`);
    if (signals.alignment < 3) reasons.push(`Weak indicator alignment (${signals.alignment})`);
    if (signals.conviction < 10) reasons.push('Low conviction');
    
    return reasons.length > 0 ? reasons.join(', ') : null;
  }

  /**
   * Generate reasoning for the signal
   */
  generateReasoning(signals, patterns, technicals) {
    const direction = signals.dominantDirection;
    const topSignals = direction === 'bullish' 
      ? signals.bullish.slice(0, 3) 
      : signals.bearish.slice(0, 3);

    let reasoning = `${signals.alignment} indicators align ${direction}. `;
    reasoning += `Key signals: ${topSignals.map(s => s.signal).join(', ')}. `;
    
    if (patterns.patterns.length > 0) {
      reasoning += `Pattern: ${patterns.patterns[0].name}. `;
    }
    
    if (technicals.adx.adx > 25) {
      reasoning += `Strong trend (ADX ${technicals.adx.adx}). `;
    }

    return reasoning;
  }

  /**
   * Generate pre-trade checklist
   */
  generateChecklist(signals, technicals) {
    const items = [];
    
    // Trend check
    items.push({
      check: 'Trend Direction',
      status: technicals.adx.adx > 20 ? 'pass' : 'warning',
      detail: technicals.adx.trendDirection || 'sideways'
    });

    // Momentum check
    items.push({
      check: 'Momentum',
      status: signals.conviction > 15 ? 'pass' : signals.conviction > 5 ? 'warning' : 'fail',
      detail: `Conviction: ${signals.conviction}`
    });

    // Volatility check
    items.push({
      check: 'Volatility',
      status: technicals.atr.atrPercent < 3 ? 'pass' : technicals.atr.atrPercent < 4 ? 'warning' : 'fail',
      detail: `ATR: ${technicals.atr.atrPercent}%`
    });

    // Volume check
    items.push({
      check: 'Volume Confirmation',
      status: technicals.vwap.signal !== 'neutral' ? 'pass' : 'warning',
      detail: technicals.vwap.description
    });

    // Risk:Reward check
    items.push({
      check: 'Indicator Alignment',
      status: signals.alignment >= 4 ? 'pass' : signals.alignment >= 3 ? 'warning' : 'fail',
      detail: `${signals.alignment} indicators agree`
    });

    return items;
  }

  /**
   * Generate summary of signals
   */
  generateSummary(signals) {
    const bullish = signals.filter(s => s.direction === 'bullish').length;
    const bearish = signals.filter(s => s.direction === 'bearish').length;
    const avgConfidence = signals.length > 0 
      ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length)
      : 0;

    return {
      totalSignals: signals.length,
      bullishSignals: bullish,
      bearishSignals: bearish,
      averageConfidence: avgConfidence,
      topPick: signals[0] ? {
        symbol: signals[0].symbol,
        action: signals[0].action,
        confidence: signals[0].confidence
      } : null
    };
  }

  /**
   * Analyze single stock with full report
   */
  async getDetailedAnalysis(symbol) {
    return this.analyzeWithFullStack(symbol);
  }
}

module.exports = new EnhancedPredictionEngine();
