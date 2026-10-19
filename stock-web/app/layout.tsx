import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock History",
  description: "Historical stock prices from Azure SQL via Azure Functions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
