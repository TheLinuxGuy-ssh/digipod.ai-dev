import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const FOCUS_DURATION = 25 * 60; // 25 min in seconds

export default function FocusModeToggle({ focusMode, setFocusMode }: { focusMode: boolean, setFocusMode: (v: boolean) => void }) {
  const [showToast, setShowToast] = useState(false);
  const [timer, setTimer] = useState(FOCUS_DURATION);
  useEffect(() => {
    let interval: any;
    if (focusMode) {
      setShowToast(true);
      interval = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            setFocusMode(false);
            localStorage.setItem('digipod-focus-mode', 'off');
            return FOCUS_DURATION;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      setTimer(FOCUS_DURATION);
    }
    return () => clearInterval(interval);
  }, [focusMode, setFocusMode]);

  useEffect(() => {
    if (showToast) {
      const t = setTimeout(() => setShowToast(false), 2500);
      return () => clearTimeout(t);
    }
  }, [showToast]);

  const handleToggle = () => {
    if (!focusMode) {
      setFocusMode(true);
      localStorage.setItem('digipod-focus-mode', 'on');
      setShowToast(true);
    } else {
      setFocusMode(false);
      localStorage.setItem('digipod-focus-mode', 'off');
    }
  };

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <div className="flex flex-col items-end mb-4">
      <motion.button
        onClick={handleToggle}
        className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold shadow-md border transition-all duration-200 ${focusMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}`}
        whileTap={{ scale: 0.95 }}
        aria-pressed={focusMode}
      >
        <span className="text-lg">🔕</span>
        Focus Mode
        {focusMode && <span className="ml-2 text-xs font-mono bg-gray-800 text-white rounded px-2 py-0.5">{minutes}:{seconds.toString().padStart(2, '0')}</span>}
      </motion.button>
      {showToast && (
        <div className="mt-2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold animate-fade-in">
          You've entered Focus Mode. Your client can wait.
        </div>
      )}
      {focusMode && (
        <div className="mt-2 text-xs text-gray-500 font-semibold">Pip put on headphones. You're unreachable. <span className="ml-1">🧢</span></div>
      )}
    </div>
  );
}

// CSS for fade-in (add to global or tailwind config):
// .animate-fade-in { animation: fadeIn 0.2s ease; }
// @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } } 