import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket } from '../../services/socket';
import Header from '../../components/common/Header';
import Timer from '../../components/common/Timer';
import LeaderboardCard from '../../components/common/LeaderboardCard';
import confetti from 'canvas-confetti';
import { Zap, Trophy, CheckCircle2, XCircle, AlertCircle, Clock, Award, ChevronRight, X } from 'lucide-react';

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
      }
    };

    const handleBuzzerStarted = () => {
      if (navigator.vibrate) {
        try { navigator.vibrate(100); } catch (e) {}
      }
    };

    const handleBuzzerLocked = (firstBuzzer) => {
      if (firstBuzzer?.participantId === participant?._id) {
        // Current player won the buzz!
        if (navigator.vibrate) {
          try { navigator.vibrate([150, 50, 150]); } catch (e) {}
        }
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
    socket.on('answer_result', handleAnswerResult);
    socket.on('score_updated', handleScoreUpdated);
    socket.on('leaderboard_updated', (lb) => setGameState((prev) => ({ ...prev, leaderboard: lb })));

    // Emit initial join
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
    socket.emit('buzz');
  };

  // Handle Answer Selection
  const handleSelectAnswer = (optionId) => {
    if (answerSubmitted) return;
    setSelectedAnswer(optionId);
    setAnswerSubmitted(true);
    socket.emit('submit_answer', { answer: optionId });
  };

  const isBuzzerActive = gameState.session?.state === 'BUZZER_ACTIVE' && !gameState.session?.buzzerLocked;
  const firstBuzzer = gameState.session?.firstBuzzer;
  const isWinner = firstBuzzer && firstBuzzer.participantId === participant?._id;
  const isSomeoneElseWinner = firstBuzzer && firstBuzzer.participantId !== participant?._id;

  return (
    <div className="min-h-screen bg-eesa-bg flex flex-col text-eesa-text select-none pb-8">
      <Header isConnected={isConnected} role="student" eventCode={eventCode} />

      {/* Student Top Bar: Team Name, Score & Leaderboard Button */}
      <div className="bg-white border-b border-eesa-border px-4 py-3 sticky top-[53px] z-30 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
              {participant?.teamName?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-eesa-text truncate">
                {participant?.teamName || participant?.name}
              </h3>
              <p className="text-[11px] text-eesa-textSecondary truncate">
                {participant?.department || participant?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live Score Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-700">Score</span>
              <span className="font-mono font-black text-blue-700 text-base">
                {participant?.score || 0}
              </span>
            </div>

            {/* Leaderboard Toggle Button */}
            <button
              onClick={() => setShowLeaderboard(true)}
              className="p-2 rounded-xl bg-white hover:bg-slate-50 text-eesa-text border border-eesa-border transition shadow-sm"
              title="View Leaderboard"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Student Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-4 flex flex-col justify-between">
        {/* State 1: Waiting for host */}
        {gameState.session?.state === 'WAITING' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 bg-white rounded-2xl p-6 border border-eesa-border shadow-sm animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mb-4 text-blue-600">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-eesa-text">You're In!</h2>
            <p className="text-blue-600 font-semibold text-sm mt-1">{gameState.event?.title || 'EESA Quiz Challenge'}</p>
            <p className="text-xs text-eesa-textSecondary mt-3 max-w-xs leading-relaxed">
              Waiting for the host to start the game. Keep your phone screen awake and get ready on the buzzer!
            </p>
            <div className="mt-6 px-4 py-2 rounded-full bg-slate-50 border border-eesa-border text-xs font-mono text-eesa-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Connected & Live
            </div>
          </div>
        )}

        {/* State 2: Game Completed */}
        {gameState.session?.state === 'COMPLETED' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 bg-white rounded-2xl p-6 border border-eesa-border shadow-sm animate-fade-in">
            <Award className="w-16 h-16 text-amber-500 mb-3 animate-bounce-short" />
            <h2 className="text-2xl font-bold text-eesa-text">Event Completed!</h2>
            <p className="text-xs text-eesa-textSecondary mt-1">Thank you for participating in EESA Quiz Challenge.</p>
            <div className="my-6 p-4 rounded-xl bg-blue-50/60 border border-blue-200 w-full">
              <span className="text-xs uppercase font-bold text-eesa-textSecondary">Your Final Score</span>
              <div className="text-4xl font-black font-mono text-blue-600 mt-1">
                {participant?.score || 0} PTS
              </div>
            </div>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm transition"
            >
              <Trophy className="w-4 h-4" /> View Final Standings
            </button>
          </div>
        )}

        {/* State 3: Active Question / Buzzer Screen */}
        {gameState.session?.state !== 'WAITING' && gameState.session?.state !== 'COMPLETED' && (
          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* Question Card */}
            <div className="bg-white rounded-2xl p-5 border border-eesa-border shadow-sm relative overflow-hidden">
              {/* Top metadata */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {gameState.currentRound?.title || 'Round'}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-blue-600">
                    +{gameState.currentQuestion?.points || 10} PTS
                  </span>
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
              <h2 className="text-base sm:text-lg font-bold text-eesa-text leading-snug">
                {gameState.currentQuestion?.questionText || 'Loading next question...'}
              </h2>

              {/* Optional Question Image */}
              {gameState.currentQuestion?.imageUrl && (
                <div className="mt-3 rounded-xl overflow-hidden border border-eesa-border max-h-40 flex items-center justify-center bg-slate-50">
                  <img
                    src={gameState.currentQuestion.imageUrl}
                    alt="Question visual"
                    className="max-h-40 object-contain w-full"
                  />
                </div>
              )}
            </div>

            {/* Answer Result Banner if Answer Reveal */}
            {lastResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 animate-fade-in ${
                  lastResult.isCorrect
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-red-50 border-red-300 text-red-800'
                }`}
              >
                {lastResult.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <div>
                  <p>
                    {lastResult.isCorrect
                      ? `Correct! +${lastResult.pointsAwarded} pts awarded to ${lastResult.teamName}`
                      : `Wrong! ${lastResult.teamName} missed the answer.`}
                  </p>
                  {lastResult.correctAnswer && (
                    <p className="font-mono text-eesa-text font-bold mt-0.5">
                      Correct Answer: {lastResult.correctAnswer}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* MCQ Options (Shown when options exist) */}
            {gameState.currentQuestion?.options && gameState.currentQuestion.options.length > 0 && (
              <div className="grid grid-cols-1 gap-2.5">
                {gameState.currentQuestion.options.map((opt) => {
                  const isSelected = selectedAnswer === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectAnswer(opt.id)}
                      disabled={answerSubmitted}
                      className={`w-full p-3.5 rounded-xl text-left font-semibold text-sm flex items-center gap-3 transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-600 text-blue-700 shadow-sm'
                          : 'bg-white border border-eesa-border hover:border-blue-300 text-eesa-text active:scale-[0.98]'
                      } disabled:pointer-events-none`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold font-mono text-xs shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-eesa-text border border-eesa-border'
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="flex-1 truncate">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* BUZZER BUTTON SECTION (Clean Professional Red Button) */}
            <div className="py-4 flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={handleBuzz}
                disabled={!isBuzzerActive}
                className={`buzzer-btn relative rounded-full flex flex-col items-center justify-center select-none shadow-md transition-all duration-150 ${
                  isWinner
                    ? 'w-60 h-60 bg-emerald-600 text-white border-4 border-emerald-300 scale-105 shadow-lg'
                    : isSomeoneElseWinner
                    ? 'w-60 h-60 bg-slate-100 border-4 border-slate-200 text-slate-400 opacity-70'
                    : isBuzzerActive
                    ? 'w-60 h-60 bg-red-600 hover:bg-red-700 text-white border-4 border-red-300 active:scale-95 shadow-lg animate-pulse'
                    : 'w-56 h-56 bg-slate-100 border-4 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {/* Visual Icon / State Content */}
                {isWinner ? (
                  <div className="text-center px-4 animate-scale-up">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-1 text-white" />
                    <span className="block font-black text-lg leading-tight">
                      YOU BUZZED FIRST!
                    </span>
                    <span className="block text-xs font-mono font-bold mt-1 bg-white/20 px-2 py-0.5 rounded-full">
                      {(firstBuzzer.responseTimeMs / 1000).toFixed(2)}s Latency
                    </span>
                  </div>
                ) : isSomeoneElseWinner ? (
                  <div className="text-center px-4">
                    <XCircle className="w-10 h-10 mx-auto mb-1 text-slate-400" />
                    <span className="block font-bold text-sm text-slate-500">
                      TOO LATE!
                    </span>
                    <span className="block text-xs text-red-600 font-semibold mt-0.5 truncate max-w-[180px]">
                      {firstBuzzer.teamName} buzzed first
                    </span>
                  </div>
                ) : isBuzzerActive ? (
                  <div className="text-center">
                    <span className="font-black text-3xl tracking-wider block">
                      BUZZ
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-100 block mt-1">
                      Tap Button
                    </span>
                  </div>
                ) : (
                  <div className="text-center px-4">
                    <Zap className="w-10 h-10 mx-auto mb-1 text-slate-400" />
                    <span className="font-bold text-sm text-slate-500 block">
                      {gameState.session?.state === 'BUZZER_LOCKED'
                        ? 'BUZZER LOCKED'
                        : 'WAITING FOR HOST'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Buzzer activates soon
                    </span>
                  </div>
                )}
              </button>

              {/* Buzzer status message under button */}
              <p className="text-xs text-eesa-textSecondary text-center font-medium mt-3">
                {isBuzzerActive
                  ? '⚡ Buzzer is live! First registered touch claims the question.'
                  : 'Host controls buzzer activation.'}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Slide-over Leaderboard Drawer */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white h-full p-5 border-l border-eesa-border flex flex-col shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-eesa-border">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-eesa-text">Live Leaderboard</h3>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-eesa-text transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1">
              <LeaderboardCard
                leaderboard={gameState.leaderboard}
                currentParticipantId={participant?._id}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
