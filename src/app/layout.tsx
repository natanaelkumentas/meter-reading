import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "VoltFlow | Power Supply Telemetry",
  description: "Premium daily voltage reading logs and analytical data display.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="nav-container">
          <div className="nav-brand">
            <span>⚡</span> VoltFlow
          </div>
          <nav className="nav-links">
            <Link href="/" className="nav-link">
              New Entry
            </Link>
            <Link href="/display" className="nav-link">
              Telemetry History
            </Link>
          </nav>
        </header>

        <main className="main-wrapper">
          {children}
        </main>

        <footer className="footer">
          VoltFlow Telemetry Console &bull; Connected to Supabase power schema
        </footer>
      </body>
    </html>
  );
}
