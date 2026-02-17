/**
 * Real-Time Data Service
 * Aggregates data from multiple sources with intelligent caching and WebSocket support
 */

const NodeCache = require('node-cache');
const stockService = require('./stockService');
const historicalService = require('./historicalService');
const moneycontrolService = require('./moneycontrolService');

class RealTimeDataService {
  constructor() {
    // Multi-tier cache for different data types
    this.priceCache = new NodeCache({ stdTTL: 10, checkperiod: 5 }); // 10 second price cache
    this.historicalCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 min historical
    this.fundamentalCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // 1 hour fundamentals
    
    // WebSocket subscribers
    this.subscribers = new Map();
    
    // Batch request queue to optimize API calls
    this.requestQueue = new Map();
    this.batchDelay = 100; // ms to wait before batching
    
    console.log('✓ Real-Time Data Service initialized with intelligent caching');
  }

  /**
   * Get real-time price with smart caching
   */
  async getRealtimePrice(symbol) {
    // Check cache first
    const cached = this.priceCache.get(symbol);
    if (cached) {
      return { ...cached, cached: true };
    }

    // Fetch fresh data
    const data = await stockService.getStockPrice(symbol);
    
    // Cache the result
    this.priceCache.set(symbol, data);
    
    // Notify subscribers
    this.notifySubscribers(symbol, data);
    
    return { ...data, cached: false };
  }

  /**
   * Batch fetch multiple stocks efficiently
   */
  async getBatchPrices(symbols) {
    const results = [];
    const uncached = [];
    
    // Check cache for all symbols
    for (const symbol of symbols) {
      const cached = this.priceCache.get(symbol);
      if (cached) {
        results.push({ ...cached, cached: true });
      } else {
        uncached.push(symbol);
      }
    }
    
    // Fetch uncached symbols in parallel (max 5 at a time to avoid rate limits)
    if (uncached.length > 0) {
      const batchSize = 5;
      for (let i = 0; i < uncached.length; i += batchSize) {
        const batch = uncached.slice(i, i + batchSize);
        const promises = batch.map(symbol => 
          this.getRealtimePrice(symbol).catch(err => ({
            symbol,
            error: err.message,
            price: 0
          }))
        );
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < uncached.length) {
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }
    
    return results;
  }

  /**
   * Get comprehensive stock data (price + technical + fundamental)
   */
  async getCompleteStockData(symbol, options = {}) {
    const { forceRefresh = false, includeHistory = true, historyRange = '1mo' } = options;
    
    const cacheKey = `complete_${symbol}`;
    
    if (!forceRefresh) {
      const cached = this.fundamentalCache.get(cacheKey);
      if (cached) return { ...cached, cached: true };
    }
    
    // Fetch all data in parallel
    const promises = [
      this.getRealtimePrice(symbol),
      stockService.getTechnicalIndicators(symbol).catch(err => ({ error: err.message }))
    ];
    
    if (includeHistory) {
      promises.push(
        historicalService.getHistoricalData(symbol, historyRange).catch(err => ({ error: err.message }))
      );
    }
    
    const [price, technical, historical] = await Promise.all(promises);
    
    const result = {
      symbol,
      timestamp: new Date().toISOString(),
      price: price.price,
      change: price.change,
      changePercent: price.changePercent,
      volume: price.volume,
      technical,
      historical: historical?.history || null,
      cached: false
    };
    
    // Cache complete data
    this.fundamentalCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Subscribe to real-time updates for a symbol
   */
  subscribe(symbol, callback) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol).add(callback);
    
    return () => {
      const subs = this.subscribers.get(symbol);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(symbol);
        }
      }
    };
  }

  /**
   * Notify all subscribers of a symbol
   */
  notifySubscribers(symbol, data) {
    const subs = this.subscribers.get(symbol);
    if (subs) {
      subs.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Subscriber callback error for ${symbol}:`, error);
        }
      });
    }
  }

  /**
   * Stream live prices with auto-refresh
   */
  async startPriceStream(symbols, interval = 5000) {
    const streamId = setInterval(async () => {
      try {
        await this.getBatchPrices(symbols);
      } catch (error) {
        console.error('Price stream error:', error);
      }
    }, interval);
    
    return () => clearInterval(streamId);
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.priceCache.flushAll();
    this.historicalCache.flushAll();
    this.fundamentalCache.flushAll();
    console.log('✓ All caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      price: this.priceCache.getStats(),
      historical: this.historicalCache.getStats(),
      fundamental: this.fundamentalCache.getStats(),
      subscribers: this.subscribers.size
    };
  }

  /**
   * Pre-warm cache with popular stocks
   */
  async warmCache(symbols) {
    console.log(`🔥 Warming cache with ${symbols.length} symbols...`);
    await this.getBatchPrices(symbols);
    console.log('✓ Cache warmed');
  }
}

// Singleton instance
const realTimeDataService = new RealTimeDataService();

module.exports = realTimeDataService;
