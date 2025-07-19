import Script from 'next/script';
import type { Metadata } from "next";
import SmoothScrollWrapper from './SmoothScrollWrapper';

export const metadata: Metadata = {
  title: "Digipod – Anti-Productivity SaaS",
  description: "Digipod: The anti-productivity tool for creative agencies and freelancers.",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* 3JS and dat.GUI for animated wave background */}
        <Script src="https://unpkg.com/three@0.155.0/build/three.min.js" strategy="beforeInteractive" />
        <Script src="/dat.gui.min.js" strategy="beforeInteractive" />
        <Script src="/locomotive.min.js" strategy="beforeInteractive" />
      </head>
      <body style={{ fontFamily: 'Inter, Sora, sans-serif' }}>
        <SmoothScrollWrapper>
          {children}
        </SmoothScrollWrapper>
        <Script src="/script.js" strategy="afterInteractive" />
      </body>
    </html>
  );
} 