import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket } from '../../services/socket';
import Header from '../../components/common/Header';
import Timer from '../../components/common/Timer';
import LeaderboardCard from '../../components/common/LeaderboardCard';
import confetti from 'canvas-confetti';
import { Zap, Trophy, CheckCircle2, XCircle, AlertCircle, Clock, Award, ChevronRight, X, Volume2, VolumeX } from 'lucide-react';

// Synthesized audio cues via Web Audio API for mobile responsiveness without external asset latency
const playAudioCue = (type) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'buzz') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'buzzer_open') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'win') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    }
  } catch (e) {
    // AudioContext blocked by browser policy until interaction
  }
};

export default function PlayerGame() {
  const { eventCode } = useParams();
  const navigate = useNavigate();
  const socket = getSocket();

  const [participant, setParticipant] = useState(() => {
    const cached = sessionStorage.getItem('eesa_participant');
    return cached ? JSON.parse(cached) : null;
  });

  const [gameState, setGameState] = useState({
    event: null,
    session: { state: 'WAITING' },
    currentRound: null,
    currentQuestion: null,
    leaderboard: [],
  });

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);

  // Redirection if no participant info
  useEffect(() => {
    if (!participant) {
      navigate(`/join/${eventCode || ''}`);
    }
  }, [participant, eventCode, navigate]);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('join_event', {
        eventCode,
        participantId: participant?._id,
        role: 'student',
      });
    };

    const handleDisconnect = () => setIsConnected(false);

    const handleEventState = (state) => {
      if (!state) return;
      setGameState(state);

      if (state.participant) {
        setParticipant(state.participant);
        sessionStorage.setItem('eesa_participant', JSON.stringify(state.participant));
      }

      // Reset local answer selection if question changed
      if (state.currentQuestion?._id !== gameState.currentQuestion?._id) {
        setSelectedAnswer(null);
        setAnswerSubmitted(false);
        setLastResult(null);
      } else if (state.session?.firstBuzzer?.participantId === participant?._id && state.session?.firstBuzzer?.selectedAnswer) {
        setSelectedAnswer(state.session.firstBuzzer.selectedAnswer);
        setAnswerSubmitted(true);
      }
    };

    const handleBuzzerStarted = () => {
      playAudioCue('buzzer_open');
      if (navigator.vibrate) {
        try { navigator.vibrate(100); } catch (e) {}
      }
    };

    const handleBuzzerLocked = (firstBuzzer) => {
      if (firstBuzzer?.participantId === participant?._id) {
        playAudioCue('win');
        if (firstBuzzer.selectedAnswer) {
          setSelectedAnswer(firstBuzzer.selectedAnswer);
          setAnswerSubmitted(true);
        }
        if (navigator.vibrate) {
          try { navigator.vibrate([120, 40, 120]); } catch (e) {}
        }
      }
    };

    const handleBuzzerAnswerUpdated = (firstBuzzer) => {
      if (firstBuzzer?.participantId === participant?._id && firstBuzzer.selectedAnswer) {
        setSelectedAnswer(firstBuzzer.selectedAnswer);
        setAnswerSubmitted(true);
      }
    };

    const handleAnswerResult = (result) => {
      setLastResult(result);
      if (result.isCorrect && result.participantName === participant?.name) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch (e) {}
      }
    };

    const handleScoreUpdated = ({ leaderboard }) => {
      if (leaderboard) {
        setGameState((prev) => ({ ...prev, leaderboard }));
        const self = leaderboard.find((p) => p._id === participant?._id);
        if (self) {
          setParticipant((prev) => ({ ...prev, score: self.score, buzzerWins: self.buzzerWins }));
        }
      }
    };

    // Socket Event Subscriptions
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('event_state', handleEventState);
    socket.on('buzzer_started', handleBuzzerStarted);
    socket.on('buzzer_locked', handleBuzzerLocked);
    socket.on('first_buzzer', handleBuzzerLocked);
    socket.on('buzzer_answer_updated', handleBuzzerAnswerUpdated);
    socket.on('answer_result', handleAnswerResult);
    socket.on('score_updated', handleScoreUpdated);
    socket.on('leaderboard_updated', (lb) => setGameState((prev) => ({ ...prev, leaderboard: lb })));

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('event_state', handleEventState);
      socket.off('buzzer_started', handleBuzzerStarted);
      socket.off('buzzer_locked', handleBuzzerLocked);
      socket.off('first_buzzer', handleBuzzerLocked);
      socket.off('buzzer_answer_updated', handleBuzzerAnswerUpdated);
      socket.off('answer_result', handleAnswerResult);
      socket.off('score_updated', handleScoreUpdated);
      socket.off('leaderboard_updated');
    };
  }, [eventCode, participant?._id, gameState.currentQuestion?._id]);

  // Handle Buzz Action
  const handleBuzz = () => {
    if (gameState.session?.state !== 'BUZZER_ACTIVE' || gameState.session?.buzzerLocked) {
      return;
    }
    playAudioCue('buzz');
    if (navigator.vibrate) {
      try { navigator.vibrate(60); } catch (e) {}
    }
    socket.emit('buzz', { answer: selectedAnswer });
  };

  // Handle Answer Selection
  const handleSelectAnswer = (optionId) => {
    setSelectedAnswer(optionId);
    if (navigator.vibrate) {
      try { navigator.vibrate(30); } catch (e) {}
    }

    // If current player already won the buzz, lock in their answer
    const isWinner = gameState.session?.firstBuzzer?.participantId === participant?._id;
    if (isWinner) {
      setAnswerSubmitted(true);
      socket.emit('submit_buzzer_answer', { answer: optionId });
    } else if (gameState.session?.state === 'QUESTION_ACTIVE' && !gameState.currentQuestion?.buzzerEnabled) {
      setAnswerSubmitted(true);
      socket.emit('submit_answer', { answer: optionId });
    }
  };

  const isBuzzerActive = gameState.session?.state === 'BUZZER_ACTIVE' && !gameState.session?.buzzerLocked;
  const firstBuzzer = gameState.session?.firstBuzzer;
  const isWinner = firstBuzzer && firstBuzzer.participantId === participant?._id;
  const isSomeoneElseWinner = firstBuzzer && firstBuzzer.participantId !== participant?._id;

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col text-eesa-text select-none touch-manipulation">
      <Header isConnected={isConnected} role="student" eventCode={eventCode} />

      {/* Mobile-Optimized Top HUD: Team Name, Score & Standings Icon */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-2.5 sticky top-[48px] z-30 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Team Identity */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
              {participant?.teamName?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                {participant?.teamName || participant?.name}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                {participant?.department || 'Participant'}
              </p>
            </div>
          </div>

          {/* Quick HUD Metrics */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 shadow-sm">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-blue-700">Score</span>
              <span className="font-mono font-black text-blue-700 text-sm sm:text-base">
                {participant?.score || 0}
              </span>
            </div>

            <button
              onClick={() => setShowLeaderboard(true)}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition active:scale-95 shadow-sm"
              title="View Leaderboard"
              aria-label="View Leaderboard"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container - Optimized for mobile viewports */}
      <main className="flex-1 max-w-md w-full mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col justify-between">
        {/* STATE 1: WAITING FOR HOST */}
        {gameState.session?.state === 'WAITING' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-fade-in my-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mb-3 text-blue-600 shadow-sm">
              <Clock className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <span className="text-[11px] uppercase font-black tracking-widest text-blue-600 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200 mb-2">
              Waiting Lobby
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {gameState.event?.title || 'EESA Quiz Challenge'}
            </h2>
            <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
              Waiting for the host to start the test. Keep your device screen awake and get ready on the buzzer!
            </p>
            <div className="mt-5 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Connected & Ready
            </div>
          </div>
        )}

        {/* STATE 2: GAME COMPLETED - TOP 1 TO 5 TEAMS & CHAMPION */}
        {gameState.session?.state === 'COMPLETED' && (
          <div className="flex-1 flex flex-col items-center justify-start py-4 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm animate-fade-in space-y-3.5">
            <div className="text-center">
              <Award className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 mx-auto mb-1 animate-bounce-short" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">Quiz Tournament Completed!</h2>
              <p className="text-xs text-slate-500 mt-0.5">Final Results & Top Contenders</p>
            </div>

            {/* GRAND WINNER SPOTLIGHT */}
            {gameState.leaderboard?.length > 0 && (
              <div className="w-full p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white shadow-md text-center">
                <span className="text-[10px] font-black uppercase tracking-widest bg-black/20 px-2.5 py-0.5 rounded-full inline-block">
                  👑 Quiz Champion / 1st Place
                </span>
                <h3 className="text-lg sm:text-xl font-black mt-1 truncate">
                  {gameState.leaderboard[0]?.teamName}
                </h3>
                <p className="text-xs text-amber-100 truncate">
                  {gameState.leaderboard[0]?.name} • {gameState.leaderboard[0]?.department}
                </p>
                <div className="mt-1.5 text-2xl font-black font-mono">
                  {gameState.leaderboard[0]?.score || 0} PTS
                </div>
              </div>
            )}

            {/* TOP 1 TO 5 TEAMS LEADERBOARD */}
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> Top 5 Winning Teams
                </span>
                <span className="text-[10px] font-bold text-blue-600 uppercase">Official Results</span>
              </div>

              <div className="space-y-1.5">
                {gameState.leaderboard?.slice(0, 5).map((p, idx) => {
                  const isSelf = p._id === participant?._id;
                  const medalIcons = ['🥇', '🥈', '🥉', '4th', '5th'];
                  return (
                    <div
                      key={p._id || idx}
                      className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between transition ${
                        isSelf
                          ? 'bg-blue-50/80 border-2 border-blue-500 shadow-sm'
                          : idx === 0
                          ? 'bg-amber-50/60 border-amber-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-xs sm:text-sm w-6 text-center shrink-0">
                          {medalIcons[idx] || `#${idx + 1}`}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {p.teamName} {isSelf && <span className="text-[9px] text-blue-600 font-extrabold bg-blue-100 px-1 py-0.2 rounded">(You)</span>}
                          </h4>
                          <p className="text-[10px] text-slate-500 truncate">
                            {p.department}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-sm text-blue-700">
                          {p.score || 0}
                        </span>
                        <span className="text-[8px] uppercase font-bold text-slate-400 block">pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Player Personal Final Score */}
            <div className="w-full p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Your Team Score</span>
                <span className="text-xs font-bold text-slate-800">{participant?.teamName || participant?.name}</span>
              </div>
              <div className="font-mono font-black text-base sm:text-lg text-blue-600">
                {participant?.score || 0} PTS
              </div>
            </div>

            {gameState.leaderboard?.length > 5 && (
              <button
                onClick={() => setShowLeaderboard(true)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-200 active:scale-95"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" /> View Complete Standings ({gameState.leaderboard.length} Teams)
              </button>
            )}
          </div>
        )}

        {/* STATE 3: ACTIVE TEST QUESTION & BUZZER SCREEN */}
        {gameState.session?.state !== 'WAITING' && gameState.session?.state !== 'COMPLETED' && (
          <div className="flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-4">
            {/* Question Card - Compact for Mobile Viewports */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-sm relative overflow-hidden">
              {/* Metadata row */}
              <div className="flex items-center justify-between gap-1.5 mb-2 sm:mb-3">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[120px]">
                  {gameState.currentRound?.title || 'Round'}
                </span>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <span className="text-[11px] sm:text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    +{gameState.currentQuestion?.points || 10} PTS
                  </span>
                  {gameState.event?.settings?.negativeMarkingEnabled !== false && (
                    <span className="text-[11px] sm:text-xs font-bold font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      -{gameState.currentQuestion?.negativePoints || gameState.event?.settings?.defaultNegativePoints || 5}
                    </span>
                  )}
                  {gameState.session?.questionStartTime && (
                    <Timer
                      startTime={gameState.session.questionStartTime}
                      duration={gameState.session.questionDuration || 15}
                      size="sm"
                    />
                  )}
                </div>
              </div>

              {/* Question Text */}
              <h2 className="text-sm sm:text-base font-bold text-slate-800 leading-snug">
                {gameState.currentQuestion?.questionText || 'Loading next question...'}
              </h2>

              {/* Optional Question Image */}
              {gameState.currentQuestion?.imageUrl && (
                <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-28 sm:max-h-40 flex items-center justify-center bg-slate-50">
                  <img
                    src={gameState.currentQuestion.imageUrl}
                    alt="Question visual"
                    className="max-h-28 sm:max-h-40 object-contain w-full"
                  />
                </div>
              )}
            </div>

            {/* Winner Answer Prompt Banner */}
            {isWinner && !firstBuzzer?.selectedAnswer && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2 animate-bounce-short">
                <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                <span>You buzzed first! Tap your option below to submit answer:</span>
              </div>
            )}

            {/* Answer Result Banner if Answer Reveal */}
            {lastResult && (
              <div
                className={`p-2.5 sm:p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
                  lastResult.isCorrect
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                {lastResult.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <p>
                    {lastResult.isCorrect
                      ? `Correct! +${lastResult.pointsAwarded} pts awarded to ${lastResult.teamName}`
                      : `Wrong! ${lastResult.teamName} incurred penalty (-${lastResult.pointsDeducted || 0} pts).`}
                  </p>
                  {lastResult.correctAnswer && (
                    <p className="font-mono text-slate-800 font-bold mt-0.5">
                      Correct: Option {lastResult.correctAnswer}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* MCQ Options: 2x2 Grid on Mobile for Maximum Ergonomics & Zero Scrolling */}
            {gameState.currentQuestion?.options && gameState.currentQuestion.options.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-2.5">
                {gameState.currentQuestion.options.map((opt) => {
                  const isSelected = selectedAnswer === opt.id;
                  const disableThisOption =
                    isSomeoneElseWinner ||
                    (answerSubmitted && !isWinner) ||
                    gameState.session?.state === 'ANSWER_REVEAL';

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectAnswer(opt.id)}
                      disabled={disableThisOption}
                      className={`p-2.5 sm:p-3 rounded-xl text-left font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all select-none touch-manipulation ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-600 text-blue-700 shadow-sm ring-2 ring-blue-500/20'
                          : 'bg-white border border-slate-200 hover:border-blue-300 text-slate-800 active:scale-[0.98]'
                      } disabled:opacity-60 disabled:pointer-events-none`}
                    >
                      <span
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold font-mono text-xs shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="flex-1 truncate text-xs sm:text-sm">{opt.text}</span>
                      {isSelected && (
                        <span className="hidden xs:inline text-[9px] uppercase font-black bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* BUZZER BUTTON SECTION (Centered, Thumb-Friendly, Zero Scroll Delay) */}
            <div className="py-2 sm:py-4 flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={handleBuzz}
                disabled={!isBuzzerActive}
                className={`buzzer-btn relative rounded-full flex flex-col items-center justify-center select-none touch-manipulation transition-all duration-150 active:scale-95 ${
                  isWinner
                    ? 'w-40 h-40 xs:w-48 xs:h-48 sm:w-56 sm:h-56 bg-emerald-600 text-white border-4 border-emerald-300 scale-105 shadow-xl shadow-emerald-600/30 ring-8 ring-emerald-500/20'
                    : isSomeoneElseWinner
                    ? 'w-40 h-40 xs:w-48 xs:h-48 sm:w-56 sm:h-56 bg-slate-100 border-4 border-slate-200 text-slate-400 opacity-70 cursor-not-allowed'
                    : isBuzzerActive
                    ? 'w-40 h-40 xs:w-48 xs:h-48 sm:w-56 sm:h-56 bg-red-600 hover:bg-red-700 text-white border-4 border-red-300 shadow-xl shadow-red-600/40 ring-8 ring-red-500/20 animate-pulse'
                    : 'w-36 h-36 xs:w-44 xs:h-44 sm:w-52 sm:h-52 bg-slate-100 border-4 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {/* Visual Icon / State Content */}
                {isWinner ? (
                  <div className="text-center px-3 animate-scale-up">
                    <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 mx-auto mb-0.5 text-white" />
                    <span className="block font-black text-sm sm:text-base leading-tight">
                      YOU BUZZED FIRST!
                    </span>
                    <span className="block text-[10px] font-mono font-bold mt-0.5 bg-white/20 px-2 py-0.5 rounded-full">
                      {(firstBuzzer.responseTimeMs / 1000).toFixed(2)}s Latency
                    </span>
                    {selectedAnswer && (
                      <span className="block text-[10px] font-bold mt-1 bg-emerald-800/80 px-2 py-0.5 rounded-full border border-emerald-400">
                        Option {selectedAnswer}
                      </span>
                    )}
                  </div>
                ) : isSomeoneElseWinner ? (
                  <div className="text-center px-3">
                    <XCircle className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-0.5 text-slate-400" />
                    <span className="block font-bold text-xs sm:text-sm text-slate-500">
                      TOO LATE!
                    </span>
                    <span className="block text-[10px] text-rose-600 font-semibold mt-0.5 truncate max-w-[140px] sm:max-w-[180px]">
                      {firstBuzzer.teamName} got it
                    </span>
                  </div>
                ) : isBuzzerActive ? (
                  <div className="text-center">
                    <span className="font-black text-2xl xs:text-3xl tracking-wider block">
                      BUZZ
                    </span>
                    {selectedAnswer ? (
                      <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full block mt-0.5">
                        Option {selectedAnswer}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-red-100 block mt-0.5">
                        Tap To Lock
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-center px-3">
                    <Zap className="w-7 h-7 sm:w-9 sm:h-9 mx-auto mb-0.5 text-slate-400" />
                    <span className="font-bold text-xs sm:text-sm text-slate-500 block">
                      {gameState.session?.state === 'BUZZER_LOCKED'
                        ? 'BUZZER LOCKED'
                        : 'WAITING FOR BUZZER'}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      Host opens buzzer shortly
                    </span>
                  </div>
                )}
              </button>

              {/* Buzzer status message under button */}
              <p className="text-[11px] text-slate-500 text-center font-medium mt-2">
                {isBuzzerActive
                  ? selectedAnswer
                    ? `⚡ Ready! Tap BUZZ to submit Option ${selectedAnswer}`
                    : '⚡ Buzzer is live! Pick an option and press BUZZ.'
                  : 'Host controls buzzer activation.'}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Slide-over Leaderboard Drawer - Mobile Optimized */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white h-full p-4 sm:p-5 border-l border-slate-200 flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900">Live Leaderboard</h3>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1">
              {gameState.session?.state === 'COMPLETED' ? (
                <LeaderboardCard
                  leaderboard={gameState.leaderboard}
                  currentParticipantId={participant?._id}
                />
              ) : (
                <div className="text-center py-10 px-3 space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200 text-xl shadow-sm">
                    🔒
                  </div>
                  <h4 className="font-black text-sm sm:text-base text-slate-900">Leaderboard Hidden</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Live team standings are monitored privately by the Admin Host during the test to keep competition fair.
                  </p>
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 font-bold space-y-1">
                    <span className="block text-xs font-black">🏆 Grand Reveal</span>
                    <span className="block text-[11px] font-normal text-amber-800">
                      The Top 5 winning teams and champion will be revealed on screen when the quiz concludes!
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
