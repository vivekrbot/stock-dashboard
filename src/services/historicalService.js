/**
 * Historical Data Service
 * Fetches historical stock data from multiple sources
 */

const https = require('https');
const http = require('http');

// Cache for historical data (longer TTL - 5 minutes)
const historyCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Make HTTP/HTTPS request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        ...options.headers
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Get cache key
 */
function getCacheKey(symbol, range) {
  return `${symbol}_${range}`;
}

/**
 * Check cache
 */
function getFromCache(symbol, range) {
  const key = getCacheKey(symbol, range);
  const cached = historyCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

/**
 * Set cache
 */
function setCache(symbol, range, data) {
  const key = getCacheKey(symbol, range);
  historyCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetch historical data from Yahoo Finance
 */
async function fetchFromYahoo(symbol, range = '1mo', interval = '1d') {
  try {
    // Add .NS for Indian stocks
    const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    
    // Map range to Yahoo parameters
    const rangeMap = {
      '1d': { range: '1d', interval: '5m' },
      '5d': { range: '5d', interval: '15m' },
      '1mo': { range: '1mo', interval: '1d' },
      '3mo': { range: '3mo', interval: '1d' },
      '6mo': { range: '6mo', interval: '1d' },
      '1y': { range: '1y', interval: '1wk' },
      '5y': { range: '5y', interval: '1mo' }
    };
    
    const params = rangeMap[range] || rangeMap['1mo'];
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${params.range}&interval=${params.interval}&includePrePost=false`;
    
    const response = await makeRequest(url);
    
    if (!response.chart?.result?.[0]) {
      throw new Error('No data from Yahoo');
    }
    
    const result = response.chart.result[0];
    const quotes = result.indicators.quote[0];
    const timestamps = result.timestamp || [];
    
    const history = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString(),
      open: quotes.open?.[i] || null,
      high: quotes.high?.[i] || null,
      low: quotes.low?.[i] || null,
      close: quotes.close?.[i] || null,
      volume: quotes.volume?.[i] || 0
    })).filter(d => d.close !== null);
    
    return {
      symbol,
      history,
      meta: {
        currency: result.meta.currency,
        regularMarketPrice: result.meta.regularMarketPrice,
        previousClose: result.meta.previousClose,
        source: 'Yahoo Finance'
      }
    };
  } catch (error) {
    console.error(`Yahoo historical error for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch historical data from Alpha Vantage (free tier)
 */
async function fetchFromAlphaVantage(symbol, range = '1mo') {
  try {
    // Alpha Vantage free API (limited to 5 calls/minute)
    const apiKey = process.env.ALPHA_VANTAGE_KEY || 'demo';
    
    // For Indian stocks, use BSE symbol format
    const avSymbol = `${symbol}.BSE`;
    
    let functionType = 'TIME_SERIES_DAILY';
    if (range === '1d' || range === '5d') {
      functionType = 'TIME_SERIES_INTRADAY&interval=15min';
    }
    
    const url = `https://www.alphavantage.co/query?function=${functionType}&symbol=${avSymbol}&apikey=${apiKey}`;
    
    const response = await makeRequest(url);
    
    // Parse response based on function type
    const timeSeries = response['Time Series (Daily)'] || 
                       response['Time Series (15min)'] || 
                       response['Time Series (5min)'];
    
    if (!timeSeries) {
      throw new Error('No data from Alpha Vantage');
    }
    
    const history = Object.entries(timeSeries)
      .map(([date, values]) => ({
        date: new Date(date).toISOString(),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'])
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Limit based on range
    const limitMap = { '1d': 50, '5d': 100, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365 };
    const limit = limitMap[range] || 30;
    
    return {
      symbol,
      history: history.slice(-limit),
      meta: { source: 'Alpha Vantage' }
    };
  } catch (error) {
    console.error(`Alpha Vantage error for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch from Moneycontrol Historical API
 */
async function fetchFromMoneycontrol(symbol, range = '1mo') {
  try {
    // First, get the stock ID from search
    const searchUrl = `https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php?classic=true&query=${symbol}&type=1&format=json`;
    const searchResults = await makeRequest(searchUrl);
    
    if (!searchResults || searchResults.length === 0) {
      throw new Error('Stock not found on Moneycontrol');
    }
    
    const stockId = searchResults[0].sc_id;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    const rangeMap = {
      '1d': 1, '5d': 5, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '5y': 1825
    };
    startDate.setDate(startDate.getDate() - (rangeMap[range] || 30));
    
    // Fetch historical data
    const historyUrl = `https://priceapi.moneycontrol.com/techCharts/indianMarket/stock/history?symbol=${stockId}&resolution=1D&from=${Math.floor(startDate.getTime()/1000)}&to=${Math.floor(endDate.getTime()/1000)}`;
    
    const response = await makeRequest(historyUrl);
    
    if (!response || response.s !== 'ok') {
      throw new Error('No historical data from Moneycontrol');
    }
    
    const history = response.t.map((timestamp, i) => ({
      date: new Date(timestamp * 1000).toISOString(),
      open: response.o[i],
      high: response.h[i],
      low: response.l[i],
      close: response.c[i],
      volume: response.v[i]
    }));
    
    return {
      symbol,
      history,
      meta: { source: 'Moneycontrol' }
    };
  } catch (error) {
    console.error(`Moneycontrol historical error for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get historical data with fallback
 */
async function getHistoricalData(symbol, range = '1mo') {
  // Check cache first
  const cached = getFromCache(symbol, range);
  if (cached) {
    console.log(`✓ ${symbol} historical from cache`);
    return cached;
  }
  
  // Try sources in order
  let data = await fetchFromYahoo(symbol, range);
  
  if (!data) {
    data = await fetchFromMoneycontrol(symbol, range);
  }
  
  if (!data) {
    data = await fetchFromAlphaVantage(symbol, range);
  }
  
  if (data) {
    setCache(symbol, range, data);
    console.log(`✓ ${symbol} historical from ${data.meta.source}`);
  }
  
  return data;
}

/**
 * Get intraday data (for live charts during market hours)
 */
async function getIntradayData(symbol) {
  return getHistoricalData(symbol, '1d');
}

/**
 * Get daily summary for last N days
 */
async function getDailySummary(symbol, days = 5) {
  const data = await getHistoricalData(symbol, days <= 5 ? '5d' : '1mo');
  if (!data) return null;
  
  const recent = data.history.slice(-days);
  
  return {
    symbol,
    days: recent,
    summary: {
      avgClose: recent.reduce((sum, d) => sum + d.close, 0) / recent.length,
      highestHigh: Math.max(...recent.map(d => d.high)),
      lowestLow: Math.min(...recent.map(d => d.low)),
      totalVolume: recent.reduce((sum, d) => sum + d.volume, 0),
      priceChange: recent.length > 1 ? recent[recent.length - 1].close - recent[0].close : 0
    }
  };
}

module.exports = {
  getHistoricalData,
  getIntradayData,
  getDailySummary,
  fetchFromYahoo,
  fetchFromMoneycontrol
};
