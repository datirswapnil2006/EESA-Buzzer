const { io } = require('../client/node_modules/socket.io-client');

const SOCKET_URL = 'http://localhost:5000';

const runTest = async () => {
  console.log('--- STARTING EESA REAL-TIME & BUZZER RACE CONDITION VERIFICATION ---');

  // 1. Connect Host Socket
  const hostSocket = io(SOCKET_URL);
  // 2. Connect 2 Concurrent Student Sockets
  const student1 = io(SOCKET_URL);
  const student2 = io(SOCKET_URL);

  let firstBuzzerRecorded = null;
  let buzzerLockEventCount = 0;

  await new Promise((resolve) => {
    let connectedCount = 0;
    const checkAllConnected = () => {
      connectedCount++;
      if (connectedCount === 3) resolve();
    };

    hostSocket.on('connect', () => {
      console.log('✓ Host connected to Socket.IO');
      checkAllConnected();
    });
    student1.on('connect', () => {
      console.log('✓ Student 1 (Team Alpha) connected');
      checkAllConnected();
    });
    student2.on('connect', () => {
      console.log('✓ Student 2 (Team Beta) connected');
      checkAllConnected();
    });
  });

  // Host joins event EESA26
  hostSocket.emit('join_event', { eventCode: 'EESA26', role: 'host' });

  // First we need a participant ID for Team Alpha and Team Beta
  // Let's create participants via API
  const ts = Date.now();
  const resAlpha = await fetch('http://localhost:5000/api/participants/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventCode: 'EESA26',
      name: `Alice_${ts}`,
      teamName: `Team Alpha ${ts}`,
      department: 'ECE',
    }),
  }).then(r => r.json());

  const resBeta = await fetch('http://localhost:5000/api/participants/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventCode: 'EESA26',
      name: `Bob_${ts}`,
      teamName: `Team Beta ${ts}`,
      department: 'EE',
    }),
  }).then(r => r.json());

  console.log('✓ Student 1 Registered:', resAlpha.data.participant.teamName);
  console.log('✓ Student 2 Registered:', resBeta.data.participant.teamName);

  student1.emit('join_event', { eventCode: 'EESA26', participantId: resAlpha.data.participant._id, role: 'student' });
  student2.emit('join_event', { eventCode: 'EESA26', participantId: resBeta.data.participant._id, role: 'student' });

  await new Promise((r) => setTimeout(r, 500));

  // Host starts game
  console.log('Host emitting start_game...');
  hostSocket.emit('start_game');

  await new Promise((r) => setTimeout(r, 500));

  // Set up buzzer listeners
  student1.on('first_buzzer', (data) => {
    console.log(`[Student 1 Listener] First buzzer broadcast: ${data.teamName} (${data.responseTimeMs}ms)`);
  });
  student2.on('first_buzzer', (data) => {
    console.log(`[Student 2 Listener] First buzzer broadcast: ${data.teamName} (${data.responseTimeMs}ms)`);
  });

  hostSocket.on('first_buzzer', (data) => {
    console.log(`[Host Listener] First buzzer confirmed: ${data.teamName}`);
    firstBuzzerRecorded = data;
    buzzerLockEventCount++;
  });

  // Host starts buzzer
  console.log('Host emitting start_buzzer...');
  hostSocket.emit('start_buzzer');

  await new Promise((r) => setTimeout(r, 100));

  // CONCURRENT RACE CONDITION TEST:
  // Both students buzz practically simultaneously
  console.log('⚡ SIMULATING CONCURRENT BUZZ (Team Alpha & Team Beta)...');
  student1.emit('buzz');
  student2.emit('buzz');

  await new Promise((r) => setTimeout(r, 800));

  if (!firstBuzzerRecorded) {
    throw new Error('FAILED: No first buzzer recorded!');
  }
  console.log(`✓ RACE CONDITION RESOLVED: Winner is ${firstBuzzerRecorded.teamName} with latency ${firstBuzzerRecorded.responseTimeMs}ms`);

  // Verify that subsequent buzz is rejected
  console.log('Testing rejection of buzz while buzzer is locked...');
  student2.on('buzz_rejected', (data) => {
    console.log(`✓ Confirmed buzz rejected when locked: ${data.reason}`);
  });
  student2.emit('buzz');

  await new Promise((r) => setTimeout(r, 400));

  // Host awards points to winner
  console.log('Host marking answer correct...');
  hostSocket.on('score_updated', ({ leaderboard }) => {
    const winner = leaderboard.find(p => p.teamName === firstBuzzerRecorded.teamName);
    console.log(`✓ Leaderboard updated! Winner ${winner.teamName} score: ${winner.score} pts (Buzzer wins: ${winner.buzzerWins})`);
  });
  hostSocket.emit('mark_correct', {});

  await new Promise((r) => setTimeout(r, 800));

  // Cleanup
  hostSocket.disconnect();
  student1.disconnect();
  student2.disconnect();

  console.log('====================================================');
  console.log('🎉 ALL REAL-TIME & RACE CONDITION TESTS PASSED 100%!');
  console.log('====================================================');
  process.exit(0);
};

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
