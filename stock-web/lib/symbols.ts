const DEFAULT_SYMBOLS = "AAPL,MSFT,GOOGL,AMZN,NVDA,META,TSLA";

export function getSymbols(): string[] {
  return (process.env.STOCK_SYMBOLS || DEFAULT_SYMBOLS)
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}
