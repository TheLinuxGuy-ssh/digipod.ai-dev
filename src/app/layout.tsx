import type { Metadata } from "next";
import "./globals.css";
import SWRProvider from '../components/SWRProvider';
import Script from 'next/script';

export const metadata: Metadata = {
  title: "Digipod – Anti-Productivity SaaS",
  description: "Digipod: The anti-productivity tool for creative agencies and freelancers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Only global scripts and meta here. No landing CSS/scripts. */}
        <Script src="https://cdn.jsdelivr.net/npm/vanilla-tilt@1.7.2/dist/vanilla-tilt.min.js" strategy="beforeInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" strategy="beforeInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/InertiaPlugin.min.js" strategy="beforeInteractive" />
        <Script src="https://unpkg.com/three@0.155.0/build/three.min.js" strategy="beforeInteractive" />
        <Script src="/dat.gui.min.js" strategy="beforeInteractive" />
        <Script src="/locomotive.min.js" strategy="afterInteractive" />
        <Script src="/new.js" strategy="afterInteractive" />
      </head>
      <body>
        <SWRProvider>
          {children}
        </SWRProvider>
      </body>
    </html>
  );
}
