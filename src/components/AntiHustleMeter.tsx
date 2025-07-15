import React, { useEffect, useState } from 'react';

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

const getAntiHustleText = (minutes: number) => {
  
  if (minutes >= 1200) return "The system's scared of you. You're the AI now."; // 20 hours
  if (minutes >= 900) return "Honestly, you might be immortal now."; // 15 hours
  if (minutes >= 600) return "🎉 You're basically retired."; // 10 hours
  if (minutes >= 540) return "You're untouchable. Admin who?"; // 9 hours
  if (minutes >= 480) return "8 hours saved. You skipped a full workday of nonsense."; // 8 hours
  if (minutes >= 420) return "7 hours back. Start that passion project."; // 7 hours
  if (minutes >= 360) return "6 hours of BS dodged. Go touch grass."; // 6 hours
  if (minutes >= 300) return "5 hours saved. You can nap guilt-free now."; // 5 hours
  if (minutes >= 240) return "That's 4 fewer hours explaining why the logo is not bigger."; // 4 hours
  if (minutes >= 180) return "3 hrs reclaimed. Your flow state is making a comeback."; // 3 hours
  if (minutes >= 120) return "2 hrs saved. Your brain says thanks."; // 2 hours
  if (minutes >= 60) return "1 hour of BS dodged. Welcome to the rebellion."; // 1 hour
  if (minutes >= 30) return `${minutes} minutes of BS dodged. Keep it up!`;
  if (minutes >= 10) return `${minutes} minutes saved. Your rebellion is growing.`;
  if (minutes >= 5) return `${minutes} minutes reclaimed. Every minute counts!`;
  if (minutes >= 1) return `${minutes} minute${minutes === 1 ? '' : 's'} of BS dodged. Welcome to the rebellion.`;
  return "You've still got admin goblins to slay.";
};

const confettiThresholds = [300, 600, 1200]; // 5 hours, 10 hours, 20 hours in minutes

export default function AntiHustleMeter({ minutesSaved }: { minutesSaved: number }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [lastThreshold, setLastThreshold] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const crossed = confettiThresholds.find(t => minutesSaved === t && lastThreshold !== t);
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
  }, [minutesSaved, lastThreshold]);

      // Reset every Monday
    useEffect(() => {
      const lastReset = localStorage.getItem('digipod-minutes-reset');
      const now = new Date();
      const thisMonday = getMonday(now).toDateString();
      if (lastReset !== thisMonday) {
        localStorage.setItem('digipod-minutes-reset', thisMonday);
        localStorage.setItem('digipod-minutes-saved', '0');
      }
    }, []);

    const antiHustleText = getAntiHustleText(minutesSaved);

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
            width: `${Math.min(minutesSaved, 1200) / 1200 * 100}%`, // 1200 minutes = 20 hours
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
        <span className="text-lg font-extrabold" style={{ color: '#4D55CC' }}>
          {Math.floor(minutesSaved / 60)}h {minutesSaved % 60}m saved
        </span>
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