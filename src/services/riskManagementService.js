/**
 * Risk Management Service
 * Professional position sizing, risk calculation, and portfolio management
 */

class RiskManagementService {
  constructor() {
    // Default risk parameters (can be customized per user)
    this.defaultConfig = {
      maxRiskPerTrade: 2,         // Max 2% of capital per trade
      maxDailyLoss: 5,            // Stop trading after 5% daily loss
      maxOpenPositions: 5,        // Max concurrent positions
      maxSectorExposure: 30,      // Max 30% in single sector
      riskRewardMinimum: 1.5,     // Minimum 1:1.5 risk:reward
      maxDrawdown: 10,            // Maximum portfolio drawdown %
      correlationThreshold: 0.7   // Max correlation between positions
    };
  }

  /**
   * Calculate optimal position size based on risk
   * Uses fixed fractional position sizing method
   */
  calculatePositionSize(config) {
    const {
      capital,
      entryPrice,
      stopLoss,
      riskPercent = this.defaultConfig.maxRiskPerTrade
    } = config;

    if (!capital || !entryPrice || !stopLoss) {
      return { error: 'Missing required parameters' };
    }

    // Calculate risk per share
    const riskPerShare = Math.abs(entryPrice - stopLoss);
    
    // Calculate maximum risk amount
    const maxRiskAmount = (capital * riskPercent) / 100;
    
    // Calculate position size (number of shares)
    const shares = Math.floor(maxRiskAmount / riskPerShare);
    
    // Calculate position value
    const positionValue = shares * entryPrice;
    const positionPercent = (positionValue / capital) * 100;

    return {
      shares,
      positionValue: Math.round(positionValue),
      positionPercent: Math.round(positionPercent * 100) / 100,
      riskAmount: Math.round(shares * riskPerShare),
      riskPercent,
      riskPerShare: Math.round(riskPerShare * 100) / 100,
      leverage: 1, // For futures/options, this would be different
      recommendation: this.getPositionRecommendation(positionPercent)
    };
  }

  /**
   * Calculate comprehensive trade risk metrics
   * Supports both BUY (entry < stopLoss makes no sense, entry > stopLoss) 
   * and SELL signals (entry < stopLoss)
   */
  calculateTradeRisk(trade) {
    // Support both naming conventions from frontend
    const entryPrice = trade.entryPrice || trade.entry;
    const targetPrice = trade.targetPrice || trade.target;
    const stopLoss = trade.stopLoss;
    const currentPrice = trade.currentPrice || entryPrice;
    const capital = trade.capital;
    const riskPercent = trade.riskPercent || this.defaultConfig.maxRiskPerTrade;
    
    // Validate inputs
    if (!entryPrice || !stopLoss || !targetPrice || !capital) {
      return {
        error: 'Missing required parameters',
        potentialProfit: null,
        potentialLoss: null,
        profitPercent: null,
        lossPercent: null,
        riskRewardRatio: 0,
        capitalAtRisk: null,
        currentPnL: null,
        currentPnLPercent: null,
        distanceToStop: null,
        distanceToTarget: null,
        riskScore: 50,
        riskLevel: 'moderate',
        recommendation: 'Please fill in all trade parameters'
      };
    }

    // Determine trade direction: SELL if stopLoss > entry, BUY otherwise
    const isSellTrade = stopLoss > entryPrice;
    
    // Calculate risk per share (always positive)
    const riskPerShare = Math.abs(entryPrice - stopLoss);
    
    // Calculate maximum risk amount based on capital and risk percent
    const maxRiskAmount = (capital * riskPercent) / 100;
    
    // Calculate optimal position size (shares)
    let shares = trade.shares;
    if (!shares || shares <= 0) {
      shares = Math.floor(maxRiskAmount / riskPerShare);
    }
    
    // Ensure we have at least 1 share
    if (shares < 1) shares = 1;
    
    // Calculate position value
    const positionValue = shares * entryPrice;
    
    // For SELL trades: profit when price goes DOWN, loss when price goes UP
    // For BUY trades: profit when price goes UP, loss when price goes DOWN
    const potentialProfit = Math.abs(targetPrice - entryPrice) * shares;
    const potentialLoss = riskPerShare * shares;
    const riskRewardRatio = potentialLoss > 0 ? potentialProfit / potentialLoss : 0;

    // Percentage calculations (accounting for trade direction)
    let profitPercent, lossPercent;
    if (isSellTrade) {
      // SELL: profit when target < entry, loss when stopLoss > entry
      profitPercent = ((entryPrice - targetPrice) / entryPrice) * 100;
      lossPercent = ((stopLoss - entryPrice) / entryPrice) * 100;
    } else {
      // BUY: profit when target > entry, loss when entry > stopLoss
      profitPercent = ((targetPrice - entryPrice) / entryPrice) * 100;
      lossPercent = ((entryPrice - stopLoss) / entryPrice) * 100;
    }
    
    const capitalAtRisk = (potentialLoss / capital) * 100;

    // Current P&L if in trade
    let currentPnL, currentPnLPercent;
    if (isSellTrade) {
      currentPnL = (entryPrice - currentPrice) * shares;
    } else {
      currentPnL = (currentPrice - entryPrice) * shares;
    }
    currentPnLPercent = (currentPnL / positionValue) * 100;

    // Distance to stop/target (always show as positive percentages)
    let distanceToStop, distanceToTarget;
    if (isSellTrade) {
      distanceToStop = ((stopLoss - currentPrice) / currentPrice) * 100;
      distanceToTarget = ((currentPrice - targetPrice) / currentPrice) * 100;
    } else {
      distanceToStop = ((currentPrice - stopLoss) / currentPrice) * 100;
      distanceToTarget = ((targetPrice - currentPrice) / currentPrice) * 100;
    }

    // Risk score (0-100, higher = riskier)
    const riskScore = this.calculateRiskScore({
      capitalAtRisk,
      riskRewardRatio,
      lossPercent: Math.abs(lossPercent),
      distanceToStop: Math.abs(distanceToStop)
    });

    return {
      // Position sizing
      shares,
      positionValue: Math.round(positionValue),
      tradeDirection: isSellTrade ? 'SELL' : 'BUY',
      
      // Risk/Reward
      potentialProfit: Math.round(potentialProfit),
      potentialLoss: Math.round(potentialLoss),
      profitPercent: Math.round(Math.abs(profitPercent) * 100) / 100,
      lossPercent: Math.round(Math.abs(lossPercent) * 100) / 100,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
      capitalAtRisk: Math.round(capitalAtRisk * 100) / 100,
      
      // Current status
      currentPnL: Math.round(currentPnL),
      currentPnLPercent: Math.round(currentPnLPercent * 100) / 100,
      distanceToStop: Math.round(Math.abs(distanceToStop) * 100) / 100,
      distanceToTarget: Math.round(Math.abs(distanceToTarget) * 100) / 100,
      
      // Risk assessment
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      recommendation: this.getTradeRiskRecommendation(riskScore, riskRewardRatio)
    };
  }

  /**
   * Calculate ATR-based stop loss levels
   * More dynamic and adapts to volatility
   */
  calculateATRStops(currentPrice, atr, direction = 'long') {
    // Tight stop (aggressive) = 1.5x ATR
    // Normal stop = 2x ATR
    // Wide stop (conservative) = 3x ATR

    if (direction === 'long') {
      return {
        tight: Math.round((currentPrice - (1.5 * atr)) * 100) / 100,
        normal: Math.round((currentPrice - (2 * atr)) * 100) / 100,
        wide: Math.round((currentPrice - (3 * atr)) * 100) / 100,
        target1: Math.round((currentPrice + (2 * atr)) * 100) / 100,
        target2: Math.round((currentPrice + (3 * atr)) * 100) / 100,
        target3: Math.round((currentPrice + (4 * atr)) * 100) / 100
      };
    } else {
      return {
        tight: Math.round((currentPrice + (1.5 * atr)) * 100) / 100,
        normal: Math.round((currentPrice + (2 * atr)) * 100) / 100,
        wide: Math.round((currentPrice + (3 * atr)) * 100) / 100,
        target1: Math.round((currentPrice - (2 * atr)) * 100) / 100,
        target2: Math.round((currentPrice - (3 * atr)) * 100) / 100,
        target3: Math.round((currentPrice - (4 * atr)) * 100) / 100
      };
    }
  }

  /**
   * Calculate trailing stop adjustment
   */
  calculateTrailingStop(trade, currentPrice) {
    const { entryPrice, direction, atr } = trade;
    let trailingStop = trade.trailingStop || trade.stopLoss;

    // Only adjust trailing stop in profit direction
    if (direction === 'long') {
      // Move stop up if price has moved up by ATR
      const newStop = currentPrice - (2 * atr);
      if (newStop > trailingStop) {
        trailingStop = newStop;
      }
    } else {
      // Move stop down if price has moved down by ATR
      const newStop = currentPrice + (2 * atr);
      if (newStop < trailingStop) {
        trailingStop = newStop;
      }
    }

    const profitLocked = direction === 'long' 
      ? trailingStop - entryPrice 
      : entryPrice - trailingStop;

    return {
      trailingStop: Math.round(trailingStop * 100) / 100,
      profitLocked: Math.round(profitLocked * 100) / 100,
      profitLockedPercent: Math.round((profitLocked / entryPrice) * 10000) / 100
    };
  }

  /**
   * Portfolio risk assessment
   */
  assessPortfolioRisk(positions, capital) {
    if (!positions || positions.length === 0) {
      return { totalRisk: 0, assessment: 'No open positions' };
    }

    let totalExposure = 0;
    let totalRiskAmount = 0;
    const sectorExposure = {};
    const correlatedPairs = [];

    positions.forEach(pos => {
      // Calculate position exposure
      const posValue = pos.shares * pos.currentPrice;
      totalExposure += posValue;

      // Calculate risk for position
      const posRisk = Math.abs(pos.currentPrice - pos.stopLoss) * pos.shares;
      totalRiskAmount += posRisk;

      // Track sector exposure
      const sector = pos.sector || 'Unknown';
      sectorExposure[sector] = (sectorExposure[sector] || 0) + posValue;
    });

    // Calculate percentages
    const exposurePercent = (totalExposure / capital) * 100;
    const riskPercent = (totalRiskAmount / capital) * 100;

    // Check sector concentration
    const sectorWarnings = [];
    for (const [sector, value] of Object.entries(sectorExposure)) {
      const sectorPercent = (value / capital) * 100;
      if (sectorPercent > this.defaultConfig.maxSectorExposure) {
        sectorWarnings.push({
          sector,
          exposure: Math.round(sectorPercent),
          warning: `Exceeds ${this.defaultConfig.maxSectorExposure}% limit`
        });
      }
    }

    // Overall assessment
    let riskLevel = 'low';
    const warnings = [...sectorWarnings];

    if (riskPercent > 10) {
      riskLevel = 'critical';
      warnings.push({ warning: `Total risk ${riskPercent.toFixed(1)}% exceeds safe limits` });
    } else if (riskPercent > 6) {
      riskLevel = 'high';
      warnings.push({ warning: `Total risk ${riskPercent.toFixed(1)}% is elevated` });
    } else if (riskPercent > 4) {
      riskLevel = 'moderate';
    }

    if (positions.length > this.defaultConfig.maxOpenPositions) {
      warnings.push({ warning: `${positions.length} positions exceeds recommended ${this.defaultConfig.maxOpenPositions}` });
    }

    return {
      totalPositions: positions.length,
      totalExposure: Math.round(totalExposure),
      exposurePercent: Math.round(exposurePercent * 100) / 100,
      totalRiskAmount: Math.round(totalRiskAmount),
      riskPercent: Math.round(riskPercent * 100) / 100,
      sectorExposure: Object.entries(sectorExposure).map(([sector, value]) => ({
        sector,
        value: Math.round(value),
        percent: Math.round((value / capital) * 10000) / 100
      })),
      riskLevel,
      warnings,
      recommendation: this.getPortfolioRecommendation(riskLevel, warnings)
    };
  }

  /**
   * Daily risk check - call before trading
   */
  dailyRiskCheck(dailyPnL, capital, config = {}) {
    const maxDailyLoss = config.maxDailyLoss || this.defaultConfig.maxDailyLoss;
    const dailyLossPercent = (Math.abs(dailyPnL) / capital) * 100;

    const checks = {
      passed: true,
      dailyPnL,
      dailyPnLPercent: Math.round(dailyLossPercent * 100) / 100,
      maxAllowed: maxDailyLoss,
      warnings: [],
      canTrade: true
    };

    if (dailyPnL < 0) {
      if (dailyLossPercent >= maxDailyLoss) {
        checks.passed = false;
        checks.canTrade = false;
        checks.warnings.push({
          type: 'STOP_TRADING',
          message: `Daily loss limit reached (${dailyLossPercent.toFixed(1)}%). Stop trading for today.`
        });
      } else if (dailyLossPercent >= maxDailyLoss * 0.75) {
        checks.warnings.push({
          type: 'WARNING',
          message: `Approaching daily loss limit (${dailyLossPercent.toFixed(1)}%). Trade cautiously.`
        });
      } else if (dailyLossPercent >= maxDailyLoss * 0.5) {
        checks.warnings.push({
          type: 'CAUTION',
          message: `50% of daily loss limit used (${dailyLossPercent.toFixed(1)}%).`
        });
      }
    }

    checks.recommendation = checks.canTrade 
      ? this.getTradingRecommendation(dailyLossPercent, maxDailyLoss)
      : 'Stop trading for today. Review your trades and come back tomorrow.';

    return checks;
  }

  /**
   * Pre-trade risk checklist
   */
  preTradeChecklist(trade, portfolio = null) {
    const checklist = [];

    // 1. Risk:Reward check
    const rrRatio = this.calculateRR(trade.entryPrice, trade.targetPrice, trade.stopLoss);
    checklist.push({
      item: 'Risk:Reward Ratio',
      status: rrRatio >= this.defaultConfig.riskRewardMinimum ? 'pass' : 'fail',
      value: `1:${rrRatio}`,
      required: `Minimum 1:${this.defaultConfig.riskRewardMinimum}`
    });

    // 2. Position size check
    if (trade.capital && trade.shares) {
      const positionValue = trade.shares * trade.entryPrice;
      const positionPercent = (positionValue / trade.capital) * 100;
      checklist.push({
        item: 'Position Size',
        status: positionPercent <= 20 ? 'pass' : positionPercent <= 30 ? 'warning' : 'fail',
        value: `${positionPercent.toFixed(1)}% of capital`,
        required: 'Max 20% recommended'
      });
    }

    // 3. Risk per trade check
    if (trade.capital && trade.shares && trade.stopLoss) {
      const riskAmount = Math.abs(trade.entryPrice - trade.stopLoss) * trade.shares;
      const riskPercent = (riskAmount / trade.capital) * 100;
      checklist.push({
        item: 'Risk Per Trade',
        status: riskPercent <= this.defaultConfig.maxRiskPerTrade ? 'pass' : 'fail',
        value: `${riskPercent.toFixed(2)}%`,
        required: `Max ${this.defaultConfig.maxRiskPerTrade}%`
      });
    }

    // 4. Stop loss defined
    checklist.push({
      item: 'Stop Loss Defined',
      status: trade.stopLoss ? 'pass' : 'fail',
      value: trade.stopLoss ? `₹${trade.stopLoss}` : 'Not set',
      required: 'Must have stop loss'
    });

    // 5. Target defined
    checklist.push({
      item: 'Target Defined',
      status: trade.targetPrice ? 'pass' : 'fail',
      value: trade.targetPrice ? `₹${trade.targetPrice}` : 'Not set',
      required: 'Must have target'
    });

    // Calculate overall score
    const passed = checklist.filter(c => c.status === 'pass').length;
    const total = checklist.length;
    const score = Math.round((passed / total) * 100);

    return {
      checklist,
      score,
      passed,
      total,
      approved: passed === total,
      recommendation: passed === total 
        ? '✅ Trade meets all risk criteria. Proceed with discipline.'
        : `⚠️ ${total - passed} items need attention before trading.`
    };
  }

  // =====================
  // HELPER METHODS
  // =====================

  calculateRR(entry, target, stop) {
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    return risk > 0 ? Math.round((reward / risk) * 10) / 10 : 0;
  }

  calculateRiskScore({ capitalAtRisk, riskRewardRatio, lossPercent, distanceToStop }) {
    let score = 0;
    
    // Capital at risk (0-40 points)
    if (capitalAtRisk > 5) score += 40;
    else if (capitalAtRisk > 3) score += 25;
    else if (capitalAtRisk > 2) score += 15;
    else score += 5;

    // Risk:Reward penalty (0-30 points)
    if (riskRewardRatio < 1) score += 30;
    else if (riskRewardRatio < 1.5) score += 20;
    else if (riskRewardRatio < 2) score += 10;

    // Loss percent (0-20 points)
    if (lossPercent > 5) score += 20;
    else if (lossPercent > 3) score += 10;
    else score += 5;

    // Distance to stop (0-10 points)
    if (distanceToStop < 1) score += 10;
    else if (distanceToStop < 2) score += 5;

    return Math.min(100, score);
  }

  getRiskLevel(score) {
    if (score >= 70) return 'high';
    if (score >= 40) return 'moderate';
    return 'low';
  }

  getPositionRecommendation(positionPercent) {
    if (positionPercent > 30) return 'Position too large - reduce size';
    if (positionPercent > 20) return 'Position size is aggressive';
    if (positionPercent < 5) return 'Position may be too small for meaningful impact';
    return 'Position size is appropriate';
  }

  getTradeRiskRecommendation(riskScore, rrRatio) {
    if (riskScore > 70) return 'High risk trade - consider reducing position or passing';
    if (rrRatio < 1.5) return 'Unfavorable risk:reward - look for better setup';
    if (riskScore < 40 && rrRatio >= 2) return 'Good risk profile - trade with confidence';
    return 'Acceptable risk - stick to your plan';
  }

  getPortfolioRecommendation(riskLevel, warnings) {
    if (riskLevel === 'critical') {
      return 'REDUCE EXPOSURE: Close some positions or tighten stops immediately';
    }
    if (riskLevel === 'high') {
      return 'CAUTION: Do not add new positions until risk is reduced';
    }
    if (warnings.length > 0) {
      return 'Address warnings before adding new positions';
    }
    return 'Portfolio risk is acceptable. Continue with discipline.';
  }

  getTradingRecommendation(currentLoss, maxLoss) {
    const remaining = maxLoss - currentLoss;
    if (remaining > maxLoss * 0.75) {
      return 'Full trading capacity available. Trade your plan.';
    }
    if (remaining > maxLoss * 0.5) {
      return 'Trade selectively. Focus on highest conviction setups only.';
    }
    return 'Minimal risk budget remaining. Consider taking a break.';
  }
}

module.exports = new RiskManagementService();
