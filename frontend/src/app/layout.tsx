import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SentinelAura",
  description: "Visual Geographic Arbitrage Engine for Kubernetes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased m-0 p-0 overflow-hidden w-screen h-screen">
        {children}
      </body>
    </html>
  );
}
