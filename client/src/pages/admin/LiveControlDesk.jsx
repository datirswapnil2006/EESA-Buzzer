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
  const [mobileTab, setMobileTab] = useState('controls'); // 'controls' | 'standings'

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
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24 lg:pb-6">
        {/* Mobile View Switcher Tabs (lg:hidden) */}
        {!isWaiting && (
          <div className="lg:hidden flex items-center bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200">
            <button
              onClick={() => setMobileTab('controls')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mobileTab === 'controls'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Controls & Question
            </button>
            <button
              onClick={() => setMobileTab('standings')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mobileTab === 'standings'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Participants ({gameState.leaderboard.length})
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT & CENTER: ACTIVE QUESTION & REAL-TIME CONTROLS (2 COLUMNS) */}
          <div className={`lg:col-span-2 space-y-6 ${mobileTab === 'controls' ? 'block' : 'hidden lg:block'}`}>
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
                  <div className="mt-4 p-5 rounded-2xl bg-slate-50 border-2 border-red-300 space-y-4 animate-fade-in shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white text-xl font-bold shadow-sm">
                          🔔
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-red-700 tracking-wider">
                            First Buzzer Winner
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

                    {/* Selected Option & Correct Key Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-white border border-eesa-border">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Student Answer</span>
                        {firstBuzzer.selectedAnswer ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs text-white ${
                              firstBuzzer.isCorrect ? 'bg-emerald-600' : 'bg-red-600'
                            }`}>
                              {firstBuzzer.selectedAnswer}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {firstBuzzer.selectedOptionText || `Option ${firstBuzzer.selectedAnswer}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-amber-600 italic block mt-1">
                            Waiting for student to select option...
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Official Correct Key</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-mono font-black text-xs">
                            {gameState.currentQuestion?.correctAnswer || 'A'}
                          </span>
                          <span className="text-xs font-semibold text-emerald-800 truncate">
                            {gameState.currentQuestion?.options?.find(o => String(o.id).toLowerCase() === String(gameState.currentQuestion?.correctAnswer).toLowerCase())?.text || 'Correct Option'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Auto-Verdict Badge */}
                    {firstBuzzer.selectedAnswer && (
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                        firstBuzzer.isCorrect
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-red-50 border-red-300 text-red-900'
                      }`}>
                        <div className="flex items-center gap-2">
                          {firstBuzzer.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                          )}
                          <span>
                            {firstBuzzer.isCorrect
                              ? `Correct Option Verified! (+${gameState.currentQuestion?.points || 10} pts)`
                              : `Wrong Option Selected! (-${gameState.event?.settings?.negativeMarkingEnabled !== false ? (gameState.currentQuestion?.negativePoints || gameState.event?.settings?.defaultNegativePoints || 5) : 0} penalty)`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* GRADING BUTTONS */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <button
                        onClick={handleMarkCorrect}
                        className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm transition transform active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                        AWARD (+{gameState.currentQuestion?.points || 10} PTS)
                      </button>

                      <button
                        onClick={handleMarkWrong}
                        className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm transition transform active:scale-95"
                      >
                        <XCircle className="w-4 h-4 stroke-[2.5]" />
                        PENALIZE (-{gameState.event?.settings?.negativeMarkingEnabled !== false ? (gameState.currentQuestion?.negativePoints || gameState.event?.settings?.defaultNegativePoints || 5) : 0} PTS)
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
        <div className={`bg-white rounded-2xl p-4 sm:p-5 border border-eesa-border shadow-sm flex flex-col space-y-4 ${
          mobileTab === 'standings' ? 'block' : 'hidden lg:flex'
        }`}>
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
      </div>
    </main>

    {/* Sticky Bottom Quick-Control Bar for Mobile Hosts */}
    {!isWaiting && !isCompleted && mobileTab === 'controls' && (
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 lg:hidden shadow-lg">
        {firstBuzzer ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkCorrect}
              className="flex-1 py-2.5 px-2 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> AWARD (+{gameState.currentQuestion?.points || 10})
            </button>
            <button
              onClick={handleMarkWrong}
              className="flex-1 py-2.5 px-2 rounded-xl bg-red-600 active:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
            >
              <XCircle className="w-4 h-4" /> PENALIZE (-{gameState.event?.settings?.negativeMarkingEnabled !== false ? (gameState.currentQuestion?.negativePoints || gameState.event?.settings?.defaultNegativePoints || 5) : 0})
            </button>
            <button
              onClick={handleNextQuestion}
              className="p-2.5 rounded-xl bg-blue-600 active:bg-blue-700 text-white font-bold text-xs flex items-center justify-center shadow-sm"
              title="Next Question"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : isBuzzerActive ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleLockBuzzer}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 active:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Lock className="w-4 h-4" /> LOCK BUZZER
            </button>
            <button
              onClick={handleNextQuestion}
              className="py-2.5 px-4 rounded-xl bg-blue-600 active:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
            >
              NEXT <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartBuzzer}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 active:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm animate-pulse"
            >
              <Zap className="w-4 h-4 fill-white" /> START BUZZER NOW
            </button>
            <button
              onClick={handleNextQuestion}
              className="py-2.5 px-4 rounded-xl bg-blue-600 active:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
            >
              NEXT <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )}

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
