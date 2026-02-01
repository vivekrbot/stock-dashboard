# Stock Dashboard

Advanced NSE Stock Analysis & Screener with real-time data from Yahoo Finance.

## Features

- 📊 Real-time stock prices from NSE
- 📈 Technical analysis (RSI, SMA, MACD)
- 💼 Fundamental analysis (P/E, P/B, Market Cap)
- 🎯 Strategy-based stock screening
- 📱 Modern React frontend with splash screen

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

## Project Structure

```
stock-dashboard/
├── src/
│   ├── server.js          # Express API server
│   └── services/          # Business logic
│       ├── stockService.js
│       ├── scoringService.js
│       ├── screenerService.js
│       └── strategyPresetsService.js
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── StockCard.jsx
│           ├── AnalysisModal.jsx
│           └── SplashScreen.jsx
├── .env                   # API keys (optional)
└── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stock/:symbol` | Get stock price |
| GET | `/api/stock/:symbol/analyze` | Full stock analysis |
| GET | `/api/screener/strategies` | List strategies |
| POST | `/api/screener/find-opportunities` | Screen stocks |

## Environment Variables (Optional)

Create a `.env` file:

```
RAPIDAPI_KEY=your-key-here
FINNHUB_API_KEY=your-key-here
```

## Tech Stack

- **Backend**: Node.js, Express 5, yahoo-finance2
- **Frontend**: React 19, Vite 7
- **Data**: Yahoo Finance API

## Author

Made by Vivek
