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
      <link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" />
<link href="https://fonts.googleapis.com/css2?family=Boldonse&family=Host+Grotesk:ital,wght@0,300..800;1,300..800&family=Kanit:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Pixelify+Sans:wght@400..700&family=Special+Gothic+Expanded+One&display=swap" rel="stylesheet" />
        {/* Only global scripts and meta here. No landing CSS/scripts. */}
        <Script src="https://cdn.jsdelivr.net/npm/vanilla-tilt@1.7.2/dist/vanilla-tilt.min.js" strategy="beforeInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" strategy="beforeInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/InertiaPlugin.min.js" strategy="beforeInteractive" />
        <Script src="https://unpkg.com/three@0.160.0/build/three.min.js" strategy="beforeInteractive" />
        <Script src="/dat.gui.min.js" strategy="beforeInteractive" />
        <Script src="/locomotive.min.js" strategy="afterInteractive" />
      </head>
      <body>
        <SWRProvider>
          {children}
        </SWRProvider>
      </body>
    </html>
  );
}
