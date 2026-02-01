/**
 * Advanced Technical Analysis Service
 * Professional-grade indicators for high-accuracy predictions
 */

class AdvancedTechnicalService {
  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * One of the most reliable trend-following momentum indicators
   */
  calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (closes.length < slowPeriod + signalPeriod) {
      return { macd: 0, signal: 0, histogram: 0, trend: 'neutral' };
    }

    const fastEMA = this.calculateEMA(closes, fastPeriod);
    const slowEMA = this.calculateEMA(closes, slowPeriod);
    
    // MACD Line = Fast EMA - Slow EMA
    const macdLine = [];
    for (let i = 0; i < closes.length; i++) {
      if (i >= slowPeriod - 1) {
        const fastVal = this.calculateEMAAtIndex(closes, fastPeriod, i);
        const slowVal = this.calculateEMAAtIndex(closes, slowPeriod, i);
        macdLine.push(fastVal - slowVal);
      }
    }

    // Signal Line = 9-day EMA of MACD Line
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    
    const currentMACD = macdLine[macdLine.length - 1];
    const prevMACD = macdLine[macdLine.length - 2];
    const currentSignal = signalLine;
    const prevSignal = this.calculateEMA(macdLine.slice(0, -1), signalPeriod);
    
    // Histogram = MACD Line - Signal Line
    const histogram = currentMACD - currentSignal;
    const prevHistogram = prevMACD - prevSignal;
    
    // Determine trend and crossovers
    let trend = 'neutral';
    let crossover = null;
    
    // Bullish crossover: MACD crosses above signal
    if (prevMACD < prevSignal && currentMACD > currentSignal) {
      trend = 'bullish';
      crossover = 'MACD Bullish Crossover';
    }
    // Bearish crossover: MACD crosses below signal
    else if (prevMACD > prevSignal && currentMACD < currentSignal) {
      trend = 'bearish';
      crossover = 'MACD Bearish Crossover';
    }
    // Histogram turning positive
    else if (prevHistogram < 0 && histogram > 0) {
      trend = 'bullish';
      crossover = 'Histogram Turned Positive';
    }
    // Histogram turning negative
    else if (prevHistogram > 0 && histogram < 0) {
      trend = 'bearish';
      crossover = 'Histogram Turned Negative';
    }
    // Above zero line = bullish bias
    else if (currentMACD > 0) {
      trend = histogram > 0 ? 'bullish' : 'weakening_bullish';
    }
    // Below zero line = bearish bias
    else {
      trend = histogram < 0 ? 'bearish' : 'weakening_bearish';
    }

    return {
      macd: Math.round(currentMACD * 100) / 100,
      signal: Math.round(currentSignal * 100) / 100,
      histogram: Math.round(histogram * 100) / 100,
      trend,
      crossover,
      histogramGrowing: Math.abs(histogram) > Math.abs(prevHistogram)
    };
  }

  /**
   * Calculate Bollinger Bands
   * Measures volatility and potential reversal points
   */
  calculateBollingerBands(closes, period = 20, stdDev = 2) {
    if (closes.length < period) {
      const lastPrice = closes[closes.length - 1];
      return {
        upper: lastPrice * 1.02,
        middle: lastPrice,
        lower: lastPrice * 0.98,
        width: 0.04,
        position: 'middle'
      };
    }

    const sma = this.calculateSMA(closes, period);
    const slice = closes.slice(-period);
    
    // Calculate standard deviation
    const squaredDiffs = slice.map(val => Math.pow(val - sma, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const standardDeviation = Math.sqrt(avgSquaredDiff);

    const upper = sma + (stdDev * standardDeviation);
    const lower = sma - (stdDev * standardDeviation);
    const currentPrice = closes[closes.length - 1];
    
    // Band width (volatility indicator)
    const width = (upper - lower) / sma;
    
    // Price position within bands (0 = at lower, 1 = at upper)
    const position = (currentPrice - lower) / (upper - lower);
    
    let signal = 'neutral';
    let description = '';
    
    // Price touching or below lower band = oversold
    if (position <= 0.05) {
      signal = 'bullish';
      description = 'Price at lower Bollinger Band - potential reversal up';
    }
    // Price touching or above upper band = overbought
    else if (position >= 0.95) {
      signal = 'bearish';
      description = 'Price at upper Bollinger Band - potential reversal down';
    }
    // Price moving towards upper band
    else if (position > 0.7) {
      signal = 'bullish';
      description = 'Price in upper zone - uptrend continuation';
    }
    // Price moving towards lower band
    else if (position < 0.3) {
      signal = 'bearish';
      description = 'Price in lower zone - downtrend continuation';
    }
    
    // Squeeze detection (low volatility = potential big move)
    const avgWidth = this.calculateAverageWidth(closes, period, stdDev);
    const isSqueeze = width < avgWidth * 0.7;

    return {
      upper: Math.round(upper * 100) / 100,
      middle: Math.round(sma * 100) / 100,
      lower: Math.round(lower * 100) / 100,
      width: Math.round(width * 10000) / 100, // as percentage
      position: Math.round(position * 100) / 100,
      signal,
      description,
      squeeze: isSqueeze,
      volatility: width > 0.06 ? 'high' : width < 0.03 ? 'low' : 'normal'
    };
  }

  /**
   * Calculate Average True Range (ATR)
   * Measures market volatility - crucial for stop-loss placement
   */
  calculateATR(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) {
      return { atr: 0, atrPercent: 0 };
    }

    const trueRanges = [];
    
    for (let i = 1; i < closes.length; i++) {
      const high = highs[i];
      const low = lows[i];
      const prevClose = closes[i - 1];
      
      // True Range = max of:
      // 1. Current High - Current Low
      // 2. |Current High - Previous Close|
      // 3. |Current Low - Previous Close|
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }

    // ATR = SMA of True Ranges
    const atr = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
    const currentPrice = closes[closes.length - 1];
    const atrPercent = (atr / currentPrice) * 100;

    return {
      atr: Math.round(atr * 100) / 100,
      atrPercent: Math.round(atrPercent * 100) / 100,
      volatilityLevel: atrPercent > 3 ? 'high' : atrPercent > 1.5 ? 'medium' : 'low',
      suggestedStopLoss: Math.round((currentPrice - 2 * atr) * 100) / 100,
      suggestedTarget: Math.round((currentPrice + 3 * atr) * 100) / 100
    };
  }

  /**
   * Calculate Stochastic Oscillator
   * Compares closing price to price range - great for overbought/oversold
   */
  calculateStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    if (closes.length < kPeriod) {
      return { k: 50, d: 50, signal: 'neutral' };
    }

    // %K = (Current Close - Lowest Low) / (Highest High - Lowest Low) * 100
    const recentHighs = highs.slice(-kPeriod);
    const recentLows = lows.slice(-kPeriod);
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    const currentClose = closes[closes.length - 1];
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // Calculate %D (SMA of %K)
    const kValues = [];
    for (let i = kPeriod - 1; i < closes.length; i++) {
      const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
      const periodLows = lows.slice(i - kPeriod + 1, i + 1);
      const hh = Math.max(...periodHighs);
      const ll = Math.min(...periodLows);
      kValues.push(((closes[i] - ll) / (hh - ll)) * 100);
    }
    
    const d = kValues.slice(-dPeriod).reduce((a, b) => a + b, 0) / dPeriod;
    const prevK = kValues[kValues.length - 2];
    const prevD = kValues.slice(-dPeriod - 1, -1).reduce((a, b) => a + b, 0) / dPeriod;

    let signal = 'neutral';
    let crossover = null;
    
    // Overbought/Oversold with crossover confirmation
    if (k < 20 && d < 20) {
      signal = 'bullish';
      if (prevK < prevD && k > d) {
        crossover = 'Bullish Stochastic Crossover in Oversold';
      }
    } else if (k > 80 && d > 80) {
      signal = 'bearish';
      if (prevK > prevD && k < d) {
        crossover = 'Bearish Stochastic Crossover in Overbought';
      }
    } else if (prevK < prevD && k > d) {
      signal = 'bullish';
      crossover = 'Bullish Stochastic Crossover';
    } else if (prevK > prevD && k < d) {
      signal = 'bearish';
      crossover = 'Bearish Stochastic Crossover';
    }

    return {
      k: Math.round(k * 100) / 100,
      d: Math.round(d * 100) / 100,
      signal,
      crossover,
      zone: k > 80 ? 'overbought' : k < 20 ? 'oversold' : 'neutral'
    };
  }

  /**
   * Calculate Williams %R
   * Similar to Stochastic but inverted scale (-100 to 0)
   */
  calculateWilliamsR(highs, lows, closes, period = 14) {
    if (closes.length < period) {
      return { value: -50, signal: 'neutral' };
    }

    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    const currentClose = closes[closes.length - 1];
    
    // %R = (Highest High - Close) / (Highest High - Lowest Low) * -100
    const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    
    let signal = 'neutral';
    if (williamsR > -20) signal = 'bearish'; // Overbought
    else if (williamsR < -80) signal = 'bullish'; // Oversold

    return {
      value: Math.round(williamsR * 100) / 100,
      signal,
      zone: williamsR > -20 ? 'overbought' : williamsR < -80 ? 'oversold' : 'neutral'
    };
  }

  /**
   * Calculate ADX (Average Directional Index)
   * Measures trend strength (not direction)
   */
  calculateADX(highs, lows, closes, period = 14) {
    if (closes.length < period * 2) {
      return { adx: 0, pdi: 0, mdi: 0, trendStrength: 'weak' };
    }

    const plusDM = [];
    const minusDM = [];
    const tr = [];

    for (let i = 1; i < closes.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
      
      const trueRange = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      tr.push(trueRange);
    }

    // Calculate smoothed values
    const smoothedPlusDM = this.smoothedSum(plusDM, period);
    const smoothedMinusDM = this.smoothedSum(minusDM, period);
    const smoothedTR = this.smoothedSum(tr, period);

    const pdi = (smoothedPlusDM / smoothedTR) * 100;
    const mdi = (smoothedMinusDM / smoothedTR) * 100;
    
    const dx = Math.abs(pdi - mdi) / (pdi + mdi) * 100;
    const adx = dx; // Simplified - should be smoothed ADX

    let trendStrength = 'weak';
    if (adx > 50) trendStrength = 'very_strong';
    else if (adx > 25) trendStrength = 'strong';
    else if (adx > 20) trendStrength = 'moderate';

    let trendDirection = 'sideways';
    if (pdi > mdi && adx > 20) trendDirection = 'bullish';
    else if (mdi > pdi && adx > 20) trendDirection = 'bearish';

    return {
      adx: Math.round(adx * 100) / 100,
      pdi: Math.round(pdi * 100) / 100,
      mdi: Math.round(mdi * 100) / 100,
      trendStrength,
      trendDirection
    };
  }

  /**
   * Calculate Volume Weighted Average Price (VWAP)
   * Institutional trading benchmark
   */
  calculateVWAP(highs, lows, closes, volumes) {
    if (closes.length < 1) return { vwap: 0, signal: 'neutral' };

    let cumulativeTPV = 0; // Cumulative (Typical Price * Volume)
    let cumulativeVolume = 0;

    for (let i = 0; i < closes.length; i++) {
      const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
      cumulativeTPV += typicalPrice * volumes[i];
      cumulativeVolume += volumes[i];
    }

    const vwap = cumulativeTPV / cumulativeVolume;
    const currentPrice = closes[closes.length - 1];
    
    let signal = 'neutral';
    const deviation = ((currentPrice - vwap) / vwap) * 100;
    
    if (deviation > 2) signal = 'overbought';
    else if (deviation < -2) signal = 'oversold';
    else if (currentPrice > vwap) signal = 'bullish';
    else signal = 'bearish';

    return {
      vwap: Math.round(vwap * 100) / 100,
      deviation: Math.round(deviation * 100) / 100,
      signal,
      description: currentPrice > vwap 
        ? 'Price above VWAP - buyers in control' 
        : 'Price below VWAP - sellers in control'
    };
  }

  /**
   * Detect Divergences (RSI, MACD)
   * Key reversal signal when price and indicator diverge
   */
  detectDivergence(closes, indicatorValues, lookback = 10) {
    if (closes.length < lookback || indicatorValues.length < lookback) {
      return { divergence: null };
    }

    const recentCloses = closes.slice(-lookback);
    const recentIndicator = indicatorValues.slice(-lookback);

    // Find local highs and lows in price
    const priceHighIdx = recentCloses.indexOf(Math.max(...recentCloses));
    const priceLowIdx = recentCloses.indexOf(Math.min(...recentCloses));
    
    const indicatorHighIdx = recentIndicator.indexOf(Math.max(...recentIndicator));
    const indicatorLowIdx = recentIndicator.indexOf(Math.min(...recentIndicator));

    // Bullish Divergence: Price making lower lows, Indicator making higher lows
    if (priceLowIdx > lookback / 2 && indicatorLowIdx < lookback / 2) {
      const priceTrend = recentCloses[recentCloses.length - 1] < recentCloses[0];
      const indicatorTrend = recentIndicator[recentIndicator.length - 1] > recentIndicator[0];
      
      if (priceTrend && indicatorTrend) {
        return {
          divergence: 'bullish',
          description: 'Bullish divergence - potential reversal up',
          confidence: 75
        };
      }
    }

    // Bearish Divergence: Price making higher highs, Indicator making lower highs
    if (priceHighIdx > lookback / 2 && indicatorHighIdx < lookback / 2) {
      const priceTrend = recentCloses[recentCloses.length - 1] > recentCloses[0];
      const indicatorTrend = recentIndicator[recentIndicator.length - 1] < recentIndicator[0];
      
      if (priceTrend && indicatorTrend) {
        return {
          divergence: 'bearish',
          description: 'Bearish divergence - potential reversal down',
          confidence: 75
        };
      }
    }

    return { divergence: null };
  }

  /**
   * Calculate Fibonacci Retracement Levels
   * Key support/resistance levels
   */
  calculateFibonacciLevels(high, low) {
    const diff = high - low;
    
    return {
      level0: high,
      level236: high - (diff * 0.236),
      level382: high - (diff * 0.382),
      level50: high - (diff * 0.5),
      level618: high - (diff * 0.618),
      level786: high - (diff * 0.786),
      level100: low,
      // Extension levels
      extension1272: high + (diff * 0.272),
      extension1618: high + (diff * 0.618)
    };
  }

  /**
   * Calculate Pivot Points (for intraday support/resistance)
   */
  calculatePivotPoints(high, low, close) {
    const pivot = (high + low + close) / 3;
    
    return {
      pivot: Math.round(pivot * 100) / 100,
      r1: Math.round((2 * pivot - low) * 100) / 100,
      r2: Math.round((pivot + (high - low)) * 100) / 100,
      r3: Math.round((high + 2 * (pivot - low)) * 100) / 100,
      s1: Math.round((2 * pivot - high) * 100) / 100,
      s2: Math.round((pivot - (high - low)) * 100) / 100,
      s3: Math.round((low - 2 * (high - pivot)) * 100) / 100
    };
  }

  // =====================
  // HELPER FUNCTIONS
  // =====================

  calculateSMA(data, period) {
    if (data.length < period) return data[data.length - 1] || 0;
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  calculateEMA(data, period) {
    if (data.length < period) return data[data.length - 1] || 0;
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(data.slice(0, period), period);
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  calculateEMAAtIndex(data, period, index) {
    if (index < period - 1) return data[index];
    
    const slice = data.slice(0, index + 1);
    return this.calculateEMA(slice, period);
  }

  smoothedSum(data, period) {
    if (data.length < period) return 0;
    return data.slice(-period).reduce((a, b) => a + b, 0);
  }

  calculateAverageWidth(closes, period, stdDev) {
    const widths = [];
    for (let i = period; i < closes.length; i++) {
      const slice = closes.slice(i - period, i);
      const sma = slice.reduce((a, b) => a + b, 0) / period;
      const squaredDiffs = slice.map(val => Math.pow(val - sma, 2));
      const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      const sd = Math.sqrt(avgSquaredDiff);
      widths.push((2 * stdDev * sd) / sma);
    }
    return widths.reduce((a, b) => a + b, 0) / widths.length;
  }

  /**
   * Get Complete Technical Analysis
   */
  getCompleteAnalysis(historicalData) {
    const closes = historicalData.map(d => d.close).filter(c => c != null);
    const highs = historicalData.map(d => d.high).filter(h => h != null);
    const lows = historicalData.map(d => d.low).filter(l => l != null);
    const volumes = historicalData.map(d => d.volume).filter(v => v != null);

    if (closes.length < 30) {
      return { error: 'Insufficient data for complete analysis' };
    }

    const macd = this.calculateMACD(closes);
    const bollinger = this.calculateBollingerBands(closes);
    const atr = this.calculateATR(highs, lows, closes);
    const stochastic = this.calculateStochastic(highs, lows, closes);
    const williamsR = this.calculateWilliamsR(highs, lows, closes);
    const adx = this.calculateADX(highs, lows, closes);
    const vwap = this.calculateVWAP(highs, lows, closes, volumes);

    // Recent high/low for Fibonacci
    const recentHigh = Math.max(...highs.slice(-20));
    const recentLow = Math.min(...lows.slice(-20));
    const fibonacci = this.calculateFibonacciLevels(recentHigh, recentLow);

    // Yesterday's data for pivot points
    const yHigh = highs[highs.length - 2] || highs[highs.length - 1];
    const yLow = lows[lows.length - 2] || lows[lows.length - 1];
    const yClose = closes[closes.length - 2] || closes[closes.length - 1];
    const pivots = this.calculatePivotPoints(yHigh, yLow, yClose);

    return {
      macd,
      bollinger,
      atr,
      stochastic,
      williamsR,
      adx,
      vwap,
      fibonacci,
      pivots,
      currentPrice: closes[closes.length - 1]
    };
  }
}

module.exports = new AdvancedTechnicalService();
