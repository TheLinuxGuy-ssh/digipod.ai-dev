import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import HeaderWithPip from '../components/HeaderWithPip';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Digipod – Anti-Productivity SaaS",
  description: "Digipod: The anti-productivity tool for creative agencies and freelancers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 flex min-h-screen`}
      >
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Global Header with Pip removed to fix server error */}
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
