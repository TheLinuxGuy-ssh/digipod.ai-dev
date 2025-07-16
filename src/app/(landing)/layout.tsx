import '../style.css';
import '../locomotive.css';
import Script from 'next/script';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Digipod – Anti-Productivity SaaS",
  description: "Digipod: The anti-productivity tool for creative agencies and freelancers.",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Landing-specific scripts/styles */}
      </head>
      <body>
        {children}
        <Script src="/script.js" strategy="afterInteractive" />
      </body>
    </html>
  );
} 