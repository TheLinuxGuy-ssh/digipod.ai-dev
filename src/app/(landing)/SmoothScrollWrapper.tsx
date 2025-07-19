'use client';
import { useEffect, ReactNode } from 'react';

declare global {
  interface Window {
    LocomotiveScroll?: unknown;
  }
}

export default function SmoothScrollWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.LocomotiveScroll) {
      const LocomotiveScroll = window.LocomotiveScroll as unknown as { new(...args: unknown[]): unknown };
      const scroll = new LocomotiveScroll({
        el: document.querySelector('[data-scroll-container]') as HTMLElement,
        smooth: true,
        lerp: 0.08,
      }) as { destroy?: () => void };
      return () => scroll && scroll.destroy && scroll.destroy();
    }
  }, []);
  return <div data-scroll-container>{children}</div>;
} 