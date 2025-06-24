import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

const getAntiHustleText = (hours: number) => {
  if (hours >= 20) return "The system's scared of you. You're the AI now.";
  if (hours >= 15) return "Honestly, you might be immortal now.";
  if (hours >= 10) return "🎉 You're basically retired.";
  if (hours >= 9) return "You're untouchable. Admin who?";
  if (hours >= 8) return "8 hours saved. You skipped a full workday of nonsense.";
  if (hours >= 7) return "7 hours back. Start that passion project.";
  if (hours >= 6) return "6 hours of BS dodged. Go touch grass.";
  if (hours >= 5) return "5 hours saved. You can nap guilt-free now.";
  if (hours >= 4) return "That's 4 fewer hours explaining why the logo is not bigger.";
  if (hours >= 3) return "3 hrs reclaimed. Your flow state is making a comeback.";
  if (hours >= 2) return "2 hrs saved. Your brain says thanks.";
  if (hours >= 1) return "1 hour of BS dodged. Welcome to the rebellion.";
  return "You've still got admin goblins to slay.";
};

export default function AntiHustleMeter({ hoursSaved }: { hoursSaved: number }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (hoursSaved >= 10) {
      setShowConfetti(true);
      setShowPopup(true);
      const t = setTimeout(() => setShowPopup(false), 3500);
      return () => clearTimeout(t);
    } else {
      setShowConfetti(false);
      setShowPopup(false);
    }
  }, [hoursSaved]);

  // Reset every Monday
  useEffect(() => {
    const lastReset = localStorage.getItem('digipod-hours-reset');
    const now = new Date();
    const thisMonday = getMonday(now).toDateString();
    if (lastReset !== thisMonday) {
      localStorage.setItem('digipod-hours-reset', thisMonday);
      localStorage.setItem('digipod-hours-saved', '0');
    }
  }, []);

  const antiHustleText = getAntiHustleText(hoursSaved);

  return (
    <div className="flex flex-col items-end w-full max-w-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg font-extrabold" style={{ color: '#4D55CC' }}>{hoursSaved} hr{hoursSaved === 1 ? '' : 's'} saved</span>
        <span className="text-xs text-gray-500 font-semibold">{antiHustleText}</span>
      </div>
      <div className="relative w-full h-3 rounded-full border" style={{ borderColor: '#4D55CC', background: '#f3f4fa' }}>
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ background: 'linear-gradient(to right, #6ee7b7, #4D55CC)' }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(hoursSaved, 20) / 20 * 100}%` }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
        />
      </div>
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <span className="text-3xl animate-bounce">🎉🎊</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-white border shadow-xl rounded-lg px-8 py-4 z-50 text-lg font-bold animate-fade-in"
            style={{ borderColor: '#4D55CC', color: '#4D55CC' }}
          >
            You&apos;re basically retired.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// CSS for fade-in (add to global or tailwind config):
// .animate-fade-in { animation: fadeIn 0.2s ease; }
// @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } } 