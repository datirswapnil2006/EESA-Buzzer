import React from 'react';

export default function EESALogo({
  size = 'md',
  showText = true,
  subtitle = 'Department of EXTC • PRMIT&R Badnera',
  showCollegeLogo = true,
}) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const collegeSizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className="flex items-center gap-3 select-none">
      {/* Logos Group: College Logo + EESA Emblem */}
      <div className="flex items-center gap-2 shrink-0">
        {showCollegeLogo && (
          <div className={`${collegeSizeMap[size]} shrink-0 rounded-lg overflow-hidden bg-white border border-slate-200 p-0.5 shadow-xs flex items-center justify-center`}>
            <img
              src="/college-logo.jpg"
              alt="College Emblem"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        <div className={`${sizeMap[size]} shrink-0 rounded-xl overflow-hidden bg-white border border-slate-200 p-0.5 shadow-xs flex items-center justify-center`}>
          <img
            src="/eesa-logo.jpg"
            alt="EESA Logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-slate-900 font-sans text-lg sm:text-xl leading-none">
              EESA
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              QUIZ
            </span>
          </div>
          {subtitle && (
            <span className="text-[11px] text-slate-500 font-medium tracking-tight mt-0.5 truncate max-w-[220px] sm:max-w-none">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
