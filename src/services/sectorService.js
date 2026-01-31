class SectorService {
  constructor() {
    // NSE sector classifications
    this.sectorStocks = {
      'IT': ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM', 'COFORGE', 'PERSISTENT', 'MPHASIS', 'TATAELXSI'],
      'Banking': ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK', 'BANKBARODA', 'PNB', 'CANBK'],
      'Auto': ['MARUTI', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'EICHERMOT', 'HEROMOTOCO', 'ESCORTS'],
      'Pharma': ['SUNPHARMA', 'DIVISLAB', 'DRREDDY', 'CIPLA', 'LUPIN', 'BIOCON', 'TORNTPHARM', 'ALKEM'],
      'Energy': ['RELIANCE', 'ONGC', 'BPCL', 'IOC', 'COALINDIA', 'NTPC', 'POWERGRID', 'ADANIGREEN', 'TATAPOWER'],
      'FMCG': ['HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'DABUR', 'MARICO', 'GODREJCP', 'TATACONSUM'],
      'Metals': ['TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'VEDL', 'SAIL', 'NMDC', 'BALKRISIND'],
      'Telecom': ['BHARTIARTL', 'IDEA'],
      'Cement': ['ULTRACEMCO', 'SHREECEM', 'AMBUJACEM'],
      'Finance': ['BAJFINANCE', 'BAJAJFINSV', 'CHOLAFIN', 'MUTHOOTFIN', 'SBILIFE', 'HDFCLIFE']
    };
  }

  // Get sector for a stock
  getSector(symbol) {
    for (const [sector, stocks] of Object.entries(this.sectorStocks)) {
      if (stocks.includes(symbol)) {
        return sector;
      }
    }
    return 'Other';
  }

  // Get all stocks in a sector
  getSectorStocks(sector) {
    return this.sectorStocks[sector] || [];
  }

  // Calculate relative strength vs sector
  calculateRelativeStrength(stockChange, sectorAvgChange) {
    if (!sectorAvgChange || sectorAvgChange === 0) return 0;
    
    const relativeStrength = ((stockChange - sectorAvgChange) / Math.abs(sectorAvgChange)) * 100;
    return parseFloat(relativeStrength.toFixed(2));
  }

  // Determine if stock is sector leader
  isSectorLeader(stockChange, relativeStrength) {
    return relativeStrength > 20; // 20% better than sector average
  }
}

module.exports = new SectorService();