import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHub — One catalog for every store",
  description:
    "Search SSENSE, Off-White, Farfetch, Saks, Nordstrom and Google Shopping in one unified catalog.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
