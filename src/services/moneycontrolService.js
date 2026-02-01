const fetch = require('node-fetch');

/**
 * Moneycontrol API Service
 * Uses unofficial Moneycontrol endpoints for Indian stock data
 */
class MoneycontrolService {
  constructor() {
    this.searchUrl = 'https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php';
    this.quoteBaseUrl = 'https://priceapi.moneycontrol.com/pricefeed/nse/equitycash';
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
  }

  /**
   * Search for a stock and get its Moneycontrol ID
   */
  async searchStock(symbol) {
    const cacheKey = `search_${symbol}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout * 60) {
      return cached.data;
    }

    try {
      const url = `${this.searchUrl}?classic=true&query=${encodeURIComponent(symbol)}&type=1&format=json`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.moneycontrol.com/'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        // Find exact match or best match
        const match = data.find(item => 
          item.stock_name?.toUpperCase().includes(symbol.toUpperCase()) ||
          item.sc_id?.toUpperCase() === symbol.toUpperCase()
        ) || data[0];

        const result = {
          scId: match.sc_id,
          name: match.stock_name,
          link: match.link_src
        };

        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      return null;
    } catch (error) {
      console.error(`Moneycontrol search failed for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Get stock quote from Moneycontrol
   */
  async getStockQuote(symbol) {
    const cacheKey = `quote_${symbol}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // First search for the stock to get its ID
      const searchResult = await this.searchStock(symbol);
      
      if (!searchResult || !searchResult.scId) {
        throw new Error(`Stock ${symbol} not found on Moneycontrol`);
      }

      const url = `${this.quoteBaseUrl}/${searchResult.scId}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.moneycontrol.com/'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Quote fetch failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.data) {
        throw new Error('Invalid response from Moneycontrol');
      }

      const stockData = data.data;
      
      const result = {
        symbol: symbol,
        name: stockData.SC_FULLNM || searchResult.name,
        price: parseFloat(stockData.pricecurrent) || 0,
        change: parseFloat(stockData.pricechange) || 0,
        percentChange: parseFloat(stockData.pricepercentchange) || 0,
        previousClose: parseFloat(stockData.priceprevclose) || 0,
        open: parseFloat(stockData.OPN) || parseFloat(stockData.priceopen) || 0,
        high: parseFloat(stockData.HP) || parseFloat(stockData.pricehigh) || 0,
        low: parseFloat(stockData.LP) || parseFloat(stockData.pricelow) || 0,
        volume: parseInt(stockData.VOL) || 0,
        '52WeekHigh': parseFloat(stockData['52H']) || parseFloat(stockData.HP52) || 0,
        '52WeekLow': parseFloat(stockData['52L']) || parseFloat(stockData.LP52) || 0,
        marketCap: stockData.MKTCAP || 'N/A',
        lastUpdate: new Date().toISOString(),
        source: 'Moneycontrol'
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;

    } catch (error) {
      console.error(`Moneycontrol quote failed for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if service is available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.searchUrl}?classic=true&query=RELIANCE&type=1&format=json`, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new MoneycontrolService();
