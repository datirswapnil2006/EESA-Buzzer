require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const setupGameEngine = require('./socket/gameEngine');

// Models for seed data
const User = require('./models/User');
const Event = require('./models/Event');
const Round = require('./models/Round');
const Question = require('./models/Question');
const GameSession = require('./models/GameSession');

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), platform: 'EESA Quiz Platform' });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/rounds', require('./routes/roundRoutes'));
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/participants', require('./routes/participantRoutes'));

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 25000,
});

setupGameEngine(io);

// Sample Event Seeder for instant evaluation
const seedSampleData = async () => {
  try {
    // 1. Admin
    let admin = await User.findOne({ email: 'admin@eesa.org' });
    if (!admin) {
      admin = await User.create({
        name: 'EESA Admin',
        email: 'admin@eesa.org',
        password: 'admin123',
        role: 'admin',
      });
      console.log('Default admin seeded: admin@eesa.org / admin123');
    }

    // 2. Sample Event EESA26 if not exists
    const existingEvent = await Event.findOne({ eventCode: 'EESA26' });
    if (!existingEvent) {
      console.log('Seeding demo event: EESA26...');
      const event = await Event.create({
        title: 'EESA Annual Tech Quiz 2026',
        description: 'Inter-Department Grand Engineering & Tech Challenge hosted by Electronics Engineering Students Association',
        eventCode: 'EESA26',
        organizer: 'Electronics Engineering Students Association (EESA)',
        createdBy: admin._id,
        status: 'draft',
        settings: {
          defaultPoints: 10,
          defaultNegativePoints: 5,
          buzzerBonus: 5,
          defaultTimeLimit: 15,
          negativeMarkingEnabled: true,
        },
      });

      // Round 1: General Tech & Electronics
      const round1 = await Round.create({
        eventId: event._id,
        title: 'Round 1: Electronics & Core Tech',
        description: 'Multiple-choice and fundamental electronics questions',
        order: 1,
        roundType: 'general',
      });

      // Round 2: Rapid Buzzer Round
      const round2 = await Round.create({
        eventId: event._id,
        title: 'Round 2: Rapid Buzzer Clash',
        description: 'First to buzz answers immediately. Speed is everything!',
        order: 2,
        roundType: 'buzzer',
      });

      // Round 3: Tie Breaker
      const round3 = await Round.create({
        eventId: event._id,
        title: 'Round 3: Grand Tie Breaker',
        description: 'High-stakes sudden death challenge',
        order: 3,
        roundType: 'tie_breaker',
      });

      // Questions for Round 1
      await Question.create([
        {
          eventId: event._id,
          roundId: round1._id,
          questionText: 'Which semiconductor material is most commonly used in modern integrated circuits (ICs)?',
          questionType: 'mcq',
          options: [
            { id: 'A', text: 'Germanium' },
            { id: 'B', text: 'Silicon' },
            { id: 'C', text: 'Gallium Arsenide' },
            { id: 'D', text: 'Carbon Nanotubes' },
          ],
          correctAnswer: 'B',
          explanation: 'Silicon is abundantly available and forms a stable native oxide (SiO2), making it the foundation of modern semiconductor fabrication.',
          category: 'Electronics',
          difficulty: 'easy',
          points: 10,
          negativePoints: 5,
          timeLimit: 15,
          order: 1,
        },
        {
          eventId: event._id,
          roundId: round1._id,
          questionText: 'In digital electronics, which logic gate is known as the "Universal Gate"?',
          questionType: 'mcq',
          options: [
            { id: 'A', text: 'AND Gate' },
            { id: 'B', text: 'OR Gate' },
            { id: 'C', text: 'NAND Gate' },
            { id: 'D', text: 'XOR Gate' },
          ],
          correctAnswer: 'C',
          explanation: 'NAND and NOR gates can implement any Boolean function without requiring any other gate type.',
          category: 'Digital Electronics',
          difficulty: 'medium',
          points: 10,
          negativePoints: 5,
          timeLimit: 15,
          order: 2,
        },
        {
          eventId: event._id,
          roundId: round1._id,
          questionText: 'What is the primary function of a Zener diode in electronic circuits?',
          questionType: 'mcq',
          options: [
            { id: 'A', text: 'Voltage Regulation' },
            { id: 'B', text: 'Current Amplification' },
            { id: 'C', text: 'Signal Modulation' },
            { id: 'D', text: 'Power Inversion' },
          ],
          correctAnswer: 'A',
          explanation: 'A Zener diode is designed to operate safely in its reverse breakdown region, providing a constant reference voltage.',
          category: 'Analog Electronics',
          difficulty: 'easy',
          points: 10,
          negativePoints: 5,
          timeLimit: 15,
          order: 3,
        },
      ]);

      // Questions for Round 2 (Buzzer Round)
      await Question.create([
        {
          eventId: event._id,
          roundId: round2._id,
          questionText: 'BUZZER QUESTION: Who is considered the father of Information Theory and author of "A Mathematical Theory of Communication"?',
          questionType: 'buzzer',
          options: [
            { id: 'A', text: 'Alan Turing' },
            { id: 'B', text: 'Claude Shannon' },
            { id: 'C', text: 'John von Neumann' },
            { id: 'D', text: 'Norbert Wiener' },
          ],
          correctAnswer: 'B',
          explanation: 'Claude Shannon published his landmark paper in 1948, founding the mathematical field of information theory.',
          category: 'Computing Pioneers',
          difficulty: 'medium',
          points: 15,
          negativePoints: 5,
          timeLimit: 12,
          order: 1,
        },
        {
          eventId: event._id,
          roundId: round2._id,
          questionText: 'BUZZER QUESTION: What SI unit measures electrical capacitance?',
          questionType: 'buzzer',
          options: [
            { id: 'A', text: 'Henry' },
            { id: 'B', text: 'Farad' },
            { id: 'C', text: 'Tesla' },
            { id: 'D', text: 'Siemens' },
          ],
          correctAnswer: 'B',
          explanation: 'Capacitance is measured in Farads (F), named after English physicist Michael Faraday.',
          category: 'Core Physics',
          difficulty: 'easy',
          points: 15,
          negativePoints: 5,
          timeLimit: 10,
          order: 2,
        },
      ]);

      // Question for Round 3 (Tie Breaker)
      await Question.create([
        {
          eventId: event._id,
          roundId: round3._id,
          questionText: 'FINAL TIE BREAKER: What does the acronym "MOSFET" stand for?',
          questionType: 'tie_breaker',
          options: [
            { id: 'A', text: 'Metal-Oxide-Semiconductor Field-Effect Transistor' },
            { id: 'B', text: 'Magnetic-Optical-Silicon Fast Electronic Terminal' },
            { id: 'C', text: 'Micro-Optic Solid-state Frequency Emission Triode' },
            { id: 'D', text: 'Modular Oxide Substrate Fast-Electron Toggle' },
          ],
          correctAnswer: 'A',
          explanation: 'MOSFET stands for Metal-Oxide-Semiconductor Field-Effect Transistor, the fundamental building block of modern digital processors.',
          category: 'Microelectronics',
          difficulty: 'hard',
          points: 20,
          negativePoints: 10,
          timeLimit: 15,
          order: 1,
        },
      ]);

      // Initialize session
      await GameSession.create({
        eventId: event._id,
        state: 'WAITING',
        currentRoundId: round1._id,
        currentRoundIndex: 0,
        currentQuestionIndex: 0,
      });

      console.log('Demo event EESA26 seeded successfully with 3 rounds and questions!');
    }
  } catch (err) {
    console.error('Seeding error:', err.message);
  }
};

const PORT = process.env.PORT || 5000;

// Start Server
const startServer = async () => {
  await connectDB();
  await seedSampleData();

  server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`⚡ EESA Quiz Platform Server Running!`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 API Health: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
  });
};

startServer();
