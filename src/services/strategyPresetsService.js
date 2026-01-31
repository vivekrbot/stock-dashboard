class StrategyPresetsService {
  constructor() {
    this.strategies = {
      'short-term': {
        name: 'Short-Term Trading',
        description: 'Day/swing trading with heavy technical focus',
        timeframe: '1-7 days',
        weights: {
          technical: 0.80,
          fundamental: 0.20
        },
        rsi: {
          largeCap: { min: 25, max: 75, requireMomentum: true },
          midCap: { min: 25, max: 70, requireMomentum: true },
          smallCap: { min: 20, max: 70, requireMomentum: true }
        },
        technicalScores: {
          largeCap: { min: 60, max: 100 },
          midCap: { min: 65, max: 100 },
          smallCap: { min: 70, max: 100 }
        },
        fundamentalScores: {
          largeCap: { min: 40, max: 100 },
          midCap: { min: 35, max: 100 },
          smallCap: { min: 30, max: 100 }
        },
        minConfidence: 65,
        requirePatterns: true,
        preferredPatterns: ['BREAKOUT', 'VOLUME_SPIKE', 'UPTREND']
      },

      'balanced': {
        name: 'Balanced Trading',
        description: 'Medium-term swing trading, balanced approach',
        timeframe: '1-4 weeks',
        weights: {
          technical: 0.60,
          fundamental: 0.40
        },
        rsi: {
          largeCap: { min: 30, max: 70, requireMomentum: false },
          midCap: { min: 35, max: 65, requireMomentum: true },
          smallCap: { min: 30, max: 60, requireMomentum: true }
        },
        technicalScores: {
          largeCap: { min: 50, max: 100 },
          midCap: { min: 55, max: 100 },
          smallCap: { min: 60, max: 100 }
        },
        fundamentalScores: {
          largeCap: { min: 50, max: 100 },
          midCap: { min: 45, max: 100 },
          smallCap: { min: 40, max: 100 }
        },
        minConfidence: 60,
        requirePatterns: false,
        preferredPatterns: ['BREAKOUT', 'SUPPORT_TEST', 'CONSOLIDATION']
      },

      'long-term': {
        name: 'Long-Term Investing',
        description: 'Position trading with fundamental focus',
        timeframe: '3-12 months',
        weights: {
          technical: 0.40,
          fundamental: 0.60
        },
        rsi: {
          largeCap: { min: 20, max: 80, requireMomentum: false },
          midCap: { min: 25, max: 75, requireMomentum: false },
          smallCap: { min: 25, max: 70, requireMomentum: false }
        },
        technicalScores: {
          largeCap: { min: 45, max: 100 },
          midCap: { min: 50, max: 100 },
          smallCap: { min: 55, max: 100 }
        },
        fundamentalScores: {
          largeCap: { min: 60, max: 100 },
          midCap: { min: 55, max: 100 },
          smallCap: { min: 50, max: 100 }
        },
        minConfidence: 55,
        requirePatterns: false,
        preferredPatterns: ['SUPPORT_TEST', 'CONSOLIDATION']
      }
    };
  }

  getStrategy(strategyName) {
    return this.strategies[strategyName] || this.strategies['balanced'];
  }

  getAllStrategies() {
    return Object.keys(this.strategies).map(key => ({
      id: key,
      name: this.strategies[key].name,
      description: this.strategies[key].description,
      timeframe: this.strategies[key].timeframe
    }));
  }

  applyStrategyToFilters(strategyName, baseFilters = {}) {
    const strategy = this.getStrategy(strategyName);
    
    return {
      ...baseFilters,
      strategy: strategyName,
      minConfidence: strategy.minConfidence,
      requirePatterns: strategy.requirePatterns,
      weights: strategy.weights,
      rsiThresholds: strategy.rsi,
      technicalScores: strategy.technicalScores,
      fundamentalScores: strategy.fundamentalScores,
      preferredPatterns: strategy.preferredPatterns
    };
  }
}

module.exports = new StrategyPresetsService();