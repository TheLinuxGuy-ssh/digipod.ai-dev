import React, { useEffect, useState } from 'react';

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

const confettiThresholds = [5, 10, 20];

export default function AntiHustleMeter({ hoursSaved }: { hoursSaved: number }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [lastThreshold, setLastThreshold] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const crossed = confettiThresholds.find(t => hoursSaved === t && lastThreshold !== t);
    if (crossed) {
      setShowConfetti(true);
      setShowPopup(true);
      setLastThreshold(crossed);
      const t = setTimeout(() => setShowPopup(false), 3500);
      const c = setTimeout(() => setShowConfetti(false), 2000);
      return () => { clearTimeout(t); clearTimeout(c); };
    } else {
      setShowConfetti(false);
      setShowPopup(false);
    }
  }, [hoursSaved, lastThreshold]);

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
    <div
      className="relative flex flex-col items-center gap-2 w-full"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      aria-label="Anti-Hustle Meter"
    >
      <div className="relative w-full h-3 rounded-full border overflow-hidden shadow-inner" style={{ borderColor: '#4D55CC', background: '#f3f4fa' }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full shadow-lg transition-all duration-1000"
          style={{
            background: 'linear-gradient(90deg, #6ee7b7, #4D55CC, #a5b4fc)',
            boxShadow: '0 0 16px #4D55CC55',
            width: `${Math.min(hoursSaved, 20) / 20 * 100}%`,
          }}
        />
        {/* Shimmer effect */}
        <div
          className="absolute left-0 top-0 h-full w-full pointer-events-none animate-fade-in"
          style={{ background: 'linear-gradient(120deg, #fff6, #fff0 60%)', opacity: 0.15 }}
        />
      </div>
      {showConfetti && (
        <div className="absolute left-1/2 top-0 -translate-x-1/2 z-50 animate-bounce animate-fade-in">
          <span className="text-4xl">🎉🎊</span>
        </div>
      )}
      {showPopup && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-white/90 border shadow-xl rounded-lg px-8 py-4 z-50 text-lg font-bold animate-fade-in backdrop-blur"
          style={{ borderColor: '#4D55CC', color: '#4D55CC' }}>
          You&apos;re basically retired.
        </div>
      )}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg font-extrabold" style={{ color: '#4D55CC' }}>{hoursSaved} hr{hoursSaved === 1 ? '' : 's'} saved</span>
        <span className="text-xs text-gray-500 font-semibold">{antiHustleText}</span>
      </div>
      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-12 bg-white text-gray-800 text-xs rounded-lg shadow-lg px-4 py-2 z-20 max-w-xs w-max break-words whitespace-pre-line border border-gray-200 font-semibold animate-fade-in text-center">
          This meter tracks how many hours of admin work Digipod has saved you this week.\nIt increases when AI replies or project phases advance.
      </div>
      )}
    </div>
  );
}

// CSS for fade-in (add to global or tailwind config):
// .animate-fade-in { animation: fadeIn 0.2s ease; }
// @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } } 