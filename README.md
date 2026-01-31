# 📈 Stock Dashboard

Real-time Indian stock market analysis dashboard with NSE/BSE data, technical indicators, and smart screening capabilities.

![Stock Dashboard](https://img.shields.io/badge/Status-Production%20Ready-green)
![Node.js](https://img.shields.io/badge/Node.js-v18+-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)

## ✨ Features

- **Real-time Stock Prices** - Live data from Yahoo Finance API
- **Technical Analysis** - RSI, SMA, EMA, momentum indicators
- **Fundamental Analysis** - P/E ratio, market cap, sector info
- **Smart Screener** - Find opportunities with 3 trading strategies:
  - Short-term (1-7 days)
  - Balanced (1-4 weeks)
  - Long-term (1-6 months)
- **Pattern Detection** - Breakouts, consolidation, support/resistance
- **Sector Analysis** - Identify sector leaders

## 🚀 Quick Start

### Prerequisites
- Node.js v18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/stock-dashboard.git
cd stock-dashboard

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Configuration

Create a `.env` file in the root directory:

```env
RAPIDAPI_KEY=your_rapidapi_key_here
FINNHUB_API_KEY=your_finnhub_key_here
```

> Note: The app works with Yahoo Finance by default. RapidAPI keys are optional for additional data sources.

### Running

**Development Mode:**
```bash
# Terminal 1 - Backend (port 3001)
npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend && npm run dev
```

**Production Mode:**
```bash
npm run prod
```

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/stock/:symbol` | GET | Get stock price |
| `/api/stock/:symbol/analyze` | GET | Full stock analysis |
| `/api/stock/:symbol/history` | GET | Historical data |
| `/api/screener/find-opportunities` | POST | Smart stock screener |
| `/api/screener/strategies` | GET | Available strategies |

## 🛠️ Tech Stack

**Backend:**
- Express.js 5.x
- Node.js
- Yahoo Finance 2 API
- RapidAPI (optional)

**Frontend:**
- React 19
- Vite 7
- Recharts
- TailwindCSS

## 📁 Project Structure

```
stock-dashboard/
├── src/
│   ├── server.js           # Express server
│   ├── api/                 # API routes
│   └── services/
│       ├── stockService.js      # Stock data fetching
│       ├── scoringService.js    # Analysis & scoring
│       ├── screenerService.js   # Stock screening
│       ├── patternService.js    # Pattern detection
│       └── sectorService.js     # Sector analysis
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   │       ├── StockCard.jsx
│   │       └── AnalysisModal.jsx
│   └── dist/               # Production build
├── .env                    # Environment variables
└── package.json
```

## 📈 Supported Stocks

The screener includes 80 popular NSE stocks:
- **Large Cap (50):** RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK, etc.
- **Mid Cap (20):** PAGEIND, MPHASIS, AUROPHARMA, LUPIN, etc.
- **Small Cap (10):** NAVINFLUOR, DEEPAKNTR, KPITTECH, etc.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

ISC License

## ⚠️ Disclaimer

This tool is for educational and informational purposes only. It should not be considered as financial advice. Always do your own research before making investment decisions.
