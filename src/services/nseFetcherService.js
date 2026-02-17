const fetch = require('node-fetch');

class NSEFetcherService {
  constructor() {
    this.cachedStocks = null;
    this.cacheTimestamp = null;
    this.cacheValidityHours = 24;
    this.session = null;
    
    // Comprehensive NSE stock universe - includes all major NSE listed stocks
    // Not limited to index constituents - covers large, mid, small and micro caps
    this.nifty50Symbols = [
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'SBIN', 
      'BHARTIARTL', 'KOTAKBANK', 'LT', 'HCLTECH', 'AXISBANK', 'ASIANPAINT', 'MARUTI',
      'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'BAJFINANCE', 'WIPRO', 'NESTLEIND', 'TECHM',
      'M&M', 'NTPC', 'POWERGRID', 'TATAMOTORS', 'JSWSTEEL', 'TATASTEEL', 'ADANIPORTS',
      'ONGC', 'COALINDIA', 'BAJAJFINSV', 'GRASIM', 'HINDALCO', 'BPCL', 'CIPLA',
      'DRREDDY', 'SBILIFE', 'DIVISLAB', 'BRITANNIA', 'EICHERMOT', 'INDUSINDBK',
      'APOLLOHOSP', 'TATACONSUM', 'BAJAJ-AUTO', 'HEROMOTOCO', 'HDFCLIFE', 'ADANIENT', 'LTIM', 'SHRIRAMFIN'
    ];
    
    this.midCapSymbols = [
      // Nifty Next 50 & Midcap 150 constituents
      'PAGEIND', 'MPHASIS', 'AUROPHARMA', 'LUPIN', 'GODREJCP', 'VOLTAS', 'PIDILITIND',
      'COLPAL', 'DABUR', 'MARICO', 'HAVELLS', 'INDIGO', 'TRENT', 'TORNTPHARM',
      'BALKRISIND', 'MUTHOOTFIN', 'ACC', 'AMBUJACEM', 'GMRINFRA', 'ZOMATO',
      // Additional midcap stocks across sectors
      'BANDHANBNK', 'BANKBARODA', 'BEL', 'BERGEPAINT', 'BIOCON', 'CANBK', 'CHOLAFIN',
      'CONCOR', 'CUMMINSIND', 'DLF', 'ESCORTS', 'FEDERALBNK', 'GAIL', 'GLAXO',
      'GLENMARK', 'GODREJPROP', 'HAL', 'HINDPETRO', 'HONAUT', 'IDFCFIRSTB',
      'IEX', 'INDUSTOWER', 'IRFC', 'JINDALSTEL', 'LICHSGFIN', 'LICI', 'M&MFIN',
      'MANAPPURAM', 'METROPOLIS', 'MRF', 'NAUKRI', 'NHPC', 'NMDC', 'OBEROIRLTY',
      'OFSS', 'PETRONET', 'PFC', 'PIIND', 'PNB', 'POLYCAB', 'PVRINOX',
      'RAMCOCEM', 'RECLTD', 'SAIL', 'SBICARD', 'SIEMENS', 'SRF',
      'STARHEALTH', 'SYNGENE', 'TATACHEM', 'TATACOMM', 'TATAPOWER', 'TORNTPOWER',
      'TVSMOTOR', 'UBL', 'UNIONBANK', 'VEDL', 'IDEA', 'YESBANK', 'ZEEL',
      'IPCALAB', 'LAURUSLABS', 'LTTS', 'MAXHEALTH', 'MINDTREE',
      'MOTHERSON', 'NATIONALUM', 'PERSISTENT', 'PHOENIXLTD',
      'PRESTIGE', 'SCHAEFFLER', 'SHREECEM', 'SJVN', 'SOLARINDS', 'SUNTV',
      'SUPREMEIND', 'TATAMTRDVR', 'THERMAX', 'TIMKEN', 'TRIDENT', 'UNITDSPR',
      'VINATIORGA', 'WHIRLPOOL', 'ZYDUSLIFE', 'ABCAPITAL', 'ABFRL', 'ALKEM',
      'ASHOKLEY', 'ASTRAL', 'ATUL', 'AUBANK', 'AFFLE', 'AJANTPHARM',
      'APLLTD', 'AARTIIND', 'BATAINDIA', 'BHEL', 'CANFINHOME', 'CENTRALBK',
      'COROMANDEL', 'CROMPTON', 'CESC', 'DALMIACEME', 'DEEPAKNTR', 'DELHIVERY',
      'DIXON', 'EMAMILTD', 'EXIDEIND', 'FORTIS', 'GNFC', 'GSPL',
      'GUJGASLTD', 'HATSUN', 'IBULHSGFIN', 'IDBI', 'INDIANB', 'IOB',
      'IOC', 'IRCTC', 'IGL', 'JSL', 'JUBLFOOD', 'KAJARIACER',
      'KEI', 'KEC', 'KANSAINER', 'L&TFH', 'LALPATHLAB', 'MCX',
      'MFSL', 'NAM-INDIA', 'NATCOPHARM', 'NIACL', 'OIL',
      'PGHH', 'POWERMECH', 'RAJESHEXPO', 'RATNAMANI', 'RELAXO', 'ROUTE',
      'SAPPHIRE', 'SUVENPHAR', 'SYMPHONY', 'TEAMLEASE', 'UCOBANK', 'UPL',
      'VBL', 'VSTIND', 'WOCKPHARMA', 'ZENSARTECH'
    ];
    
    this.smallCapSymbols = [
      // Nifty Smallcap 250 & additional small/micro cap stocks
      'NAVINFLUOR', 'KPITTECH', 'COFORGE', 'SONACOMS',
      'TATAELXSI', 'HAPPSTMNDS', 'ANGELONE', 'APTUS', 'AETHER',
      'CAMPUS', 'CARTRADE', 'CLEAN', 'CMSINFO', 'DATAPATTNS', 'DEVYANI',
      'EASEMYTRIP', 'ELETTECH', 'EPIGRAL', 'ETHOSLTD', 'FINEORG', 'FSL',
      'GICRE', 'GRINDWELL', 'GRSE', 'HGS', 'HOMEFIRST', 'HUDCO',
      'IIFL', 'INDIAMART', 'INOXWIND', 'INTELLECT', 'JBCHEPHARM', 'JKCEMENT',
      'JKLAKSHMI', 'JKPAPER', 'JMFINANCIL', 'JTEKTINDIA', 'JYOTHYLAB', 'KAYNES',
      'KFINTECH', 'LATENTVIEW', 'LAXMIMACH', 'LINDEINDIA', 'MAPMYINDIA', 'MASTEK',
      'MEDANTA', 'MEDPLUS', 'METROBRAND', 'MIDHANI', 'MMTC', 'MOTILALOFS',
      'MRPL', 'NESCO', 'NEWGEN', 'OLECTRA', 'PATANJALI', 'PCBL',
      'PGEL', 'PNBHOUSING', 'POLYMED', 'PPLPHARMA', 'PRINCEPIPE', 'PRAJIND',
      'QUESS', 'RADICO', 'RAIN', 'RAJRATAN', 'RKFORGE', 'RBA',
      'ROSSARI', 'RVNL', 'SANOFI', 'SBCL', 'SHILPAMED', 'SHOPERSTOP',
      'SPARC', 'SUMICHEM', 'SUNDARMFIN', 'SUNFLAG', 'SWANENERGY', 'TANLA',
      'TATAINVEST', 'TEGA', 'TIINDIA', 'TITAGARH', 'TRIVENI', 'TRITURBINE',
      'TV18BRDCST', 'UJJIVANSFB', 'VGUARD', 'WELCORP', 'WELSPUNLIV', 'WHEELS',
      'YATHARTH', 'GESHIP', 'MAZDOCK', 'COCHINSHIP', 'BSOFT', 'CGPOWER',
      'CDSL', 'CERA', 'CHAMBLFERT', 'CHEMPLASTS', 'CIEINDIA', 'CYIENT',
      'DCMSHRIRAM', 'FACT', 'FDC', 'GHCL', 'GPPL', 'GRAPHITE',
      'GRINFRA', 'GSFC', 'GUJALKALI', 'HBLPOWER', 'HCC', 'HFCL',
      'HINDCOPPER', 'HINDZINC', 'HSCL', 'IIFLWAM', 'INDHOTEL', 'JAMNAAUTO',
      'JPPOWER', 'KALYANKJIL', 'KIMS', 'KSB', 'MAHLOG', 'MAHSEAMLES',
      'MANINFRA', 'MAXIND', 'NLCINDIA', 'NUVAMA', 'RITES',
      'SAFARI', 'SUNTECK', 'SWSOLAR', 'TCIEXP', 'TECHNOE', 'TTML',
      'TVSSRICHAK', 'VAIBHAVGBL', 'WABAG', 'WESTLIFE', 'ZFCVINDIA'
    ];
  }

  // Initialize - no session needed for Yahoo Finance
  async initSession() {
    console.log('🔑 Using Yahoo Finance for stock data (NSE direct access blocked)');
    return true;
  }

  // Fetch all stocks - Using hardcoded list since NSE API is blocked
  async getAllNSEStocks() {
    if (this.isCacheValid()) {
      console.log('📦 Using cached stock list');
      return this.cachedStocks;
    }

    console.log('🌐 Preparing stock universe from predefined list...');

    const stocks = {
      largeCap: this.nifty50Symbols,
      midCap: this.midCapSymbols,
      smallCap: this.smallCapSymbols,
      total: this.nifty50Symbols.length + this.midCapSymbols.length + this.smallCapSymbols.length
    };
    
    this.cachedStocks = stocks;
    this.cacheTimestamp = Date.now();
    
    console.log(`✅ Loaded ${stocks.total} stocks for screening`);
    console.log(`   Large Cap: ${stocks.largeCap.length}`);
    console.log(`   Mid Cap: ${stocks.midCap.length}`);
    console.log(`   Small Cap: ${stocks.smallCap.length}`);
    
    return stocks;
  }

  async fetchFromNSE() {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    try {
      const [nifty50, niftyNext50, midcap150, smallcap250] = await Promise.all([
        this.fetchNifty50(),
        this.fetchNiftyNext50(),
        this.fetchNiftyMidcap150(),
        this.fetchNiftySmallcap250()
      ]);

      await delay(1000); // Rate limiting

      const largeCap = [...new Set([...nifty50, ...niftyNext50])];
      const midCap = midcap150.filter(s => !largeCap.includes(s)).slice(0, 100);
      const smallCap = smallcap250.filter(s => !largeCap.includes(s) && !midCap.includes(s)).slice(0, 100);

      return {
        largeCap: largeCap,
        midCap: midCap,
        smallCap: smallCap,
        total: largeCap.length + midCap.length + smallCap.length,
        lastUpdated: new Date().toISOString(),
        source: 'NSE_LIVE'
      };
    } catch (error) {
      throw new Error(`NSE fetch failed: ${error.message}`);
    }
  }

  async fetchNifty50() {
    const url = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/',
        'Cookie': this.session || ''
      },
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`Nifty 50 API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid Nifty 50 response format');
    }

    const symbols = data.data
      .filter(item => item.symbol && item.symbol !== '')
      .map(item => item.symbol);

    console.log(`✓ Nifty 50: ${symbols.length} stocks (LIVE)`);
    return symbols;
  }

  async fetchNiftyNext50() {
    const url = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20NEXT%2050';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.nseindia.com/',
        'Cookie': this.session || ''
      },
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`Nifty Next 50 API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid Nifty Next 50 response format');
    }

    const symbols = data.data
      .filter(item => item.symbol && item.symbol !== '')
      .map(item => item.symbol);

    console.log(`✓ Nifty Next 50: ${symbols.length} stocks (LIVE)`);
    return symbols;
  }

  async fetchNiftyMidcap150() {
    const url = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20MIDCAP%20150';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.nseindia.com/',
        'Cookie': this.session || ''
      },
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`Nifty Midcap 150 API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid Nifty Midcap 150 response format');
    }

    const symbols = data.data
      .filter(item => item.symbol && item.symbol !== '')
      .map(item => item.symbol);

    console.log(`✓ Nifty Midcap 150: ${symbols.length} stocks (LIVE)`);
    return symbols;
  }

  async fetchNiftySmallcap250() {
    const url = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20SMALLCAP%20250';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.nseindia.com/',
        'Cookie': this.session || ''
      },
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`Nifty Smallcap 250 API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid Nifty Smallcap 250 response format');
    }

    const symbols = data.data
      .filter(item => item.symbol && item.symbol !== '')
      .map(item => item.symbol);

    console.log(`✓ Nifty Smallcap 250: ${symbols.length} stocks (LIVE)`);
    return symbols;
  }

  isCacheValid() {
    if (!this.cachedStocks || !this.cacheTimestamp) return false;
    
    const hoursSinceCache = (Date.now() - this.cacheTimestamp) / (1000 * 60 * 60);
    return hoursSinceCache < this.cacheValidityHours;
  }

  async refreshCache() {
    this.cachedStocks = null;
    this.cacheTimestamp = null;
    this.session = null;
    return await this.getAllNSEStocks();
  }
}

module.exports = new NSEFetcherService();