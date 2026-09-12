import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import Header from '../../components/common/Header';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Calendar,
  Layers,
  HelpCircle,
  Award,
  Users,
  Eye,
  QrCode,
  Copy,
} from 'lucide-react';

export default function EventWizardPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdEvent, setCreatedEvent] = useState(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [eventInfo, setEventInfo] = useState({
    title: 'EESA Circuit Masters Quiz 2026',
    description: 'Live competitive quiz tournament hosted by Electronics Engineering Students Association',
    organizer: 'Electronics Engineering Students Association (EESA)',
    eventCode: 'EESA' + Math.floor(100 + Math.random() * 900),
    date: new Date().toISOString().split('T')[0],
  });

  const [rounds, setRounds] = useState([
    {
      title: 'Round 1: Core Electronics',
      description: 'MCQ general questions covering circuit analysis and components',
      roundType: 'general',
      order: 1,
    },
    {
      title: 'Round 2: Rapid Buzzer Clash',
      description: 'First to buzz gets to answer for bonus points',
      roundType: 'buzzer',
      order: 2,
    },
  ]);

  const [questions, setQuestions] = useState([
    {
      roundIndex: 0,
      questionText: 'Which theorem states that any linear electrical network can be replaced by an equivalent voltage source in series with a resistance?',
      questionType: 'mcq',
      options: [
        { id: 'A', text: "Norton's Theorem" },
        { id: 'B', text: "Thevenin's Theorem" },
        { id: 'C', text: 'Superposition Theorem' },
        { id: 'D', text: 'Maximum Power Transfer' },
      ],
      correctAnswer: 'B',
      points: 10,
      negativePoints: 5,
      timeLimit: 15,
      category: 'Network Analysis',
      difficulty: 'medium',
    },
    {
      roundIndex: 1,
      questionText: 'BUZZER: What is the ideal input impedance of an Operational Amplifier (Op-Amp)?',
      questionType: 'buzzer',
      options: [
        { id: 'A', text: 'Zero Ohms' },
        { id: 'B', text: '50 Ohms' },
        { id: 'C', text: 'Infinite' },
        { id: 'D', text: '1 Megaohm' },
      ],
      correctAnswer: 'C',
      points: 15,
      negativePoints: 5,
      timeLimit: 10,
      category: 'Linear ICs',
      difficulty: 'easy',
    },
  ]);

  const [scoring, setScoring] = useState({
    defaultPoints: 10,
    defaultNegativePoints: 5,
    buzzerBonus: 5,
    defaultTimeLimit: 15,
    negativeMarkingEnabled: true,
  });

  const [participantSettings, setParticipantSettings] = useState({
    allowDuplicateNames: false,
    maxParticipants: 150,
  });

  const handleAddRound = () => {
    setRounds([
      ...rounds,
      {
        title: `Round ${rounds.length + 1}: General`,
        description: '',
        roundType: 'general',
        order: rounds.length + 1,
      },
    ]);
  };

  const handleRemoveRound = (idx) => {
    if (rounds.length <= 1) return;
    setRounds(rounds.filter((_, i) => i !== idx));
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        roundIndex: 0,
        questionText: '',
        questionType: 'mcq',
        options: [
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' },
        ],
        correctAnswer: 'A',
        points: scoring.defaultPoints,
        negativePoints: scoring.defaultNegativePoints,
        timeLimit: scoring.defaultTimeLimit,
        category: 'General',
        difficulty: 'medium',
      },
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleCreateEvent = async () => {
    setError('');
    setLoading(true);

    try {
      const payload = {
        title: eventInfo.title,
        description: eventInfo.description,
        organizer: eventInfo.organizer,
        eventCode: eventInfo.eventCode.toUpperCase().trim(),
        date: eventInfo.date,
        settings: {
          ...scoring,
          ...participantSettings,
        },
        rounds,
        questions,
      };

      const res = await apiRequest('/events/wizard', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setCreatedEvent(res.data.event);
        setCurrentStep(7);
      }
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Info' },
    { num: 2, title: 'Rounds' },
    { num: 3, title: 'Questions' },
    { num: 4, title: 'Scoring' },
    { num: 5, title: 'Participants' },
    { num: 6, title: 'Review' },
    { num: 7, title: 'Launch QR' },
  ];

  const handleCopyJoinLink = () => {
    if (!createdEvent) return;
    const url = `${window.location.origin}/join/${createdEvent.eventCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <Header role="admin" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {/* Step Indicator Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between max-w-2xl mx-auto mb-2 overflow-x-auto py-2">
            {steps.map((s) => (
              <div key={s.num} className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition ${
                    currentStep === s.num
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm'
                      : currentStep > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {currentStep > s.num ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                </div>
                <span
                  className={`text-xs font-semibold hidden md:inline ${
                    currentStep === s.num ? 'text-blue-600 font-bold' : 'text-slate-500'
                  }`}
                >
                  {s.title}
                </span>
                {s.num < steps.length && (
                  <div className="w-6 sm:w-10 h-[2px] bg-slate-200 hidden sm:block mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            {error}
          </div>
        )}

        {/* STEP 1: EVENT INFORMATION */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" /> Step 1: Event Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Event Name
                </label>
                <input
                  type="text"
                  value={eventInfo.title}
                  onChange={(e) => setEventInfo({ ...eventInfo, title: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Event Code (Unique join code)
                </label>
                <input
                  type="text"
                  value={eventInfo.eventCode}
                  onChange={(e) => setEventInfo({ ...eventInfo, eventCode: e.target.value.toUpperCase() })}
                  maxLength={10}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-base font-mono font-bold text-blue-700 uppercase tracking-widest outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Organizer Branding
                </label>
                <input
                  type="text"
                  value={eventInfo.organizer}
                  onChange={(e) => setEventInfo({ ...eventInfo, organizer: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={eventInfo.description}
                  onChange={(e) => setEventInfo({ ...eventInfo, description: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 text-sm shadow-sm transition"
              >
                Next: Configure Rounds <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ROUNDS */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" /> Step 2: Competition Rounds
              </h2>
              <button
                type="button"
                onClick={handleAddRound}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-blue-700 text-xs font-bold flex items-center gap-1 border border-slate-200"
              >
                <Plus className="w-3.5 h-3.5" /> Add Round
              </button>
            </div>

            <div className="space-y-4">
              {rounds.map((round, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider font-mono">
                      Round {idx + 1}
                    </span>
                    {rounds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRound(idx)}
                        className="text-slate-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Round Title (e.g. Sports / Buzzer)"
                      value={round.title}
                      onChange={(e) => {
                        const updated = [...rounds];
                        updated[idx].title = e.target.value;
                        setRounds(updated);
                      }}
                      className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none"
                    />

                    <select
                      value={round.roundType}
                      onChange={(e) => {
                        const updated = [...rounds];
                        updated[idx].roundType = e.target.value;
                        setRounds(updated);
                      }}
                      className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none"
                    >
                      <option value="general">General Knowledge</option>
                      <option value="buzzer">Buzzer Round</option>
                      <option value="rapid_fire">Rapid Fire</option>
                      <option value="tie_breaker">Tie Breaker</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 text-sm shadow-sm transition"
              >
                Next: Questions <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: QUESTIONS */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" /> Step 3: Questions Configuration
              </h2>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-blue-700 text-xs font-bold flex items-center gap-1 border border-slate-200"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 font-mono">
                      Q{idx + 1} • {rounds[q.roundIndex]?.title || 'Round 1'}
                    </span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-slate-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Enter question text here..."
                    value={q.questionText}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[idx].questionText = e.target.value;
                      setQuestions(updated);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-semibold outline-none"
                    required
                  />

                  {/* Options A, B, C, D */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-500 w-4">{opt.id}:</span>
                        <input
                          type="text"
                          placeholder={`Option ${opt.id}`}
                          value={opt.text}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[idx].options[optIdx].text = e.target.value;
                            setQuestions(updated);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Correct Answer & Metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">Correct Key</label>
                      <select
                        value={q.correctAnswer}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].correctAnswer = e.target.value;
                          setQuestions(updated);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 outline-none"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">Round</label>
                      <select
                        value={q.roundIndex}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].roundIndex = Number(e.target.value);
                          setQuestions(updated);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none"
                      >
                        {rounds.map((r, rIdx) => (
                          <option key={rIdx} value={rIdx}>{r.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">Points</label>
                      <input
                        type="number"
                        value={q.points}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].points = Number(e.target.value);
                          setQuestions(updated);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-blue-700 font-mono font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">Time (Sec)</label>
                      <input
                        type="number"
                        value={q.timeLimit}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].timeLimit = Number(e.target.value);
                          setQuestions(updated);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 text-sm shadow-sm transition"
              >
                Next: Scoring Rules <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SCORING RULES */}
        {currentStep === 4 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" /> Step 4: Scoring Configuration
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Default Correct Points
                </label>
                <input
                  type="number"
                  value={scoring.defaultPoints}
                  onChange={(e) => setScoring({ ...scoring, defaultPoints: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-base font-mono font-bold text-emerald-700 outline-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Negative Penalty (Wrong Answer)
                </label>
                <input
                  type="number"
                  value={scoring.defaultNegativePoints}
                  onChange={(e) => setScoring({ ...scoring, defaultNegativePoints: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-base font-mono font-bold text-red-600 outline-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  First Buzzer Bonus Points
                </label>
                <input
                  type="number"
                  value={scoring.buzzerBonus}
                  onChange={(e) => setScoring({ ...scoring, buzzerBonus: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-base font-mono font-bold text-blue-600 outline-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Default Timer (Seconds)
                </label>
                <input
                  type="number"
                  value={scoring.defaultTimeLimit}
                  onChange={(e) => setScoring({ ...scoring, defaultTimeLimit: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-base font-mono font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 text-sm shadow-sm transition"
              >
                Next: Participants <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: PARTICIPANTS */}
        {currentStep === 5 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Step 5: Participant Settings
            </h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Allow Duplicate Names</h4>
                  <p className="text-xs text-slate-500">Permit multiple teams with identical names to register</p>
                </div>
                <input
                  type="checkbox"
                  checked={participantSettings.allowDuplicateNames}
                  onChange={(e) => setParticipantSettings({ ...participantSettings, allowDuplicateNames: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Max Participants
                </label>
                <input
                  type="number"
                  value={participantSettings.maxParticipants}
                  onChange={(e) => setParticipantSettings({ ...participantSettings, maxParticipants: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(6)}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 text-sm shadow-sm transition"
              >
                Next: Review Summary <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW SUMMARY */}
        {currentStep === 6 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" /> Step 6: Review Configuration
            </h2>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Event Title</span>
                <span className="font-bold text-slate-900">{eventInfo.title}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Event Code</span>
                <span className="font-mono font-bold text-blue-600">{eventInfo.eventCode}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Rounds</span>
                <span className="font-semibold text-slate-800">{rounds.length} Rounds</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Total Questions</span>
                <span className="font-semibold text-slate-800">{questions.length} Questions</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Scoring</span>
                <span className="font-mono font-bold text-emerald-700">+{scoring.defaultPoints} / -{scoring.defaultNegativePoints}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleCreateEvent}
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition"
              >
                {loading ? 'Initializing Event...' : 'Create Event & Launch'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: SUCCESS & LAUNCH QR CODE */}
        {currentStep === 7 && createdEvent && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-5 animate-fade-in max-w-md mx-auto shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Event Created Successfully!</h2>
              <p className="text-xs text-slate-500 mt-1">Students can scan this QR code or use the join code.</p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl inline-block shadow-xs mx-auto">
              <QRCodeSVG
                value={`${window.location.origin}/join/${createdEvent.eventCode}`}
                size={200}
                level="H"
                includeMargin={true}
              />
              <p className="text-slate-900 font-mono font-bold text-sm tracking-wider mt-2 uppercase">
                CODE: {createdEvent.eventCode}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${window.location.origin}/join/${createdEvent.eventCode}`}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 outline-none"
              />
              <button
                onClick={handleCopyJoinLink}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shrink-0 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Link
                to={`/admin/events/${createdEvent._id}/live`}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                Enter Host Desk
              </Link>
              <Link
                to={`/display/${createdEvent.eventCode}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg border border-slate-300 text-xs shadow-sm transition"
              >
                Open Projector
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
