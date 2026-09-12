const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: ClientIO } = require('../client/node_modules/socket.io-client');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const setupGameEngine = require('./socket/gameEngine');
const Event = require('./models/Event');
const Question = require('./models/Question');
const Participant = require('./models/Participant');
const GameSession = require('./models/GameSession');
const ScoreEvent = require('./models/ScoreEvent');
const eventRoutes = require('./routes/eventRoutes');
const participantRoutes = require('./routes/participantRoutes');

const runBuzzerScoringTest = async () => {
  console.log('=== STARTING COMPLETE BUZZER SCORING, EXCLUSIVE FASTEST TEAM & LEADERBOARD PRIVACY TEST ===\n');

  // 1. Connect DB
  await connectDB();

  // 2. Setup test server on ephemeral port 5056
  const app = express();
  app.use(express.json());
  app.use('/api/events', eventRoutes);
  app.use('/api/participants', participantRoutes);

  const server = http.createServer(app);
  const ioServer = new Server(server, { cors: { origin: '*' } });
  setupGameEngine(ioServer);

  const PORT = 5056;
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`✓ Test Server listening on port ${PORT}`);

  const SERVER_URL = `http://localhost:${PORT}`;

  // Find or verify demo event
  let event = await Event.findOne({ eventCode: 'EESA26' });
  const Round = require('./models/Round');
  if (!event) {
    console.log('Seeding test event EESA26 in in-memory database...');
    event = await Event.create({
      title: 'EESA Annual Tech Quiz 2026',
      eventCode: 'EESA26',
      organizer: 'EESA',
      settings: {
        defaultPoints: 10,
        defaultNegativePoints: 5,
        buzzerBonus: 5,
        negativeMarkingEnabled: true,
      },
      status: 'active',
    });

    const round = await Round.create({
      eventId: event._id,
      title: 'Round 1: Electronics',
      order: 1,
    });

    await Question.create({
      eventId: event._id,
      roundId: round._id,
      questionText: 'Which semiconductor material is most commonly used in modern integrated circuits (ICs)?',
      options: [
        { id: 'A', text: 'Germanium' },
        { id: 'B', text: 'Silicon' },
        { id: 'C', text: 'Gallium Arsenide' },
        { id: 'D', text: 'Carbon Nanotubes' },
      ],
      correctAnswer: 'B',
      points: 10,
      negativePoints: 5,
      timeLimit: 15,
      buzzerEnabled: true,
      order: 1,
    });
  }

  // Create or clean test participants: Team Omega & Team Alpha
  await Participant.deleteMany({ teamName: { $in: ['Test Team Omega', 'Test Team Alpha'] } });
  await ScoreEvent.deleteMany({ eventId: event._id });

  const participantOmega = await Participant.create({
    eventId: event._id,
    name: 'Vikram Omega',
    teamName: 'Test Team Omega',
    department: 'EXTC',
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    buzzerWins: 0,
  });

  const participantAlpha = await Participant.create({
    eventId: event._id,
    name: 'Rohan Alpha',
    teamName: 'Test Team Alpha',
    department: 'CS',
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    buzzerWins: 0,
  });

  console.log(`✓ Created participants: "${participantOmega.teamName}" & "${participantAlpha.teamName}"`);

  // 3. Connect Host, Student Omega, and Student Alpha sockets
  const hostSocket = ClientIO(SERVER_URL);
  const studentOmegaSocket = ClientIO(SERVER_URL);
  const studentAlphaSocket = ClientIO(SERVER_URL);

  await Promise.all([
    new Promise((resolve) => hostSocket.on('connect', resolve)),
    new Promise((resolve) => studentOmegaSocket.on('connect', resolve)),
    new Promise((resolve) => studentAlphaSocket.on('connect', resolve)),
  ]);
  console.log('✓ Host and 2 Student sockets connected via WebSocket');

  // Track received game states
  let latestStudentState = null;
  let latestAdminState = null;

  studentOmegaSocket.on('event_state', (state) => {
    latestStudentState = state;
  });

  hostSocket.on('event_state', (state) => {
    latestAdminState = state;
  });

  // Join rooms
  hostSocket.emit('join_event', { eventCode: 'EESA26', role: 'host' });
  studentOmegaSocket.emit('join_event', { eventCode: 'EESA26', participantId: participantOmega._id.toString(), role: 'student' });
  studentAlphaSocket.emit('join_event', { eventCode: 'EESA26', participantId: participantAlpha._id.toString(), role: 'student' });
  await new Promise((r) => setTimeout(r, 400));

  // 4. Host starts the game
  console.log('\n--- Step A: Host starts the game ---');
  hostSocket.emit('start_game');
  await new Promise((r) => setTimeout(r, 400));

  // 5. Verify Leaderboard Privacy during active quiz
  console.log('\n--- Step B: Verifying Leaderboard Privacy during Active Quiz ---');
  console.log(`Host admin sees leaderboard count: ${latestAdminState?.leaderboard?.length || 0}`);
  console.log(`Student sees leaderboard count: ${latestStudentState?.leaderboard?.length || 0}`);

  if (latestStudentState?.leaderboard && latestStudentState.leaderboard.length > 0) {
    throw new Error('LEAK: Student socket received leaderboard during active quiz! Should be hidden until quiz completion.');
  }
  console.log('✓ PASS: Student leaderboard is strictly hidden during active quiz.');

  // 6. Host activates the buzzer
  console.log('\n--- Step C: Host activates the buzzer ---');
  hostSocket.emit('start_buzzer');
  await new Promise((r) => setTimeout(r, 200));

  // 7. Team Omega presses BUZZ first with Option B (Silicon)
  console.log('\n--- Step D: Team Omega clicks buzzer first; Team Alpha clicks after ---');
  let winnerReceivedByHost = null;
  hostSocket.on('first_buzzer', (data) => {
    winnerReceivedByHost = data;
  });

  studentOmegaSocket.emit('buzz', { answer: 'B' });
  // Alpha tries to buzz right after
  studentAlphaSocket.emit('buzz', { answer: 'B' });
  await new Promise((r) => setTimeout(r, 400));

  console.log('✓ Fastest buzzer locked by:', winnerReceivedByHost?.teamName, 'Answer:', winnerReceivedByHost?.selectedAnswer);
  if (winnerReceivedByHost?.teamName !== 'Test Team Omega') {
    throw new Error(`Expected first buzzer winner to be Team Omega, got: ${winnerReceivedByHost?.teamName}`);
  }

  // 8. Host awards score for correct answer
  console.log('\n--- Step E: Host awards score (Only fastest buzzer team should be scored) ---');
  hostSocket.emit('mark_correct', {});
  await new Promise((r) => setTimeout(r, 400));

  const updatedOmega = await Participant.findById(participantOmega._id);
  const updatedAlpha = await Participant.findById(participantAlpha._id);

  console.log(`✓ Team Omega score: ${updatedOmega.score} (Expected > 0)`);
  console.log(`✓ Team Alpha score: ${updatedAlpha.score} (Expected === 0, not scored)`);

  if (updatedOmega.score <= 0) {
    throw new Error(`Expected Team Omega to receive positive score, got ${updatedOmega.score}`);
  }
  if (updatedAlpha.score !== 0) {
    throw new Error(`Expected Team Alpha score to remain 0, got ${updatedAlpha.score}`);
  }
  console.log('✓ PASS: Only the fastest buzzer team had their score calculated!');

  // 9. Host ends the game: State becomes COMPLETED, final top 1-5 leaderboard revealed to all
  console.log('\n--- Step F: Host ends quiz -> Reveal Final Top 1-5 Leaderboard ---');
  hostSocket.emit('end_game');
  await new Promise((r) => setTimeout(r, 500));

  console.log(`Final Quiz State: ${latestStudentState?.session?.state}`);
  console.log(`Student now receives leaderboard entries: ${latestStudentState?.leaderboard?.length}`);
  if (latestStudentState?.leaderboard?.length > 0) {
    console.log('Top Teams revealed to student:');
    latestStudentState.leaderboard.slice(0, 5).forEach((team, idx) => {
      console.log(`  #${idx + 1}: ${team.teamName} - ${team.score} pts`);
    });
  }

  if (latestStudentState?.session?.state !== 'COMPLETED') {
    throw new Error(`Expected game state COMPLETED, got: ${latestStudentState?.session?.state}`);
  }
  if (!latestStudentState?.leaderboard || latestStudentState.leaderboard.length === 0) {
    throw new Error('Expected final leaderboard to be broadcast to students upon game completion!');
  }
  console.log('✓ PASS: Final leaderboard with Top teams revealed to everyone on quiz completion!');

  // 10. Verify Results API
  console.log('\n--- Step G: Verifying Admin Results Endpoint ---');
  const resultsRes = await fetch(`${SERVER_URL}/api/events/${event._id}/results`).then(r => r.json());
  console.log(`✓ Results success: ${resultsRes.success}`);
  console.log(`✓ Top participant on leaderboard: ${resultsRes.data.leaderboard[0]?.teamName} with ${resultsRes.data.leaderboard[0]?.score} pts`);

  console.log('\n================================================================');
  console.log('🎉 ALL EXCLUSIVE BUZZER SCORING & LEADERBOARD REVEAL CHECKS PASSED!');
  console.log('================================================================\n');

  hostSocket.disconnect();
  studentOmegaSocket.disconnect();
  studentAlphaSocket.disconnect();
  server.close();
  await mongoose.disconnect();
  process.exit(0);
};

runBuzzerScoringTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
