const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('🚀 Starting Stock Dashboard API...');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');

// Load services
let stockService, scoringService, screenerService, strategyPresetsService, marketHoursService, historicalService;

try {
  stockService = require('./services/stockService');
  console.log('✓ stockService loaded');
} catch (e) {
  console.error('✗ Failed to load stockService:', e.message);
}

try {
  scoringService = require('./services/scoringService');
  console.log('✓ scoringService loaded');
} catch (e) {
  console.error('✗ Failed to load scoringService:', e.message);
}

try {
  screenerService = require('./services/screenerService');
  console.log('✓ screenerService loaded');
} catch (e) {
  console.error('✗ Failed to load screenerService:', e.message);
}

try {
  strategyPresetsService = require('./services/strategyPresetsService');
  console.log('✓ strategyPresetsService loaded');
} catch (e) {
  console.error('✗ Failed to load strategyPresetsService:', e.message);
}

try {
  marketHoursService = require('./services/marketHoursService');
  console.log('✓ marketHoursService loaded');
} catch (e) {
  console.error('✗ Failed to load marketHoursService:', e.message);
}

try {
  historicalService = require('./services/historicalService');
  console.log('✓ historicalService loaded');
} catch (e) {
  console.error('✗ Failed to load historicalService:', e.message);
}

// AI Prediction Services
let patternAnalysisService, aiPredictionService, enhancedPredictionEngine, marketSentimentService, riskManagementService, advancedTechnicalService;

try {
  patternAnalysisService = require('./services/patternAnalysisService');
  console.log('✓ patternAnalysisService loaded');
} catch (e) {
  console.error('✗ Failed to load patternAnalysisService:', e.message);
}

try {
  aiPredictionService = require('./services/aiPredictionService');
  console.log('✓ aiPredictionService loaded');
} catch (e) {
  console.error('✗ Failed to load aiPredictionService:', e.message);
}

try {
  enhancedPredictionEngine = require('./services/enhancedPredictionEngine');
  console.log('✓ enhancedPredictionEngine loaded');
} catch (e) {
  console.error('✗ Failed to load enhancedPredictionEngine:', e.message);
}

try {
  marketSentimentService = require('./services/marketSentimentService');
  console.log('✓ marketSentimentService loaded');
} catch (e) {
  console.error('✗ Failed to load marketSentimentService:', e.message);
}

try {
  riskManagementService = require('./services/riskManagementService');
  console.log('✓ riskManagementService loaded');
} catch (e) {
  console.error('✗ Failed to load riskManagementService:', e.message);
}

try {
  advancedTechnicalService = require('./services/advancedTechnicalService');
  console.log('✓ advancedTechnicalService loaded');
} catch (e) {
  console.error('✗ Failed to load advancedTechnicalService:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  const marketStatus = marketHoursService ? marketHoursService.getMarketStatus() : { status: 'UNKNOWN' };
  res.json({ 
    status: 'ok',
    message: 'Stock Dashboard API is running!',
    timestamp: new Date().toISOString(),
    market: marketStatus,
    services: {
      stockService: !!stockService,
      scoringService: !!scoringService,
      screenerService: !!screenerService,
      strategyPresetsService: !!strategyPresetsService,
      marketHoursService: !!marketHoursService,
      historicalService: !!historicalService
    }
  });
});

// Market status endpoint (uses live check)
app.get('/api/market/status', async (req, res) => {
  try {
    if (!marketHoursService) {
      return res.status(503).json({ error: 'Market hours service not available' });
    }
    // Use async version that checks actual market state
    const status = await marketHoursService.getMarketStatusAsync();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    name: 'Stock Dashboard API',
    version: '2.0.0',
    endpoints: [
      '/api/health',
      '/api/market/status',
      '/api/stock/:symbol',
      '/api/stock/:symbol/history?range=1d|5d|1mo|3mo|6mo|1y',
      '/api/stock/:symbol/intraday',
      '/api/stock/:symbol/analyze',
      '/api/screener/strategies',
      '/api/screener/find-opportunities'
    ]
  });
});

// Get single stock data
app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await stockService.getStockPrice(symbol);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stock details with fundamentals
app.get('/api/stock/:symbol/details', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await stockService.getStockDetails(symbol);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get multiple stocks (watchlist)
app.post('/api/stocks/batch', async (req, res) => {
  try {
    const { symbols } = req.body;
    const data = await stockService.getMultipleStocks(symbols);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get technical indicators
app.get('/api/stock/:symbol/technical', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await stockService.getTechnicalIndicators(symbol);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get historical data (ENHANCED)
app.get('/api/stock/:symbol/history', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = '1mo' } = req.query;
    
    if (historicalService) {
      const data = await historicalService.getHistoricalData(symbol, range);
      if (data) {
        return res.json({
          ...data,
          marketStatus: marketHoursService ? marketHoursService.getMarketStatus() : null
        });
      }
    }
    
    // Fallback to old method
    const periodMap = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365 };
    const days = periodMap[range] || 90;
    const data = await stockService.getHistoricalData(symbol, days);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get intraday data (for live charts during market hours)
app.get('/api/stock/:symbol/intraday', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!historicalService) {
      return res.status(503).json({ error: 'Historical service not available' });
    }
    
    const marketStatus = marketHoursService ? marketHoursService.getMarketStatus() : { isOpen: false };
    const data = await historicalService.getIntradayData(symbol);
    
    res.json({
      ...data,
      marketStatus,
      isLive: marketStatus.isOpen
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get daily summary
app.get('/api/stock/:symbol/summary', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 5 } = req.query;
    
    if (!historicalService) {
      return res.status(503).json({ error: 'Historical service not available' });
    }
    
    const data = await historicalService.getDailySummary(symbol, parseInt(days));
    const marketStatus = marketHoursService ? marketHoursService.getMarketStatus() : null;
    
    res.json({ ...data, marketStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get complete stock analysis
app.get('/api/stock/:symbol/analyze', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const [stockData, technicals] = await Promise.all([
      stockService.getStockPrice(symbol),
      stockService.getTechnicalIndicators(symbol)
    ]);

    let fundamentals = {};
    try {
      fundamentals = await stockService.getStockDetails(symbol);
    } catch (error) {
      fundamentals = {
        marketCap: stockData.price * 1000000000,
        peRatio: 20,
        pbRatio: 3,
        debtToEquity: 0.5,
        roe: 15,
        sector: 'Unknown'
      };
    }

    const analysis = await scoringService.analyzeStock(stockData, technicals, fundamentals);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock screener
app.post('/api/screener/find-opportunities', async (req, res) => {
  try {
    const filters = req.body || {};
    const results = await screenerService.findOpportunities(filters);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stock universe statistics
app.get('/api/screener/stats', async (req, res) => {
  try {
    const stats = screenerService.getUniverseStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available trading strategies
app.get('/api/screener/strategies', (req, res) => {
  try {
    const strategies = strategyPresetsService.getAllStrategies();
    res.json(strategies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific strategy details
app.get('/api/screener/strategies/:name', (req, res) => {
  try {
    const strategy = strategyPresetsService.getStrategy(req.params.name);
    res.json(strategy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// AI PREDICTION & PATTERN ANALYSIS ENDPOINTS
// =============================================

// Scan all stocks for trading opportunities
app.get('/api/ai/opportunities', async (req, res) => {
  try {
    if (!aiPredictionService) {
      return res.status(503).json({ error: 'AI prediction service not available' });
    }
    console.log('🤖 Starting AI opportunity scan...');
    const opportunities = await aiPredictionService.scanForOpportunities();
    res.json(opportunities);
  } catch (error) {
    console.error('AI scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get bullish opportunities only
app.get('/api/ai/opportunities/bullish', async (req, res) => {
  try {
    if (!aiPredictionService) {
      return res.status(503).json({ error: 'AI prediction service not available' });
    }
    const { limit = 10 } = req.query;
    const opportunities = await aiPredictionService.getBullishOpportunities(parseInt(limit));
    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bearish opportunities only
app.get('/api/ai/opportunities/bearish', async (req, res) => {
  try {
    if (!aiPredictionService) {
      return res.status(503).json({ error: 'AI prediction service not available' });
    }
    const { limit = 10 } = req.query;
    const opportunities = await aiPredictionService.getBearishOpportunities(parseInt(limit));
    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze specific stock for patterns and predictions
app.get('/api/ai/analyze/:symbol', async (req, res) => {
  try {
    if (!aiPredictionService) {
      return res.status(503).json({ error: 'AI prediction service not available' });
    }
    const { symbol } = req.params;
    console.log(`🔍 AI analyzing ${symbol}...`);
    const analysis = await aiPredictionService.analyzeStock(symbol);
    if (!analysis) {
      return res.json({ symbol, message: 'No significant opportunity detected', confidence: 0 });
    }
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message, symbol: req.params.symbol });
  }
});

// Analyze user's watchlist
app.post('/api/ai/analyze-watchlist', async (req, res) => {
  try {
    if (!aiPredictionService) {
      return res.status(503).json({ error: 'AI prediction service not available' });
    }
    const { symbols } = req.body;
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'symbols array required' });
    }
    console.log(`🔍 Analyzing watchlist of ${symbols.length} stocks...`);
    const results = await aiPredictionService.analyzeWatchlist(symbols);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pattern analysis for a stock
app.get('/api/ai/patterns/:symbol', async (req, res) => {
  try {
    if (!patternAnalysisService || !historicalService) {
      return res.status(503).json({ error: 'Pattern analysis service not available' });
    }
    const { symbol } = req.params;
    
    // Get historical data
    const historicalData = await historicalService.getHistoricalData(symbol, '3mo');
    if (!historicalData || !historicalData.history) {
      return res.status(404).json({ error: 'No historical data available' });
    }
    
    // Get current price
    const priceData = await stockService.getStockPrice(symbol);
    const currentPrice = priceData?.price || historicalData.history[historicalData.history.length - 1]?.close;
    
    // Analyze patterns
    const patterns = patternAnalysisService.analyzePatterns(historicalData.history, currentPrice);
    
    res.json({
      symbol,
      currentPrice,
      ...patterns,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// PREMIUM AI SIGNALS & MARKET INTELLIGENCE
// =============================================

// Get PREMIUM high-quality signals only
app.get('/api/ai/premium-signals', async (req, res) => {
  try {
    if (!enhancedPredictionEngine) {
      return res.status(503).json({ error: 'Enhanced prediction engine not available' });
    }
    console.log('🎯 Generating PREMIUM signals...');
    const signals = await enhancedPredictionEngine.generatePremiumSignals();
    res.json(signals);
  } catch (error) {
    console.error('Premium signals error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed analysis for single stock
app.get('/api/ai/detailed/:symbol', async (req, res) => {
  try {
    if (!enhancedPredictionEngine) {
      return res.status(503).json({ error: 'Enhanced prediction engine not available' });
    }
    const { symbol } = req.params;
    console.log(`🔬 Deep analysis for ${symbol}...`);
    const analysis = await enhancedPredictionEngine.getDetailedAnalysis(symbol);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get advanced technical indicators
app.get('/api/ai/technicals/:symbol', async (req, res) => {
  try {
    if (!advancedTechnicalService || !historicalService) {
      return res.status(503).json({ error: 'Technical service not available' });
    }
    const { symbol } = req.params;
    
    const historicalData = await historicalService.getHistoricalData(symbol, '3mo');
    if (!historicalData?.history) {
      return res.status(404).json({ error: 'No historical data' });
    }
    
    const technicals = advancedTechnicalService.getCompleteAnalysis(historicalData.history);
    res.json({ symbol, ...technicals, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// MARKET SENTIMENT & INTELLIGENCE
// =============================================

// Get overall market sentiment
app.get('/api/market/sentiment', async (req, res) => {
  try {
    if (!marketSentimentService) {
      return res.status(503).json({ error: 'Market sentiment service not available' });
    }
    console.log('📊 Analyzing market sentiment...');
    const sentiment = await marketSentimentService.getMarketSentiment();
    res.json(sentiment);
  } catch (error) {
    console.error('Sentiment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sector rotation analysis
app.get('/api/market/sectors', async (req, res) => {
  try {
    if (!marketSentimentService) {
      return res.status(503).json({ error: 'Market sentiment service not available' });
    }
    console.log('🔄 Analyzing sector rotation...');
    const sectors = await marketSentimentService.getSectorRotation();
    res.json(sectors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if trading conditions are favorable
app.get('/api/market/trading-conditions', async (req, res) => {
  try {
    if (!marketSentimentService) {
      return res.status(503).json({ error: 'Market sentiment service not available' });
    }
    const conditions = await marketSentimentService.isTradingFavorable();
    res.json(conditions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Fear & Greed index
app.get('/api/market/fear-greed', async (req, res) => {
  try {
    if (!marketSentimentService) {
      return res.status(503).json({ error: 'Market sentiment service not available' });
    }
    const fearGreed = await marketSentimentService.getFearGreedIndex();
    res.json(fearGreed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// RISK MANAGEMENT
// =============================================

// Calculate position size
app.post('/api/risk/position-size', (req, res) => {
  try {
    if (!riskManagementService) {
      return res.status(503).json({ error: 'Risk management service not available' });
    }
    const result = riskManagementService.calculatePositionSize(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate trade risk
app.post('/api/risk/trade-risk', (req, res) => {
  try {
    if (!riskManagementService) {
      return res.status(503).json({ error: 'Risk management service not available' });
    }
    const result = riskManagementService.calculateTradeRisk(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pre-trade checklist
app.post('/api/risk/pre-trade-check', (req, res) => {
  try {
    if (!riskManagementService) {
      return res.status(503).json({ error: 'Risk management service not available' });
    }
    const result = riskManagementService.preTradeChecklist(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Daily risk check
app.post('/api/risk/daily-check', (req, res) => {
  try {
    if (!riskManagementService) {
      return res.status(503).json({ error: 'Risk management service not available' });
    }
    const { dailyPnL, capital } = req.body;
    const result = riskManagementService.dailyRiskCheck(dailyPnL, capital);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Portfolio risk assessment
app.post('/api/risk/portfolio', (req, res) => {
  try {
    if (!riskManagementService) {
      return res.status(503).json({ error: 'Risk management service not available' });
    }
    const { positions, capital } = req.body;
    const result = riskManagementService.assessPortfolioRisk(positions, capital);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Server running on http://localhost:' + PORT);
  console.log('📊 Ready to fetch stock data!');
});
