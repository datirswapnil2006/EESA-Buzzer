import React from 'react';
import { Trophy, Zap } from 'lucide-react';

export default function LeaderboardCard({ leaderboard = [], currentParticipantId, maxDisplay = 10, isCompact = false }) {
  const displayList = leaderboard.slice(0, maxDisplay);

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 font-black flex items-center justify-center text-xs shrink-0 shadow-sm">
            1
          </div>
        );
      case 2:
        return (
          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-black flex items-center justify-center text-xs shrink-0 shadow-sm">
            2
          </div>
        );
      case 3:
        return (
          <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-black flex items-center justify-center text-xs shrink-0 shadow-sm">
            3
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 font-semibold flex items-center justify-center text-xs shrink-0">
            {rank}
          </div>
        );
    }
  };

  if (!displayList || displayList.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm bg-white rounded-xl border border-slate-200 p-6">
        <Trophy className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
        <p className="font-semibold text-slate-700">No scores recorded yet</p>
        <p className="text-xs text-slate-400 mt-0.5">Leaderboard will update live as questions are scored</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 select-none w-full">
      {displayList.map((item, index) => {
        const rank = index + 1;
        const isCurrent = currentParticipantId && (item._id === currentParticipantId || item.id === currentParticipantId);

        return (
          <div
            key={item._id || index}
            className={`flex items-center justify-between p-3 rounded-xl transition-all ${
              isCurrent
                ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                : rank === 1
                ? 'bg-gradient-to-r from-amber-50/70 to-white border border-amber-200 shadow-sm'
                : 'bg-white border border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {getRankBadge(rank)}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`font-bold text-sm truncate ${isCurrent ? 'text-blue-900' : 'text-slate-800'}`}>
                    {item.teamName || item.name}
                  </h4>
                  {isCurrent && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-blue-600 text-white">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 truncate mt-0.5">
                  <span className="truncate">{item.department || item.name}</span>
                  {!isCompact && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-0.5 text-amber-600 font-medium" title="Buzzer Wins">
                        <Zap className="w-3 h-3" /> {item.buzzerWins || 0}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              <div className="text-right">
                <span className="font-bold text-base font-mono text-blue-600">
                  {item.score || 0}
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block -mt-1">
                  PTS
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
