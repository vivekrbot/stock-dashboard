/**
 * Pattern Analysis Service
 * Detects chart patterns, candlestick patterns, and technical setups
 */

class PatternAnalysisService {
  constructor() {
    this.patterns = [];
  }

  /**
   * Analyze stock data for all patterns
   */
  analyzePatterns(historicalData, currentPrice) {
    const patterns = [];
    
    if (!historicalData || historicalData.length < 20) {
      return { patterns: [], summary: 'Insufficient data' };
    }

    // Extract OHLC data
    const closes = historicalData.map(d => d.close).filter(c => c != null);
    const highs = historicalData.map(d => d.high).filter(h => h != null);
    const lows = historicalData.map(d => d.low).filter(l => l != null);
    const opens = historicalData.map(d => d.open).filter(o => o != null);
    const volumes = historicalData.map(d => d.volume).filter(v => v != null);

    // Detect various patterns
    const chartPatterns = this.detectChartPatterns(closes, highs, lows);
    const candlestickPatterns = this.detectCandlestickPatterns(historicalData.slice(-10));
    const supportResistance = this.findSupportResistance(closes, highs, lows);
    const trendAnalysis = this.analyzeTrend(closes);
    const volumeAnalysis = this.analyzeVolume(closes, volumes);
    const maAnalysis = this.analyzeMovingAverages(closes, currentPrice);

    patterns.push(...chartPatterns);
    patterns.push(...candlestickPatterns);

    return {
      patterns,
      supportResistance,
      trend: trendAnalysis,
      volumeSignal: volumeAnalysis,
      maSignal: maAnalysis,
      summary: this.generateSummary(patterns, trendAnalysis)
    };
  }

  /**
   * Detect chart patterns (Head & Shoulders, Double Top/Bottom, etc.)
   */
  detectChartPatterns(closes, highs, lows) {
    const patterns = [];
    const len = closes.length;
    
    if (len < 30) return patterns;

    // Double Bottom Detection
    const doubleBottom = this.detectDoubleBottom(lows, closes);
    if (doubleBottom) patterns.push(doubleBottom);

    // Double Top Detection
    const doubleTop = this.detectDoubleTop(highs, closes);
    if (doubleTop) patterns.push(doubleTop);

    // Bullish Flag Pattern
    const bullishFlag = this.detectBullishFlag(closes, highs, lows);
    if (bullishFlag) patterns.push(bullishFlag);

    // Bearish Flag Pattern
    const bearishFlag = this.detectBearishFlag(closes, highs, lows);
    if (bearishFlag) patterns.push(bearishFlag);

    // Ascending Triangle
    const ascTriangle = this.detectAscendingTriangle(highs, lows, closes);
    if (ascTriangle) patterns.push(ascTriangle);

    // Descending Triangle
    const descTriangle = this.detectDescendingTriangle(highs, lows, closes);
    if (descTriangle) patterns.push(descTriangle);

    // Breakout Detection
    const breakout = this.detectBreakout(closes, highs, lows);
    if (breakout) patterns.push(breakout);

    return patterns;
  }

  /**
   * Detect Double Bottom pattern
   */
  detectDoubleBottom(lows, closes) {
    const len = lows.length;
    if (len < 20) return null;

    const recentLows = lows.slice(-30);
    const minIdx1 = this.findLocalMinima(recentLows, 5, 15);
    const minIdx2 = this.findLocalMinima(recentLows, 20, 28);

    if (minIdx1 === -1 || minIdx2 === -1) return null;

    const low1 = recentLows[minIdx1];
    const low2 = recentLows[minIdx2];
    const tolerance = low1 * 0.03; // 3% tolerance

    if (Math.abs(low1 - low2) < tolerance && closes[closes.length - 1] > low1 * 1.05) {
      return {
        name: 'Double Bottom',
        type: 'bullish',
        strength: 'strong',
        confidence: 75,
        description: 'W-shaped reversal pattern indicating potential uptrend',
        action: 'BUY',
        targetMultiplier: 1.08
      };
    }
    return null;
  }

  /**
   * Detect Double Top pattern
   */
  detectDoubleTop(highs, closes) {
    const len = highs.length;
    if (len < 20) return null;

    const recentHighs = highs.slice(-30);
    const maxIdx1 = this.findLocalMaxima(recentHighs, 5, 15);
    const maxIdx2 = this.findLocalMaxima(recentHighs, 20, 28);

    if (maxIdx1 === -1 || maxIdx2 === -1) return null;

    const high1 = recentHighs[maxIdx1];
    const high2 = recentHighs[maxIdx2];
    const tolerance = high1 * 0.03;

    if (Math.abs(high1 - high2) < tolerance && closes[closes.length - 1] < high1 * 0.95) {
      return {
        name: 'Double Top',
        type: 'bearish',
        strength: 'strong',
        confidence: 72,
        description: 'M-shaped reversal pattern indicating potential downtrend',
        action: 'SELL',
        targetMultiplier: 0.92
      };
    }
    return null;
  }

  /**
   * Detect Bullish Flag pattern
   */
  detectBullishFlag(closes, highs, lows) {
    const len = closes.length;
    if (len < 15) return null;

    // Check for prior uptrend (pole)
    const priorTrend = closes.slice(-20, -10);
    const poleGain = (priorTrend[priorTrend.length - 1] - priorTrend[0]) / priorTrend[0];
    
    if (poleGain < 0.05) return null; // Need 5%+ pole

    // Check for consolidation (flag)
    const flagPeriod = closes.slice(-10);
    const flagHigh = Math.max(...flagPeriod);
    const flagLow = Math.min(...flagPeriod);
    const flagRange = (flagHigh - flagLow) / flagLow;

    // Check for downward sloping consolidation with tight range
    const flagSlope = (flagPeriod[flagPeriod.length - 1] - flagPeriod[0]) / flagPeriod[0];
    
    if (flagRange < 0.08 && flagSlope < 0 && flagSlope > -0.05) {
      const currentPrice = closes[len - 1];
      if (currentPrice > flagHigh * 0.98) { // Near breakout
        return {
          name: 'Bullish Flag',
          type: 'bullish',
          strength: 'strong',
          confidence: 78,
          description: 'Continuation pattern after uptrend, flag consolidation near breakout',
          action: 'BUY',
          targetMultiplier: 1 + poleGain // Target = pole height added
        };
      }
    }
    return null;
  }

  /**
   * Detect Bearish Flag pattern
   */
  detectBearishFlag(closes, highs, lows) {
    const len = closes.length;
    if (len < 15) return null;

    // Check for prior downtrend (pole)
    const priorTrend = closes.slice(-20, -10);
    const poleLoss = (priorTrend[0] - priorTrend[priorTrend.length - 1]) / priorTrend[0];
    
    if (poleLoss < 0.05) return null;

    // Check for consolidation (flag)
    const flagPeriod = closes.slice(-10);
    const flagHigh = Math.max(...flagPeriod);
    const flagLow = Math.min(...flagPeriod);
    const flagRange = (flagHigh - flagLow) / flagLow;

    const flagSlope = (flagPeriod[flagPeriod.length - 1] - flagPeriod[0]) / flagPeriod[0];
    
    if (flagRange < 0.08 && flagSlope > 0 && flagSlope < 0.05) {
      const currentPrice = closes[len - 1];
      if (currentPrice < flagLow * 1.02) {
        return {
          name: 'Bearish Flag',
          type: 'bearish',
          strength: 'strong',
          confidence: 74,
          description: 'Continuation pattern after downtrend, potential breakdown',
          action: 'SELL',
          targetMultiplier: 1 - poleLoss
        };
      }
    }
    return null;
  }

  /**
   * Detect Ascending Triangle
   */
  detectAscendingTriangle(highs, lows, closes) {
    const len = closes.length;
    if (len < 20) return null;

    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);

    // Check for flat resistance (highs near same level)
    const maxHigh = Math.max(...recentHighs);
    const highsNearResistance = recentHighs.filter(h => h > maxHigh * 0.98).length;

    // Check for rising support (higher lows)
    let risingLows = 0;
    for (let i = 5; i < recentLows.length; i += 5) {
      if (recentLows[i] > recentLows[i - 5]) risingLows++;
    }

    if (highsNearResistance >= 3 && risingLows >= 2) {
      const currentPrice = closes[len - 1];
      if (currentPrice > maxHigh * 0.97) { // Near resistance
        return {
          name: 'Ascending Triangle',
          type: 'bullish',
          strength: 'moderate',
          confidence: 70,
          description: 'Triangle with flat top and rising bottom, breakout imminent',
          action: 'BUY',
          targetMultiplier: 1.06
        };
      }
    }
    return null;
  }

  /**
   * Detect Descending Triangle
   */
  detectDescendingTriangle(highs, lows, closes) {
    const len = closes.length;
    if (len < 20) return null;

    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);

    // Check for flat support
    const minLow = Math.min(...recentLows);
    const lowsNearSupport = recentLows.filter(l => l < minLow * 1.02).length;

    // Check for falling resistance (lower highs)
    let fallingHighs = 0;
    for (let i = 5; i < recentHighs.length; i += 5) {
      if (recentHighs[i] < recentHighs[i - 5]) fallingHighs++;
    }

    if (lowsNearSupport >= 3 && fallingHighs >= 2) {
      const currentPrice = closes[len - 1];
      if (currentPrice < minLow * 1.03) {
        return {
          name: 'Descending Triangle',
          type: 'bearish',
          strength: 'moderate',
          confidence: 68,
          description: 'Triangle with flat bottom and falling top, breakdown likely',
          action: 'SELL',
          targetMultiplier: 0.94
        };
      }
    }
    return null;
  }

  /**
   * Detect Breakout
   */
  detectBreakout(closes, highs, lows) {
    const len = closes.length;
    if (len < 30) return null;

    const currentPrice = closes[len - 1];
    const prev20High = Math.max(...highs.slice(-25, -5));
    const prev20Low = Math.min(...lows.slice(-25, -5));

    // Bullish Breakout
    if (currentPrice > prev20High * 1.02) {
      return {
        name: 'Bullish Breakout',
        type: 'bullish',
        strength: 'strong',
        confidence: 80,
        description: `Breaking above 20-day high of ₹${prev20High.toFixed(2)}`,
        action: 'BUY',
        targetMultiplier: 1.08
      };
    }

    // Bearish Breakdown
    if (currentPrice < prev20Low * 0.98) {
      return {
        name: 'Bearish Breakdown',
        type: 'bearish',
        strength: 'strong',
        confidence: 75,
        description: `Breaking below 20-day low of ₹${prev20Low.toFixed(2)}`,
        action: 'SELL',
        targetMultiplier: 0.92
      };
    }

    return null;
  }

  /**
   * Detect Candlestick Patterns
   */
  detectCandlestickPatterns(recentData) {
    const patterns = [];
    if (recentData.length < 3) return patterns;

    const last = recentData[recentData.length - 1];
    const prev = recentData[recentData.length - 2];
    const prev2 = recentData[recentData.length - 3];

    if (!last || !prev) return patterns;

    const body = last.close - last.open;
    const upperShadow = last.high - Math.max(last.open, last.close);
    const lowerShadow = Math.min(last.open, last.close) - last.low;
    const bodySize = Math.abs(body);
    const range = last.high - last.low;

    // Hammer (Bullish reversal)
    if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.3 && body > 0) {
      patterns.push({
        name: 'Hammer',
        type: 'bullish',
        strength: 'moderate',
        confidence: 65,
        description: 'Bullish reversal candle with long lower shadow',
        action: 'BUY',
        targetMultiplier: 1.04
      });
    }

    // Inverted Hammer (Bullish)
    if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.3 && body > 0) {
      patterns.push({
        name: 'Inverted Hammer',
        type: 'bullish',
        strength: 'moderate',
        confidence: 60,
        description: 'Potential bullish reversal with long upper shadow',
        action: 'BUY',
        targetMultiplier: 1.03
      });
    }

    // Shooting Star (Bearish reversal)
    if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.3 && body < 0) {
      patterns.push({
        name: 'Shooting Star',
        type: 'bearish',
        strength: 'moderate',
        confidence: 65,
        description: 'Bearish reversal candle with long upper shadow',
        action: 'SELL',
        targetMultiplier: 0.96
      });
    }

    // Bullish Engulfing
    if (prev && prev.close < prev.open && last.close > last.open) {
      if (last.open < prev.close && last.close > prev.open) {
        patterns.push({
          name: 'Bullish Engulfing',
          type: 'bullish',
          strength: 'strong',
          confidence: 72,
          description: 'Green candle completely engulfs prior red candle',
          action: 'BUY',
          targetMultiplier: 1.05
        });
      }
    }

    // Bearish Engulfing
    if (prev && prev.close > prev.open && last.close < last.open) {
      if (last.open > prev.close && last.close < prev.open) {
        patterns.push({
          name: 'Bearish Engulfing',
          type: 'bearish',
          strength: 'strong',
          confidence: 70,
          description: 'Red candle completely engulfs prior green candle',
          action: 'SELL',
          targetMultiplier: 0.95
        });
      }
    }

    // Doji (Indecision)
    if (bodySize < range * 0.1 && range > 0) {
      patterns.push({
        name: 'Doji',
        type: 'neutral',
        strength: 'weak',
        confidence: 55,
        description: 'Indecision candle - wait for confirmation',
        action: 'HOLD',
        targetMultiplier: 1
      });
    }

    // Morning Star (3-candle bullish reversal)
    if (prev2 && prev && last) {
      const body2 = prev2.close - prev2.open;
      const body1 = prev.close - prev.open;
      const body0 = last.close - last.open;

      if (body2 < 0 && Math.abs(body1) < Math.abs(body2) * 0.3 && body0 > 0 && body0 > Math.abs(body2) * 0.5) {
        patterns.push({
          name: 'Morning Star',
          type: 'bullish',
          strength: 'strong',
          confidence: 75,
          description: '3-candle bullish reversal pattern',
          action: 'BUY',
          targetMultiplier: 1.06
        });
      }
    }

    // Evening Star (3-candle bearish reversal)
    if (prev2 && prev && last) {
      const body2 = prev2.close - prev2.open;
      const body1 = prev.close - prev.open;
      const body0 = last.close - last.open;

      if (body2 > 0 && Math.abs(body1) < body2 * 0.3 && body0 < 0 && Math.abs(body0) > body2 * 0.5) {
        patterns.push({
          name: 'Evening Star',
          type: 'bearish',
          strength: 'strong',
          confidence: 73,
          description: '3-candle bearish reversal pattern',
          action: 'SELL',
          targetMultiplier: 0.94
        });
      }
    }

    return patterns;
  }

  /**
   * Find Support and Resistance levels
   */
  findSupportResistance(closes, highs, lows) {
    const allPrices = [...closes, ...highs, ...lows];
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const current = closes[closes.length - 1];

    // Find clusters of price points
    const bucketSize = (max - min) / 20;
    const buckets = {};

    allPrices.forEach(price => {
      const bucket = Math.floor((price - min) / bucketSize);
      buckets[bucket] = (buckets[bucket] || 0) + 1;
    });

    // Find significant levels
    const sortedBuckets = Object.entries(buckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const levels = sortedBuckets.map(([bucket, count]) => {
      const price = min + (parseInt(bucket) + 0.5) * bucketSize;
      return { price, strength: count };
    }).sort((a, b) => a.price - b.price);

    // Separate into support and resistance
    const support = levels.filter(l => l.price < current).slice(-2);
    const resistance = levels.filter(l => l.price > current).slice(0, 2);

    return {
      support: support.map(s => s.price),
      resistance: resistance.map(r => r.price),
      nearestSupport: support.length > 0 ? support[support.length - 1].price : current * 0.95,
      nearestResistance: resistance.length > 0 ? resistance[0].price : current * 1.05
    };
  }

  /**
   * Analyze overall trend
   */
  analyzeTrend(closes) {
    if (closes.length < 20) return { direction: 'neutral', strength: 0 };

    const sma5 = this.calculateSMA(closes, 5);
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = closes.length >= 50 ? this.calculateSMA(closes, 50) : sma20;

    const current = closes[closes.length - 1];
    
    // Calculate trend strength
    let bullishPoints = 0;
    let bearishPoints = 0;

    // Price above/below MAs
    if (current > sma5) bullishPoints += 1; else bearishPoints += 1;
    if (current > sma20) bullishPoints += 2; else bearishPoints += 2;
    if (current > sma50) bullishPoints += 2; else bearishPoints += 2;

    // MA alignment
    if (sma5 > sma20) bullishPoints += 1; else bearishPoints += 1;
    if (sma20 > sma50) bullishPoints += 1; else bearishPoints += 1;

    // Recent momentum
    const momentum5 = (current - closes[closes.length - 6]) / closes[closes.length - 6];
    const momentum20 = (current - closes[closes.length - 21]) / closes[closes.length - 21];

    if (momentum5 > 0.02) bullishPoints += 1;
    if (momentum5 < -0.02) bearishPoints += 1;
    if (momentum20 > 0.05) bullishPoints += 2;
    if (momentum20 < -0.05) bearishPoints += 2;

    const totalPoints = bullishPoints + bearishPoints;
    const bullishRatio = bullishPoints / totalPoints;

    let direction, strength;
    if (bullishRatio > 0.65) {
      direction = 'bullish';
      strength = Math.min(100, Math.round(bullishRatio * 100));
    } else if (bullishRatio < 0.35) {
      direction = 'bearish';
      strength = Math.min(100, Math.round((1 - bullishRatio) * 100));
    } else {
      direction = 'neutral';
      strength = 50;
    }

    return {
      direction,
      strength,
      sma5,
      sma20,
      sma50,
      momentum5: (momentum5 * 100).toFixed(2) + '%',
      momentum20: (momentum20 * 100).toFixed(2) + '%'
    };
  }

  /**
   * Analyze volume patterns
   */
  analyzeVolume(closes, volumes) {
    if (volumes.length < 20) return { signal: 'neutral', description: 'Insufficient volume data' };

    const avgVolume20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const todayVolume = volumes[volumes.length - 1];

    const volumeRatio = todayVolume / avgVolume20;
    const recentVolumeRatio = recentVolume / avgVolume20;

    // Check price direction with volume
    const priceChange = (closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6];

    let signal = 'neutral';
    let description = '';

    if (volumeRatio > 1.5 && priceChange > 0.02) {
      signal = 'bullish';
      description = 'High volume with price increase - strong buying pressure';
    } else if (volumeRatio > 1.5 && priceChange < -0.02) {
      signal = 'bearish';
      description = 'High volume with price decrease - strong selling pressure';
    } else if (volumeRatio < 0.5) {
      signal = 'neutral';
      description = 'Low volume - weak conviction in current move';
    } else if (recentVolumeRatio > 1.2) {
      signal = priceChange > 0 ? 'bullish' : 'bearish';
      description = 'Volume picking up - increasing interest';
    } else {
      signal = 'neutral';
      description = 'Normal volume levels';
    }

    return {
      signal,
      description,
      todayVolume,
      avgVolume: Math.round(avgVolume20),
      volumeRatio: volumeRatio.toFixed(2)
    };
  }

  /**
   * Analyze Moving Averages for signals
   */
  analyzeMovingAverages(closes, currentPrice) {
    if (closes.length < 50) return { signal: 'neutral', crossover: null };

    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const prev20 = this.calculateSMA(closes.slice(0, -1), 20);
    const prev50 = this.calculateSMA(closes.slice(0, -1), 50);

    let signal = 'neutral';
    let crossover = null;

    // Golden Cross (bullish)
    if (prev20 < prev50 && sma20 > sma50) {
      signal = 'bullish';
      crossover = {
        type: 'Golden Cross',
        description: '20 SMA crossed above 50 SMA - Strong bullish signal'
      };
    }
    // Death Cross (bearish)
    else if (prev20 > prev50 && sma20 < sma50) {
      signal = 'bearish';
      crossover = {
        type: 'Death Cross',
        description: '20 SMA crossed below 50 SMA - Bearish signal'
      };
    }
    // Price crossing above 20 SMA
    else if (closes[closes.length - 2] < prev20 && currentPrice > sma20) {
      signal = 'bullish';
      crossover = {
        type: 'Price Cross Above 20 SMA',
        description: 'Price crossed above 20-day moving average'
      };
    }
    // Price crossing below 20 SMA
    else if (closes[closes.length - 2] > prev20 && currentPrice < sma20) {
      signal = 'bearish';
      crossover = {
        type: 'Price Cross Below 20 SMA',
        description: 'Price crossed below 20-day moving average'
      };
    }

    return { signal, crossover, sma20, sma50 };
  }

  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(data, period) {
    if (data.length < period) return data[data.length - 1];
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Calculate RSI
   */
  calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Find local minima in a range
   */
  findLocalMinima(data, start, end) {
    let minIdx = -1;
    let minVal = Infinity;
    
    for (let i = start; i < Math.min(end, data.length); i++) {
      if (data[i] < minVal) {
        minVal = data[i];
        minIdx = i;
      }
    }
    return minIdx;
  }

  /**
   * Find local maxima in a range
   */
  findLocalMaxima(data, start, end) {
    let maxIdx = -1;
    let maxVal = -Infinity;
    
    for (let i = start; i < Math.min(end, data.length); i++) {
      if (data[i] > maxVal) {
        maxVal = data[i];
        maxIdx = i;
      }
    }
    return maxIdx;
  }

  /**
   * Generate pattern summary
   */
  generateSummary(patterns, trend) {
    const bullishPatterns = patterns.filter(p => p.type === 'bullish');
    const bearishPatterns = patterns.filter(p => p.type === 'bearish');

    if (bullishPatterns.length > bearishPatterns.length && trend.direction === 'bullish') {
      return 'Strong bullish setup with multiple confirming patterns';
    } else if (bearishPatterns.length > bullishPatterns.length && trend.direction === 'bearish') {
      return 'Bearish setup with multiple warning signals';
    } else if (patterns.length === 0) {
      return 'No significant patterns detected - wait for setup';
    } else {
      return 'Mixed signals - exercise caution';
    }
  }
}

module.exports = new PatternAnalysisService();
