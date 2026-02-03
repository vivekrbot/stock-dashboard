/**
 * Market Hours Service
 * Handles NSE/BSE market timing detection and holiday calendar
 */

// NSE/BSE Market Hours (IST)
const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MINUTE = 15;
const MARKET_CLOSE_HOUR = 15;
const MARKET_CLOSE_MINUTE = 30;

// 2024-2026 NSE Holidays (update annually)
const NSE_HOLIDAYS = [
  // 2024
  '2024-01-26', '2024-03-08', '2024-03-25', '2024-03-29', '2024-04-11',
  '2024-04-14', '2024-04-17', '2024-04-21', '2024-05-01', '2024-05-23',
  '2024-06-17', '2024-07-17', '2024-08-15', '2024-10-02', '2024-11-01',
  '2024-11-15', '2024-12-25',
  // 2025
  '2025-01-26', '2025-02-26', '2025-03-14', '2025-03-31', '2025-04-10',
  '2025-04-14', '2025-04-18', '2025-05-01', '2025-08-15', '2025-08-27',
  '2025-10-02', '2025-10-21', '2025-10-22', '2025-11-05', '2025-12-25',
  // 2026 (tentative)
  '2026-01-26', '2026-03-10', '2026-03-17', '2026-04-02', '2026-04-03',
  '2026-04-14', '2026-05-01', '2026-08-15', '2026-08-17', '2026-10-02',
  '2026-10-20', '2026-11-09', '2026-12-25'
];

// Cache for live market check
let liveMarketCache = { isLive: null, lastCheck: 0 };
const LIVE_CHECK_TTL = 60000; // 1 minute

/**
 * Get current time in IST using proper timezone
 */
function getISTTime() {
  // Use Intl to get accurate IST time
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istString);
}

/**
 * Check if today is a market holiday
 */
function isHoliday(date = getISTTime()) {
  const dateStr = date.toISOString().split('T')[0];
  return NSE_HOLIDAYS.includes(dateStr);
}

/**
 * Check if it's a weekend
 */
function isWeekend(date = getISTTime()) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Check if market is currently open (basic time-based check)
 */
function isMarketOpenByTime() {
  const ist = getISTTime();
  
  // Check weekend
  if (isWeekend(ist)) {
    return false;
  }
  
  // Check holiday
  if (isHoliday(ist)) {
    return false;
  }
  
  // Check market hours
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const currentTime = hours * 60 + minutes;
  const marketOpen = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MINUTE;
  const marketClose = MARKET_CLOSE_HOUR * 60 + MARKET_CLOSE_MINUTE;
  
  return currentTime >= marketOpen && currentTime <= marketClose;
}

/**
 * Check if market is live by checking Moneycontrol
 */
async function checkLiveMarket() {
  // Use cache if recent
  if (Date.now() - liveMarketCache.lastCheck < LIVE_CHECK_TTL && liveMarketCache.isLive !== null) {
    return liveMarketCache.isLive;
  }
  
  try {
    const https = require('https');
    
    // Check Moneycontrol for NIFTY 50 live status
    const url = 'https://priceapi.moneycontrol.com/pricefeed/nse/equitycash/NSE';
    
    const data = await new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.moneycontrol.com/'
        },
        timeout: 5000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } 
          catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
    
    if (data?.data) {
      // Check market state from Moneycontrol response
      const priceData = data.data;
      const marketState = priceData.marketState || priceData.mktState || '';
      const sessionId = priceData.sessionId || '';
      
      // Moneycontrol uses sessionId="CONTINUOUS" when market is OPEN for live trading
      // Also check marketState for backwards compatibility
      const isLive = sessionId.toUpperCase() === 'CONTINUOUS' ||
                     marketState.toLowerCase().includes('open') || 
                     marketState.toLowerCase().includes('live');
      
      console.log(`📊 Moneycontrol market check: sessionId=${sessionId}, marketState=${marketState || 'NO_STATE'} → ${isLive ? 'LIVE' : 'CLOSED'}`);
      liveMarketCache = { isLive, lastCheck: Date.now() };
      return isLive;
    }
  } catch (e) {
    console.error('Moneycontrol market check failed:', e.message);
  }
  
  // Fallback: Check NIFTY index from Moneycontrol
  try {
    const https = require('https');
    const indexUrl = 'https://priceapi.moneycontrol.com/pricefeed/notap498/inidicesin498/in%3BNSX';
    
    const indexData = await new Promise((resolve) => {
      const req = https.get(indexUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        },
        timeout: 3000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } 
          catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
    
    if (indexData?.data) {
      // Check for explicit market state in index data
      const marketState = indexData.data.marketState || indexData.data.mktState || '';
      const sessionId = indexData.data.sessionId || '';
      
      // Check sessionId="CONTINUOUS" for live market
      if (sessionId.toUpperCase() === 'CONTINUOUS' ||
          marketState.toLowerCase().includes('open') || 
          marketState.toLowerCase().includes('live')) {
        console.log(`📊 NIFTY index indicates market OPEN (sessionId=${sessionId})`);
        liveMarketCache = { isLive: true, lastCheck: Date.now() };
        return true;
      }
      // Don't assume market is open just because price data exists
      console.log(`📊 NIFTY index: sessionId=${sessionId}, marketState=${marketState || 'NO_STATE'} - not live`);
    }
  } catch (e) {
    // Ignore
  }
  
  // Final fallback to time-based check
  return isMarketOpenByTime();
}

/**
 * Check if market is currently open
 */
function isMarketOpen() {
  return isMarketOpenByTime();
}

/**
 * Get market status with details (async version for accurate live check)
 */
async function getMarketStatusAsync() {
  const ist = getISTTime();
  const isLive = await checkLiveMarket();
  
  let status, message, nextEvent;
  
  if (isLive) {
    status = 'OPEN';
    message = 'Market is Open - Live Trading';
    nextEvent = getMarketCloseTime(ist);
  } else if (isWeekend(ist)) {
    status = 'CLOSED';
    message = 'Weekend - Market Closed';
    nextEvent = getNextMarketOpen(ist);
  } else if (isHoliday(ist)) {
    status = 'HOLIDAY';
    message = 'Market Holiday';
    nextEvent = getNextMarketOpen(ist);
  } else {
    const hours = ist.getHours();
    const marketOpen = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MINUTE;
    const currentTime = hours * 60 + ist.getMinutes();
    
    if (currentTime < marketOpen) {
      status = 'PRE_MARKET';
      message = 'Pre-Market - Opens at 9:15 AM IST';
      nextEvent = getMarketOpenTime(ist);
    } else {
      status = 'CLOSED';
      message = 'Market Closed for Today';
      nextEvent = getNextMarketOpen(ist);
    }
  }
  
  return {
    status,
    message,
    isOpen: isLive,
    currentTime: ist.toISOString(),
    currentTimeIST: ist.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    nextEvent,
    timezone: 'IST'
  };
}

/**
 * Get market status with details (sync version - uses time-based check)
 */
function getMarketStatus() {
  const ist = getISTTime();
  const isOpen = isMarketOpenByTime();
  
  let status, message, nextEvent;
  
  if (isWeekend(ist)) {
    status = 'CLOSED';
    message = 'Weekend - Market Closed';
    nextEvent = getNextMarketOpen(ist);
  } else if (isHoliday(ist)) {
    status = 'HOLIDAY';
    message = 'Market Holiday';
    nextEvent = getNextMarketOpen(ist);
  } else if (isOpen) {
    status = 'OPEN';
    message = 'Market is Open';
    nextEvent = getMarketCloseTime(ist);
  } else {
    const hours = ist.getHours();
    const marketOpen = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MINUTE;
    const currentTime = hours * 60 + ist.getMinutes();
    
    if (currentTime < marketOpen) {
      status = 'PRE_MARKET';
      message = 'Pre-Market - Opens at 9:15 AM IST';
      nextEvent = getMarketOpenTime(ist);
    } else {
      status = 'CLOSED';
      message = 'Market Closed for Today';
      nextEvent = getNextMarketOpen(ist);
    }
  }
  
  return {
    status,
    message,
    isOpen,
    currentTime: ist.toISOString(),
    nextEvent,
    timezone: 'IST'
  };
}

/**
 * Get next market open time
 */
function getNextMarketOpen(fromDate) {
  const date = new Date(fromDate);
  date.setHours(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE, 0, 0);
  
  // If today's market time has passed, start from tomorrow
  if (date <= fromDate) {
    date.setDate(date.getDate() + 1);
  }
  
  // Find next trading day
  while (isWeekend(date) || isHoliday(date)) {
    date.setDate(date.getDate() + 1);
  }
  
  return date.toISOString();
}

/**
 * Get market open time for given date
 */
function getMarketOpenTime(date) {
  const openTime = new Date(date);
  openTime.setHours(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE, 0, 0);
  return openTime.toISOString();
}

/**
 * Get market close time for given date
 */
function getMarketCloseTime(date) {
  const closeTime = new Date(date);
  closeTime.setHours(MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE, 0, 0);
  return closeTime.toISOString();
}

/**
 * Get last trading day
 */
function getLastTradingDay() {
  const ist = getISTTime();
  const date = new Date(ist);
  
  // If market hasn't opened today, go back one day
  const hours = ist.getHours();
  const currentTime = hours * 60 + ist.getMinutes();
  const marketOpen = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MINUTE;
  
  if (currentTime < marketOpen || isWeekend(ist) || isHoliday(ist)) {
    date.setDate(date.getDate() - 1);
  }
  
  // Find previous trading day
  while (isWeekend(date) || isHoliday(date)) {
    date.setDate(date.getDate() - 1);
  }
  
  return date.toISOString().split('T')[0];
}

module.exports = {
  isMarketOpen,
  isMarketOpenByTime,
  checkLiveMarket,
  getMarketStatus,
  getMarketStatusAsync,
  getISTTime,
  isHoliday,
  isWeekend,
  getLastTradingDay,
  getNextMarketOpen,
  NSE_HOLIDAYS
};
