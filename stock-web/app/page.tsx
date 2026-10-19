import StockViewer from "./StockViewer";

export default function Home() {
  return (
    <main className="container">
      <h1>Stock History</h1>
      <p className="subtitle">Pick a symbol to load its price history.</p>
      <StockViewer />
    </main>
  );
}
