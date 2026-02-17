# Stock Dashboard - AI-Powered Trading System

Advanced NSE Stock Analysis & Trading Platform with **real-time data**, **Machine Learning predictions**, and **multi-strategy trading** capabilities.

## 🚀 New Features (v3.0)

### ✨ AI & Machine Learning
- **Neural Network Predictions**: LSTM-based price prediction using Synaptic.js
- **Multi-indicator ML Models**: 15 technical indicators as features
- **Confidence Scoring**: Probabilistic predictions (Bearish/Neutral/Bullish)
- **Auto-training**: Models train on 6 months of historical data
- **Ensemble Methods**: Combines multiple signals for higher accuracy

### 📊 Multi-Strategy Trading
- **Intraday Scalping** (1-day): 1.5% stop-loss, 2.5% target, 5min-1hr timeframe
- **Swing Trading** (2-10 days): 3% stop-loss, 6% target, pattern-based
- **Short-term Position** (1-4 weeks): 4% stop-loss, 10% target, technical+fundamental
- **Long-term Investment** (3-12 months): 15% stop-loss, 45% target, fundamental focus

### 🔍 Advanced Market Scanner
- **Master Scan**: Finds ALL opportunity types across 90+ stocks
- **Early Mover Detection**: Identifies stocks BEFORE major moves
- **Volume Accumulation**: Detects smart money activity
- **Volatility Compression**: Finds stocks ready to break out
- **Multi-source Confirmation**: Combines ML, technical, and pattern signals

### ⚡ Real-Time Data Infrastructure
- **Intelligent Caching**: 3-tier cache (price: 10s, historical: 5min, fundamental: 1hr)
- **Batch Processing**: Parallel API calls with rate limiting
- **Multi-source Aggregation**: Moneycontrol → Yahoo → RapidAPI → NSE
- **Sub-second Performance**: Cache-first architecture

### 🎯 Risk Management
- **Position Sizing**: Kelly Criterion-based calculations
- **Risk-Reward Optimization**: Minimum 1.5:1 to 3:1 ratios
- **Stop-Loss Management**: Dynamic based on ATR and support levels
- **Portfolio Analysis**: Correlation and diversification metrics

## Quick Start

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Start Backend Server

```bash
npm start
```

Backend runs on http://localhost:3001

### 3. Start Frontend (in a new terminal)

```bash
npm run frontend
```

Frontend runs on http://localhost:5173

## New API Endpoints

### 🤖 Machine Learning

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ml/predict/:symbol` | GET | Get ML prediction for a stock |
| `/api/ml/predict-batch` | POST | Batch predict multiple stocks |
| `/api/ml/train/:symbol` | POST | Train/retrain model for symbol |
| `/api/ml/stats` | GET | Get ML model statistics |

**Example:**
```bash
curl http://localhost:3001/api/ml/predict/RELIANCE
```

### 📈 Intelligent Trading

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/trading/analyze/:symbol` | GET | Multi-strategy analysis |
| `/api/trading/scan/:strategy` | GET | Quick scan (SWING, SHORT_TERM, etc.) |
| `/api/trading/master-scan` | POST | Complete market scan |
| `/api/trading/backtest/:symbol` | POST | Backtest strategy on symbol |
| `/api/trading/strategies` | GET | List all available strategies |

**Example:**
```bash
# Analyze stock for all strategies
curl "http://localhost:3001/api/trading/analyze/TCS?strategies=SWING,SHORT_TERM&capital=100000"

# Quick swing trade scan
curl "http://localhost:3001/api/trading/scan/SWING?maxResults=10&minScore=75"

# Master scan - finds ALL opportunities
curl -X POST http://localhost:3001/api/trading/master-scan \
  -H "Content-Type: application/json" \
  -d '{"strategies": ["SWING", "SHORT_TERM"], "minScore": 70, "maxResults": 20}'
```

### ⚡ Real-Time Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/realtime/:symbol` | GET | Real-time price with caching |
| `/api/realtime/:symbol/complete` | GET | Complete data (price+technical+history) |
| `/api/realtime/batch` | POST | Batch fetch multiple stocks |
| `/api/realtime/cache/stats` | GET | Cache statistics |
| `/api/realtime/cache/clear` | POST | Clear all caches |

**Example:**
```bash
# Get real-time price
curl http://localhost:3001/api/realtime/INFY

# Get complete stock data
curl "http://localhost:3001/api/realtime/INFY/complete?includeHistory=true&historyRange=1mo"

# Batch fetch
curl -X POST http://localhost:3001/api/realtime/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["RELIANCE", "TCS", "INFY"]}'
```

### 🔍 Market Scanner

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scanner/universe` | GET | Get stock universe info |
| `/api/screener/find-opportunities` | POST | Original screener |
| `/api/screener/strategies` | GET | List screening strategies |

## Trading Strategies Explained

### Intraday Scalping
- **Timeframe**: 5min to 1hr charts
- **Holding Period**: Same day
- **Risk/Reward**: 1.5:1
- **Best For**: Active traders with time to monitor
- **Indicators**: RSI, VWAP, Volume, Support/Resistance

### Swing Trading
- **Timeframe**: 1hr to daily charts
- **Holding Period**: 2-10 days
- **Risk/Reward**: 2:1
- **Best For**: Part-time traders
- **Indicators**: Pattern analysis, RSI, MACD, Volume, Trend

### Short-term Position
- **Timeframe**: Daily charts
- **Holding Period**: 1-4 weeks
- **Risk/Reward**: 2.5:1
- **Best For**: Position traders
- **Indicators**: Technical + Fundamental blend

### Long-term Investment
- **Timeframe**: Weekly/monthly charts
- **Holding Period**: 3-12 months
- **Risk/Reward**: 3:1
- **Best For**: Investors
- **Indicators**: Fundamental analysis, growth metrics, valuation

## ML Prediction Model

### Architecture
- **Input Layer**: 15 technical indicators
  - RSI, SMA20, SMA50, EMA12, EMA26
  - MACD (value, signal, histogram)
  - Bollinger Bands (upper, middle, lower)
  - ATR, Stochastic (K, D), Volume ratio

- **Hidden Layers**: 3 layers [20, 15, 10 neurons]
- **Output Layer**: 3 classes [Bearish, Neutral, Bullish]

### Training
- **Data**: 6 months of historical data
- **Samples**: Sliding window approach
- **Learning Rate**: 0.01
- **Iterations**: Up to 1000 or error < 0.005
- **Cost Function**: Cross-entropy

### Prediction Output
```json
{
  "symbol": "RELIANCE",
  "prediction": "BULLISH",
  "confidence": 78,
  "probabilities": {
    "bearish": 8,
    "neutral": 14,
    "bullish": 78
  },
  "currentPrice": 2850.50,
  "targetPrice": 2935.20,
  "expectedMove": 2.97,
  "volatility": 1.85
}
```

## Master Scan Example

The Master Scan combines multiple detection methods:

```bash
curl -X POST http://localhost:3001/api/trading/master-scan \
  -H "Content-Type: application/json" \
  -d '{
    "strategies": ["SWING", "SHORT_TERM"],
    "minScore": 70,
    "maxResults": 30
  }'
```

**Response includes:**
- Traditional strategy-based opportunities
- ML-predicted opportunities
- Early mover detections (volume accumulation, volatility compression)
- Market context (sentiment, hot sectors)
- Multi-source confirmation scores

## Stock Universe

- **NIFTY 50**: 50 large-cap stocks
- **Mid-cap**: 25 mid-cap stocks
- **Momentum**: 15 high-momentum stocks
- **Total**: 90 actively scanned stocks

## Tech Stack

### Backend
- **Runtime**: Node.js 24+
- **Framework**: Express 5
- **ML Library**: Synaptic.js (neural networks)
- **Technical Indicators**: technicalindicators npm package
- **Math**: simple-statistics, mathjs
- **Data Sources**: 
  - Yahoo Finance (primary)
  - Moneycontrol (Indian stocks)
  - RapidAPI (fallback)
- **Caching**: node-cache (in-memory)

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 7
- **Charts**: Recharts, lightweight-charts
- **Styling**: Tailwind CSS 4

## Performance Optimizations

### Caching Strategy
- **Price Data**: 10-second TTL (real-time feel)
- **Historical Data**: 5-minute TTL (reduces API calls)
- **Fundamental Data**: 1-hour TTL (rarely changes)

### Parallel Processing
- Batch API calls (5 concurrent max)
- Promise.all for independent operations
- Rate limiting with delays (100-200ms between batches)

### Smart Scanning
- Pre-filtered stock universe
- Early exit on low scores
- Incremental results reporting

## Security

- API keys stored in `.env` (not committed)
- Input validation on all endpoints
- Rate limiting on intensive operations
- Error handling with fallbacks

## Environment Variables (Optional)

Create a `.env` file:

```env
RAPIDAPI_KEY=your-rapidapi-key-here
FINNHUB_API_KEY=your-finnhub-key-here
PORT=3001
NODE_ENV=development
```

## Project Structure

```
stock-dashboard/
├── src/
│   ├── server.js                           # Main API server
│   └── services/
│       ├── stockService.js                 # Multi-source price fetching
│       ├── historicalService.js            # Historical data
│       ├── realTimeDataService.js          # 🆕 Real-time with caching
│       ├── mlPredictionService.js          # 🆕 ML predictions
│       ├── intelligentTradingEngine.js     # 🆕 Multi-strategy analysis
│       ├── advancedMarketScanner.js        # 🆕 Advanced scanning
│       ├── aiPredictionService.js          # Pattern-based AI
│       ├── enhancedPredictionEngine.js     # Premium signals
│       ├── patternAnalysisService.js       # Chart patterns
│       ├── advancedTechnicalService.js     # Technical indicators
│       ├── marketSentimentService.js       # Market sentiment
│       ├── riskManagementService.js        # Risk calculations
│       ├── scoringService.js               # Stock scoring
│       ├── screenerService.js              # Stock screener
│       └── strategyPresetsService.js       # Strategy presets
├── frontend/
│   └── src/
│       ├── App.jsx                         # Main app
│       └── components/                     # React components
└── package.json
```

## Backtesting

Test strategies on historical data:

```bash
curl -X POST http://localhost:3001/api/trading/backtest/RELIANCE \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "SWING",
    "period": "1y",
    "capital": 100000
  }'
```

**Response includes:**
- Total return %
- Win rate
- Average win/loss
- Max drawdown
- Trade history

## Tips for Best Results

### For Intraday Trading
1. Monitor during market hours (9:15 AM - 3:30 PM IST)
2. Focus on high-liquidity stocks (NIFTY 50)
3. Use tight stop-losses (1-2%)
4. Book profits quickly at targets

### For Swing Trading
1. Scan after market close for next day setups
2. Look for pattern breakouts + volume confirmation
3. Hold 2-10 days typically
4. Use 3-4% stop-loss

### For Position Trading
1. Weekly scans are sufficient
2. Combine technical + fundamental analysis
3. Wider stop-losses (5-8%)
4. Target 10-20% returns

### For Long-term Investing
1. Focus on fundamentals (P/E, growth, sector)
2. Monthly rebalancing
3. Wide stop-losses (15%+)
4. Target 30-50% returns

## Known Limitations

- Market data delayed by 15-20 minutes in some regions
- NSE direct API often blocked (fallback to Yahoo Finance)
- ML models require retraining periodically
- Rate limits on free API tiers

## Author

Made by Vivek

## License

ISC
