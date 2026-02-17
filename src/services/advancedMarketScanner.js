/**
 * Advanced Market Scanner
 * Finds trading opportunities using AI, patterns, and market intelligence
 * Detects opportunities BEFORE they become obvious to other traders
 */

const intelligentTradingEngine = require('./intelligentTradingEngine');
const mlPredictionService = require('./mlPredictionService');
const realTimeDataService = require('./realTimeDataService');
const marketSentimentService = require('./marketSentimentService');
const sectorService = require('./sectorService');

class AdvancedMarketScanner {
  constructor() {
    // Expanded universe of stocks
    this.stockUniverse = {
      nifty50: [
        'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
        'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'ITC',
        'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'SUNPHARMA',
        'TITAN', 'BAJFINANCE', 'NESTLEIND', 'WIPRO', 'ULTRACEMCO',
        'TATAMOTORS', 'TATASTEEL', 'POWERGRID', 'NTPC', 'ONGC',
        'M&M', 'ADANIENT', 'ADANIPORTS', 'COALINDIA', 'JSWSTEEL',
        'HCLTECH', 'TECHM', 'DRREDDY', 'CIPLA', 'APOLLOHOSP',
        'BAJAJFINSV', 'EICHERMOT', 'GRASIM', 'INDUSINDBK', 'BRITANNIA',
        'HEROMOTOCO', 'HINDALCO', 'DIVISLAB', 'TATACONSUM', 'BPCL',
        'SHREECEM', 'SBILIFE', 'HDFCLIFE', 'BAJAJ-AUTO', 'TRENT'
      ],
      midcap: [
        'GODREJCP', 'INDIGO', 'ADANIGREEN', 'PIDILITIND', 'DABUR',
        'SIEMENS', 'DLF', 'GLAND', 'HAVELLS', 'BERGEPAINT',
        'BANDHANBNK', 'MCDOWELL-N', 'ABB', 'LUPIN', 'BIOCON',
        'DIXON', 'ZOMATO', 'PAYTM', 'NYKAA', 'POLICYBZR',
        'CUMMINSIND', 'TORNTPHARM', 'BOSCHLTD', 'BALKRISIND', 'MRF'
      ],
      momentum: [
        'TATAPOWER', 'IRCTC', 'HAL', 'BEL', 'SAIL',
        'BHEL', 'RVNL', 'IRFC', 'RECLTD', 'PFC',
        'VEDL', 'NMDC', 'ZEEL', 'PVR', 'DIXON'
      ]
    };
    
    this.allStocks = [
      ...this.stockUniverse.nifty50,
      ...this.stockUniverse.midcap,
      ...this.stockUniverse.momentum
    ];
    
    // Scanning strategies
    this.scanTypes = {
      BREAKOUT: 'Stocks breaking out of consolidation',
      MOMENTUM: 'Stocks with strong momentum',
      REVERSAL: 'Potential reversal opportunities',
      VALUE: 'Undervalued stocks with potential',
      ML_SIGNALS: 'AI/ML predicted opportunities',
      EARLY_MOVERS: 'Stocks showing early signs of moves'
    };
    
    console.log(`✓ Advanced Market Scanner initialized with ${this.allStocks.length} stocks`);
  }

  /**
   * Master scan - finds ALL types of opportunities
   */
  async masterScan(options = {}) {
    const {
      strategies = ['SWING', 'SHORT_TERM'],
      minScore = 70,
      maxResults = 30,
      focusSectors = null
    } = options;
    
    console.log('🔍 Starting MASTER SCAN...');
    
    const startTime = Date.now();
    
    // Filter stocks by sector if specified
    let stocksToScan = this.allStocks;
    if (focusSectors && focusSectors.length > 0) {
      stocksToScan = stocksToScan.filter(symbol => {
        const sector = sectorService.getSectorForSymbol(symbol);
        return focusSectors.includes(sector);
      });
    }
    
    // Run parallel scans for different opportunity types
    const [
      tradingOpportunities,
      mlOpportunities,
      earlyMovers,
      marketContext
    ] = await Promise.all([
      // Traditional strategy-based scan
      intelligentTradingEngine.scanMarket(stocksToScan, { strategies, minScore, maxResults }),
      
      // ML-based opportunities
      this.scanMLOpportunities(stocksToScan.slice(0, 50), minScore),
      
      // Early mover detection
      this.detectEarlyMovers(stocksToScan.slice(0, 40)),
      
      // Market context
      this.getMarketContext()
    ]);
    
    // Combine and rank all opportunities
    const allOpportunities = this.combineOpportunities({
      trading: tradingOpportunities.opportunities,
      ml: mlOpportunities,
      early: earlyMovers
    });
    
    // Apply final filters and ranking
    const topOpportunities = this.rankOpportunities(allOpportunities, maxResults);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    return {
      timestamp: new Date().toISOString(),
      scanTime: `${elapsed}s`,
      scannedCount: stocksToScan.length,
      foundCount: allOpportunities.length,
      topCount: topOpportunities.length,
      marketContext,
      opportunities: topOpportunities,
      summary: {
        byType: this.summarizeByType(topOpportunities),
        byStrategy: this.summarizeByStrategy(topOpportunities),
        bySector: this.summarizeBySector(topOpportunities)
      }
    };
  }

  /**
   * Scan for ML-predicted opportunities
   */
  async scanMLOpportunities(symbols, minConfidence = 70) {
    console.log('🤖 Scanning for ML opportunities...');
    
    const opportunities = [];
    
    // Batch predict
    const predictions = await mlPredictionService.batchPredict(symbols);
    
    for (const pred of predictions) {
      if (pred.error) continue;
      
      if (pred.prediction === 'BULLISH' && pred.confidence >= minConfidence) {
        // Get current price
        const priceData = await realTimeDataService.getRealtimePrice(pred.symbol).catch(() => null);
        
        if (priceData) {
          opportunities.push({
            symbol: pred.symbol,
            type: 'ML_SIGNAL',
            signal: 'BUY',
            score: pred.confidence,
            currentPrice: priceData.price,
            targetPrice: pred.targetPrice,
            confidence: pred.confidence,
            reason: `ML predicts ${pred.expectedMove.toFixed(2)}% move`,
            probabilities: pred.probabilities,
            timeDetected: new Date().toISOString()
          });
        }
      }
    }
    
    console.log(`✓ Found ${opportunities.length} ML opportunities`);
    return opportunities;
  }

  /**
   * Detect early movers - stocks showing signs BEFORE major moves
   */
  async detectEarlyMovers(symbols) {
    console.log('⚡ Detecting early movers...');
    
    const earlyMovers = [];
    
    // Check each stock for early signals
    for (const symbol of symbols) {
      try {
        const analysis = await this.analyzeEarlySignals(symbol);
        
        if (analysis && analysis.earlySignal) {
          earlyMovers.push({
            symbol,
            type: 'EARLY_MOVER',
            signal: analysis.direction,
            score: analysis.score,
            currentPrice: analysis.currentPrice,
            signals: analysis.signals,
            reason: analysis.reason,
            timeDetected: new Date().toISOString()
          });
        }
      } catch (error) {
        // Skip stocks with errors
      }
      
      // Delay to avoid rate limits
      await new Promise(r => setTimeout(r, 150));
    }
    
    console.log(`✓ Found ${earlyMovers.length} early movers`);
    return earlyMovers;
  }

  /**
   * Analyze stock for early signals
   */
  async analyzeEarlySignals(symbol) {
    const data = await realTimeDataService.getCompleteStockData(symbol, {
      includeHistory: true,
      historyRange: '1mo'
    });
    
    if (!data.historical || data.historical.length < 20) {
      return null;
    }
    
    const history = data.historical;
    const currentPrice = data.price;
    
    const signals = [];
    let score = 0;
    
    // 1. Volume accumulation (increasing volume with minimal price change)
    const recentVolumes = history.slice(-5).map(d => d.volume);
    const avgVolume = history.slice(-20).map(d => d.volume).reduce((a, b) => a + b, 0) / 20;
    const volumeIncrease = recentVolumes[recentVolumes.length - 1] / avgVolume;
    
    if (volumeIncrease > 1.5) {
      const priceChange = Math.abs((history[history.length - 1].close - history[history.length - 5].close) / history[history.length - 5].close);
      
      if (priceChange < 0.03) {  // Less than 3% price change with high volume
        signals.push('Volume accumulation detected');
        score += 25;
      }
    }
    
    // 2. Tightening price range (volatility compression)
    const recentRanges = history.slice(-10).map(d => (d.high - d.low) / d.low);
    const avgRange = recentRanges.reduce((a, b) => a + b, 0) / recentRanges.length;
    const currentRange = recentRanges[recentRanges.length - 1];
    
    if (currentRange < avgRange * 0.6) {
      signals.push('Volatility compression');
      score += 20;
    }
    
    // 3. Price testing support/resistance multiple times
    const closes = history.map(d => d.close);
    const priceLevel = currentPrice;
    const touches = closes.filter(c => Math.abs(c - priceLevel) / priceLevel < 0.02).length;
    
    if (touches >= 3) {
      signals.push(`Tested ${priceLevel.toFixed(2)} level ${touches} times`);
      score += 15;
    }
    
    // 4. Bullish divergence - price making lower lows but RSI making higher lows
    if (data.technical?.rsi) {
      const rsi = data.technical.rsi;
      const recentLows = history.slice(-10).map(d => d.low);
      
      if (recentLows[0] > recentLows[recentLows.length - 1] && rsi > 40) {
        signals.push('Bullish RSI divergence');
        score += 20;
      }
    }
    
    // 5. Smart money accumulation (institutional buying pattern)
    const avgPrice = history.slice(-5).map(d => (d.high + d.low) / 2).reduce((a, b) => a + b, 0) / 5;
    if (currentPrice > avgPrice && volumeIncrease > 1.3) {
      signals.push('Potential smart money accumulation');
      score += 20;
    }
    
    if (signals.length >= 2 && score >= 50) {
      return {
        earlySignal: true,
        direction: 'BUY',
        score,
        currentPrice,
        signals,
        reason: signals.join(', ')
      };
    }
    
    return null;
  }

  /**
   * Get market context for better decision making
   */
  async getMarketContext() {
    try {
      const [sentiment, sectors] = await Promise.all([
        marketSentimentService.getMarketSentiment().catch(() => null),
        marketSentimentService.getSectorRotation().catch(() => null)
      ]);
      
      return {
        sentiment: sentiment ? {
          overall: sentiment.overall,
          score: sentiment.sentimentScore,
          trend: sentiment.trend
        } : null,
        hotSectors: sectors ? sectors.hotSectors?.slice(0, 5) : [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Combine opportunities from different sources
   */
  combineOpportunities({ trading, ml, early }) {
    const combined = [];
    const seen = new Set();
    
    // Add trading opportunities
    for (const opp of trading) {
      if (!seen.has(opp.symbol)) {
        combined.push({ ...opp, sources: ['TRADING'] });
        seen.add(opp.symbol);
      }
    }
    
    // Add ML opportunities
    for (const opp of ml) {
      if (seen.has(opp.symbol)) {
        // Boost score if multiple sources agree
        const existing = combined.find(o => o.symbol === opp.symbol);
        if (existing) {
          existing.score = Math.min(100, existing.score + 10);
          existing.sources.push('ML');
          existing.mlConfidence = opp.confidence;
        }
      } else {
        combined.push({ ...opp, sources: ['ML'] });
        seen.add(opp.symbol);
      }
    }
    
    // Add early movers
    for (const opp of early) {
      if (seen.has(opp.symbol)) {
        const existing = combined.find(o => o.symbol === opp.symbol);
        if (existing) {
          existing.score = Math.min(100, existing.score + 15); // Big boost for early signals
          existing.sources.push('EARLY');
          existing.earlySignals = opp.signals;
        }
      } else {
        combined.push({ ...opp, sources: ['EARLY'] });
        seen.add(opp.symbol);
      }
    }
    
    return combined;
  }

  /**
   * Rank opportunities by quality and timeliness
   */
  rankOpportunities(opportunities, maxResults) {
    // Calculate final score with bonuses
    const scored = opportunities.map(opp => {
      let finalScore = opp.score;
      
      // Multi-source bonus
      if (opp.sources.length > 1) {
        finalScore += opp.sources.length * 5;
      }
      
      // Early detection bonus
      if (opp.sources.includes('EARLY')) {
        finalScore += 10;
      }
      
      // ML confirmation bonus
      if (opp.sources.includes('ML') && opp.mlConfidence > 75) {
        finalScore += 8;
      }
      
      return {
        ...opp,
        finalScore: Math.min(100, finalScore)
      };
    });
    
    // Sort by final score
    scored.sort((a, b) => b.finalScore - a.finalScore);
    
    return scored.slice(0, maxResults);
  }

  /**
   * Summarize by opportunity type
   */
  summarizeByType(opportunities) {
    const summary = {};
    
    for (const opp of opportunities) {
      const type = opp.type || 'TRADING';
      if (!summary[type]) {
        summary[type] = { count: 0, avgScore: 0 };
      }
      summary[type].count++;
      summary[type].avgScore += opp.finalScore || opp.score;
    }
    
    Object.keys(summary).forEach(type => {
      summary[type].avgScore = Math.round(summary[type].avgScore / summary[type].count);
    });
    
    return summary;
  }

  /**
   * Summarize by strategy
   */
  summarizeByStrategy(opportunities) {
    const summary = {};
    
    for (const opp of opportunities) {
      if (opp.strategy) {
        if (!summary[opp.strategy]) {
          summary[opp.strategy] = { count: 0, avgScore: 0 };
        }
        summary[opp.strategy].count++;
        summary[opp.strategy].avgScore += opp.finalScore || opp.score;
      }
    }
    
    Object.keys(summary).forEach(strategy => {
      summary[strategy].avgScore = Math.round(summary[strategy].avgScore / summary[strategy].count);
    });
    
    return summary;
  }

  /**
   * Summarize by sector
   */
  summarizeBySector(opportunities) {
    const summary = {};
    
    for (const opp of opportunities) {
      const sector = sectorService.getSectorForSymbol(opp.symbol) || 'Unknown';
      if (!summary[sector]) {
        summary[sector] = { count: 0, symbols: [] };
      }
      summary[sector].count++;
      summary[sector].symbols.push(opp.symbol);
    }
    
    return summary;
  }

  /**
   * Quick scan for specific strategy
   */
  async quickScan(strategyType, options = {}) {
    const { maxResults = 10, minScore = 75 } = options;
    
    console.log(`⚡ Quick ${strategyType} scan...`);
    
    // Select appropriate stock universe based on strategy
    let stocks = this.stockUniverse.nifty50;
    
    if (strategyType === 'SWING') {
      stocks = [...this.stockUniverse.nifty50, ...this.stockUniverse.momentum].slice(0, 60);
    } else if (strategyType === 'SHORT_TERM') {
      stocks = [...this.stockUniverse.nifty50, ...this.stockUniverse.midcap].slice(0, 50);
    }
    
    const result = await intelligentTradingEngine.scanMarket(stocks, {
      strategies: [strategyType],
      minScore,
      maxResults
    });
    
    return result;
  }

  /**
   * Get stock universe info
   */
  getStockUniverse() {
    return {
      total: this.allStocks.length,
      nifty50: this.stockUniverse.nifty50.length,
      midcap: this.stockUniverse.midcap.length,
      momentum: this.stockUniverse.momentum.length,
      scanTypes: this.scanTypes
    };
  }
}

// Singleton instance
const advancedMarketScanner = new AdvancedMarketScanner();

module.exports = advancedMarketScanner;
