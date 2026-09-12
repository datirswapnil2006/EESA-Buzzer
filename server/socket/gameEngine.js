const Event = require('../models/Event');
const Round = require('../models/Round');
const Question = require('../models/Question');
const Participant = require('../models/Participant');
const GameSession = require('../models/GameSession');
const ScoreEvent = require('../models/ScoreEvent');

// In-memory active locks to guarantee single-winner atomic buzzer resolution
const buzzerLocks = new Map(); // eventId -> { locked: boolean, winner: object, startTime: number }

const setupGameEngine = (io) => {
  // Helper to broadcast full state
  const getHydratedState = async (eventId, forAdmin = false) => {
    const event = await Event.findById(eventId);
    if (!event) return null;

    let session = await GameSession.findOne({ eventId });
    if (!session) {
      session = await GameSession.create({ eventId, state: 'WAITING' });
    }

    const rounds = await Round.find({ eventId }).sort({ order: 1 });
    const currentRound = session.currentRoundId
      ? await Round.findById(session.currentRoundId)
      : rounds[session.currentRoundIndex] || rounds[0];

    let questions = [];
    if (currentRound) {
      questions = await Question.find({ roundId: currentRound._id }).sort({ order: 1 });
    }

    const currentQuestion = session.currentQuestionId
      ? await Question.findById(session.currentQuestionId)
      : questions[session.currentQuestionIndex];

    const fullLeaderboard = await Participant.find({ eventId })
      .sort({ score: -1, buzzerWins: -1, name: 1 })
      .limit(20);

    // Leaderboard is visible ONLY to admin while the test is active,
    // and revealed to everyone once the quiz ends (state === 'COMPLETED')
    const showLeaderboard = forAdmin || session.state === 'COMPLETED';
    const leaderboard = showLeaderboard ? fullLeaderboard : [];

    const totalParticipants = await Participant.countDocuments({ eventId });
    const connectedParticipants = await Participant.countDocuments({ eventId, isConnected: true });

    return {
      event: {
        _id: event._id,
        title: event.title,
        eventCode: event.eventCode,
        organizer: event.organizer,
        status: event.status,
        settings: event.settings,
      },
      session: {
        state: session.state,
        currentRoundIndex: session.currentRoundIndex,
        currentQuestionIndex: session.currentQuestionIndex,
        questionStartTime: session.questionStartTime,
        questionDuration: session.questionDuration,
        buzzerStartTime: session.buzzerStartTime,
        buzzerLocked: session.buzzerLocked,
        firstBuzzer: session.firstBuzzer,
      },
      currentRound: currentRound
        ? {
            _id: currentRound._id,
            title: currentRound.title,
            description: currentRound.description,
            order: currentRound.order,
            roundType: currentRound.roundType,
            rules: currentRound.rules,
            totalQuestions: questions.length,
          }
        : null,
      currentQuestion: currentQuestion
        ? {
            _id: currentQuestion._id,
            questionText: currentQuestion.questionText,
            questionType: currentQuestion.questionType,
            options: currentQuestion.options,
            explanation: (forAdmin || session.state === 'ANSWER_REVEAL') ? currentQuestion.explanation : '',
            correctAnswer: (forAdmin || session.state === 'ANSWER_REVEAL') ? currentQuestion.correctAnswer : null,
            imageUrl: currentQuestion.imageUrl,
            category: currentQuestion.category,
            difficulty: currentQuestion.difficulty,
            points: currentQuestion.points,
            negativePoints: currentQuestion.negativePoints,
            timeLimit: currentQuestion.timeLimit,
            buzzerEnabled: currentQuestion.buzzerEnabled,
            order: currentQuestion.order,
          }
        : null,
      leaderboard,
      totalParticipants,
      connectedParticipants,
    };
  };

  const broadcastState = async (eventId) => {
    const publicState = await getHydratedState(eventId, false);
    const adminState = await getHydratedState(eventId, true);
    io.to(`event_${eventId}`).emit('event_state', publicState);
    io.to(`event_${eventId}_admin`).emit('event_state', adminState);

    // Admin desk always receives real-time leaderboard
    if (adminState?.leaderboard) {
      io.to(`event_${eventId}_admin`).emit('leaderboard_updated', adminState.leaderboard);
    }
    // Students and public display only receive leaderboard once the event concludes
    if (adminState?.session?.state === 'COMPLETED') {
      io.to(`event_${eventId}`).emit('leaderboard_updated', adminState.leaderboard);
    }
  };

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room for an event
    socket.on('join_event', async ({ eventCode, participantId, role }) => {
      try {
        const event = await Event.findOne({ eventCode: eventCode?.toUpperCase() });
        if (!event) {
          return socket.emit('sync_error', { message: 'Event not found' });
        }

        const roomName = `event_${event._id}`;
        socket.join(roomName);
        socket.eventId = event._id.toString();
        socket.role = role || 'student';

        const isAdmin = socket.role === 'admin' || socket.role === 'host';
        if (isAdmin) {
          socket.join(`event_${event._id}_admin`);
        }

        let participant = null;
        if (participantId) {
          participant = await Participant.findById(participantId);
          if (participant) {
            participant.socketId = socket.id;
            participant.isConnected = true;
            participant.lastActive = new Date();
            await participant.save();
            socket.participantId = participant._id.toString();

            // Notify room of participant join/reconnect
            io.to(roomName).emit('participant_joined', {
              participant: {
                _id: participant._id,
                name: participant.name,
                teamName: participant.teamName,
                department: participant.department,
                score: participant.score,
                isConnected: true,
              },
            });
          }
        }

        // Send full authoritative initial state to the connecting socket
        const state = await getHydratedState(event._id, isAdmin);
        socket.emit('event_state', { ...state, participant });
      } catch (err) {
        console.error('join_event error:', err);
        socket.emit('sync_error', { message: err.message });
      }
    });

    // Request fresh state
    socket.on('request_state', async ({ eventId }) => {
      try {
        const targetEventId = eventId || socket.eventId;
        if (!targetEventId) return;
        const isAdmin = socket.role === 'admin' || socket.role === 'host';
        const state = await getHydratedState(targetEventId, isAdmin);
        socket.emit('event_state', state);
      } catch (err) {
        console.error('request_state error:', err);
      }
    });

    // START GAME
    socket.on('start_game', async () => {
      try {
        if (socket.role !== 'admin' && socket.role !== 'host') return;
        const eventId = socket.eventId;
        const event = await Event.findById(eventId);
        if (!event) return;

        event.status = 'active';
        await event.save();

        let session = await GameSession.findOne({ eventId });
        if (!session) session = new GameSession({ eventId });

        const rounds = await Round.find({ eventId }).sort({ order: 1 });
        const firstRound = rounds[0];
        let firstQuestion = null;
        if (firstRound) {
          firstQuestion = await Question.findOne({ roundId: firstRound._id }).sort({ order: 1 });
        }

        session.state = 'QUESTION_ACTIVE';
        session.currentRoundId = firstRound?._id;
        session.currentQuestionId = firstQuestion?._id;
        session.currentRoundIndex = 0;
        session.currentQuestionIndex = 0;
        session.questionStartTime = new Date();
        session.questionDuration = firstQuestion?.timeLimit || event.settings?.defaultTimeLimit || 15;
        session.buzzerLocked = false;
        session.firstBuzzer = null;
        session.updatedAt = new Date();
        await session.save();

        buzzerLocks.set(eventId, { locked: false, winner: null, startTime: null });

        const state = await getHydratedState(eventId, true);
        io.to(`event_${eventId}`).emit('game_started', state);
        await broadcastState(eventId);
      } catch (err) {
        console.error('start_game error:', err);
      }
    });

    // START BUZZER
    socket.on('start_buzzer', async () => {
      try {
        if (socket.role !== 'admin' && socket.role !== 'host') return;
        const eventId = socket.eventId;
        const session = await GameSession.findOne({ eventId });
        if (!session) return;

        session.state = 'BUZZER_ACTIVE';
        session.buzzerStartTime = new Date();
        session.buzzerLocked = false;
        session.firstBuzzer = null;
        session.updatedAt = new Date();
        await session.save();

        // Authoritative lock reset
        buzzerLocks.set(eventId, {
          locked: false,
          winner: null,
          startTime: Date.now(),
        });

        io.to(`event_${eventId}`).emit('buzzer_started', {
          buzzerStartTime: session.buzzerStartTime,
        });

        await broadcastState(eventId);
      } catch (err) {
        console.error('start_buzzer error:', err);
      }
    });

    // HELPER: APPLY CORRECT ANSWER
    const applyCorrectAnswer = async (eventId, participantId, customPoints) => {
      const session = await GameSession.findOne({ eventId });
      const event = await Event.findById(eventId);
      const targetParticipantId = participantId || session?.firstBuzzer?.participantId;
      if (!targetParticipantId) return null;

      const currentQuestion = session?.currentQuestionId
        ? await Question.findById(session.currentQuestionId)
        : null;

      const basePoints = currentQuestion?.points !== undefined
        ? currentQuestion.points
        : (event?.settings?.defaultPoints || 10);
      const buzzerBonus = session?.buzzerLocked ? (event?.settings?.buzzerBonus || 0) : 0;
      const pointsToAdd = customPoints !== undefined ? Number(customPoints) : (basePoints + buzzerBonus);

      const participant = await Participant.findById(targetParticipantId);
      if (!participant) return null;

      participant.score += pointsToAdd;
      participant.correctCount += 1;
      await participant.save();

      await ScoreEvent.create({
        eventId,
        participantId: participant._id,
        questionId: currentQuestion?._id,
        roundId: session?.currentRoundId,
        action: 'CORRECT_ANSWER',
        pointsDelta: pointsToAdd,
        resultingScore: participant.score,
        selectedAnswer: session?.firstBuzzer?.selectedAnswer || '',
        selectedOptionText: session?.firstBuzzer?.selectedOptionText || '',
        correctAnswer: currentQuestion?.correctAnswer || '',
        isCorrect: true,
        responseTimeMs: session?.firstBuzzer?.responseTimeMs || 0,
        note: `Correct Answer (+${pointsToAdd} pts)${session?.firstBuzzer?.selectedAnswer ? ` [Option ${session.firstBuzzer.selectedAnswer}]` : ''}`,
      });

      if (session) {
        session.state = 'ANSWER_REVEAL';
        if (session.firstBuzzer) {
          session.firstBuzzer.isCorrect = true;
        }
        await session.save();
      }

      const resultPayload = {
        isCorrect: true,
        participantId: participant._id,
        participantName: participant.name,
        teamName: participant.teamName,
        selectedAnswer: session?.firstBuzzer?.selectedAnswer || '',
        selectedOptionText: session?.firstBuzzer?.selectedOptionText || '',
        pointsAwarded: pointsToAdd,
        correctAnswer: currentQuestion?.correctAnswer,
        explanation: currentQuestion?.explanation,
      };

      io.to(`event_${eventId}`).emit('answer_result', resultPayload);
      await broadcastState(eventId);
      return resultPayload;
    };

    // HELPER: APPLY WRONG ANSWER
    const applyWrongAnswer = async (eventId, participantId, customPenalty) => {
      const session = await GameSession.findOne({ eventId });
      const event = await Event.findById(eventId);
      const targetParticipantId = participantId || session?.firstBuzzer?.participantId;
      if (!targetParticipantId) return null;

      const currentQuestion = session?.currentQuestionId
        ? await Question.findById(session.currentQuestionId)
        : null;

      const isNegEnabled = event?.settings?.negativeMarkingEnabled !== false;
      const configuredPenalty = currentQuestion?.negativePoints !== undefined
        ? currentQuestion.negativePoints
        : (event?.settings?.defaultNegativePoints || 5);

      const negativePoints = customPenalty !== undefined
        ? Number(customPenalty)
        : (isNegEnabled ? configuredPenalty : 0);

      const participant = await Participant.findById(targetParticipantId);
      if (!participant) return null;

      participant.score = Math.max(0, participant.score - negativePoints);
      participant.wrongCount += 1;
      await participant.save();

      await ScoreEvent.create({
        eventId,
        participantId: participant._id,
        questionId: currentQuestion?._id,
        roundId: session?.currentRoundId,
        action: 'WRONG_ANSWER',
        pointsDelta: -negativePoints,
        resultingScore: participant.score,
        selectedAnswer: session?.firstBuzzer?.selectedAnswer || '',
        selectedOptionText: session?.firstBuzzer?.selectedOptionText || '',
        correctAnswer: currentQuestion?.correctAnswer || '',
        isCorrect: false,
        responseTimeMs: session?.firstBuzzer?.responseTimeMs || 0,
        note: `Wrong Answer (-${negativePoints} pts)${session?.firstBuzzer?.selectedAnswer ? ` [Option ${session.firstBuzzer.selectedAnswer}]` : ''}`,
      });

      if (session) {
        session.state = 'ANSWER_REVEAL';
        if (session.firstBuzzer) {
          session.firstBuzzer.isCorrect = false;
        }
        await session.save();
      }

      const resultPayload = {
        isCorrect: false,
        participantId: participant._id,
        participantName: participant.name,
        teamName: participant.teamName,
        selectedAnswer: session?.firstBuzzer?.selectedAnswer || '',
        selectedOptionText: session?.firstBuzzer?.selectedOptionText || '',
        pointsDeducted: negativePoints,
        correctAnswer: currentQuestion?.correctAnswer,
        explanation: currentQuestion?.explanation,
      };

      io.to(`event_${eventId}`).emit('answer_result', resultPayload);
      await broadcastState(eventId);
      return resultPayload;
    };

    // ATOMIC BUZZ ACTION (from Student) - supports option answer selection
    socket.on('buzz', async (payload = {}) => {
      try {
        const answer = typeof payload === 'object' ? payload.answer : payload;
        const eventId = socket.eventId;
        const participantId = socket.participantId;
        if (!eventId || !participantId) {
          return socket.emit('buzz_rejected', { reason: 'Unauthorized participant' });
        }

        const lock = buzzerLocks.get(eventId);
        if (!lock || lock.locked || !lock.startTime) {
          return socket.emit('buzz_rejected', { reason: 'Buzzer is locked or inactive' });
        }

        // ATOMIC WINNER REGISTRATION - SYNCHRONOUS WITH ZERO ASYNC GAP
        lock.locked = true;
        const now = Date.now();
        const responseTimeMs = Math.max(10, now - lock.startTime);

        const session = await GameSession.findOne({ eventId });
        if (!session || session.state !== 'BUZZER_ACTIVE' || session.buzzerLocked) {
          lock.locked = false; // rollback
          return socket.emit('buzz_rejected', { reason: 'Buzzer is not active' });
        }

        const participant = await Participant.findById(participantId);
        if (!participant) {
          lock.locked = false; // rollback if invalid
          return socket.emit('buzz_rejected', { reason: 'Participant not found' });
        }

        const currentQuestion = session.currentQuestionId
          ? await Question.findById(session.currentQuestionId)
          : null;

        let selectedAnswer = answer || '';
        let selectedOptionText = '';
        let isCorrect = null;

        if (selectedAnswer && currentQuestion) {
          const chosenOpt = currentQuestion.options?.find(
            (o) => String(o.id).trim().toLowerCase() === String(selectedAnswer).trim().toLowerCase()
          );
          selectedOptionText = chosenOpt ? `${chosenOpt.id}: ${chosenOpt.text}` : String(selectedAnswer);
          isCorrect = String(currentQuestion.correctAnswer).trim().toLowerCase() === String(selectedAnswer).trim().toLowerCase();
        }

        const winnerData = {
          participantId: participant._id,
          participantName: participant.name,
          teamName: participant.teamName,
          selectedAnswer,
          selectedOptionText,
          isCorrect,
          responseTimeMs,
          timestamp: new Date(),
        };

        lock.winner = winnerData;
        session.state = 'BUZZER_LOCKED';
        session.buzzerLocked = true;
        session.firstBuzzer = winnerData;
        session.updatedAt = new Date();
        await session.save();

        // Participant buzzer wins stat update
        participant.buzzerWins += 1;
        await participant.save();

        console.log(`[BUZZER WINNER] ${participant.teamName} (${participant.name}) in ${responseTimeMs}ms with answer: "${selectedAnswer}" (isCorrect: ${isCorrect})`);

        // Instant broadcast to ALL clients
        io.to(`event_${eventId}`).emit('buzzer_locked', winnerData);
        io.to(`event_${eventId}`).emit('first_buzzer', winnerData);

        await broadcastState(eventId);
      } catch (err) {
        console.error('buzz error:', err);
      }
    });

    // SUBMIT OR CONFIRM BUZZER ANSWER (if buzz was pressed first before selecting option)
    socket.on('submit_buzzer_answer', async ({ answer }) => {
      try {
        const eventId = socket.eventId;
        const participantId = socket.participantId;
        if (!eventId || !participantId || !answer) return;

        const session = await GameSession.findOne({ eventId });
        if (!session || !session.buzzerLocked || !session.firstBuzzer) return;

        if (session.firstBuzzer.participantId?.toString() !== participantId.toString()) {
          return socket.emit('answer_rejected', { reason: 'Only the buzzer winner can submit answer' });
        }

        const currentQuestion = session.currentQuestionId
          ? await Question.findById(session.currentQuestionId)
          : null;

        const chosenOpt = currentQuestion?.options?.find(
          (o) => String(o.id).trim().toLowerCase() === String(answer).trim().toLowerCase()
        );
        const selectedOptionText = chosenOpt ? `${chosenOpt.id}: ${chosenOpt.text}` : String(answer);
        const isCorrect = currentQuestion
          ? String(currentQuestion.correctAnswer).trim().toLowerCase() === String(answer).trim().toLowerCase()
          : null;

        session.firstBuzzer.selectedAnswer = answer;
        session.firstBuzzer.selectedOptionText = selectedOptionText;
        session.firstBuzzer.isCorrect = isCorrect;
        session.updatedAt = new Date();
        await session.save();

        const lock = buzzerLocks.get(eventId);
        if (lock && lock.winner) {
          lock.winner.selectedAnswer = answer;
          lock.winner.selectedOptionText = selectedOptionText;
          lock.winner.isCorrect = isCorrect;
        }

        io.to(`event_${eventId}`).emit('buzzer_answer_updated', session.firstBuzzer);
        io.to(`event_${eventId}`).emit('buzzer_locked', session.firstBuzzer);
        io.to(`event_${eventId}`).emit('first_buzzer', session.firstBuzzer);
        await broadcastState(eventId);
      } catch (err) {
        console.error('submit_buzzer_answer error:', err);
      }
    });

    // LOCK BUZZER (Host manual lock)
    socket.on('lock_buzzer', async () => {
      try {
        if (socket.role !== 'admin' && socket.role !== 'host') return;
        const eventId = socket.eventId;
        const session = await GameSession.findOne({ eventId });
        if (!session) return;

        session.state = 'BUZZER_LOCKED';
        session.buzzerLocked = true;
        await session.save();

        const lock = buzzerLocks.get(eventId);
        if (lock) lock.locked = true;

        io.to(`event_${eventId}`).emit('buzzer_locked', session.firstBuzzer || {});
        await broadcastState(eventId);
      } catch (err) {
        console.error('lock_buzzer error:', err);
      }
    });

    // MARK ANSWER CORRECT
    socket.on('mark_correct', async ({ participantId, customPoints }) => {
      try {
        if (socket.role !== 'admin' && socket.role !== 'host') return;
        await applyCorrectAnswer(socket.eventId, participantId, customPoints);
      } catch (err) {
        console.error('mark_correct error:', err);
      }
    });

    // MARK ANSWER WRONG
    socket.on('mark_wrong', async ({ participantId, customPenalty }) => {
      try {
        if (socket.role !== 'admin' && socket.role !== 'host') return;
        await applyWrongAnswer(socket.eventId, participantId, customPenalty);
      } catch (err) {
        console.error('mark_wrong error:', err);
      }
    });

    // AUTO-GRADE BUZZER
    socket.on('auto_grade_buzzer', async () => {
      try {
        if (socket.role !== 'admin' && socket.role !== 'host') return;
        const session = await GameSession.findOne({ eventId: socket.eventId });
        if (!session?.firstBuzzer?.participantId) return;

        if (session.firstBuzzer.isCorrect === true) {
          await applyCorrectAnswer(socket.eventId, session.firstBuzzer.participantId);
        } else if (session.firstBuzzer.isCorrect === false) {
          await applyWrongAnswer(socket.eventId, session.firstBuzzer.participantId);
        }
      } catch (err) {
        console.error('auto_grade_buzzer error:', err);
      }
    });

    // STUDENT SUBMITS ANSWER (for MCQ/True-False rounds)
    socket.on('submit_answer', async ({ answer }) => {
      try {
        const eventId = socket.eventId;
        const participantId = socket.participantId;
        if (!eventId || !participantId) return;

        const session = await GameSession.findOne({ eventId });
        if (!session || (session.state !== 'QUESTION_ACTIVE' && session.state !== 'BUZZER_LOCKED')) {
          return socket.emit('answer_rejected', { reason: 'Answering is not currently open' });
        }

        const question = await Question.findById(session.currentQuestionId);
        if (!question) return;

        const isCorrect = String(question.correctAnswer).trim().toLowerCase() === String(answer).trim().toLowerCase();
        socket.emit('answer_submitted', { answer, received: true });

        // If in buzzer mode and this is the first buzzer participant, host can auto-grade or review
        console.log(`Answer submitted by participant ${participantId}: ${answer} (Correct: ${isCorrect})`);
      } catch (err) {
        console.error('submit_answer error:', err);
      }
    });

    // NEXT QUESTION
    socket.on('next_question', async () => {
      try {
        if (socket.role !== 'admin' && socket.role !== 'host') return;
        const eventId = socket.eventId;
        const session = await GameSession.findOne({ eventId });
        if (!session) return;

        const rounds = await Round.find({ eventId }).sort({ order: 1 });
        const currentRound = rounds[session.currentRoundIndex] || rounds[0];
        const questionsInRound = await Question.find({ roundId: currentRound?._id }).sort({ order: 1 });

        const nextQIndex = session.currentQuestionIndex + 1;
        if (nextQIndex < questionsInRound.length) {
          // Advance question within same round
          session.currentQuestionIndex = nextQIndex;
          session.currentQuestionId = questionsInRound[nextQIndex]._id;
          session.state = 'QUESTION_ACTIVE';
          session.questionStartTime = new Date();
          session.questionDuration = questionsInRound[nextQIndex].timeLimit || 15;
          session.buzzerLocked = false;
          session.firstBuzzer = null;
          await session.save();

          buzzerLocks.set(eventId, { locked: false, winner: null, startTime: null });
        } else {
          // End of round reached
          const nextRIndex = session.currentRoundIndex + 1;
          if (nextRIndex < rounds.length) {
            // Next round
            const nextRound = rounds[nextRIndex];
            const nextQuestions = await Question.find({ roundId: nextRound._id }).sort({ order: 1 });
            session.currentRoundIndex = nextRIndex;
            session.currentRoundId = nextRound._id;
            session.currentQuestionIndex = 0;
            session.currentQuestionId = nextQuestions[0]?._id;
            session.state = 'ROUND_RESULT';
            session.buzzerLocked = false;
            session.firstBuzzer = null;
            await session.save();
          } else {
            // All rounds completed
            session.state = 'COMPLETED';
            await session.save();
            const event = await Event.findById(eventId);
            if (event) {
              event.status = 'completed';
              await event.save();
            }
          }
        }

        await broadcastState(eventId);
      } catch (err) {
        console.error('next_question error:', err);
      }
    });

    // PAUSE GAME
    socket.on('pause_game', async () => {
      try {
        if (socket.role !== 'admin' && socket.role !== 'host') return;
        const eventId = socket.eventId;
        const session = await GameSession.findOne({ eventId });
        if (!session) return;

        session.state = 'PAUSED';
        await session.save();

        io.to(`event_${eventId}`).emit('game_paused');
        await broadcastState(eventId);
      } catch (err) {
        console.error('pause_game error:', err);
      }
    });

    // RESUME GAME
    socket.on('resume_game', async () => {
      try {
        if (socket.role !== 'admin' && socket.role !== 'host') return;
        const eventId = socket.eventId;
        const session = await GameSession.findOne({ eventId });
        if (!session) return;

        session.state = 'QUESTION_ACTIVE';
        session.questionStartTime = new Date();
        await session.save();

        await broadcastState(eventId);
      } catch (err) {
        console.error('resume_game error:', err);
      }
    });

    // END GAME
    socket.on('end_game', async () => {
      try {
        if (socket.role !== 'admin' && socket.role !== 'host') return;
        const eventId = socket.eventId;
        const session = await GameSession.findOne({ eventId });
        const event = await Event.findById(eventId);

        if (session) {
          session.state = 'COMPLETED';
          await session.save();
        }
        if (event) {
          event.status = 'completed';
          await event.save();
        }

        const state = await getHydratedState(eventId, true);
        io.to(`event_${eventId}`).emit('game_ended', state);
        await broadcastState(eventId);
      } catch (err) {
        console.error('end_game error:', err);
      }
    });

    // DISCONNECT
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      if (socket.participantId && socket.eventId) {
        try {
          const participant = await Participant.findById(socket.participantId);
          if (participant) {
            participant.isConnected = false;
            await participant.save();
            io.to(`event_${socket.eventId}`).emit('participant_left', {
              participantId: participant._id,
              name: participant.name,
              teamName: participant.teamName,
            });
          }
        } catch (e) {
          console.error('disconnect error:', e);
        }
      }
    });
  });
};

module.exports = setupGameEngine;
