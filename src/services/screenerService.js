const stockService = require('./stockService');
const scoringService = require('./scoringService');
const patternService = require('./patternService');
const sectorService = require('./sectorService');
const nseFetcherService = require('./nseFetcherService');
const strategyPresetsService = require('./strategyPresetsService');

class ScreenerService {
  constructor() {
    this.stocksByCapSize = null;
    this.totalStocks = 0;
  }

  // Initialize with live NSE data
  async initialize() {
    if (!this.stocksByCapSize) {
      const nseStocks = await nseFetcherService.getAllNSEStocks();
      this.stocksByCapSize = {
        largeCap: nseStocks.largeCap,
        midCap: nseStocks.midCap,
        smallCap: nseStocks.smallCap
      };
      this.totalStocks = nseStocks.total;
      
      console.log(`📊 Screener initialized with ${this.totalStocks} NSE stocks`);
      console.log(`   Large Cap: ${nseStocks.largeCap.length}`);
      console.log(`   Mid Cap: ${nseStocks.midCap.length}`);
      console.log(`   Small Cap: ${nseStocks.smallCap.length}`);
    }
  }

  // Add to findOpportunities method
async findOpportunities(filters = {}) {
  // Ensure initialized with REAL data
  try {
    await this.initialize();
  } catch (error) {
    throw new Error(`Cannot initialize screener: ${error.message}. Real-time NSE data unavailable.`);
  }

  const {
    capSize = 'all',
    strategy = 'balanced', // NEW: Strategy preset
    minConfidence,
    maxResults = 8,
    signalType = 'BUY',
    sector = null,
    minVolume = 0,
    minPrice = 0,
    maxPrice = 999999,
    requirePatterns,
    sectorLeadersOnly = false,
  } = filters;

  // Apply strategy preset
  const strategyConfig = strategyPresetsService.getStrategy(strategy);
  const effectiveMinConfidence = minConfidence || strategyConfig.minConfidence;
  const effectiveRequirePatterns = requirePatterns !== undefined ? requirePatterns : strategyConfig.requirePatterns;

  console.log(`🎯 Strategy: ${strategyConfig.name} (${strategyConfig.timeframe})`);
  console.log(`⚖️  Weights: Tech ${(strategyConfig.weights.technical*100).toFixed(0)}% / Fund ${(strategyConfig.weights.fundamental*100).toFixed(0)}%`);
  console.log(`🔍 Scanning: ${capSize} cap, ${sector || 'all sectors'}`);

    let stocksToScan = [];
    if (capSize === 'all') {
      stocksToScan = [
        ...this.stocksByCapSize.largeCap,
        ...this.stocksByCapSize.midCap,
        ...this.stocksByCapSize.smallCap
      ];
    } else if (this.stocksByCapSize[capSize]) {
      stocksToScan = this.stocksByCapSize[capSize];
    }

    if (sector && sector !== 'all') {
      const sectorStocks = sectorService.getSectorStocks(sector);
      stocksToScan = stocksToScan.filter(s => sectorStocks.includes(s));
    }

    console.log(`📊 Will scan ${stocksToScan.length} stocks`);

    const opportunities = [];
    const sectorPerformance = {};
    const stockDataMap = {};
    let scanned = 0;
    let errors = 0;

    // First pass: collect data
    // In the scanning loop, track real errors
  for (const symbol of stocksToScan) {
    try {
      const [stockData, technicals, fundamentals, history] = await Promise.all([
        stockService.getStockPrice(symbol),
        stockService.getTechnicalIndicators(symbol),
        stockService.getStockDetails(symbol),
        stockService.getHistoricalData(symbol, 30)
      ]);

      // Only proceed with REAL data
      stockDataMap[symbol] = { stockData, technicals, fundamentals, history };

        const stockSector = sectorService.getSector(symbol);
        if (!sectorPerformance[stockSector]) {
          sectorPerformance[stockSector] = [];
        }
        sectorPerformance[stockSector].push(stockData.percentChange);

        scanned++;
        
        if (scanned % 25 === 0) {
          console.log(`✓ Collected ${scanned}/${stocksToScan.length}`);
        }
      } catch (error) {
      // Log real failures
      console.error(`⚠️ REAL DATA UNAVAILABLE for ${symbol}: ${error.message}`);
      errors++;
      scanned++;
    }
  }

  // If too many failures, warn user
  const failureRate = errors / stocksToScan.length;
  if (failureRate > 0.5) {
    console.warn(`⚠️ HIGH FAILURE RATE: ${(failureRate * 100).toFixed(0)}% of stocks failed to fetch`);
  }

    console.log(`✅ Data collected: ${scanned} stocks (${errors} errors)`);

    // Calculate sector averages
    const sectorAverages = {};
    for (const [sec, changes] of Object.entries(sectorPerformance)) {
      sectorAverages[sec] = changes.reduce((a, b) => a + b, 0) / changes.length;
    }

    // Second pass: analyze
    let analyzed = 0;
    for (const symbol of stocksToScan) {
      if (!stockDataMap[symbol]) continue;

      try {
        const { stockData, technicals, fundamentals, history } = stockDataMap[symbol];

        if (stockData.volume < minVolume) continue;
        if (stockData.price < minPrice || stockData.price > maxPrice) continue;

        // In the analysis loop, pass weights
  const analysis = await scoringService.analyzeStock(
    stockData, 
    technicals, 
    fundamentals,
    strategyConfig.weights // Pass strategy weights
  );
        const patterns = patternService.detectPatterns(history, stockData.price);
        const patternScore = patternService.calculatePatternScore(patterns);

        if (requirePatterns && patterns.length === 0) continue;

        const stockSector = sectorService.getSector(symbol);
        const sectorAvg = sectorAverages[stockSector] || 0;
        const relativeStrength = sectorService.calculateRelativeStrength(
          stockData.percentChange,
          sectorAvg
        );
        const isSectorLeader = sectorService.isSectorLeader(stockData.percentChange, relativeStrength);

        if (sectorLeadersOnly && !isSectorLeader) continue;

        // Use strategy-specific criteria
  const actualCapSize = this.determineCapSize(symbol);
  const capCriteria = this.getCapSizeCriteriaWithStrategy(actualCapSize, strategyConfig);


        const passesFilters = this.applyAdvancedFilters(
          analysis,
          stockData,
          technicals,
          capCriteria,
          { minConfidence, signalType, patternScore, patterns }
        );

        if (passesFilters) {
          opportunities.push({
            symbol: symbol,
            capSize: actualCapSize,
            sector: stockSector,
            confidence: analysis.confidenceScore + Math.min(patternScore, 15),
            signal: analysis.signal.action,
            price: stockData.price,
            change: stockData.percentChange,
            volume: stockData.volume,
            rsi: technicals.rsi,
            technicalScore: analysis.technical.score,
            fundamentalScore: analysis.fundamental.score,
            patterns: patterns,
            patternScore: patternScore,
            relativeStrength: relativeStrength,
            sectorLeader: isSectorLeader,
            sectorAvgChange: sectorAvg.toFixed(2),
            reason: this.getAdvancedReason(analysis, actualCapSize, patterns, isSectorLeader),
            risk: capCriteria.risk,
            targetGain: capCriteria.targetGain
          });
        }

        analyzed++;
        if (analyzed % 25 === 0) {
          console.log(`⚡ Analyzed ${analyzed}, Found ${opportunities.length}`);
        }

      } catch (error) {
        // Silent skip
      }
    }

    opportunities.sort((a, b) => b.confidence - a.confidence);
    const topOpportunities = opportunities.slice(0, maxResults);

    console.log(`🎯 COMPLETE: ${opportunities.length} opportunities from ${scanned} stocks`);

    return {
    opportunities: topOpportunities,
    totalScanned: scanned,
    totalFound: opportunities.length,
    totalUniverse: this.totalStocks,
    strategy: strategyConfig,
    filters: filters,
    sectorAverages: sectorAverages,
    timestamp: new Date().toISOString()
  };
}
// NEW METHOD: Get criteria based on strategy
getCapSizeCriteriaWithStrategy(capSize, strategyConfig) {
  const capKey = capSize.toLowerCase().replace(' ', '');
  const rsiConfig = strategyConfig.rsi[capKey] || strategyConfig.rsi.largeCap;
  const techConfig = strategyConfig.technicalScores[capKey] || strategyConfig.technicalScores.largeCap;
  const fundConfig = strategyConfig.fundamentalScores[capKey] || strategyConfig.fundamentalScores.largeCap;

  const riskLevels = {
    'Large Cap': 'LOW',
    'Mid Cap': 'MODERATE',
    'Small Cap': 'HIGH'
  };

  const targetGains = {
    'Large Cap': '5-10%',
    'Mid Cap': '10-20%',
    'Small Cap': '20-40%'
  };

  return {
    minRSI: rsiConfig.min,
    maxRSI: rsiConfig.max,
    requireMomentum: rsiConfig.requireMomentum,
    minTechnicalScore: techConfig.min,
    minFundamentalScore: fundConfig.min,
    risk: riskLevels[capSize],
    targetGain: targetGains[capSize]
  };
}

  applyAdvancedFilters(analysis, stockData, technicals, capCriteria, customFilters) {
    const { minConfidence, signalType, patternScore } = customFilters;

    const adjustedConfidence = analysis.confidenceScore + Math.min(patternScore, 15);
    if (adjustedConfidence < minConfidence) return false;
    if (signalType && analysis.signal.action !== signalType) return false;

    if (technicals.rsi) {
      if (technicals.rsi < capCriteria.minRSI || technicals.rsi > capCriteria.maxRSI) {
        return false;
      }
    }

    if (capCriteria.requireMomentum && stockData.percentChange < 0) {
      return false;
    }

    if (analysis.technical.score < capCriteria.minTechnicalScore) return false;
    if (analysis.fundamental.score < capCriteria.minFundamentalScore) return false;

    return true;
  }

  getAdvancedReason(analysis, capSize, patterns, isSectorLeader) {
    const reasons = [];
    reasons.push(capSize);

    if (analysis.confidenceScore >= 75) reasons.push('High confidence');
    if (isSectorLeader) reasons.push('Sector leader');

    const bullishPatterns = patterns.filter(p => p.signal === 'BULLISH');
    if (bullishPatterns.length > 0) {
      reasons.push(bullishPatterns[0].pattern.replace('_', ' '));
    }

    const hasGoldenCross = analysis.technical.signals.some(s => 
      s.signal === 'GOLDEN CROSS'
    );
    if (hasGoldenCross) reasons.push('Golden cross');

    return reasons.slice(0, 4).join(' • ');
  }

  determineCapSize(symbol) {
    if (this.stocksByCapSize.largeCap.includes(symbol)) return 'Large Cap';
    if (this.stocksByCapSize.midCap.includes(symbol)) return 'Mid Cap';
    if (this.stocksByCapSize.smallCap.includes(symbol)) return 'Small Cap';
    return 'Unknown';
  }

  getCapSizeCriteria(capSize) {
    const criteria = {
      'Large Cap': {
        minRSI: 30, maxRSI: 70, requireMomentum: false,
        minTechnicalScore: 50, minFundamentalScore: 50,
        risk: 'LOW', targetGain: '5-10%'
      },
      'Mid Cap': {
        minRSI: 35, maxRSI: 65, requireMomentum: true,
        minTechnicalScore: 55, minFundamentalScore: 45,
        risk: 'MODERATE', targetGain: '10-20%'
      },
      'Small Cap': {
        minRSI: 20, maxRSI: 60, requireMomentum: true,
        minTechnicalScore: 60, minFundamentalScore: 40,
        risk: 'HIGH', targetGain: '20-40%'
      }
    };
    return criteria[capSize] || criteria['Large Cap'];
  }

  async getUniverseStats() {
    await this.initialize();
    return {
      total: this.totalStocks,
      largeCap: this.stocksByCapSize.largeCap.length,
      midCap: this.stocksByCapSize.midCap.length,
      smallCap: this.stocksByCapSize.smallCap.length
    };
  }

  // Manually refresh NSE stock list
  async refreshNSEStocks() {
    const nseStocks = await nseFetcherService.refreshCache();
    this.stocksByCapSize = {
      largeCap: nseStocks.largeCap,
      midCap: nseStocks.midCap,
      smallCap: nseStocks.smallCap
    };
    this.totalStocks = nseStocks.total;
    
    return {
      success: true,
      total: this.totalStocks,
      message: 'NSE stock universe refreshed'
    };
  }
}

module.exports = new ScreenerService();