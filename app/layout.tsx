import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Epoch Journeys",
  description: "B2B tour operator platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
