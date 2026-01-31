class ScoringService {
  constructor() {
    // Scoring weights (you can adjust these based on your strategy)
    this.weights = {
      technical: 0.6,    // 60% weight on technical analysis
      fundamental: 0.4   // 40% weight on fundamentals
    };
  }

  // Main method: Get complete analysis with confidence score
 async analyzeStock(stockData, technicals, fundamentals, weights = null) {
  // Use custom weights or default
  const techWeight = weights?.technical || 0.6;
  const fundWeight = weights?.fundamental || 0.4;

  const technicalAnalysis = this.calculateTechnicalScore(stockData, technicals);
  const fundamentalAnalysis = this.calculateFundamentalScore(fundamentals);

  const technicalScore = technicalAnalysis.score;
  const fundamentalScore = fundamentalAnalysis.score;

  // Apply dynamic weights
  const confidenceScore = Math.round(
    (technicalScore * techWeight) + (fundamentalScore * fundWeight)
  );

  const rating = this.getRating(confidenceScore);
  const signal = this.generateSignal(confidenceScore, technicalScore, fundamentalScore, technicals);
  const recommendation = this.getRecommendation(confidenceScore, signal);

  return {
    confidenceScore,
    rating,
    signal,
    recommendation,
    technical: technicalAnalysis,
    fundamental: fundamentalAnalysis,
    weights: { technical: techWeight, fundamental: fundWeight }, // Show applied weights
    timestamp: new Date().toISOString()
  };
}

  // Technical Analysis Score (0-100)
  calculateTechnicalScore(stockData, technicals) {
    let score = 50; // Start neutral
    const signals = [];
    const { price, previousClose, high, low, volume } = stockData;
    const { rsi, sma20, sma50, ema20, currentPrice } = technicals;

    // 1. RSI Analysis (30 points)
    if (rsi !== null) {
      if (rsi < 30) {
        score += 15;
        signals.push({ indicator: 'RSI', signal: 'OVERSOLD', impact: '+15', value: rsi });
      } else if (rsi > 70) {
        score -= 15;
        signals.push({ indicator: 'RSI', signal: 'OVERBOUGHT', impact: '-15', value: rsi });
      } else if (rsi >= 40 && rsi <= 60) {
        score += 5;
        signals.push({ indicator: 'RSI', signal: 'NEUTRAL', impact: '+5', value: rsi });
      }
    }

    // 2. Moving Average Trend (30 points)
    if (sma20 && sma50) {
      // Golden Cross (bullish)
      if (sma20 > sma50 && currentPrice > sma20) {
        score += 20;
        signals.push({ indicator: 'MA Trend', signal: 'GOLDEN CROSS', impact: '+20', detail: 'Price > SMA20 > SMA50' });
      }
      // Death Cross (bearish)
      else if (sma20 < sma50 && currentPrice < sma20) {
        score -= 20;
        signals.push({ indicator: 'MA Trend', signal: 'DEATH CROSS', impact: '-20', detail: 'Price < SMA20 < SMA50' });
      }
      // Price above SMA20 (bullish)
      else if (currentPrice > sma20) {
        score += 10;
        signals.push({ indicator: 'MA Trend', signal: 'BULLISH', impact: '+10', detail: 'Price above SMA20' });
      }
      // Price below SMA20 (bearish)
      else {
        score -= 10;
        signals.push({ indicator: 'MA Trend', signal: 'BEARISH', impact: '-10', detail: 'Price below SMA20' });
      }
    }

    // 3. Price Momentum (20 points)
    const priceChange = ((price - previousClose) / previousClose) * 100;
    if (priceChange > 2) {
      score += 15;
      signals.push({ indicator: 'Momentum', signal: 'STRONG BULLISH', impact: '+15', value: `${priceChange.toFixed(2)}%` });
    } else if (priceChange > 0) {
      score += 5;
      signals.push({ indicator: 'Momentum', signal: 'BULLISH', impact: '+5', value: `${priceChange.toFixed(2)}%` });
    } else if (priceChange < -2) {
      score -= 15;
      signals.push({ indicator: 'Momentum', signal: 'STRONG BEARISH', impact: '-15', value: `${priceChange.toFixed(2)}%` });
    } else {
      score -= 5;
      signals.push({ indicator: 'Momentum', signal: 'BEARISH', impact: '-5', value: `${priceChange.toFixed(2)}%` });
    }

    // 4. Price Position in Day Range (10 points)
    const rangePosition = ((price - low) / (high - low)) * 100;
    if (rangePosition > 70) {
      score += 5;
      signals.push({ indicator: 'Price Position', signal: 'NEAR HIGH', impact: '+5', value: `${rangePosition.toFixed(0)}% of range` });
    } else if (rangePosition < 30) {
      score -= 5;
      signals.push({ indicator: 'Price Position', signal: 'NEAR LOW', impact: '-5', value: `${rangePosition.toFixed(0)}% of range` });
    }

    // 5. Volume Analysis (10 points)
    // For demo, we'll use simple volume check
    if (volume > 100000) {
      score += 5;
      signals.push({ indicator: 'Volume', signal: 'HIGH LIQUIDITY', impact: '+5', value: volume });
    }

    // Cap score between 0-100
    score = Math.max(0, Math.min(100, score));

    return {
      score: score,
      signals: signals,
      indicators: {
        rsi: rsi,
        sma20: sma20,
        sma50: sma50,
        ema20: ema20,
        momentum: priceChange.toFixed(2) + '%',
        rangePosition: rangePosition.toFixed(0) + '%'
      }
    };
  }

  // Fundamental Analysis Score (0-100)
  calculateFundamentalScore(fundamentals) {
    let score = 50; // Start neutral
    const signals = [];
    
    const { peRatio, marketCap, priceToBook, sector } = fundamentals;

    // 1. P/E Ratio Analysis (40 points)
    if (peRatio) {
      if (peRatio > 0 && peRatio < 15) {
        score += 20;
        signals.push({ metric: 'P/E Ratio', signal: 'UNDERVALUED', impact: '+20', value: peRatio });
      } else if (peRatio >= 15 && peRatio <= 25) {
        score += 10;
        signals.push({ metric: 'P/E Ratio', signal: 'FAIR VALUE', impact: '+10', value: peRatio });
      } else if (peRatio > 25 && peRatio < 40) {
        score -= 5;
        signals.push({ metric: 'P/E Ratio', signal: 'SLIGHTLY OVERVALUED', impact: '-5', value: peRatio });
      } else if (peRatio >= 40) {
        score -= 20;
        signals.push({ metric: 'P/E Ratio', signal: 'OVERVALUED', impact: '-20', value: peRatio });
      }
    }

    // 2. Market Cap Size (30 points)
    if (marketCap) {
      const capInCrores = marketCap / 10000000;
      if (capInCrores > 100000) { // Large cap (>1 lakh crores)
        score += 15;
        signals.push({ metric: 'Market Cap', signal: 'LARGE CAP (LOW RISK)', impact: '+15', value: `₹${(capInCrores/100000).toFixed(2)}L Cr` });
      } else if (capInCrores > 30000) { // Mid cap
        score += 10;
        signals.push({ metric: 'Market Cap', signal: 'MID CAP (MODERATE RISK)', impact: '+10', value: `₹${(capInCrores/1000).toFixed(2)}K Cr` });
      } else { // Small cap
        score += 5;
        signals.push({ metric: 'Market Cap', signal: 'SMALL CAP (HIGH RISK)', impact: '+5', value: `₹${capInCrores.toFixed(2)} Cr` });
      }
    }

    // 3. Price to Book (30 points)
    if (priceToBook) {
      if (priceToBook < 1) {
        score += 15;
        signals.push({ metric: 'P/B Ratio', signal: 'UNDERVALUED', impact: '+15', value: priceToBook });
      } else if (priceToBook >= 1 && priceToBook <= 3) {
        score += 5;
        signals.push({ metric: 'P/B Ratio', signal: 'FAIR VALUE', impact: '+5', value: priceToBook });
      } else {
        score -= 10;
        signals.push({ metric: 'P/B Ratio', signal: 'OVERVALUED', impact: '-10', value: priceToBook });
      }
    }

    // Cap score between 0-100
    score = Math.max(0, Math.min(100, score));

    return {
      score: score,
      signals: signals,
      metrics: {
        peRatio: peRatio || 'N/A',
        marketCap: marketCap || 'N/A',
        priceToBook: priceToBook || 'N/A',
        sector: sector || 'N/A'
      }
    };
  }

  // Generate BUY/SELL/HOLD signal
  generateSignal(confidenceScore, technicalScore, fundamentalScore) {
    const entryPrice = null;
    const exitPrice = null;
    const stopLoss = null;

    if (confidenceScore >= 70) {
      return {
        action: 'BUY',
        strength: 'STRONG',
        reasoning: 'High confidence score with positive technical and fundamental indicators',
        entryZone: 'Current price levels',
        targetGain: '10-15%',
        riskLevel: 'MODERATE'
      };
    } else if (confidenceScore >= 55) {
      return {
        action: 'BUY',
        strength: 'MODERATE',
        reasoning: 'Decent confidence score, favorable indicators',
        entryZone: 'Wait for pullback or breakout confirmation',
        targetGain: '5-10%',
        riskLevel: 'MODERATE'
      };
    } else if (confidenceScore >= 40) {
      return {
        action: 'HOLD',
        strength: 'NEUTRAL',
        reasoning: 'Mixed signals, no clear directional bias',
        entryZone: 'Wait for clearer signals',
        targetGain: 'N/A',
        riskLevel: 'HIGH'
      };
    } else if (confidenceScore >= 25) {
      return {
        action: 'SELL',
        strength: 'MODERATE',
        reasoning: 'Weak indicators, bearish signals present',
        entryZone: 'Exit on bounce',
        targetGain: 'N/A',
        riskLevel: 'HIGH'
      };
    } else {
      return {
        action: 'SELL',
        strength: 'STRONG',
        reasoning: 'Very weak indicators, high risk of further decline',
        entryZone: 'Exit immediately',
        targetGain: 'N/A',
        riskLevel: 'VERY HIGH'
      };
    }
  }

  // Get rating label
  getRating(score) {
    if (score >= 80) return 'EXCELLENT';
    if (score >= 70) return 'VERY GOOD';
    if (score >= 60) return 'GOOD';
    if (score >= 50) return 'FAIR';
    if (score >= 40) return 'BELOW AVERAGE';
    if (score >= 30) return 'POOR';
    return 'VERY POOR';
  }

  // Get actionable recommendation
  getRecommendation(score, signal) {
    if (signal.action === 'BUY') {
      return `${signal.strength} BUY opportunity. ${signal.reasoning}. Consider entry at ${signal.entryZone} with target of ${signal.targetGain}.`;
    } else if (signal.action === 'SELL') {
      return `${signal.strength} SELL signal. ${signal.reasoning}. ${signal.entryZone}.`;
    } else {
      return `${signal.strength} position. ${signal.reasoning}. ${signal.entryZone}.`;
    }
  }
}

module.exports = new ScoringService();