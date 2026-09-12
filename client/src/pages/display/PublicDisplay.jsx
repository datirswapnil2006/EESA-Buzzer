import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSocket } from '../../services/socket';
import { QRCodeSVG } from 'qrcode.react';
import EESALogo from '../../components/common/EESALogo';
import Timer from '../../components/common/Timer';
import confetti from 'canvas-confetti';
import { Zap, Trophy, Award, CheckCircle, XCircle, Users, Radio, Sparkles } from 'lucide-react';

export default function PublicDisplay() {
  const { eventCode } = useParams();
  const socket = getSocket();

  const [gameState, setGameState] = useState({
    event: null,
    session: { state: 'WAITING' },
    currentRound: null,
    currentQuestion: null,
    leaderboard: [],
    totalParticipants: 0,
    connectedParticipants: 0,
  });

  const [lastResult, setLastResult] = useState(null);
  const [celebrated, setCelebrated] = useState(false);

  useEffect(() => {
    const handleConnect = () => {
      socket.emit('join_event', {
        eventCode,
        role: 'display',
      });
    };

    const handleEventState = (state) => {
      if (!state) return;
      setGameState(state);

      if (state.session?.state === 'COMPLETED' && !celebrated) {
        setCelebrated(true);
        triggerWinnerConfetti();
      }
    };

    const handleBuzzerLocked = (firstBuzzer) => {
      console.log('Projector display: Buzzer locked by', firstBuzzer);
    };

    const handleAnswerResult = (result) => {
      setLastResult(result);
      if (result.isCorrect) {
        try {
          confetti({
            particleCount: 70,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch (e) {}
      }
    };

    socket.on('connect', handleConnect);
    socket.on('event_state', handleEventState);
    socket.on('buzzer_locked', handleBuzzerLocked);
    socket.on('first_buzzer', handleBuzzerLocked);
    socket.on('answer_result', handleAnswerResult);
    socket.on('leaderboard_updated', (lb) => setGameState((prev) => ({ ...prev, leaderboard: lb })));
    socket.on('game_ended', () => triggerWinnerConfetti());

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('event_state', handleEventState);
      socket.off('buzzer_locked', handleBuzzerLocked);
      socket.off('first_buzzer', handleBuzzerLocked);
      socket.off('answer_result', handleAnswerResult);
      socket.off('leaderboard_updated');
      socket.off('game_ended');
    };
  }, [eventCode, celebrated]);

  const triggerWinnerConfetti = () => {
    try {
      const end = Date.now() + 4 * 1000;
      const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: { x: Math.random(), y: Math.random() - 0.2 },
        });
      }, 250);
    } catch (e) {}
  };

  const joinUrl = `${window.location.origin}/join/${eventCode || ''}`;
  const firstBuzzer = gameState.session?.firstBuzzer;
  const isBuzzerLocked = gameState.session?.state === 'BUZZER_LOCKED' && firstBuzzer;
  const isAnswerReveal = gameState.session?.state === 'ANSWER_REVEAL';

  return (
    <div className="min-h-screen bg-eesa-bg text-eesa-text flex flex-col justify-between p-6 lg:p-10 select-none overflow-hidden relative font-sans">
      {/* TOP BAR: Grand EESA Header */}
      <header className="flex items-center justify-between pb-6 border-b border-eesa-border relative z-10">
        <EESALogo size="lg" subtitle="Electronics Engineering Students Association • Live Event" />

        <div className="flex items-center gap-6">
          <div className="text-right">
            <h3 className="font-bold text-xl text-eesa-text tracking-tight">
              {gameState.event?.title || 'EESA QUIZ CHALLENGE'}
            </h3>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-0.5">
              Event Code: <span className="font-mono text-blue-700 bg-blue-50 border border-blue-200 font-bold text-sm px-2.5 py-0.5 rounded ml-1">{eventCode}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-eesa-border text-xs font-semibold shadow-sm">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-eesa-text">
              {gameState.connectedParticipants || 0} Connected
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col justify-center my-6 relative z-10">
        {/* VIEW 1: WAITING SCREEN (QR Code + Join Instructions) */}
        {gameState.session?.state === 'WAITING' && (
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center bg-white rounded-3xl p-10 lg:p-14 border border-eesa-border shadow-sm">
            <div className="text-center md:text-left space-y-4">
              <span className="text-xs uppercase font-bold tracking-wider px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-block">
                ⚡ Ready to Compete
              </span>
              <h2 className="text-4xl lg:text-5xl font-black text-eesa-text leading-tight">
                Scan QR to <span className="text-blue-600">Join Game</span>
              </h2>
              <p className="text-eesa-textSecondary text-base leading-relaxed">
                Open your phone's camera or browser and scan the code to register your team. No app installation needed!
              </p>

              <div className="p-4 rounded-xl bg-slate-50 border border-eesa-border font-mono text-sm">
                <span className="text-eesa-textSecondary block text-xs uppercase mb-1">Direct Link</span>
                <span className="text-blue-600 font-bold break-all">{joinUrl}</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-eesa-border shadow-inner">
              <QRCodeSVG
                value={joinUrl}
                size={240}
                level="H"
                includeMargin={true}
              />
              <p className="text-eesa-text font-bold text-sm tracking-wider uppercase mt-3">
                SCAN WITH PHONE
              </p>
            </div>
          </div>
        )}

        {/* VIEW 2: FINAL COMPLETED PODIUM SCREEN */}
        {gameState.session?.state === 'COMPLETED' && (
          <div className="max-w-5xl mx-auto w-full bg-white rounded-3xl p-8 lg:p-12 border border-eesa-border shadow-sm text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-4 h-4 text-amber-600" /> Championship Standings
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-eesa-text mb-2">
              EESA Quiz Challenge Winners
            </h2>
            <p className="text-eesa-textSecondary text-sm mb-10">Congratulations to all participating engineering teams!</p>

            {/* PODIUM DISPLAY */}
            <div className="grid grid-cols-3 gap-4 lg:gap-8 items-end max-w-3xl mx-auto pt-6 pb-2">
              {/* 2nd Place */}
              <div className="order-1 flex flex-col items-center">
                <div className="text-3xl mb-2">🥈</div>
                <div className="bg-slate-50 p-4 rounded-2xl w-full border border-slate-200 mb-2">
                  <h4 className="font-bold text-base text-eesa-text truncate">
                    {gameState.leaderboard[1]?.teamName || 'Runner Up'}
                  </h4>
                  <p className="text-xs text-eesa-textSecondary truncate">{gameState.leaderboard[1]?.department}</p>
                  <p className="font-mono font-black text-xl text-slate-700 mt-2">
                    {gameState.leaderboard[1]?.score || 0} PTS
                  </p>
                </div>
                <div className="w-full bg-slate-200 h-28 rounded-t-2xl flex items-center justify-center font-bold text-2xl text-slate-700 border-t-4 border-slate-300">
                  2ND
                </div>
              </div>

              {/* 1st Place Champion */}
              <div className="order-2 flex flex-col items-center -mt-6">
                <div className="text-5xl mb-2 animate-bounce-short">👑</div>
                <div className="bg-amber-50/80 p-5 rounded-2xl w-full border-2 border-amber-300 mb-2 shadow-sm">
                  <h4 className="font-black text-lg lg:text-xl text-amber-900 truncate">
                    {gameState.leaderboard[0]?.teamName || 'Champion'}
                  </h4>
                  <p className="text-xs text-amber-700 truncate">{gameState.leaderboard[0]?.department}</p>
                  <p className="font-mono font-black text-3xl text-amber-600 mt-2">
                    {gameState.leaderboard[0]?.score || 0} PTS
                  </p>
                </div>
                <div className="w-full bg-gradient-to-b from-amber-400 to-amber-500 h-40 rounded-t-2xl flex items-center justify-center font-black text-3xl text-white shadow-sm border-t-4 border-amber-300">
                  1ST
                </div>
              </div>

              {/* 3rd Place */}
              <div className="order-3 flex flex-col items-center">
                <div className="text-3xl mb-2">🥉</div>
                <div className="bg-slate-50 p-4 rounded-2xl w-full border border-amber-200 mb-2">
                  <h4 className="font-bold text-base text-eesa-text truncate">
                    {gameState.leaderboard[2]?.teamName || '3rd Place'}
                  </h4>
                  <p className="text-xs text-eesa-textSecondary truncate">{gameState.leaderboard[2]?.department}</p>
                  <p className="font-mono font-black text-xl text-amber-700 mt-2">
                    {gameState.leaderboard[2]?.score || 0} PTS
                  </p>
                </div>
                <div className="w-full bg-amber-100 h-20 rounded-t-2xl flex items-center justify-center font-bold text-2xl text-amber-800 border-t-4 border-amber-200">
                  3RD
                </div>
              </div>
            </div>

            {/* Top 4 & 5 Honor Roll */}
            {gameState.leaderboard?.length > 3 && (
              <div className="pt-6 border-t border-eesa-border max-w-2xl mx-auto">
                <span className="text-xs uppercase font-bold text-eesa-textSecondary tracking-wider block mb-3">
                  Top Contenders (4th & 5th Place)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gameState.leaderboard.slice(3, 5).map((p, idx) => (
                    <div key={p._id || idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 font-mono font-black text-xs flex items-center justify-center shrink-0">
                          #{idx + 4}
                        </span>
                        <div className="text-left min-w-0">
                          <h5 className="font-bold text-sm text-eesa-text truncate">{p.teamName}</h5>
                          <p className="text-[11px] text-eesa-textSecondary truncate">{p.department}</p>
                        </div>
                      </div>
                      <div className="font-mono font-black text-base text-blue-600 shrink-0 ml-2">
                        {p.score || 0} PTS
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: LIVE ACTIVE QUESTION / BUZZER / ANSWER DISPLAY */}
        {gameState.session?.state !== 'WAITING' && gameState.session?.state !== 'COMPLETED' && (
          <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            {/* Main Stage (3 Columns) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Question Header Card */}
              <div className="bg-white rounded-3xl p-8 lg:p-10 border border-eesa-border shadow-sm relative overflow-hidden">
                {/* Round & Meta Banner */}
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold uppercase tracking-wider px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {gameState.currentRound?.title || 'Round'}
                    </span>
                    <span className="text-xs font-bold text-eesa-textSecondary uppercase tracking-wider">
                      Question {gameState.currentQuestion?.order || 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-base font-black font-mono text-blue-600">
                      +{gameState.currentQuestion?.points || 10} PTS
                    </span>
                    {gameState.session?.questionStartTime && (
                      <Timer
                        startTime={gameState.session.questionStartTime}
                        duration={gameState.session.questionDuration || 15}
                        size="md"
                      />
                    )}
                  </div>
                </div>

                {/* Hero Question Text with 1080p Optimized Sizing */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-eesa-text leading-tight">
                  {gameState.currentQuestion?.questionText}
                </h1>

                {/* Optional High-Res Question Image */}
                {gameState.currentQuestion?.imageUrl && (
                  <div className="mt-6 rounded-2xl overflow-hidden border border-eesa-border max-h-72 flex items-center justify-center bg-slate-50">
                    <img
                      src={gameState.currentQuestion.imageUrl}
                      alt="Question display"
                      className="max-h-72 object-contain w-full"
                    />
                  </div>
                )}
              </div>

              {/* BUZZER LOCKED HERO BANNER (When student buzzes first) */}
              {isBuzzerLocked && (
                <div className="p-6 rounded-2xl bg-red-50 border-2 border-red-300 shadow-sm flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center text-white text-2xl shadow-sm animate-pulse">
                      🔔
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-red-700 block">
                        BUZZER LOCKED FIRST
                      </span>
                      <h3 className="text-3xl font-black text-eesa-text">
                        {firstBuzzer.teamName}
                      </h3>
                      <p className="text-xs text-eesa-textSecondary">
                        Player: {firstBuzzer.participantName}
                      </p>
                      {firstBuzzer.selectedAnswer && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-100/80 border border-red-200 text-xs font-bold text-red-900">
                          <span>Selected:</span>
                          <span className="font-mono bg-red-600 text-white px-1.5 py-0.5 rounded text-[11px]">
                            {firstBuzzer.selectedAnswer}
                          </span>
                          <span className="truncate max-w-[240px]">
                            {firstBuzzer.selectedOptionText || `Option ${firstBuzzer.selectedAnswer}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs uppercase font-bold text-eesa-textSecondary block">
                      Reaction Time
                    </span>
                    <span className="text-3xl font-black font-mono text-blue-600">
                      {(firstBuzzer.responseTimeMs / 1000).toFixed(2)}s
                    </span>
                  </div>
                </div>
              )}

              {/* ANSWER REVEAL BANNER (When Host marks correct/wrong) */}
              {isAnswerReveal && lastResult && (
                <div
                  className={`p-6 rounded-2xl border-2 flex items-center justify-between animate-fade-in ${
                    lastResult.isCorrect
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
                      : 'bg-red-50 border-red-300 text-red-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {lastResult.isCorrect ? (
                      <CheckCircle className="w-12 h-12 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-12 h-12 text-red-600 shrink-0" />
                    )}
                    <div>
                      <h3 className="text-2xl font-black">
                        {lastResult.isCorrect ? '✓ CORRECT ANSWER!' : '✕ INCORRECT!'}
                      </h3>
                      <p className="text-sm font-semibold opacity-90 mt-0.5">
                        {lastResult.isCorrect
                          ? `+${lastResult.pointsAwarded} points awarded to ${lastResult.teamName}`
                          : `Wrong answer! ${lastResult.teamName} incurred penalty (-${lastResult.pointsDeducted || 0} pts).`}
                      </p>
                      {lastResult.selectedAnswer && (
                        <p className="text-xs opacity-75 mt-1">
                          Player answered: Option {lastResult.selectedAnswer}
                        </p>
                      )}
                    </div>
                  </div>

                  {lastResult.correctAnswer && (
                    <div className="text-right">
                      <span className="text-xs uppercase font-bold opacity-80 block">
                        Official Answer
                      </span>
                      <span className="text-2xl font-black font-mono text-eesa-text">
                        {lastResult.correctAnswer}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* MCQ Options Grid */}
              {gameState.currentQuestion?.options && gameState.currentQuestion.options.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gameState.currentQuestion.options.map((opt) => {
                    const isCorrectAnswer = isAnswerReveal && String(gameState.currentQuestion?.correctAnswer).toLowerCase() === String(opt.id).toLowerCase();

                    return (
                      <div
                        key={opt.id}
                        className={`p-5 rounded-2xl font-bold text-lg flex items-center gap-4 transition-all duration-300 border ${
                          isCorrectAnswer
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm scale-[1.01]'
                            : 'bg-white border border-eesa-border text-eesa-text hover:border-blue-300'
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-bold text-xl shrink-0 ${
                            isCorrectAnswer
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-eesa-text border border-eesa-border'
                          }`}
                        >
                          {opt.id}
                        </div>
                        <span className="text-xl font-bold text-eesa-text">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Side Tournament Status Panel (1 Column) */}
            <div className="lg:col-span-1 bg-white rounded-3xl p-5 border border-eesa-border shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-eesa-border">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-base text-eesa-text">Live Tournament</h3>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-center space-y-2.5 my-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto text-lg shadow-sm">
                    🔒
                  </div>
                  <h4 className="font-bold text-sm text-eesa-text">Standings Hidden</h4>
                  <p className="text-xs text-eesa-textSecondary leading-relaxed">
                    Live team ranks are monitored privately on the Host Desk during the active quiz.
                  </p>
                  <div className="pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white border border-blue-200 text-blue-700 inline-block shadow-2xs">
                      Top 5 Revealed at End
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-eesa-border text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{gameState.connectedParticipants || 0} Teams Competing</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER: EESA Projector Footer */}
      <footer className="pt-4 border-t border-eesa-border flex items-center justify-between text-xs text-eesa-textSecondary relative z-10">
        <p className="font-medium text-eesa-textSecondary">EESA Quiz Challenge • Official Live Display System</p>
        <p className="font-mono text-blue-600 font-semibold">Press F11 for Fullscreen Mode</p>
      </footer>
    </div>
  );
}
