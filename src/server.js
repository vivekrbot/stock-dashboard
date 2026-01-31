const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config();
console.log('🚀 Starting Stock Dashboard API...');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🔑 RAPIDAPI_KEY:', process.env.RAPIDAPI_KEY ? 'SET ✓' : 'NOT SET ✗');
console.log('🔑 FINNHUB_API_KEY:', process.env.FINNHUB_API_KEY ? 'SET ✓' : 'NOT SET ✗');

// Load services with error handling
let stockService, scoringService, screenerService, strategyPresetsService;

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

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend in production
if (isProduction) {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
}

// Test route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Stock Dashboard API is running!',
    timestamp: new Date().toISOString()
  });
});

// Keep legacy route for compatibility
app.get('/', (req, res) => {
  if (isProduction) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  } else {
    res.json({ message: 'Stock Dashboard API is running!' });
  }
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

// Get stocks by index (NIFTY 50, NIFTY BANK, etc.)
app.get('/api/stocks/index/:indexName', async (req, res) => {
  try {
    const { indexName } = req.params;
    const decodedIndex = decodeURIComponent(indexName);
    const data = await stockService.getStocksByIndex(decodedIndex);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get technical indicators (calculated locally)
app.get('/api/stock/:symbol/technical', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await stockService.getTechnicalIndicators(symbol);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get historical data
app.get('/api/stock/:symbol/history', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '3mo' } = req.query;
    
    // Convert period to days
    const periodMap = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365 };
    const days = periodMap[period] || 90;
    
    const data = await stockService.getHistoricalData(symbol, days);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get complete stock analysis with confidence score
app.get('/api/stock/:symbol/analyze', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Fetch stock data and technicals, fundamentals optional
    const [stockData, technicals] = await Promise.all([
      stockService.getStockPrice(symbol),
      stockService.getTechnicalIndicators(symbol)
    ]);

    // Try to get fundamentals, but don't fail if unavailable
    let fundamentals = {};
    try {
      fundamentals = await stockService.getStockDetails(symbol);
    } catch (error) {
      console.log(`⚠ Fundamentals unavailable for ${symbol}, using defaults`);
      // Provide default fundamental data
      fundamentals = {
        marketCap: stockData.price * 1000000000, // Estimated
        peRatio: 20, // Industry average
        pbRatio: 3,
        debtToEquity: 0.5,
        roe: 15,
        sector: 'Technology'
      };
    }

    const analysis = await scoringService.analyzeStock(stockData, technicals, fundamentals);
    
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock screener endpoint
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

// Refresh NSE stock universe
app.post('/api/screener/refresh-nse-stocks', async (req, res) => {
  try {
    const result = await screenerService.refreshNSEStocks();
    res.json(result);
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
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Ready to fetch NSE/BSE stock data!`);
  console.log(`🔑 RapidAPI configured: ${process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY !== 'your-rapidapi-key-here' ? 'YES ✓' : 'NO ✗ (using fallback sources)'}`);
});

