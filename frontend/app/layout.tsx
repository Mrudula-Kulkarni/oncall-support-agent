import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "On-Call Support Agent",
  description:
    "Four agents take a production alert and return what broke, where in the code, and a fix grounded in past incidents.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
