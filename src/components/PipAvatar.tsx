"use client";
import React, { useState, useEffect, useRef } from 'react';

const getPipEmoji = (hours: number, focusMode: boolean) => {
  if (focusMode) return '🧢';
  if (hours > 10) return '🤖';
  if (hours >= 3) return '😎';
  return '😴';
};

// Comment out unused variable 'getTooltip' at line 12
// const getTooltip = (hours: number, focusMode: boolean) => {
//   if (focusMode) return "Pip's in Focus Mode. Headphones on, world off.";
//   if (hours > 10) return "Pip just dodged a 7-email thread for you. You're basically retired.";
//   if (hours >= 3) return "Pip's feeling cool. That's a lot of admin dodged!";
//   return "Pip's been chilling. Let's delete more work.";
// };

const defaultMessages = [
  "Inbox zero? More like inbox hero.",
  "I'm on the lookout for admin nonsense.",
  "Let's see how much time we can save today.",
  "Focus Mode: Engaged. Your client can wait.",
  "I just wrote that for you. Easy.",
  "Less admin, more art.",
  "You just dodged 2 hours of email!",
  "Shhh… I'm blocking the noise.",
  "Pip's been chilling. Let's delete more work.",
  "Pip just dodged a 7-email thread for you. You're basically retired.",
  "Pip's feeling cool. That's a lot of admin dodged!"
];

function getRandomMessage(messages: string[], lastIdx: number) {
  let idx = Math.floor(Math.random() * messages.length);
  if (idx === lastIdx) idx = (idx + 1) % messages.length;
  return [messages[idx], idx];
}

export default function PipAvatar({ hoursSaved, focusMode, message }: { hoursSaved: number, focusMode: boolean, message?: string }) {
  const [showLog, setShowLog] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [bubbleMsg, setBubbleMsg] = useState(message || defaultMessages[0]);
  const [msgIdx, setMsgIdx] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  // Rotate message every 6s if not set by prop
  useEffect(() => {
    if (message) {
      setBubbleMsg(message);
      return;
    }
    const interval = setInterval(() => {
      const [msg, idx] = getRandomMessage(defaultMessages, msgIdx);
      setBubbleMsg(msg as string);
      setMsgIdx(idx as number);
    }, 6000);
    return () => clearInterval(interval);
  }, [message, msgIdx]);

  // Animate Pip when message changes
  useEffect(() => {
    // Could trigger animation here if needed
  }, [bubbleMsg]);

  // Close modal on Esc or click outside
  useEffect(() => {
    if (!showLog) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLog(false); };
    const clickHandler = (e: MouseEvent) => {
      if (logRef.current && !logRef.current.contains(e.target as Node)) setShowLog(false);
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('mousedown', clickHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('mousedown', clickHandler);
    };
  }, [showLog]);

  const emoji = getPipEmoji(hoursSaved, focusMode);
  // const tooltip = getTooltip(hoursSaved, focusMode); // Unused

  return (
    <div
      className="relative flex flex-col items-center cursor-pointer select-none"
      tabIndex={0}
      aria-label="Pip the Assistant"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Pip avatar */}
      <span
        className="text-3xl md:text-4xl lg:text-5xl drop-shadow"
          aria-label="Pip avatar"
        >
          {emoji}
      </span>
      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-10 sm:-top-12 bg-white text-gray-800 text-xs rounded-lg shadow-lg px-4 py-2 z-20 max-w-xs w-max break-words whitespace-pre-line border border-gray-200 font-semibold animate-fade-in text-center">
          Pip is your anti-hustle AI assistant.\nHover to see what Pip has done for you lately.
        </div>
      )}
      {/* Speech bubble (caption) always visible below Pip */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg px-4 py-2 z-10 max-w-xs w-max break-words whitespace-pre-line border border-gray-200 font-semibold animate-fade-in text-center"
        style={{ minWidth: 120 }}
        role="status"
      >
        {bubbleMsg}
            </div>
    </div>
  );
}

// CSS for fade-in (add to global or tailwind config):
// .animate-fade-in { animation: fadeIn 0.2s ease; }
// @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } } 