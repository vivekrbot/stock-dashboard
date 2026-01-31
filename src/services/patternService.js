class PatternService {
  // Detect chart patterns from historical data
  detectPatterns(history, currentPrice) {
    const patterns = [];
    
    if (history.length < 20) return patterns;

    // 1. Breakout Pattern
    const breakout = this.detectBreakout(history, currentPrice);
    if (breakout) patterns.push(breakout);

    // 2. Support/Resistance Test
    const supportResistance = this.detectSupportResistance(history, currentPrice);
    if (supportResistance) patterns.push(supportResistance);

    // 3. Consolidation/Accumulation
    const consolidation = this.detectConsolidation(history);
    if (consolidation) patterns.push(consolidation);

    // 4. Higher Highs/Higher Lows (Uptrend)
    const uptrend = this.detectUptrend(history);
    if (uptrend) patterns.push(uptrend);

    // 5. Volume Breakout
    const volumeBreakout = this.detectVolumeBreakout(history);
    if (volumeBreakout) patterns.push(volumeBreakout);

    return patterns;
  }

  // Detect breakout above resistance
  detectBreakout(history, currentPrice) {
    const last20Days = history.slice(-20);
    const highs = last20Days.map(d => d.high);
    const resistance = Math.max(...highs.slice(0, -1)); // Exclude today

    if (currentPrice > resistance * 1.01) { // 1% above resistance
      return {
        pattern: 'BREAKOUT',
        signal: 'BULLISH',
        strength: 'HIGH',
        description: `Price broke above ${resistance.toFixed(2)} resistance`,
        score: 20
      };
    }

    return null;
  }

  // Detect support/resistance bounce
  detectSupportResistance(history, currentPrice) {
    const last30Days = history.slice(-30);
    const lows = last30Days.map(d => d.low);
    const avgLow = lows.reduce((a, b) => a + b, 0) / lows.length;

    // Price near support (within 2%)
    if (currentPrice <= avgLow * 1.02 && currentPrice >= avgLow * 0.98) {
      return {
        pattern: 'SUPPORT_TEST',
        signal: 'BULLISH',
        strength: 'MEDIUM',
        description: `Testing support at ${avgLow.toFixed(2)}`,
        score: 15
      };
    }

    return null;
  }

  // Detect consolidation (low volatility, tight range)
  detectConsolidation(history) {
    const last15Days = history.slice(-15);
    
    if (last15Days.length < 15) return null;

    const closes = last15Days.map(d => d.close);
    const maxClose = Math.max(...closes);
    const minClose = Math.min(...closes);
    const range = ((maxClose - minClose) / minClose) * 100;

    // Tight range < 5%
    if (range < 5) {
      return {
        pattern: 'CONSOLIDATION',
        signal: 'NEUTRAL',
        strength: 'MEDIUM',
        description: `Tight ${range.toFixed(1)}% range - potential breakout`,
        score: 10
      };
    }

    return null;
  }

  // Detect uptrend (higher highs and higher lows)
  detectUptrend(history) {
    const last10Days = history.slice(-10);
    
    if (last10Days.length < 10) return null;

    let higherHighs = 0;
    let higherLows = 0;

    for (let i = 1; i < last10Days.length; i++) {
      if (last10Days[i].high > last10Days[i - 1].high) higherHighs++;
      if (last10Days[i].low > last10Days[i - 1].low) higherLows++;
    }

    // At least 60% of days show higher highs/lows
    if (higherHighs >= 6 && higherLows >= 6) {
      return {
        pattern: 'UPTREND',
        signal: 'BULLISH',
        strength: 'HIGH',
        description: 'Strong uptrend with higher highs and lows',
        score: 25
      };
    }

    return null;
  }

  // Detect volume breakout (volume > 2x average)
  detectVolumeBreakout(history) {
    const last20Days = history.slice(-20);
    
    if (last20Days.length < 20) return null;

    const volumes = last20Days.map(d => d.volume);
    const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);
    const todayVolume = volumes[volumes.length - 1];

    if (todayVolume > avgVolume * 2) {
      return {
        pattern: 'VOLUME_SPIKE',
        signal: 'BULLISH',
        strength: 'HIGH',
        description: `Volume ${(todayVolume / avgVolume).toFixed(1)}x above average`,
        score: 20
      };
    }

    return null;
  }

  // Calculate total pattern score
  calculatePatternScore(patterns) {
    return patterns.reduce((total, p) => total + (p.score || 0), 0);
  }
}

module.exports = new PatternService();