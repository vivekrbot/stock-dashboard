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

// Start server
app.listen(PORT, () => {
  console.log('🚀 Server running on http://localhost:' + PORT);
  console.log('📊 Ready to fetch stock data!');
});
