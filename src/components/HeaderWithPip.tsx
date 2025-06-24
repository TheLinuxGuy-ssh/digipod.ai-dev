"use client";
import React from 'react';
import PipAvatar from './PipAvatar';

export default function HeaderWithPip() {
  const [hoursSaved, setHoursSaved] = React.useState(0);
  const [focusMode, setFocusMode] = React.useState(false);
  const [pipAnimate, setPipAnimate] = React.useState(false);

  React.useEffect(() => {
    const saved = parseInt(localStorage.getItem('digipod-hours-saved') || '0', 10);
    setHoursSaved(saved);
    setFocusMode(localStorage.getItem('digipod-focus-mode') === 'on');
    setPipAnimate(true);
    setTimeout(() => setPipAnimate(false), 1200);
  }, []);

  return (
    <header className="w-full flex items-center justify-between px-8 py-4 border-b bg-white/80 backdrop-blur z-30 sticky top-0">
      <div className="font-extrabold text-xl tracking-tight text-blue-700">Digipod</div>
      <div className="ml-auto flex items-center gap-4">
        <PipAvatar hoursSaved={hoursSaved} focusMode={focusMode} animate={pipAnimate} />
      </div>
    </header>
  );
} 