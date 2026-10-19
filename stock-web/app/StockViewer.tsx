"use client";

import { useEffect, useState } from "react";

type Row = Record<string, string | number | null>;
type StockResponse = { symbol: string; count: number; history: Row[]; error?: string };

const PRICE_KEYS = ["close", "adjclose", "adj_close", "price"];

function formatCell(value: Row[string]) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }
  // Trim "2024-01-02T00:00:00" to "2024-01-02".
  return /^\d{4}-\d{2}-\d{2}T00:00:00/.test(value) ? value.slice(0, 10) : value;
}

export default function StockViewer() {
  const [symbols, setSymbols] = useState<string[] | null>(null);
  const [symbolsError, setSymbolsError] = useState("");
  const [symbol, setSymbol] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<StockResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/symbols")
      .then(async (res) => {
        const body: { symbols?: string[]; error?: string } = await res.json();
        if (!res.ok || !body.symbols) throw new Error(body.error || `Request failed (${res.status}).`);
        setSymbols(body.symbols);
      })
      .catch((err: Error) => {
        setSymbols([]);
        setSymbolsError(`Could not load symbols: ${err.message}`);
      });
  }, []);

  async function load() {
    if (!symbol) return;
    setLoading(true);
    setError("");
    setData(null);
    const params = new URLSearchParams({ symbol });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const res = await fetch(`/api/stock?${params}`);
      const body: StockResponse = await res.json();
      if (res.status === 404) setError(`No price history found for ${symbol}.`);
      else if (!res.ok) setError(body.error || `Request failed (${res.status}).`);
      else setData(body);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const rows = data?.history ?? [];
  const columns = rows.length ? Object.keys(rows[0]).filter((c) => c.toLowerCase() !== "symbol") : [];
  const priceKey = columns.find((c) => PRICE_KEYS.includes(c.toLowerCase()));
  const latest = rows.at(-1);

  return (
    <>
      <form
        className="controls"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <label>
          Symbol
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            disabled={!symbols?.length}
            required
          >
            <option value="" disabled>
              {symbols === null ? "Loading symbols…" : symbols.length ? "Select…" : "No symbols"}
            </option>
            {symbols?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="submit" disabled={!symbol || loading}>
          {loading ? "Loading…" : "Get prices"}
        </button>
      </form>

      {symbols === null && (
        <p className="note">Loading symbols — the first request can take up to a minute while the database wakes up.</p>
      )}
      {symbolsError && <p className="error">{symbolsError}</p>}
      {loading && <p className="note">Fetching data — the first request can take up to a minute while the database wakes up.</p>}
      {error && <p className="error">{error}</p>}

      {data && rows.length > 0 && (
        <section>
          <div className="summary">
            <div>
              <span className="label">Symbol</span>
              <strong>{data.symbol}</strong>
            </div>
            {priceKey && latest && (
              <div>
                <span className="label">Latest {priceKey}</span>
                <strong>{formatCell(latest[priceKey])}</strong>
              </div>
            )}
            <div>
              <span className="label">Records</span>
              <strong>{data.count.toLocaleString()}</strong>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c} className={typeof row[c] === "number" ? "num" : undefined}>
                        {formatCell(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
