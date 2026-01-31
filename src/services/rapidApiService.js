const axios = require('axios');

/**
 * RapidAPI Service for fetching real-time stock data
 * Supports multiple Indian stock market APIs through RapidAPI
 */
class RapidAPIService {
  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY;
    this.baseUrl = 'https://latest-stock-price.p.rapidapi.com';
    this.yahooFinanceUrl = 'https://yahoo-finance15.p.rapidapi.com';
  }

  /**
   * Get real-time stock price from RapidAPI Latest Stock Price API
   * @param {string} symbol - Stock symbol (e.g., 'RELIANCE', 'TCS')
   */
  async getLatestStockPrice(symbol) {
    if (!this.apiKey || this.apiKey === 'your-rapidapi-key-here') {
      throw new Error('RapidAPI key not configured');
    }

    try {
      // Use /any endpoint which returns all NIFTY stocks
      const response = await axios.get(`${this.baseUrl}/any`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'latest-stock-price.p.rapidapi.com'
        },
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        const stockData = response.data.find(s => 
          s.symbol === symbol || 
          s.symbol === `${symbol}EQN` ||
          s.identifier === `${symbol}EQN`
        );

        if (stockData) {
          return this.formatStockData(stockData, symbol);
        }
      }

      throw new Error(`Stock ${symbol} not found in response`);
    } catch (error) {
      if (error.response) {
        throw new Error(`RapidAPI Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
      }
      throw error;
    }
  }

  /**
   * Get all NSE stocks from RapidAPI
   */
  async getAllStocks() {
    if (!this.apiKey || this.apiKey === 'your-rapidapi-key-here') {
      throw new Error('RapidAPI key not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/any`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'latest-stock-price.p.rapidapi.com'
        },
        timeout: 15000
      });

      if (response.data && Array.isArray(response.data)) {
        return response.data.map(stock => this.formatStockData(stock));
      }

      return [];
    } catch (error) {
      if (error.response) {
        throw new Error(`RapidAPI Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
      }
      throw error;
    }
  }

  /**
   * Get stocks by indices (NIFTY 50, NIFTY BANK, etc.)
   */
  async getStocksByIndex(indexName = 'NIFTY 50') {
    if (!this.apiKey || this.apiKey === 'your-rapidapi-key-here') {
      throw new Error('RapidAPI key not configured');
    }

    try {
      // Use /any endpoint and filter by index if needed
      const response = await axios.get(`${this.baseUrl}/any`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'latest-stock-price.p.rapidapi.com'
        },
        timeout: 15000
      });

      if (response.data && Array.isArray(response.data)) {
        // Filter stocks - skip index entries (like "NIFTY 50" itself)
        const stocks = response.data.filter(stock => 
          stock.symbol && stock.symbol !== indexName && !stock.symbol.includes(' ')
        );
        return stocks.map(stock => this.formatStockData(stock));
      }

      return [];
    } catch (error) {
      if (error.response) {
        throw new Error(`RapidAPI Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
      }
      throw error;
    }
  }

  /**
   * Get stock quote from Yahoo Finance via RapidAPI
   */
  async getYahooFinanceQuote(symbol) {
    if (!this.apiKey || this.apiKey === 'your-rapidapi-key-here') {
      throw new Error('RapidAPI key not configured');
    }

    try {
      // For Indian stocks, add .NS suffix for NSE
      const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
      
      const response = await axios.get(`${this.yahooFinanceUrl}/api/yahoo/qu/quote/${yahooSymbol}`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
        },
        timeout: 10000
      });

      if (response.data && response.data.body) {
        return this.formatYahooData(response.data.body, symbol);
      }

      throw new Error(`No data found for ${symbol}`);
    } catch (error) {
      if (error.response) {
        throw new Error(`Yahoo Finance API Error: ${error.response.status}`);
      }
      throw error;
    }
  }

  /**
   * Format stock data from Latest Stock Price API
   */
  formatStockData(data, symbolOverride = null) {
    const symbol = symbolOverride || data.symbol?.replace('EQN', '') || 'UNKNOWN';
    const currentPrice = parseFloat(data.lastPrice || data.pClosed || 0);
    const previousClose = parseFloat(data.previousClose || data.pClosed || 0);
    const change = parseFloat(data.change || 0);
    const percentChange = parseFloat(data.pChange || 0);

    return {
      symbol,
      price: currentPrice,
      change,
      percentChange,
      previousClose,
      open: parseFloat(data.open || 0),
      high: parseFloat(data.dayHigh || 0),
      low: parseFloat(data.dayLow || 0),
      volume: parseInt(data.totalTradedVolume || 0),
      '52WeekHigh': parseFloat(data.yearHigh || 0),
      '52WeekLow': parseFloat(data.yearLow || 0),
      lastUpdate: data.lastUpdateTime || new Date().toISOString(),
      source: 'RapidAPI-LatestStockPrice'
    };
  }

  /**
   * Format data from Yahoo Finance API
   */
  formatYahooData(data, symbol) {
    const currentPrice = parseFloat(data.regularMarketPrice || 0);
    const previousClose = parseFloat(data.regularMarketPreviousClose || 0);
    const change = currentPrice - previousClose;
    const percentChange = previousClose > 0 ? ((change / previousClose) * 100) : 0;

    return {
      symbol,
      price: currentPrice,
      change,
      percentChange,
      previousClose,
      open: parseFloat(data.regularMarketOpen || 0),
      high: parseFloat(data.regularMarketDayHigh || 0),
      low: parseFloat(data.regularMarketDayLow || 0),
      volume: parseInt(data.regularMarketVolume || 0),
      '52WeekHigh': parseFloat(data.fiftyTwoWeekHigh || 0),
      '52WeekLow': parseFloat(data.fiftyTwoWeekLow || 0),
      marketCap: data.marketCap || null,
      peRatio: parseFloat(data.trailingPE || 0),
      lastUpdate: new Date().toISOString(),
      source: 'RapidAPI-YahooFinance'
    };
  }

  /**
   * Check if RapidAPI is configured and available
   */
  isConfigured() {
    return !!(this.apiKey && this.apiKey !== 'your-rapidapi-key-here');
  }
}

module.exports = new RapidAPIService();
