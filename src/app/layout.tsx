import type { Metadata } from "next";
import "./globals.css";
import SWRProvider from '../components/SWRProvider';
// import HeaderWithPip from '../components/HeaderWithPip';

export const metadata: Metadata = {
  title: "Digipod – Anti-Productivity SaaS",
  description: "Digipod: The anti-productivity tool for creative agencies and freelancers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen">
        <SWRProvider>
          {children}
        </SWRProvider>
      </body>
    </html>
  );
}
