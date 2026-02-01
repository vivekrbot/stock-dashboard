/**
 * AI Prediction Service
 * Generates trading opportunities with entry, target, stop-loss predictions
 */

const patternAnalysisService = require('./patternAnalysisService');
const historicalService = require('./historicalService');
const stockService = require('./stockService');

class AIPredictionService {
  constructor() {
    // Popular NSE stocks to scan
    this.watchlist = [
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
      'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'ITC',
      'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'SUNPHARMA',
      'TITAN', 'BAJFINANCE', 'NESTLEIND', 'WIPRO', 'ULTRACEMCO',
      'TATAMOTORS', 'TATASTEEL', 'POWERGRID', 'NTPC', 'ONGC',
      'M&M', 'ADANIENT', 'ADANIPORTS', 'COALINDIA', 'JSWSTEEL',
      'HCLTECH', 'TECHM', 'DRREDDY', 'CIPLA', 'APOLLOHOSP',
      'BAJAJFINSV', 'EICHERMOT', 'GRASIM', 'INDUSINDBK', 'BRITANNIA'
    ];
  }

  /**
   * Scan all stocks and return top trading opportunities
   */
  async scanForOpportunities(customWatchlist = null) {
    const stocksToScan = customWatchlist || this.watchlist;
    const opportunities = [];
    const errors = [];

    console.log(`🔍 Scanning ${stocksToScan.length} stocks for opportunities...`);

    for (const symbol of stocksToScan) {
      try {
        const opportunity = await this.analyzeStock(symbol);
        if (opportunity && opportunity.confidence >= 60) {
          opportunities.push(opportunity);
        }
      } catch (error) {
        errors.push({ symbol, error: error.message });
        console.log(`⚠️ Failed to analyze ${symbol}: ${error.message}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }

    // Sort by confidence and opportunity score
    opportunities.sort((a, b) => {
      const scoreA = a.confidence * (a.riskRewardRatio || 1);
      const scoreB = b.confidence * (b.riskRewardRatio || 1);
      return scoreB - scoreA;
    });

    const topOpportunities = opportunities.slice(0, 15); // Top 15

    console.log(`✅ Found ${opportunities.length} opportunities, showing top ${topOpportunities.length}`);

    return {
      timestamp: new Date().toISOString(),
      scannedCount: stocksToScan.length,
      totalFound: opportunities.length,
      opportunitiesFound: topOpportunities.length,
      opportunities: topOpportunities,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Analyze a single stock for trading opportunity
   */
  async analyzeStock(symbol) {
    // Get current price data
    const priceData = await stockService.getStockPrice(symbol);
    if (!priceData || priceData.price <= 0) {
      throw new Error('No price data available');
    }

    // Get historical data
    const historicalData = await historicalService.getHistoricalData(symbol, '3mo');
    if (!historicalData || !historicalData.history || historicalData.history.length < 30) {
      throw new Error('Insufficient historical data');
    }

    const currentPrice = priceData.price;
    const history = historicalData.history;

    // Run pattern analysis
    const analysis = patternAnalysisService.analyzePatterns(history, currentPrice);

    // Calculate technical indicators
    const closes = history.map(d => d.close).filter(c => c != null);
    const rsi = patternAnalysisService.calculateRSI(closes);
    const sma20 = patternAnalysisService.calculateSMA(closes, 20);
    const sma50 = closes.length >= 50 ? patternAnalysisService.calculateSMA(closes, 50) : null;

    // Generate opportunity score
    const opportunityScore = this.calculateOpportunityScore(analysis, rsi, currentPrice, sma20, sma50, priceData);

    // Return analysis for scores >= 55 (moderate confidence and above)
    if (opportunityScore.score < 55) {
      return null; // Not a good opportunity
    }

    // Calculate entry, target, and stop-loss
    const tradeSetup = this.calculateTradeSetup(
      currentPrice,
      analysis,
      opportunityScore.type,
      priceData
    );

    return {
      symbol,
      name: priceData.name || symbol,
      currentPrice,
      change: priceData.change,
      percentChange: priceData.percentChange,
      
      // Trade Setup
      type: opportunityScore.type,
      action: opportunityScore.type === 'bullish' ? 'BUY' : 'SELL',
      entry: tradeSetup.entry,
      target: tradeSetup.target,
      stopLoss: tradeSetup.stopLoss,
      
      // Risk/Reward
      riskRewardRatio: tradeSetup.riskRewardRatio,
      potentialGain: tradeSetup.potentialGain,
      potentialLoss: tradeSetup.potentialLoss,
      
      // Confidence & Signals
      confidence: opportunityScore.score,
      strength: opportunityScore.strength,
      signals: opportunityScore.signals,
      
      // Pattern Info
      patterns: analysis.patterns.map(p => p.name),
      patternDetails: analysis.patterns,
      trend: analysis.trend,
      
      // Technical Levels
      support: analysis.supportResistance.nearestSupport,
      resistance: analysis.supportResistance.nearestResistance,
      rsi,
      sma20,
      sma50,
      
      // Volume Analysis
      volumeSignal: analysis.volumeSignal,
      
      // Reasoning
      reasoning: this.generateReasoning(opportunityScore, analysis, tradeSetup)
    };
  }

  /**
   * Calculate opportunity score based on multiple factors
   */
  calculateOpportunityScore(analysis, rsi, currentPrice, sma20, sma50, priceData) {
    let bullishScore = 0;
    let bearishScore = 0;
    const signals = [];

    // Pattern signals (weight: 30)
    analysis.patterns.forEach(pattern => {
      if (pattern.type === 'bullish') {
        bullishScore += pattern.confidence * 0.3;
        signals.push({ name: pattern.name, type: 'bullish', weight: 'high' });
      } else if (pattern.type === 'bearish') {
        bearishScore += pattern.confidence * 0.3;
        signals.push({ name: pattern.name, type: 'bearish', weight: 'high' });
      }
    });

    // Trend analysis (weight: 25)
    if (analysis.trend.direction === 'bullish') {
      bullishScore += analysis.trend.strength * 0.25;
      signals.push({ name: 'Bullish Trend', type: 'bullish', weight: 'high' });
    } else if (analysis.trend.direction === 'bearish') {
      bearishScore += analysis.trend.strength * 0.25;
      signals.push({ name: 'Bearish Trend', type: 'bearish', weight: 'high' });
    }

    // RSI signals (weight: 15)
    if (rsi < 30) {
      bullishScore += 15;
      signals.push({ name: 'RSI Oversold', type: 'bullish', weight: 'medium' });
    } else if (rsi > 70) {
      bearishScore += 15;
      signals.push({ name: 'RSI Overbought', type: 'bearish', weight: 'medium' });
    } else if (rsi < 40) {
      bullishScore += 8;
      signals.push({ name: 'RSI Low', type: 'bullish', weight: 'low' });
    } else if (rsi > 60) {
      bearishScore += 8;
      signals.push({ name: 'RSI High', type: 'bearish', weight: 'low' });
    }

    // Moving Average signals (weight: 15)
    if (currentPrice > sma20) {
      bullishScore += 8;
      signals.push({ name: 'Above 20 SMA', type: 'bullish', weight: 'medium' });
    } else {
      bearishScore += 8;
      signals.push({ name: 'Below 20 SMA', type: 'bearish', weight: 'medium' });
    }

    if (sma50 && currentPrice > sma50) {
      bullishScore += 7;
      signals.push({ name: 'Above 50 SMA', type: 'bullish', weight: 'medium' });
    } else if (sma50) {
      bearishScore += 7;
      signals.push({ name: 'Below 50 SMA', type: 'bearish', weight: 'medium' });
    }

    // MA crossover (weight: 10)
    if (analysis.maSignal.crossover) {
      if (analysis.maSignal.signal === 'bullish') {
        bullishScore += 10;
        signals.push({ name: analysis.maSignal.crossover.type, type: 'bullish', weight: 'high' });
      } else {
        bearishScore += 10;
        signals.push({ name: analysis.maSignal.crossover.type, type: 'bearish', weight: 'high' });
      }
    }

    // Volume signal (weight: 5)
    if (analysis.volumeSignal.signal === 'bullish') {
      bullishScore += 5;
      signals.push({ name: 'Volume Surge', type: 'bullish', weight: 'low' });
    } else if (analysis.volumeSignal.signal === 'bearish') {
      bearishScore += 5;
      signals.push({ name: 'Heavy Selling Volume', type: 'bearish', weight: 'low' });
    }

    // Support/Resistance proximity
    const distToSupport = (currentPrice - analysis.supportResistance.nearestSupport) / currentPrice;
    const distToResistance = (analysis.supportResistance.nearestResistance - currentPrice) / currentPrice;

    if (distToSupport < 0.02) {
      bullishScore += 10;
      signals.push({ name: 'Near Support', type: 'bullish', weight: 'medium' });
    }
    if (distToResistance < 0.02) {
      bearishScore += 5;
      signals.push({ name: 'Near Resistance', type: 'bearish', weight: 'low' });
    }

    // Determine overall direction and score
    const type = bullishScore >= bearishScore ? 'bullish' : 'bearish';
    const score = Math.min(95, Math.max(bullishScore, bearishScore));
    
    let strength;
    if (score >= 80) strength = 'Very Strong';
    else if (score >= 65) strength = 'Strong';
    else if (score >= 50) strength = 'Moderate';
    else strength = 'Weak';

    return {
      type,
      score: Math.round(score),
      strength,
      signals: signals.filter(s => s.type === type || s.type === 'neutral'),
      bullishScore: Math.round(bullishScore),
      bearishScore: Math.round(bearishScore)
    };
  }

  /**
   * Calculate trade setup (entry, target, stop-loss)
   */
  calculateTradeSetup(currentPrice, analysis, type, priceData) {
    const { nearestSupport, nearestResistance } = analysis.supportResistance;
    
    let entry, target, stopLoss;

    if (type === 'bullish') {
      // Bullish setup
      entry = currentPrice; // Current price or slight pullback
      
      // Target: Next resistance or pattern-based target
      const patternTarget = analysis.patterns
        .filter(p => p.type === 'bullish' && p.targetMultiplier)
        .map(p => currentPrice * p.targetMultiplier)
        .sort((a, b) => b - a)[0];
      
      target = patternTarget || nearestResistance || currentPrice * 1.06;
      target = Math.max(target, currentPrice * 1.04); // Minimum 4% target

      // Stop-loss: Below support or 3-4% below entry
      stopLoss = Math.max(nearestSupport * 0.99, currentPrice * 0.96);
      stopLoss = Math.min(stopLoss, currentPrice * 0.97); // Max 4% loss
      
    } else {
      // Bearish setup
      entry = currentPrice;
      
      const patternTarget = analysis.patterns
        .filter(p => p.type === 'bearish' && p.targetMultiplier)
        .map(p => currentPrice * p.targetMultiplier)
        .sort((a, b) => a - b)[0];
      
      target = patternTarget || nearestSupport || currentPrice * 0.94;
      target = Math.min(target, currentPrice * 0.96);

      stopLoss = Math.min(nearestResistance * 1.01, currentPrice * 1.04);
      stopLoss = Math.max(stopLoss, currentPrice * 1.03);
    }

    // Calculate risk/reward
    const potentialGain = Math.abs(target - entry);
    const potentialLoss = Math.abs(entry - stopLoss);
    const riskRewardRatio = potentialGain / potentialLoss;

    return {
      entry: Math.round(entry * 100) / 100,
      target: Math.round(target * 100) / 100,
      stopLoss: Math.round(stopLoss * 100) / 100,
      potentialGain: `${((potentialGain / entry) * 100).toFixed(1)}%`,
      potentialLoss: `${((potentialLoss / entry) * 100).toFixed(1)}%`,
      riskRewardRatio: Math.round(riskRewardRatio * 10) / 10
    };
  }

  /**
   * Generate human-readable reasoning
   */
  generateReasoning(opportunityScore, analysis, tradeSetup) {
    const { type, signals, strength } = opportunityScore;
    const action = type === 'bullish' ? 'buying' : 'selling';
    
    let reasoning = `${strength} ${type} opportunity. `;

    // Add pattern info
    if (analysis.patterns.length > 0) {
      const patternNames = analysis.patterns.slice(0, 2).map(p => p.name).join(' + ');
      reasoning += `Detected ${patternNames}. `;
    }

    // Add trend info
    if (analysis.trend.direction !== 'neutral') {
      reasoning += `Overall trend is ${analysis.trend.direction} with ${analysis.trend.strength}% strength. `;
    }

    // Add key signals
    const keySignals = signals.filter(s => s.weight === 'high').map(s => s.name);
    if (keySignals.length > 0) {
      reasoning += `Key signals: ${keySignals.join(', ')}. `;
    }

    // Add risk/reward
    reasoning += `Risk/Reward ratio of 1:${tradeSetup.riskRewardRatio} with ${tradeSetup.potentialGain} upside potential.`;

    return reasoning;
  }

  /**
   * Get quick scan for a specific list of symbols
   */
  async quickScan(symbols) {
    return this.scanForOpportunities(symbols);
  }

  /**
   * Get top bullish opportunities only
   */
  async getBullishOpportunities(limit = 10) {
    const result = await this.scanForOpportunities();
    return {
      ...result,
      opportunities: result.opportunities
        .filter(o => o.type === 'bullish')
        .slice(0, limit)
    };
  }

  /**
   * Get top bearish opportunities only
   */
  async getBearishOpportunities(limit = 10) {
    const result = await this.scanForOpportunities();
    return {
      ...result,
      opportunities: result.opportunities
        .filter(o => o.type === 'bearish')
        .slice(0, limit)
    };
  }

  /**
   * Analyze opportunity for user's watchlist
   */
  async analyzeWatchlist(watchlist) {
    if (!watchlist || watchlist.length === 0) {
      return { error: 'Empty watchlist' };
    }
    return this.scanForOpportunities(watchlist);
  }
}

module.exports = new AIPredictionService();
