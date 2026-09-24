// The tradable universe. Prices are seed anchors for the random-walk engine;
// the demo feed generates live ticks and history from them deterministically.
// Region 'IN' quotes in INR on NSE; 'US' quotes in USD on NASDAQ/NYSE (fallback feed).

export const STOCKS = [
  // ---------- NSE ----------
  { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', region: 'IN', sector: 'Energy', base: 2985.4 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', region: 'IN', sector: 'IT', base: 4126.75 },
  { symbol: 'INFY', name: 'Infosys', exchange: 'NSE', region: 'IN', sector: 'IT', base: 1873.2 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', region: 'IN', sector: 'Financials', base: 1642.9 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE', region: 'IN', sector: 'Financials', base: 1178.35 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', exchange: 'NSE', region: 'IN', sector: 'Telecom', base: 1387.6 },
  { symbol: 'ITC', name: 'ITC', exchange: 'NSE', region: 'IN', sector: 'FMCG', base: 438.15 },
  { symbol: 'LT', name: 'Larsen & Toubro', exchange: 'NSE', region: 'IN', sector: 'Industrials', base: 3542.8 },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', region: 'IN', sector: 'Financials', base: 812.45 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', exchange: 'NSE', region: 'IN', sector: 'Auto', base: 968.3 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', exchange: 'NSE', region: 'IN', sector: 'Auto', base: 12480.5 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', exchange: 'NSE', region: 'IN', sector: 'Pharma', base: 1778.9 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', exchange: 'NSE', region: 'IN', sector: 'FMCG', base: 2456.7 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', exchange: 'NSE', region: 'IN', sector: 'Industrials', base: 2941.55 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', exchange: 'NSE', region: 'IN', sector: 'Financials', base: 6894.25 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', exchange: 'NSE', region: 'IN', sector: 'Materials', base: 2834.6 },
  { symbol: 'TITAN', name: 'Titan Company', exchange: 'NSE', region: 'IN', sector: 'Consumer', base: 3395.85 },
  { symbol: 'WIPRO', name: 'Wipro', exchange: 'NSE', region: 'IN', sector: 'IT', base: 521.4 },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corp', exchange: 'NSE', region: 'IN', sector: 'Energy', base: 264.8 },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Laboratories", exchange: 'NSE', region: 'IN', sector: 'Pharma', base: 1289.75 },
  // ---------- US (fallback feed) ----------
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', region: 'US', sector: 'Technology', base: 227.48 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', region: 'US', sector: 'Technology', base: 416.12 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', region: 'US', sector: 'Technology', base: 118.62 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', region: 'US', sector: 'Technology', base: 162.45 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', region: 'US', sector: 'Consumer', base: 183.28 },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', region: 'US', sector: 'Technology', base: 512.7 },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', region: 'US', sector: 'Auto', base: 216.53 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', region: 'US', sector: 'Financials', base: 208.91 },
  { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', region: 'US', sector: 'Financials', base: 272.36 },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE', region: 'US', sector: 'Energy', base: 115.84 },
  { symbol: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE', region: 'US', sector: 'Consumer', base: 63.29 },
  { symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE', region: 'US', sector: 'Media', base: 89.47 }
]

export const SECTORS = [...new Set(STOCKS.map((s) => s.sector))].sort()

export const INSTRUMENTS = {
  RELIANCE: { lot: 1 },
  default: { lot: 1 }
}

export const bySymbol = (sym) => STOCKS.find((s) => s.symbol === sym)

export const FEE_RATE = 0.0005 // 0.05% simulated brokerage per side
export const START_CASH = { IN: 1000000, US: 100000 } // virtual funds
