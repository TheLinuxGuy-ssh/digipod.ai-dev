import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
// import HeaderWithPip from '../components/HeaderWithPip';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
        className={`${inter.variable} antialiased text-gray-900 flex min-h-screen bg-gray-50`}
      >
        <ThemeProvider>
          <div className="flex-1 flex flex-col min-h-screen">
            {/* Global Header with Pip removed to fix server error */}
            <div className="flex-1">{children}</div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
