import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import EESALogo from '../../components/common/EESALogo';
import { apiRequest } from '../../services/api';
import {
  Zap,
  Trophy,
  Users,
  ShieldCheck,
  ArrowRight,
  Tv,
  Sparkles,
  User,
  Building,
  Hash,
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  // On-spot registration form state
  const [eventCode, setEventCode] = useState('EESA26');
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [department, setDepartment] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegisterOnSpot = async (e) => {
    e.preventDefault();
    setError('');

    if (!eventCode.trim()) {
      setError('Please enter a valid Event Code');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!teamName.trim()) {
      setError('Please enter or select a team name');
      return;
    }
    if (!department.trim()) {
      setError('Please enter your college department');
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/participants/join', {
        method: 'POST',
        body: JSON.stringify({
          eventCode: eventCode.trim().toUpperCase(),
          name: name.trim(),
          teamName: teamName.trim(),
          department: department.trim(),
          participantId: participantId.trim(),
        }),
      });

      if (res.success && res.data) {
        sessionStorage.setItem('eesa_participant', JSON.stringify(res.data.participant));
        sessionStorage.setItem('eesa_event_code', res.data.event.eventCode);
        navigate(`/play/${res.data.event.eventCode}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to register team. Check event code or team name.');
    } finally {
      setLoading(false);
    }
  };

  const quickTeams = [
    'Circuit Masters',
    'Silicon Sparks',
    'Quantum Logic',
    'Ohm Dynamos',
    'Robo Pioneers',
  ];

  return (
    <div className="min-h-screen bg-eesa-bg text-eesa-text flex flex-col font-sans select-none">
      {/* Universal MITRA Header with Login and Register options */}
      <Header role="student" />

      {/* Hero Section with Academic / College Presentation */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-eesa-border bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Hero Text & Value Props */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Electronics Engineering Students Association</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-eesa-text tracking-tight leading-tight">
                Live College Quiz & <span className="text-blue-600">Buzzer Competition</span> Platform
              </h1>

              <p className="text-base sm:text-lg text-eesa-textSecondary max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Join live technical rounds with real-time sub-millisecond buzzer detection, synchronized timer feeds, and instant leaderboard standings straight from your phone browser.
              </p>

              {/* Quick Feature Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-eesa-border text-left">
                  <Zap className="w-5 h-5 text-blue-600 mb-1" />
                  <h4 className="text-xs font-bold text-eesa-text">Instant Buzzer</h4>
                  <p className="text-[11px] text-eesa-textSecondary">Zero app install required</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-eesa-border text-left">
                  <Tv className="w-5 h-5 text-emerald-600 mb-1" />
                  <h4 className="text-xs font-bold text-eesa-text">1080p Display</h4>
                  <p className="text-[11px] text-eesa-textSecondary">Auditorium projector view</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-eesa-border text-left col-span-2 sm:col-span-1">
                  <Trophy className="w-5 h-5 text-amber-500 mb-1" />
                  <h4 className="text-xs font-bold text-eesa-text">Live Rankings</h4>
                  <p className="text-[11px] text-eesa-textSecondary">Instant score audits</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                <a
                  href="#register-section"
                  className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition transform active:scale-95 flex items-center gap-2"
                >
                  <Users className="w-4 h-4" /> Register Team On-Spot
                </a>

                <Link
                  to="/display/EESA26"
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-eesa-text border border-eesa-border font-semibold text-sm transition shadow-sm flex items-center gap-2"
                >
                  <Tv className="w-4 h-4 text-blue-600" /> Open Projector Screen
                </Link>

                <Link
                  to="/login"
                  className="px-5 py-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-eesa-textSecondary hover:text-eesa-text border border-eesa-border font-semibold text-sm transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" /> Admin Portal
                </Link>
              </div>
            </div>

            {/* Right Column: On-Spot Student Team Registration Card */}
            <div id="register-section" className="lg:col-span-5">
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-eesa-border shadow-md">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-eesa-border">
                  <div>
                    <h2 className="text-lg font-bold text-eesa-text">On-Spot Registration</h2>
                    <p className="text-xs text-eesa-textSecondary mt-0.5">Register & join your competition team now</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Live
                  </span>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRegisterOnSpot} className="space-y-3.5">
                  {/* Event Code */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-eesa-textSecondary mb-1">
                      Event Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={eventCode}
                      onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                      placeholder="e.g. EESA26"
                      maxLength={10}
                      required
                      className="w-full bg-white border border-eesa-border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2.5 text-eesa-text font-mono font-bold tracking-wider text-sm transition outline-none"
                    />
                  </div>

                  {/* Team Selection or Custom Input */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-eesa-textSecondary mb-1">
                      Select or Enter Team Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="e.g. Circuit Masters"
                        required
                        className="w-full bg-white border border-eesa-border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl pl-9 pr-3.5 py-2 text-sm text-eesa-text font-medium transition outline-none"
                      />
                    </div>

                    {/* Quick Suggestion Pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {quickTeams.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTeamName(t)}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border transition ${
                            teamName === t
                              ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          + {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Player Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-eesa-textSecondary mb-1">
                      Your Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Patil"
                        required
                        className="w-full bg-white border border-eesa-border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl pl-9 pr-3.5 py-2 text-sm text-eesa-text font-medium transition outline-none"
                      />
                    </div>
                  </div>

                  {/* Department & ID in 2 columns */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-eesa-textSecondary mb-1">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="e.g. ECE / EE"
                          required
                          className="w-full bg-white border border-eesa-border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl pl-9 pr-3 py-2 text-sm text-eesa-text font-medium transition outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-eesa-textSecondary mb-1">
                        ID / Roll <span className="text-slate-400 text-[10px]">(Opt)</span>
                      </label>
                      <div className="relative">
                        <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={participantId}
                          onChange={(e) => setParticipantId(e.target.value)}
                          placeholder="e.g. 23EC01"
                          className="w-full bg-white border border-eesa-border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl pl-9 pr-3 py-2 text-sm text-eesa-text font-medium transition outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-95 disabled:opacity-50 text-sm"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        JOIN COMPETITION <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-eesa-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-eesa-text">
              How the EESA Platform Works
            </h2>
            <p className="text-sm text-eesa-textSecondary mt-2">
              Three seamless steps for participating teams and organizers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-eesa-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                01
              </div>
              <h3 className="font-bold text-base text-eesa-text">Register On-Spot</h3>
              <p className="text-xs text-eesa-textSecondary leading-relaxed">
                Scan the hall QR code or enter event code <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-bold">EESA26</code>. Register your team name in seconds with no app required.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-eesa-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm">
                02
              </div>
              <h3 className="font-bold text-base text-eesa-text">Hit the Live Buzzer</h3>
              <p className="text-xs text-eesa-textSecondary leading-relaxed">
                When the host unlocks the question, tap the tactile red buzzer on your phone. The atomic server engine registers the first tap in sub-milliseconds.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-eesa-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black text-sm">
                03
              </div>
              <h3 className="font-bold text-base text-eesa-text">Climb the Leaderboard</h3>
              <p className="text-xs text-eesa-textSecondary leading-relaxed">
                Score points for correct answers, avoid negative penalties, and watch your team advance up the auditorium projector podium in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-white border-t border-eesa-border text-xs text-eesa-textSecondary">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <EESALogo size="sm" showText={false} />
            <span>Electronics Engineering Students Association (EESA)</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-eesa-text transition">Admin Portal</Link>
            <span>•</span>
            <Link to="/display/EESA26" target="_blank" rel="noreferrer" className="hover:text-eesa-text transition">Projector Feed</Link>
            <span>•</span>
            <Link to="/join" className="hover:text-eesa-text transition">Direct Join</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
