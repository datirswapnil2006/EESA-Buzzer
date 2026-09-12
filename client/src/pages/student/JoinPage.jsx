import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import EESALogo from '../../components/common/EESALogo';
import { ArrowRight, User, Users, Building, Hash, Sparkles } from 'lucide-react';

export default function JoinPage() {
  const { eventCode: urlCode } = useParams();
  const navigate = useNavigate();

  const [eventCode, setEventCode] = useState((urlCode || '').toUpperCase());
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [department, setDepartment] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (urlCode) {
      setEventCode(urlCode.toUpperCase());
    }
  }, [urlCode]);

  const handleSubmit = async (e) => {
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
      setError('Please enter your team or player display name');
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
        // Store in sessionStorage for resilient reconnection on refresh
        sessionStorage.setItem('eesa_participant', JSON.stringify(res.data.participant));
        sessionStorage.setItem('eesa_event_code', res.data.event.eventCode);
        navigate(`/play/${res.data.event.eventCode}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to join event. Please check the event code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-eesa-bg flex flex-col justify-center px-4 py-8 relative overflow-hidden">
      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-block mb-3">
            <EESALogo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-eesa-text">
            EESA <span className="text-blue-600">QUIZ CHALLENGE</span>
          </h1>
          <p className="text-xs sm:text-sm text-eesa-textSecondary mt-1">
            Electronics Engineering Students Association
          </p>
        </div>

        {/* Join Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-eesa-border">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-eesa-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-eesa-text uppercase tracking-wider">
                Enter Event
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Mobile Web App
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event Code */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-eesa-textSecondary mb-1.5">
                Event Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EESA26"
                  maxLength={10}
                  required
                  className="w-full bg-white border border-eesa-border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-2.5 text-eesa-text font-mono font-bold tracking-widest text-base uppercase transition placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            {/* Team / Display Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-eesa-textSecondary mb-1.5">
                Team Name / Player Display <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Circuit Masters"
                  required
                  className="w-full bg-white border border-eesa-border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-eesa-text font-medium transition placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            {/* Player Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-eesa-textSecondary mb-1.5">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Sharma"
                  required
                  className="w-full bg-white border border-eesa-border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-eesa-text font-medium transition placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            {/* Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-eesa-textSecondary mb-1.5">
                  Department <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. ECE / EE"
                    required
                    className="w-full bg-white border border-eesa-border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl pl-10 pr-3 py-2.5 text-sm text-eesa-text font-medium transition placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              {/* Optional Roll / ID */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-eesa-textSecondary mb-1.5">
                  ID / Roll No <span className="text-slate-400 text-[10px]">(Opt)</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={participantId}
                    onChange={(e) => setParticipantId(e.target.value)}
                    placeholder="e.g. 21EC04"
                    className="w-full bg-white border border-eesa-border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl pl-10 pr-3 py-2.5 text-sm text-eesa-text font-medium transition placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-95 disabled:opacity-50 select-none text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  JOIN GAME <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-eesa-textSecondary mt-6">
          Powered by EESA Real-Time Engine • All Rights Reserved
        </p>
      </div>
    </div>
  );
}
