/**
 * Intelligent Trading Strategy Engine
 * Implements swing, short-term, and long-term trading strategies
 * with ML-powered signals and advanced risk management
 */

const mlPredictionService = require('./mlPredictionService');
const realTimeDataService = require('./realTimeDataService');
const historicalService = require('./historicalService');
const patternAnalysisService = require('./patternAnalysisService');
const advancedTechnicalService = require('./advancedTechnicalService');
const riskManagementService = require('./riskManagementService');
const stats = require('simple-statistics');

class IntelligentTradingEngine {
  constructor() {
    this.strategies = {
      INTRADAY: {
        name: 'Intraday Scalping',
        timeframe: '5min-1hr',
        holdingPeriod: '1 day',
        riskReward: 1.5,
        stopLossPercent: 1.5,
        targetPercent: 2.5,
        minConfidence: 75,
        indicators: ['RSI', 'VWAP', 'Volume', 'Support/Resistance']
      },
      SWING: {
        name: 'Swing Trading',
        timeframe: '1hr-daily',
        holdingPeriod: '2-10 days',
        riskReward: 2.0,
        stopLossPercent: 3.0,
        targetPercent: 6.0,
        minConfidence: 70,
        indicators: ['Pattern', 'RSI', 'MACD', 'Volume', 'Trend']
      },
      SHORT_TERM: {
        name: 'Short-term Position',
        timeframe: 'daily',
        holdingPeriod: '1-4 weeks',
        riskReward: 2.5,
        stopLossPercent: 4.0,
        targetPercent: 10.0,
        minConfidence: 65,
        indicators: ['Technical', 'Fundamental', 'Sector', 'Market']
      },
      LONG_TERM: {
        name: 'Long-term Investment',
        timeframe: 'weekly-monthly',
        holdingPeriod: '3-12 months',
        riskReward: 3.0,
        stopLossPercent: 15.0,
        targetPercent: 45.0,
        minConfidence: 60,
        indicators: ['Fundamental', 'Growth', 'Valuation', 'Management']
      }
    };
    
    console.log('✓ Intelligent Trading Engine initialized with 4 strategies');
  }

  /**
   * Analyze stock for all strategies
   */
  async analyzeStock(symbol, options = {}) {
    const { strategies = ['SWING', 'SHORT_TERM', 'LONG_TERM'], capital = 100000 } = options;
    
    console.log(`📊 Analyzing ${symbol} for strategies: ${strategies.join(', ')}`);
    
    // Get comprehensive data
    const [priceData, historicalData, mlPrediction] = await Promise.all([
      realTimeDataService.getRealtimePrice(symbol),
      historicalService.getHistoricalData(symbol, '3mo'),
      mlPredictionService.predict(symbol).catch(err => ({ error: err.message }))
    ]);
    
    if (!priceData || !historicalData?.history) {
      throw new Error(`Insufficient data for ${symbol}`);
    }
    
    // Run pattern and technical analysis
    const patterns = patternAnalysisService.analyzePatterns(historicalData.history, priceData.price);
    const technicals = advancedTechnicalService.getCompleteAnalysis(historicalData.history);
    
    // Analyze for each requested strategy
    const results = {};
    
    for (const strategyType of strategies) {
      const strategyConfig = this.strategies[strategyType];
      if (!strategyConfig) continue;
      
      const analysis = await this.analyzeForStrategy(
        symbol,
        strategyType,
        strategyConfig,
        { priceData, historicalData, mlPrediction, patterns, technicals },
        capital
      );
      
      results[strategyType] = analysis;
    }
    
    // Find best strategy
    const bestStrategy = Object.entries(results)
      .filter(([_, analysis]) => analysis.signal !== 'HOLD')
      .sort((a, b) => b[1].score - a[1].score)[0];
    
    return {
      symbol,
      currentPrice: priceData.price,
      change: priceData.change,
      changePercent: priceData.changePercent,
      mlPrediction,
      strategies: results,
      recommendation: bestStrategy ? {
        strategy: bestStrategy[0],
        ...bestStrategy[1]
      } : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze for specific strategy
   */
  async analyzeForStrategy(symbol, strategyType, config, data, capital) {
    const { priceData, historicalData, mlPrediction, patterns, technicals } = data;
    const currentPrice = priceData.price;
    
    // Calculate strategy-specific score
    let score = 0;
    let signals = [];
    let warnings = [];
    
    // ML Prediction weight
    if (mlPrediction && !mlPrediction.error) {
      const mlWeight = strategyType === 'INTRADAY' ? 0.4 : strategyType === 'SWING' ? 0.35 : 0.25;
      
      if (mlPrediction.prediction === 'BULLISH') {
        score += mlWeight * (mlPrediction.confidence / 100) * 100;
        signals.push(`ML: ${mlPrediction.confidence}% bullish`);
      } else if (mlPrediction.prediction === 'BEARISH') {
        score -= mlWeight * (mlPrediction.confidence / 100) * 100;
        warnings.push(`ML: ${mlPrediction.confidence}% bearish`);
      }
    }
    
    // Technical Analysis weight
    const techWeight = strategyType === 'INTRADAY' ? 0.35 : strategyType === 'SWING' ? 0.35 : 0.25;
    
    if (technicals.signals) {
      const bullishSignals = technicals.signals.filter(s => s.type === 'BULLISH').length;
      const bearishSignals = technicals.signals.filter(s => s.type === 'BEARISH').length;
      const netSignals = bullishSignals - bearishSignals;
      
      score += techWeight * (netSignals / 5) * 100;  // Normalize to -100 to 100
      
      if (bullishSignals > bearishSignals) {
        signals.push(`${bullishSignals} bullish technical signals`);
      } else if (bearishSignals > bullishSignals) {
        warnings.push(`${bearishSignals} bearish technical signals`);
      }
    }
    
    // Pattern Analysis weight
    const patternWeight = strategyType === 'SWING' ? 0.30 : strategyType === 'SHORT_TERM' ? 0.25 : 0.20;
    
    if (patterns.detectedPatterns && patterns.detectedPatterns.length > 0) {
      const bullishPatterns = patterns.detectedPatterns.filter(p => 
        ['DOUBLE_BOTTOM', 'BREAKOUT', 'SUPPORT_TEST'].includes(p.pattern)
      ).length;
      
      const bearishPatterns = patterns.detectedPatterns.filter(p =>
        ['DOUBLE_TOP', 'BREAKDOWN', 'RESISTANCE_TEST'].includes(p.pattern)
      ).length;
      
      score += patternWeight * ((bullishPatterns - bearishPatterns) / 2) * 100;
      
      if (bullishPatterns > 0) {
        signals.push(`${bullishPatterns} bullish patterns detected`);
      }
      if (bearishPatterns > 0) {
        warnings.push(`${bearishPatterns} bearish patterns detected`);
      }
    }
    
    // Trend Analysis
    const closes = historicalData.history.map(d => d.close);
    const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const sma50 = closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : sma20;
    
    const trendScore = currentPrice > sma20 ? 20 : -20;
    const strongTrend = (currentPrice > sma20 && sma20 > sma50) || (currentPrice < sma20 && sma20 < sma50);
    
    score += trendScore;
    if (strongTrend) {
      if (currentPrice > sma20) {
        signals.push('Strong uptrend');
      } else {
        warnings.push('Strong downtrend');
      }
    }
    
    // Normalize score to 0-100
    const normalizedScore = Math.max(0, Math.min(100, (score + 100) / 2));
    
    // Determine signal
    let signal = 'HOLD';
    if (normalizedScore >= config.minConfidence) {
      signal = 'BUY';
    } else if (normalizedScore <= (100 - config.minConfidence)) {
      signal = 'SELL';
    }
    
    // Calculate entry, target, and stop-loss
    let entry = currentPrice;
    let target = null;
    let stopLoss = null;
    let riskReward = null;
    let positionSize = null;
    
    if (signal === 'BUY') {
      // Use support as stop-loss if available
      const support = patterns.supportResistance?.support || currentPrice * (1 - config.stopLossPercent / 100);
      stopLoss = Math.max(support, currentPrice * (1 - config.stopLossPercent / 100));
      
      // Use resistance as initial target if available
      const resistance = patterns.supportResistance?.resistance || currentPrice * (1 + config.targetPercent / 100);
      target = Math.max(resistance, currentPrice * (1 + config.targetPercent / 100));
      
      // Calculate risk-reward
      const risk = entry - stopLoss;
      const reward = target - entry;
      riskReward = reward / risk;
      
      // Adjust target if risk-reward is too low
      if (riskReward < config.riskReward) {
        target = entry + (risk * config.riskReward);
        riskReward = config.riskReward;
      }
      
      // Calculate position size based on risk
      const maxRisk = capital * 0.02; // 2% max risk per trade
      positionSize = Math.floor(maxRisk / risk);
    }
    
    return {
      signal,
      score: Math.round(normalizedScore),
      confidence: Math.round(normalizedScore),
      entry: Math.round(entry * 100) / 100,
      target: target ? Math.round(target * 100) / 100 : null,
      stopLoss: stopLoss ? Math.round(stopLoss * 100) / 100 : null,
      riskReward: riskReward ? Math.round(riskReward * 10) / 10 : null,
      positionSize,
      expectedReturn: target ? Math.round(((target - entry) / entry) * 100 * 10) / 10 : null,
      maxRisk: stopLoss ? Math.round(((entry - stopLoss) / entry) * 100 * 10) / 10 : null,
      holdingPeriod: config.holdingPeriod,
      signals,
      warnings,
      strategyDetails: config
    };
  }

  /**
   * Scan market for opportunities across all strategies
   */
  async scanMarket(symbols, options = {}) {
    const { strategies = ['SWING', 'SHORT_TERM'], minScore = 70, maxResults = 20 } = options;
    
    console.log(`🔍 Scanning ${symbols.length} stocks for ${strategies.join(', ')} opportunities...`);
    
    const opportunities = [];
    
    // Analyze stocks in batches
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(symbol =>
        this.analyzeStock(symbol, { strategies }).catch(err => ({
          symbol,
          error: err.message
        }))
      );
      
      const results = await Promise.all(promises);
      
      // Filter and collect opportunities
      for (const result of results) {
        if (result.error) continue;
        
        if (result.recommendation && result.recommendation.score >= minScore) {
          opportunities.push({
            symbol: result.symbol,
            currentPrice: result.currentPrice,
            change: result.change,
            changePercent: result.changePercent,
            ...result.recommendation
          });
        }
      }
      
      // Progress update
      console.log(`Progress: ${Math.min(i + batchSize, symbols.length)}/${symbols.length}`);
      
      // Delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    
    // Sort by score
    opportunities.sort((a, b) => b.score - a.score);
    
    return {
      timestamp: new Date().toISOString(),
      scannedCount: symbols.length,
      foundCount: opportunities.length,
      strategies,
      opportunities: opportunities.slice(0, maxResults),
      summary: {
        byStrategy: this.summarizeByStrategy(opportunities),
        avgScore: opportunities.length > 0 ? 
          Math.round(opportunities.reduce((sum, o) => sum + o.score, 0) / opportunities.length) : 0
      }
    };
  }

  /**
   * Summarize opportunities by strategy
   */
  summarizeByStrategy(opportunities) {
    const summary = {};
    
    for (const opp of opportunities) {
      if (!summary[opp.strategy]) {
        summary[opp.strategy] = { count: 0, avgScore: 0, symbols: [] };
      }
      summary[opp.strategy].count++;
      summary[opp.strategy].avgScore += opp.score;
      summary[opp.strategy].symbols.push(opp.symbol);
    }
    
    // Calculate averages
    Object.keys(summary).forEach(strategy => {
      summary[strategy].avgScore = Math.round(summary[strategy].avgScore / summary[strategy].count);
    });
    
    return summary;
  }

  /**
   * Get strategy details
   */
  getStrategies() {
    return this.strategies;
  }

  /**
   * Backtest strategy on historical data
   */
  async backtest(symbol, strategyType, options = {}) {
    const { period = '1y', capital = 100000 } = options;
    
    console.log(`📈 Backtesting ${strategyType} on ${symbol} for ${period}...`);
    
    // Get extended historical data
    const historicalData = await historicalService.getHistoricalData(symbol, period);
    
    if (!historicalData?.history || historicalData.history.length < 100) {
      throw new Error('Insufficient data for backtesting');
    }
    
    const trades = [];
    let currentCapital = capital;
    let position = null;
    
    // Simplified backtest (walk-forward)
    const history = historicalData.history;
    
    for (let i = 50; i < history.length - 10; i++) {
      const currentData = {
        priceData: { price: history[i].close },
        historicalData: { history: history.slice(Math.max(0, i - 90), i) },
        mlPrediction: { prediction: 'NEUTRAL', confidence: 50 },
        patterns: { detectedPatterns: [], supportResistance: null },
        technicals: { signals: [] }
      };
      
      const analysis = await this.analyzeForStrategy(
        symbol,
        strategyType,
        this.strategies[strategyType],
        currentData,
        currentCapital
      );
      
      // Execute trade logic
      if (!position && analysis.signal === 'BUY' && analysis.score >= this.strategies[strategyType].minConfidence) {
        // Open position
        position = {
          entry: history[i].close,
          entryDate: history[i].date,
          stopLoss: analysis.stopLoss,
          target: analysis.target,
          quantity: analysis.positionSize || Math.floor(currentCapital * 0.1 / history[i].close)
        };
      } else if (position) {
        // Check exit conditions
        const currentPrice = history[i].close;
        let exitReason = null;
        
        if (currentPrice <= position.stopLoss) {
          exitReason = 'Stop Loss';
        } else if (currentPrice >= position.target) {
          exitReason = 'Target Hit';
        } else if (i >= history.length - 5) {
          exitReason = 'End of Period';
        }
        
        if (exitReason) {
          const pnl = (currentPrice - position.entry) * position.quantity;
          const pnlPercent = ((currentPrice - position.entry) / position.entry) * 100;
          
          trades.push({
            entryDate: position.entryDate,
            exitDate: history[i].date,
            entry: position.entry,
            exit: currentPrice,
            quantity: position.quantity,
            pnl,
            pnlPercent,
            exitReason
          });
          
          currentCapital += pnl;
          position = null;
        }
      }
    }
    
    // Calculate statistics
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    return {
      symbol,
      strategy: strategyType,
      period,
      initialCapital: capital,
      finalCapital: currentCapital,
      totalReturn: ((currentCapital - capital) / capital) * 100,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      avgWin: winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0,
      maxWin: trades.length > 0 ? Math.max(...trades.map(t => t.pnl)) : 0,
      maxLoss: trades.length > 0 ? Math.min(...trades.map(t => t.pnl)) : 0,
      trades: trades.slice(-20) // Last 20 trades
    };
  }
}

// Singleton instance
const intelligentTradingEngine = new IntelligentTradingEngine();

module.exports = intelligentTradingEngine;
