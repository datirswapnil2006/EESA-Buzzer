import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSocket } from '../../services/socket';
import { apiRequest } from '../../services/api';
import Header from '../../components/common/Header';
import Timer from '../../components/common/Timer';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useToast } from '../../context/ToastContext';
import {
  Play,
  Pause,
  Zap,
  Lock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Tv,
  Award,
  Users,
  AlertOctagon,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';

export default function LiveControlDesk() {
  const { eventId } = useParams();
  const socket = getSocket();
  const { showToast } = useToast();

  const [eventData, setEventData] = useState(null);
  const [gameState, setGameState] = useState({
    event: null,
    session: { state: 'WAITING' },
    currentRound: null,
    currentQuestion: null,
    leaderboard: [],
    totalParticipants: 0,
    connectedParticipants: 0,
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await apiRequest(`/events/${eventId}`);
        if (res.success) {
          setEventData(res.data);
        }
      } catch (err) {
        console.error('Failed to load event details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    if (!eventData?.event?.eventCode) return;

    const handleConnect = () => {
      socket.emit('join_event', {
        eventCode: eventData.event.eventCode,
        role: 'host',
      });
    };

    const handleEventState = (state) => {
      if (state) setGameState(state);
    };

    socket.on('connect', handleConnect);
    socket.on('event_state', handleEventState);
    socket.on('leaderboard_updated', (lb) => setGameState((prev) => ({ ...prev, leaderboard: lb })));

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('event_state', handleEventState);
      socket.off('leaderboard_updated');
    };
  }, [eventData?.event?.eventCode]);

  // Host Action Handlers
  const handleStartGame = () => {
    socket.emit('start_game');
  };

  const handleStartBuzzer = () => {
    socket.emit('start_buzzer');
  };

  const handleLockBuzzer = () => {
    socket.emit('lock_buzzer');
  };

  const handleMarkCorrect = () => {
    socket.emit('mark_correct', {});
  };

  const handleMarkWrong = () => {
    socket.emit('mark_wrong', {});
  };

  const handleNextQuestion = () => {
    socket.emit('next_question');
  };

  const handlePauseGame = () => {
    socket.emit('pause_game');
  };

  const handleResumeGame = () => {
    socket.emit('resume_game');
  };

  const handleEndGamePrompt = () => {
    setConfirmModal({
      isOpen: true,
      title: 'End Event Competition?',
      message: 'Are you sure you want to end this event? All rounds will conclude and the final podium standings will be locked.',
      onConfirm: () => {
        socket.emit('end_game');
        showToast('Event competition concluded', 'info');
        setConfirmModal({ isOpen: false });
      },
    });
  };

  const handleAdjustScore = async (participantId, delta) => {
    try {
      await apiRequest(`/participants/${participantId}/score`, {
        method: 'PUT',
        body: JSON.stringify({ delta, note: 'Manual Host Adjustment' }),
      });
      // Refresh state
      socket.emit('request_state', { eventId });
      showToast(`Score adjusted (${delta > 0 ? `+${delta}` : delta} pts)`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to adjust score', 'error');
    }
  };

  const handleRemoveParticipantPrompt = (p) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Participant?',
      message: `Are you sure you want to disconnect and remove "${p.teamName}" (${p.name}) from this event?`,
      onConfirm: async () => {
        try {
          await apiRequest(`/participants/${p._id}`, { method: 'DELETE' });
          socket.emit('request_state', { eventId });
          showToast(`Participant "${p.teamName || p.name}" removed`, 'info');
        } catch (err) {
          showToast(err.message || 'Failed to remove participant', 'error');
        }
        setConfirmModal({ isOpen: false });
      },
    });
  };

  const firstBuzzer = gameState.session?.firstBuzzer;
  const isBuzzerActive = gameState.session?.state === 'BUZZER_ACTIVE';
  const isBuzzerLocked = gameState.session?.buzzerLocked || gameState.session?.state === 'BUZZER_LOCKED';
  const isWaiting = gameState.session?.state === 'WAITING';
  const isCompleted = gameState.session?.state === 'COMPLETED';

  if (loading) {
    return (
      <div className="min-h-screen bg-eesa-bg text-eesa-text flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-eesa-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-bold text-sm text-eesa-textSecondary">Loading Host Control Desk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-eesa-bg text-eesa-text flex flex-col select-none">
      <Header role="host" eventCode={eventData?.event?.eventCode} />

      {/* Control Desk Master Header */}
      <div className="bg-white border-b border-eesa-border px-4 sm:px-6 py-3 sticky top-[53px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              {eventData?.event?.eventCode}
            </span>
            <div>
              <h2 className="font-black text-lg text-eesa-text leading-tight">
                {eventData?.event?.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-eesa-textSecondary">
                <span>State: <strong className="text-blue-600 font-mono uppercase">{gameState.session?.state || 'WAITING'}</strong></span>
                <span>•</span>
                <span>{gameState.connectedParticipants || 0} Connected Players</span>
              </div>
            </div>
          </div>

          {/* Quick Screen Shortcuts & End Game */}
          <div className="flex items-center gap-2">
            <Link
              to={`/display/${eventData?.event?.eventCode}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-eesa-textSecondary hover:text-eesa-text border border-eesa-border text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Tv className="w-3.5 h-3.5 text-blue-600" /> Open Projector
            </Link>

            <Link
              to={`/admin/events/${eventId}/results`}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-eesa-textSecondary hover:text-eesa-text border border-eesa-border text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Award className="w-3.5 h-3.5 text-amber-500" /> Standings
            </Link>

            {!isCompleted && !isWaiting && (
              <button
                onClick={handleEndGamePrompt}
                className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition flex items-center gap-1"
              >
                <AlertOctagon className="w-3.5 h-3.5" /> End Event
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Host Split View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT & CENTER: ACTIVE QUESTION & REAL-TIME CONTROLS (2 COLUMNS) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Waiting Room Launch Card */}
          {isWaiting && (
            <div className="bg-white p-8 rounded-2xl border border-eesa-border shadow-sm text-center space-y-4">
              <span className="text-xs uppercase font-black tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-block">
                Ready for Kickoff
              </span>
              <h3 className="text-2xl font-black text-eesa-text">Start Competition Event</h3>
              <p className="text-sm text-eesa-textSecondary max-w-md mx-auto">
                Students are connecting in the waiting room. Click below to launch Round 1 and start the game!
              </p>
              <button
                onClick={handleStartGame}
                className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-sm inline-flex items-center gap-2 transform active:scale-95 transition"
              >
                <Play className="w-5 h-5 fill-white" /> START GAME NOW
              </button>
            </div>
          )}

          {/* Active Question Control Card */}
          {!isWaiting && (
            <>
              <div className="bg-white rounded-2xl p-6 border border-eesa-border shadow-sm space-y-4 relative">
                {/* Round & Progress Bar */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-eesa-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {gameState.currentRound?.title || 'Round'}
                    </span>
                    <span className="text-xs font-bold text-eesa-textSecondary">
                      Question #{gameState.currentQuestion?.order || 1}
                    </span>
                  </div>

                  {/* Synchronized Timer */}
                  {gameState.session?.questionStartTime && (
                    <div className="flex items-center gap-2">
                      <Timer
                        startTime={gameState.session.questionStartTime}
                        duration={gameState.session.questionDuration || 15}
                        size="sm"
                      />
                    </div>
                  )}
                </div>

                {/* Question Text */}
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-eesa-text leading-snug">
                    {gameState.currentQuestion?.questionText}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-eesa-textSecondary">
                    <span>Category: <strong className="text-eesa-text">{gameState.currentQuestion?.category || 'General'}</strong></span>
                    <span>•</span>
                    <span>Points: <strong className="text-blue-600">+{gameState.currentQuestion?.points || 10}</strong></span>
                  </div>
                </div>

                {/* MCQ Options with Host Answer Highlight */}
                {gameState.currentQuestion?.options && gameState.currentQuestion.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {gameState.currentQuestion.options.map((opt) => {
                      const isCorrect = String(gameState.currentQuestion?.correctAnswer).toLowerCase() === String(opt.id).toLowerCase();
                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-2.5 ${
                            isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : 'bg-slate-50 border-eesa-border text-eesa-text'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white font-black' : 'bg-white text-eesa-text border border-eesa-border'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span className="truncate">{opt.text}</span>
                          {isCorrect && (
                            <span className="ml-auto text-[10px] uppercase font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                              CORRECT KEY
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MASTER BUZZER CONTROL PANEL */}
              <div className="bg-white rounded-2xl p-6 border border-eesa-border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-eesa-textSecondary flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" /> Buzzer Control Engine
                  </h4>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isBuzzerActive
                        ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                        : isBuzzerLocked
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isBuzzerActive ? '🔴 BUZZER LIVE' : isBuzzerLocked ? '🔒 BUZZER LOCKED' : 'STANDBY'}
                  </span>
                </div>

                {/* Buzzer Trigger Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleStartBuzzer}
                    disabled={isBuzzerActive}
                    className="py-3.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:pointer-events-none active:scale-95"
                  >
                    <Zap className="w-5 h-5 fill-white" />
                    START BUZZER NOW
                  </button>

                  <button
                    onClick={handleLockBuzzer}
                    disabled={!isBuzzerActive}
                    className="py-3.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-eesa-text font-bold text-base border border-eesa-border flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Lock className="w-5 h-5" />
                    LOCK BUZZER
                  </button>
                </div>

                {/* FIRST BUZZER WINNER CARD & GRADING */}
                {firstBuzzer ? (
                  <div className="mt-4 p-5 rounded-xl bg-red-50/70 border-2 border-red-300 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white text-xl font-bold shadow-sm">
                          🔔
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-red-700 tracking-wider">
                            First Buzzer Registered
                          </span>
                          <h4 className="text-xl font-black text-eesa-text">
                            {firstBuzzer.teamName}
                          </h4>
                          <p className="text-xs text-eesa-textSecondary">
                            Student: {firstBuzzer.participantName}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-eesa-textSecondary block">Response Time</span>
                        <span className="font-mono font-black text-2xl text-blue-600">
                          {(firstBuzzer.responseTimeMs / 1000).toFixed(2)}s
                        </span>
                      </div>
                    </div>

                    {/* GRADING BUTTONS */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-red-200">
                      <button
                        onClick={handleMarkCorrect}
                        className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm transition transform active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                        MARK CORRECT (+PTS)
                      </button>

                      <button
                        onClick={handleMarkWrong}
                        className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm transition transform active:scale-95"
                      >
                        <XCircle className="w-4 h-4 stroke-[2.5]" />
                        MARK WRONG (-PENALTY)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-eesa-border text-center text-xs text-eesa-textSecondary font-medium">
                    No buzzer pressed yet for this question
                  </div>
                )}

                {/* ADVANCE TO NEXT QUESTION */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {gameState.session?.state === 'PAUSED' ? (
                      <button
                        onClick={handleResumeGame}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" /> Resume Question
                      </button>
                    ) : (
                      <button
                        onClick={handlePauseGame}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-eesa-textSecondary hover:text-eesa-text font-bold text-xs flex items-center gap-1 border border-eesa-border"
                      >
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleNextQuestion}
                    className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition transform active:scale-95"
                  >
                    NEXT QUESTION <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: LIVE PARTICIPANTS & INSTANT SCORE AUDIT (1 COLUMN) */}
        <div className="bg-white rounded-2xl p-5 border border-eesa-border shadow-sm flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-eesa-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-eesa-text">Live Participants</h3>
            </div>
            <span className="text-xs font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {gameState.leaderboard.length} Total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[600px]">
            {gameState.leaderboard.map((p, idx) => (
              <div
                key={p._id || idx}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-eesa-border space-y-2 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-eesa-textSecondary font-bold">#{idx + 1}</span>
                      <h5 className="font-bold text-xs text-eesa-text truncate max-w-[120px] sm:max-w-[140px]">
                        {p.teamName || p.name}
                      </h5>
                    </div>
                    <p className="text-[10px] text-eesa-textSecondary truncate">{p.name} • {p.department}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-sm text-blue-600">
                      {p.score || 0}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-eesa-textSecondary block">pts</span>
                  </div>
                </div>

                {/* Score Micro-Adjustments & Kick */}
                <div className="flex items-center justify-between pt-1.5 border-t border-eesa-border text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAdjustScore(p._id, 5)}
                      className="px-1.5 py-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-700 font-mono font-bold border border-eesa-border text-[10px]"
                      title="+5 pts"
                    >
                      +5
                    </button>
                    <button
                      onClick={() => handleAdjustScore(p._id, -5)}
                      className="px-1.5 py-0.5 rounded bg-white hover:bg-red-50 text-red-700 font-mono font-bold border border-eesa-border text-[10px]"
                      title="-5 pts"
                    >
                      -5
                    </button>
                  </div>

                  <button
                    onClick={() => handleRemoveParticipantPrompt(p)}
                    className="text-slate-400 hover:text-red-600 p-1 transition"
                    title="Remove from Event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Action Safety Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
    </div>
  );
}
