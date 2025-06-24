"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const getPipEmoji = (hours: number, focusMode: boolean) => {
  if (focusMode) return '🧢';
  if (hours > 10) return '🤖';
  if (hours >= 3) return '😎';
  return '😴';
};

const getTooltip = (hours: number, focusMode: boolean) => {
  if (focusMode) return "Pip's in Focus Mode. Headphones on, world off.";
  if (hours > 10) return "Pip just dodged a 7-email thread for you. You're basically retired.";
  if (hours >= 3) return "Pip's feeling cool. That's a lot of admin dodged!";
  return "Pip's been chilling. Let's delete more work.";
};

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

export default function PipAvatar({ hoursSaved, focusMode, animate, message, onClick }: { hoursSaved: number, focusMode: boolean, animate: boolean, message?: string, onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  const [showLog, setShowLog] = useState(false);
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

  // Mock log data (replace with real automations if available)
  const log = [
    { type: 'AI Reply', detail: 'Wrote a reply to client', time: '2 min ago' },
    { type: 'Phase Advance', detail: 'Auto-moved project to DESIGN', time: '1 hr ago' },
    { type: 'Focus Mode', detail: 'Muted client notifications', time: 'Today' },
    { type: 'Inbox Filter', detail: 'Filtered 7 emails', time: 'Yesterday' },
  ];

  const emoji = getPipEmoji(hoursSaved, focusMode);
  const tooltip = getTooltip(hoursSaved, focusMode);

  return (
    <div className="relative flex flex-col items-center cursor-pointer select-none" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} tabIndex={0} aria-label="Pip the Assistant">
      <AnimatePresence>
        <motion.span
          key={emoji}
          initial={{ y: animate ? -20 : 0, scale: animate ? 1.2 : 1 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: animate ? 20 : 0, scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.5, duration: 0.6 }}
          className="text-3xl md:text-4xl lg:text-5xl drop-shadow cursor-pointer"
          aria-label="Pip avatar"
          onClick={onClick || (() => setShowLog(true))}
        >
          {emoji}
        </motion.span>
      </AnimatePresence>
      {/* Speech bubble */}
      <motion.div
        key={bubbleMsg}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg px-4 py-2 z-50 max-w-xs w-max break-words whitespace-pre-line border border-gray-200 font-semibold animate-fade-in text-center"
        style={{ minWidth: 120 }}
        role="status"
      >
        {bubbleMsg}
      </motion.div>
      {/* Pip's Log Modal */}
      <AnimatePresence>
        {showLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={(e) => { e.stopPropagation(); setShowLog(false); }}
          >
            <div ref={logRef} className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md border border-blue-100 relative" onClick={(e) => e.stopPropagation()}>
              <button className="absolute top-3 right-3 p-2 rounded hover:bg-gray-100" onClick={(e) => { e.stopPropagation(); setShowLog(false); }}>
                <span className="text-xl">✖️</span>
              </button>
              <div className="font-bold text-lg mb-4 flex items-center gap-2">Pip's Log</div>
              <div className="mb-4 text-gray-600 text-sm">Here's what I've done for you lately:</div>
              <ul className="space-y-3">
                {log.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="text-xl">{item.type === 'AI Reply' ? '💬' : item.type === 'Phase Advance' ? '🚀' : item.type === 'Focus Mode' ? '🔕' : '📥'}</span>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{item.type}</div>
                      <div className="text-xs text-gray-500">{item.detail}</div>
                    </div>
                    <div className="ml-auto text-xs text-gray-400">{item.time}</div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 text-xs text-gray-400 text-center">More admin deleted soon…</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// CSS for fade-in (add to global or tailwind config):
// .animate-fade-in { animation: fadeIn 0.2s ease; }
// @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } } 