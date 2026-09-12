import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import Header from '../../components/common/Header';
import {
  Trophy,
  Download,
  Award,
  Users,
  CheckCircle,
  XCircle,
  Zap,
  ArrowLeft,
  Tv,
  FileSpreadsheet,
} from 'lucide-react';

export default function ResultsPage() {
  const { eventId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await apiRequest(`/events/${eventId}/results`);
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load results:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [eventId]);

  const handleDownloadCSV = () => {
    window.location.href = `/api/events/${eventId}/export`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-eesa-bg text-eesa-text flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-eesa-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { event, leaderboard = [], totalParticipants, totalQuestions, totalRounds, scoreEvents = [] } = data || {};

  return (
    <div className="min-h-screen bg-eesa-bg text-eesa-text flex flex-col select-none">
      <Header role="admin" eventCode={event?.eventCode} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header & Export Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-eesa-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/admin/dashboard" className="text-xs text-eesa-textSecondary hover:text-eesa-text flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </Link>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">{event?.eventCode}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-eesa-text">
              Official Results & Final Standings
            </h1>
            <p className="text-xs sm:text-sm text-eesa-textSecondary mt-0.5">{event?.title}</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/display/${event?.eventCode}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-eesa-textSecondary hover:text-eesa-text border border-eesa-border text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Tv className="w-4 h-4 text-blue-600" /> View Screen
            </Link>

            <button
              onClick={() => { window.location.href = `/api/events/${eventId}/export?type=buzzers`; }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-eesa-text font-bold text-xs border border-eesa-border flex items-center gap-2 transition shadow-sm"
            >
              <Download className="w-4 h-4 text-blue-600" /> BUZZER AUDIT (CSV)
            </button>

            <button
              onClick={handleDownloadCSV}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition transform active:scale-95"
            >
              <Download className="w-4 h-4 stroke-[2.5]" /> EXPORT STANDINGS (CSV)
            </button>
          </div>
        </div>

        {/* Podium Highlight */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
            {/* 2nd Place */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center order-2 md:order-1">
              <span className="text-3xl">🥈</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mt-1">2nd Place</span>
              <h3 className="text-xl font-bold text-eesa-text mt-1 truncate">{leaderboard[1]?.teamName}</h3>
              <p className="text-xs text-eesa-textSecondary truncate">{leaderboard[1]?.name} • {leaderboard[1]?.department}</p>
              <p className="font-mono font-black text-2xl text-slate-700 mt-3">{leaderboard[1]?.score} PTS</p>
            </div>

            {/* 1st Place */}
            <div className="bg-gradient-to-b from-amber-50/70 to-white p-6 rounded-2xl border-2 border-amber-300 shadow-sm text-center order-1 md:order-2">
              <span className="text-4xl animate-bounce-short inline-block">🥇</span>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mt-1">Winner / Champion</span>
              <h3 className="text-2xl font-black text-eesa-text mt-1 truncate">{leaderboard[0]?.teamName}</h3>
              <p className="text-xs text-eesa-textSecondary truncate">{leaderboard[0]?.name} • {leaderboard[0]?.department}</p>
              <p className="font-mono font-black text-4xl text-amber-600 mt-3">
                {leaderboard[0]?.score} PTS
              </p>
            </div>

            {/* 3rd Place */}
            <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm text-center order-3">
              <span className="text-3xl">🥉</span>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mt-1">3rd Place</span>
              <h3 className="text-xl font-bold text-eesa-text mt-1 truncate">{leaderboard[2]?.teamName}</h3>
              <p className="text-xs text-eesa-textSecondary truncate">{leaderboard[2]?.name} • {leaderboard[2]?.department}</p>
              <p className="font-mono font-black text-2xl text-amber-700 mt-3">{leaderboard[2]?.score} PTS</p>
            </div>
          </div>
        )}

        {/* 4th & 5th Place Honor Roll */}
        {leaderboard.length > 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {leaderboard.slice(3, 5).map((p, idx) => (
              <div key={p._id || idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-mono font-black text-sm flex items-center justify-center shrink-0">
                    #{idx + 4}
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      {idx === 0 ? '4th Place' : '5th Place'}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 truncate">{p.teamName}</h4>
                    <p className="text-xs text-slate-500 truncate">{p.name} • {p.department}</p>
                  </div>
                </div>
                <div className="font-mono font-black text-xl text-blue-600 shrink-0 ml-3">
                  {p.score || 0} PTS
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BUZZER RESULTS & ANSWER AUDIT SECTION */}
        <div className="bg-white rounded-2xl p-6 border border-eesa-border shadow-sm space-y-4 my-8">
          <div className="flex items-center justify-between pb-3 border-b border-eesa-border">
            <div>
              <h3 className="font-bold text-base text-eesa-text flex items-center gap-2">
                <Zap className="w-5 h-5 text-red-600" /> Buzzer Winners & Answer Verification Log
              </h3>
              <p className="text-xs text-eesa-textSecondary mt-0.5">
                Detailed record of which participants locked the buzzer, what option was selected, and points awarded or deducted.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
              {scoreEvents.filter((ev) => ev.action === 'CORRECT_ANSWER' || ev.action === 'WRONG_ANSWER').length} Buzzer Actions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-eesa-border text-eesa-textSecondary text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-3">Question</th>
                  <th className="py-3 px-3">Buzzer Winner</th>
                  <th className="py-3 px-3 text-center">Selected Option</th>
                  <th className="py-3 px-3 text-center">Correct Key</th>
                  <th className="py-3 px-3 text-center">Verdict</th>
                  <th className="py-3 px-3 text-right">Points Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-eesa-border">
                {scoreEvents
                  .filter((ev) => ev.action === 'CORRECT_ANSWER' || ev.action === 'WRONG_ANSWER')
                  .map((ev, idx) => {
                    const isCorrect = ev.isCorrect !== null ? ev.isCorrect : ev.action === 'CORRECT_ANSWER';
                    return (
                      <tr key={ev._id || idx} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-3 max-w-[240px]">
                          <span className="font-bold text-xs text-blue-600 font-mono block">
                            Q#{ev.questionId?.order || idx + 1}
                          </span>
                          <span className="text-xs text-slate-800 line-clamp-1">
                            {ev.questionId?.questionText || 'Quiz Question'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900 block text-xs">
                            {ev.participantId?.teamName || 'Unknown Team'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {ev.participantId?.name} {ev.responseTimeMs ? `(${(ev.responseTimeMs / 1000).toFixed(2)}s)` : ''}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {ev.selectedAnswer ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-black text-xs text-white ${
                              isCorrect ? 'bg-emerald-600' : 'bg-red-600'
                            }`}>
                              {ev.selectedAnswer}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-black text-xs bg-slate-100 text-slate-800 border border-slate-300">
                            {ev.correctAnswer || ev.questionId?.correctAnswer || '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3.5 h-3.5 text-red-600" /> Wrong
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-black text-sm">
                          <span className={ev.pointsDelta > 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {ev.pointsDelta > 0 ? `+${ev.pointsDelta}` : ev.pointsDelta} pts
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                {scoreEvents.filter((ev) => ev.action === 'CORRECT_ANSWER' || ev.action === 'WRONG_ANSWER').length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-xs text-slate-400">
                      No buzzer responses recorded for this event yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full Leaderboard Table */}
        <div className="bg-white rounded-2xl p-6 border border-eesa-border shadow-sm space-y-4 my-8">
          <div className="flex items-center justify-between pb-3 border-b border-eesa-border">
            <h3 className="font-bold text-base text-eesa-text flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" /> Complete Participant Standings
            </h3>
            <span className="text-xs text-eesa-textSecondary font-mono font-bold">
              {leaderboard.length} Participants Ranked
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-eesa-border text-eesa-textSecondary text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Team / Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4 text-center">Correct</th>
                  <th className="py-3 px-4 text-center">Wrong</th>
                  <th className="py-3 px-4 text-center">Buzzer Wins</th>
                  <th className="py-3 px-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-eesa-border">
                {leaderboard.map((p, idx) => (
                  <tr key={p._id || idx} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-eesa-textSecondary">#{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-eesa-text block">{p.teamName}</span>
                      <span className="text-xs text-eesa-textSecondary">{p.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-eesa-textSecondary">{p.department}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-eesa-textSecondary">{p.participantId || '—'}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600">{p.correctCount || 0}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-red-600">{p.wrongCount || 0}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-600">{p.buzzerWins || 0}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-base text-blue-600">{p.score || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log / Score History */}
        {scoreEvents.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-eesa-border shadow-sm space-y-4">
            <h3 className="font-bold text-base text-eesa-text flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Auditable Score History
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 text-xs">
              {scoreEvents.map((ev, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-eesa-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        ev.pointsDelta > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {ev.pointsDelta > 0 ? `+${ev.pointsDelta}` : ev.pointsDelta}
                    </span>
                    <span className="text-eesa-text font-semibold">{ev.note || ev.action}</span>
                  </div>
                  <span className="text-eesa-textSecondary font-mono text-[10px]">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
