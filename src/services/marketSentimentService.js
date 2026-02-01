/**
 * Market Sentiment Analysis Service
 * Analyzes market breadth, sector strength, and overall sentiment
 */

const stockService = require('./stockService');

class MarketSentimentService {
  constructor() {
    // Key index stocks for sentiment
    this.indexComponents = {
      nifty50: [
        'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
        'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'ITC',
        'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'SUNPHARMA',
        'TITAN', 'BAJFINANCE', 'NESTLEIND', 'WIPRO', 'ULTRACEMCO'
      ],
      bankNifty: [
        'HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK',
        'INDUSINDBK', 'BANDHANBNK', 'FEDERALBNK', 'IDFCFIRSTB', 'PNB'
      ]
    };

    // Sector mappings
    this.sectors = {
      IT: ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM', 'MPHASIS', 'COFORGE'],
      Banking: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK'],
      Auto: ['MARUTI', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT'],
      Pharma: ['SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'APOLLOHOSP', 'BIOCON'],
      Energy: ['RELIANCE', 'ONGC', 'NTPC', 'POWERGRID', 'BPCL', 'IOC'],
      FMCG: ['HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'DABUR', 'MARICO'],
      Metals: ['TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'COALINDIA', 'VEDL', 'NMDC'],
      Finance: ['BAJFINANCE', 'BAJAJFINSV', 'SBILIFE', 'HDFCLIFE', 'ICICIPRULI'],
      Infra: ['LT', 'ADANIENT', 'ADANIPORTS', 'ULTRACEMCO', 'GRASIM', 'SHREECEM']
    };
  }

  /**
   * Get overall market sentiment
   */
  async getMarketSentiment() {
    const results = {
      advancing: 0,
      declining: 0,
      unchanged: 0,
      totalVolume: 0,
      avgChange: 0,
      sectorPerformance: {},
      topGainers: [],
      topLosers: [],
      sentiment: 'neutral',
      sentimentScore: 50,
      details: []
    };

    const errors = [];
    const stockData = [];

    // Fetch data for Nifty 50 components
    for (const symbol of this.indexComponents.nifty50) {
      try {
        const data = await stockService.getStockPrice(symbol);
        if (data && data.percentChange !== undefined) {
          stockData.push({
            symbol,
            price: data.price,
            change: data.change,
            percentChange: data.percentChange,
            volume: data.volume || 0
          });
        }
      } catch (error) {
        errors.push(symbol);
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }

    if (stockData.length < 10) {
      return { error: 'Insufficient data for market sentiment', fetched: stockData.length };
    }

    // Calculate breadth
    stockData.forEach(stock => {
      if (stock.percentChange > 0.1) results.advancing++;
      else if (stock.percentChange < -0.1) results.declining++;
      else results.unchanged++;
      
      results.totalVolume += stock.volume;
    });

    // Average change
    results.avgChange = stockData.reduce((sum, s) => sum + s.percentChange, 0) / stockData.length;

    // Top gainers and losers
    const sorted = [...stockData].sort((a, b) => b.percentChange - a.percentChange);
    results.topGainers = sorted.slice(0, 5).map(s => ({
      symbol: s.symbol,
      change: s.percentChange.toFixed(2) + '%'
    }));
    results.topLosers = sorted.slice(-5).reverse().map(s => ({
      symbol: s.symbol,
      change: s.percentChange.toFixed(2) + '%'
    }));

    // Calculate sector performance
    for (const [sector, stocks] of Object.entries(this.sectors)) {
      const sectorStocks = stockData.filter(s => stocks.includes(s.symbol));
      if (sectorStocks.length > 0) {
        const avgSectorChange = sectorStocks.reduce((sum, s) => sum + s.percentChange, 0) / sectorStocks.length;
        results.sectorPerformance[sector] = {
          avgChange: avgSectorChange.toFixed(2),
          advancing: sectorStocks.filter(s => s.percentChange > 0).length,
          declining: sectorStocks.filter(s => s.percentChange < 0).length,
          sentiment: avgSectorChange > 0.5 ? 'bullish' : avgSectorChange < -0.5 ? 'bearish' : 'neutral'
        };
      }
    }

    // Calculate overall sentiment score (0-100)
    const advanceDeclineRatio = results.advancing / Math.max(results.declining, 1);
    let sentimentScore = 50;
    
    // Factor 1: Advance/Decline ratio (30 points)
    if (advanceDeclineRatio > 2) sentimentScore += 30;
    else if (advanceDeclineRatio > 1.5) sentimentScore += 20;
    else if (advanceDeclineRatio > 1) sentimentScore += 10;
    else if (advanceDeclineRatio < 0.5) sentimentScore -= 30;
    else if (advanceDeclineRatio < 0.67) sentimentScore -= 20;
    else if (advanceDeclineRatio < 1) sentimentScore -= 10;

    // Factor 2: Average market change (20 points)
    if (results.avgChange > 1) sentimentScore += 20;
    else if (results.avgChange > 0.5) sentimentScore += 10;
    else if (results.avgChange < -1) sentimentScore -= 20;
    else if (results.avgChange < -0.5) sentimentScore -= 10;

    sentimentScore = Math.max(0, Math.min(100, sentimentScore));
    results.sentimentScore = sentimentScore;

    // Determine sentiment label
    if (sentimentScore >= 70) results.sentiment = 'very_bullish';
    else if (sentimentScore >= 55) results.sentiment = 'bullish';
    else if (sentimentScore >= 45) results.sentiment = 'neutral';
    else if (sentimentScore >= 30) results.sentiment = 'bearish';
    else results.sentiment = 'very_bearish';

    // Add trading recommendation based on sentiment
    results.recommendation = this.getMarketRecommendation(sentimentScore, results);

    return results;
  }

  /**
   * Get sector rotation analysis
   * Identifies which sectors are leading/lagging
   */
  async getSectorRotation() {
    const sectorData = {};
    
    for (const [sector, stocks] of Object.entries(this.sectors)) {
      const sectorResults = {
        stocks: [],
        avgChange: 0,
        momentum: 'neutral',
        strength: 0,
        leaders: [],
        laggards: []
      };

      for (const symbol of stocks.slice(0, 5)) { // Top 5 from each sector
        try {
          const data = await stockService.getStockPrice(symbol);
          if (data) {
            sectorResults.stocks.push({
              symbol,
              percentChange: data.percentChange,
              price: data.price,
              volume: data.volume
            });
          }
        } catch (error) {
          // Skip failed fetches
        }
        await new Promise(r => setTimeout(r, 50));
      }

      if (sectorResults.stocks.length > 0) {
        // Calculate sector metrics
        sectorResults.avgChange = sectorResults.stocks.reduce(
          (sum, s) => sum + s.percentChange, 0
        ) / sectorResults.stocks.length;

        // Sort by performance
        const sorted = [...sectorResults.stocks].sort(
          (a, b) => b.percentChange - a.percentChange
        );
        sectorResults.leaders = sorted.slice(0, 2).map(s => s.symbol);
        sectorResults.laggards = sorted.slice(-2).map(s => s.symbol);

        // Determine sector momentum
        if (sectorResults.avgChange > 1) sectorResults.momentum = 'strong_bullish';
        else if (sectorResults.avgChange > 0.3) sectorResults.momentum = 'bullish';
        else if (sectorResults.avgChange < -1) sectorResults.momentum = 'strong_bearish';
        else if (sectorResults.avgChange < -0.3) sectorResults.momentum = 'bearish';

        sectorResults.strength = Math.abs(sectorResults.avgChange);
        sectorData[sector] = sectorResults;
      }
    }

    // Rank sectors
    const rankedSectors = Object.entries(sectorData)
      .sort((a, b) => b[1].avgChange - a[1].avgChange)
      .map(([sector, data], index) => ({
        sector,
        rank: index + 1,
        ...data
      }));

    return {
      sectors: rankedSectors,
      leadingSectors: rankedSectors.slice(0, 3).map(s => s.sector),
      laggingSectors: rankedSectors.slice(-3).map(s => s.sector),
      recommendation: this.getSectorRecommendation(rankedSectors)
    };
  }

  /**
   * Check if market conditions favor trading
   */
  async isTradingFavorable() {
    const sentiment = await this.getMarketSentiment();
    
    const conditions = {
      isFavorable: false,
      score: 0,
      maxScore: 100,
      factors: []
    };

    // Factor 1: Clear trend (not choppy)
    const adRatio = sentiment.advancing / Math.max(sentiment.declining, 1);
    if (adRatio > 1.5 || adRatio < 0.67) {
      conditions.score += 25;
      conditions.factors.push({
        factor: 'Clear Trend',
        status: 'positive',
        detail: adRatio > 1 ? 'Bullish breadth' : 'Bearish breadth'
      });
    } else {
      conditions.factors.push({
        factor: 'Clear Trend',
        status: 'negative',
        detail: 'Mixed/choppy market'
      });
    }

    // Factor 2: Strong sector leadership
    const strongSectors = Object.values(sentiment.sectorPerformance)
      .filter(s => Math.abs(parseFloat(s.avgChange)) > 0.5).length;
    
    if (strongSectors >= 3) {
      conditions.score += 25;
      conditions.factors.push({
        factor: 'Sector Leadership',
        status: 'positive',
        detail: `${strongSectors} sectors showing clear direction`
      });
    } else {
      conditions.factors.push({
        factor: 'Sector Leadership',
        status: 'negative',
        detail: 'Weak sector leadership'
      });
    }

    // Factor 3: Not extreme sentiment (avoid tops/bottoms)
    if (sentiment.sentimentScore > 25 && sentiment.sentimentScore < 75) {
      conditions.score += 25;
      conditions.factors.push({
        factor: 'Sentiment Balance',
        status: 'positive',
        detail: 'Not at extreme levels'
      });
    } else {
      conditions.factors.push({
        factor: 'Sentiment Balance',
        status: 'warning',
        detail: sentiment.sentimentScore > 75 ? 'Extremely bullish - caution' : 'Extremely bearish - caution'
      });
    }

    // Factor 4: Consistent direction
    const gainersRatio = sentiment.advancing / (sentiment.advancing + sentiment.declining);
    if (gainersRatio > 0.6 || gainersRatio < 0.4) {
      conditions.score += 25;
      conditions.factors.push({
        factor: 'Market Direction',
        status: 'positive',
        detail: `${(gainersRatio * 100).toFixed(0)}% stocks in one direction`
      });
    } else {
      conditions.factors.push({
        factor: 'Market Direction',
        status: 'negative',
        detail: 'No clear direction'
      });
    }

    conditions.isFavorable = conditions.score >= 50;
    conditions.summary = conditions.isFavorable 
      ? 'Market conditions favor trading'
      : 'Consider waiting for better conditions';

    return conditions;
  }

  /**
   * Get market recommendation based on sentiment
   */
  getMarketRecommendation(score, data) {
    if (score >= 70) {
      return {
        action: 'BUY',
        confidence: 'high',
        message: 'Strong bullish sentiment. Look for quality breakouts and momentum plays.',
        preferredSectors: Object.entries(data.sectorPerformance)
          .filter(([_, v]) => v.sentiment === 'bullish')
          .map(([k, _]) => k)
          .slice(0, 3)
      };
    } else if (score >= 55) {
      return {
        action: 'SELECTIVE_BUY',
        confidence: 'moderate',
        message: 'Mild bullish bias. Focus on leading sectors and strong setups only.',
        preferredSectors: Object.entries(data.sectorPerformance)
          .filter(([_, v]) => v.sentiment === 'bullish')
          .map(([k, _]) => k)
          .slice(0, 2)
      };
    } else if (score >= 45) {
      return {
        action: 'WAIT',
        confidence: 'low',
        message: 'Mixed signals. Best to wait for clearer direction.',
        preferredSectors: []
      };
    } else if (score >= 30) {
      return {
        action: 'SELECTIVE_SELL',
        confidence: 'moderate',
        message: 'Mild bearish bias. Consider reducing exposure, avoid new longs.',
        preferredSectors: []
      };
    } else {
      return {
        action: 'SELL',
        confidence: 'high',
        message: 'Strong bearish sentiment. Protect capital, consider hedging.',
        preferredSectors: []
      };
    }
  }

  /**
   * Get sector-based recommendation
   */
  getSectorRecommendation(rankedSectors) {
    const leading = rankedSectors.slice(0, 2);
    const lagging = rankedSectors.slice(-2);

    let recommendation = '';
    
    if (leading[0].avgChange > 1) {
      recommendation = `Strong rotation into ${leading.map(s => s.sector).join(' and ')}. `;
      recommendation += `Consider stocks: ${leading.flatMap(s => s.leaders).join(', ')}. `;
    } else if (leading[0].avgChange > 0.3) {
      recommendation = `Mild strength in ${leading[0].sector}. `;
    }

    if (lagging[0].avgChange < -1) {
      recommendation += `Avoid ${lagging.map(s => s.sector).join(' and ')} sector weakness.`;
    }

    return recommendation || 'No strong sector rotation detected today.';
  }

  /**
   * Get Fear & Greed index approximation
   */
  async getFearGreedIndex() {
    const sentiment = await this.getMarketSentiment();
    
    // Simplified fear/greed calculation
    let index = sentiment.sentimentScore;
    
    // Adjust based on volatility of top movers
    const avgMoverSize = (
      sentiment.topGainers.reduce((sum, g) => sum + Math.abs(parseFloat(g.change)), 0) +
      sentiment.topLosers.reduce((sum, l) => sum + Math.abs(parseFloat(l.change)), 0)
    ) / 10;

    // High volatility suggests fear
    if (avgMoverSize > 3) index -= 10;
    else if (avgMoverSize < 1) index += 5;

    index = Math.max(0, Math.min(100, index));

    let label = 'Neutral';
    if (index >= 75) label = 'Extreme Greed';
    else if (index >= 55) label = 'Greed';
    else if (index >= 45) label = 'Neutral';
    else if (index >= 25) label = 'Fear';
    else label = 'Extreme Fear';

    return {
      index: Math.round(index),
      label,
      interpretation: this.interpretFearGreed(index)
    };
  }

  interpretFearGreed(index) {
    if (index >= 75) {
      return 'Market is extremely greedy. Be cautious of potential correction.';
    } else if (index >= 55) {
      return 'Greed is present but not extreme. Trend-following strategies work well.';
    } else if (index >= 45) {
      return 'Market is balanced. Look for individual stock setups.';
    } else if (index >= 25) {
      return 'Fear is present. Quality stocks at discount - accumulation opportunity.';
    } else {
      return 'Extreme fear presents best buying opportunities for long-term investors.';
    }
  }
}

module.exports = new MarketSentimentService();
