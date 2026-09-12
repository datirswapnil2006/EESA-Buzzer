import React, { useState, useEffect } from 'react';

export default function Timer({ startTime, duration = 15, isActive = true, size = 'md', onExpire }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!isActive || !startTime) {
      setTimeLeft(duration);
      return;
    }

    const startMs = new Date(startTime).getTime();
    const durationMs = duration * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startMs;
      const remainingSec = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));

      setTimeLeft(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [startTime, duration, isActive, onExpire]);

  const config = {
    sm: { size: 48, stroke: 4, font: 'text-sm font-bold' },
    md: { size: 76, stroke: 5, font: 'text-xl font-extrabold' },
    lg: { size: 120, stroke: 7, font: 'text-3xl font-black' },
    display: { size: 160, stroke: 8, font: 'text-5xl font-black' },
  }[size] || { size: 76, stroke: 5, font: 'text-xl font-extrabold' };

  const radius = (config.size - config.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = duration > 0 ? (timeLeft / duration) : 0;
  const strokeDashoffset = circumference - progress * circumference;

  let strokeColor = '#2563EB'; // Primary Blue
  let textColor = 'text-slate-900';

  if (timeLeft <= 3) {
    strokeColor = '#DC2626'; // Danger Red
    textColor = 'text-red-600 animate-pulse-fast';
  } else if (timeLeft <= 5) {
    strokeColor = '#F59E0B'; // Warning Amber
    textColor = 'text-amber-600';
  }

  return (
    <div className="relative inline-flex items-center justify-center select-none">
      <svg
        width={config.size}
        height={config.size}
        className="transform -rotate-90"
      >
        {/* Clean Background track */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={config.stroke}
          fill="transparent"
        />
        {/* Clean countdown ring */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={config.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-300 ease-linear"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${config.font} ${textColor} tracking-tight font-mono`}>
          {String(timeLeft).padStart(2, '0')}
        </span>
        {size === 'display' && (
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold -mt-1">
            SEC
          </span>
        )}
      </div>
    </div>
  );
}
