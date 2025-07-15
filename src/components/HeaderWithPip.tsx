"use client";
import React, { useEffect } from 'react';
import PipAvatar from './PipAvatar';
import Image from 'next/image';

export default function HeaderWithPip() {
  const [minutesSaved, setMinutesSaved] = React.useState(0);
  const [focusMode, setFocusMode] = React.useState(false);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem('digipod-minutes-saved') || '0', 10);
    setMinutesSaved(saved);
    setFocusMode(localStorage.getItem('digipod-focus-mode') === 'on');
  }, []);

  return (
    <header className="w-full flex items-center justify-between px-8 py-4 border-b bg-white/80 backdrop-blur z-30 sticky top-0">
      <div className="flex items-center">
        <Image src="/digilogo.png" alt="Digipod Logo" width={120} height={40} />
      </div>
      <div className="ml-auto flex items-center gap-4">
        <PipAvatar minutesSaved={minutesSaved} focusMode={focusMode} />
      </div>
    </header>
  );
} 