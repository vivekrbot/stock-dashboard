# RapidAPI Integration Guide

## Overview
This stock dashboard now supports real-time data fetching through RapidAPI, providing access to multiple Indian stock market data sources including:
- Latest Stock Price API (NSE stocks)
- Yahoo Finance API (Global stocks including NSE)
- NSE India direct API (fallback)

## Setup Instructions

### 1. Get RapidAPI Key
1. Visit [RapidAPI](https://rapidapi.com/)
2. Sign up for a free account
3. Subscribe to these APIs:
   - **Latest Stock Price API**: [Subscribe here](https://rapidapi.com/suneetk92/api/latest-stock-price)
   - **Yahoo Finance15 API** (Optional): [Subscribe here](https://rapidapi.com/yahoo-finance15/api/yahoo-finance15)

### 2. Configure API Key
Add your RapidAPI key to the `.env` file:
```env
RAPIDAPI_KEY='your-actual-rapidapi-key-here'
```

Replace `your-actual-rapidapi-key-here` with your actual key from RapidAPI dashboard.

## Available APIs

### Stock Data Endpoints

#### Get Single Stock Price
```bash
GET /api/stock/:symbol
```
Example: `GET /api/stock/RELIANCE`

#### Get Multiple Stocks (Batch)
```bash
POST /api/stocks/batch
Content-Type: application/json

{
  "symbols": ["RELIANCE", "TCS", "INFY", "HDFCBANK"]
}
```

#### Get Stocks by Index
```bash
GET /api/stocks/index/:indexName
```
Examples:
- `GET /api/stocks/index/NIFTY%2050` (NIFTY 50)
- `GET /api/stocks/index/NIFTY%20BANK` (NIFTY BANK)
- `GET /api/stocks/index/NIFTY%20IT` (NIFTY IT)

#### Get Stock Details with Fundamentals
```bash
GET /api/stock/:symbol/details
```

#### Get Technical Indicators
```bash
GET /api/stock/:symbol/technical
```

#### Get Historical Data
```bash
GET /api/stock/:symbol/history?period=3mo
```
Periods: `1mo`, `3mo`, `6mo`, `1y`

## Data Sources Priority

The system uses a fallback mechanism:
1. **Primary**: RapidAPI Latest Stock Price (if configured)
2. **Secondary**: RapidAPI Yahoo Finance (for additional data)
3. **Fallback**: NSE India direct API

## Response Format

### Stock Price Response
```json
{
  "symbol": "RELIANCE",
  "price": 2456.75,
  "change": 23.50,
  "percentChange": 0.97,
  "previousClose": 2433.25,
  "open": 2440.00,
  "high": 2460.00,
  "low": 2435.00,
  "volume": 8934567,
  "52WeekHigh": 2856.00,
  "52WeekLow": 2220.30,
  "lastUpdate": "2026-02-01T10:30:00.000Z",
  "source": "RapidAPI-LatestStockPrice"
}
```

### Batch Response
```json
[
  {
    "symbol": "RELIANCE",
    "price": 2456.75,
    ...
  },
  {
    "symbol": "TCS",
    "price": 3678.90,
    ...
  }
]
```

## Testing

### Test RapidAPI Connection
```bash
curl http://localhost:3001/api/stock/RELIANCE
```

### Test Batch Request
```bash
curl -X POST http://localhost:3001/api/stocks/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["RELIANCE", "TCS", "INFY"]}'
```

### Test Index Stocks
```bash
curl http://localhost:3001/api/stocks/index/NIFTY%2050
```

## Supported Indices
- NIFTY 50
- NIFTY BANK
- NIFTY IT
- NIFTY AUTO
- NIFTY PHARMA
- NIFTY FMCG
- NIFTY METAL
- And more...

## Rate Limits
- **Free Tier**: Typically 500 requests/month
- **Pro Tier**: Higher limits based on subscription
- Check your RapidAPI dashboard for current usage

## Error Handling
If RapidAPI is not configured or fails, the system automatically falls back to:
1. NSE India direct API
2. Returns error with details if all sources fail

## Monitoring
The server logs indicate which data source is used:
```
✓ RELIANCE fetched from RapidAPI
✓ TCS fetched from NSE
⚠ RapidAPI failed for INFY: Rate limit exceeded
```

## Troubleshooting

### RapidAPI Key Not Working
1. Verify key is correctly set in `.env`
2. Check if you're subscribed to the required APIs
3. Verify you haven't exceeded rate limits
4. Check API key permissions on RapidAPI dashboard

### No Data Returned
1. Check if stock symbol is correct (use NSE symbols)
2. Verify stock is trading (not delisted)
3. Check network connectivity
4. Review server logs for detailed errors

## Cost Optimization
- Use batch endpoints to fetch multiple stocks in one request
- Cache responses on frontend to reduce API calls
- Monitor usage on RapidAPI dashboard
- Consider upgrading plan if hitting rate limits

## Next Steps
1. Add your RapidAPI key to `.env`
2. Restart the server: `npm run dev`
3. Test the endpoints
4. Monitor the console for data source confirmations
