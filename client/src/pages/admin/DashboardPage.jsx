import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import Header from '../../components/common/Header';
import ConfirmModal from '../../components/common/ConfirmModal';
import PdfQuestionImportModal from '../../components/admin/PdfQuestionImportModal';
import { useToast } from '../../context/ToastContext';
import { QRCodeSVG } from 'qrcode.react';
import {
  LayoutDashboard,
  Calendar,
  HelpCircle,
  Layers,
  Users,
  Play,
  Trophy,
  FileText,
  Settings,
  Plus,
  Tv,
  Trash2,
  QrCode,
  X,
  Copy,
  Check,
  Search,
  Filter,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'events', 'questions', 'leaderboard'
  const [events, setEvents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventForQR, setSelectedEventForQR] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Question Bank Search & Filter States
  const [qSearch, setQSearch] = useState('');
  const [qCategory, setQCategory] = useState('all');
  const [qDifficulty, setQDifficulty] = useState('all');
  const [qType, setQType] = useState('all');

  const fetchDashboardData = async () => {
    try {
      const resEvents = await apiRequest('/events');
      if (resEvents.success) {
        setEvents(resEvents.data);
      }

      // Fetch sample question bank questions
      const resQuestions = await apiRequest('/questions/bank');
      if (resQuestions.success) {
        setQuestions(resQuestions.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    const eventTitle = eventToDelete.title || eventToDelete.eventCode;
    try {
      await apiRequest(`/events/${eventToDelete._id}`, { method: 'DELETE' });
      setEvents((prev) => prev.filter((e) => e._id !== eventToDelete._id));
      setEventToDelete(null);
      showToast(`Event "${eventTitle}" deleted successfully`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete event', 'error');
    }
  };

  const handleDeleteQuestion = async (qId) => {
    try {
      await apiRequest(`/questions/${qId}`, { method: 'DELETE' });
      setQuestions((prev) => prev.filter((q) => q._id !== qId));
      showToast('Question deleted from Question Bank', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete question', 'error');
    }
  };

  const handleCopyLink = (code) => {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    showToast('Event link copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportToQuestionBank = async (importedQuestions) => {
    try {
      const res = await apiRequest('/questions/bulk', {
        method: 'POST',
        body: JSON.stringify({ questions: importedQuestions }),
      });
      if (res.success) {
        const refreshed = await apiRequest('/questions/bank');
        if (refreshed.success) {
          setQuestions(refreshed.data);
        }
        showToast(`Imported ${importedQuestions.length} questions to Question Bank`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to save questions to question bank', 'error');
    }
  };

  // Filtered Questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = !qSearch || q.questionText.toLowerCase().includes(qSearch.toLowerCase());
    const matchesCat = qCategory === 'all' || q.category === qCategory;
    const matchesDiff = qDifficulty === 'all' || q.difficulty === qDifficulty;
    const matchesType = qType === 'all' || q.questionType === qType;
    return matchesSearch && matchesCat && matchesDiff && matchesType;
  });

  const activeEvent = events.find((e) => e.status === 'active') || events[0];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'questions', label: 'Questions', icon: HelpCircle },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <Header role="admin" />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* MITRA-STYLE WHITE SIDEBAR */}
        <aside className="w-full md:w-60 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-4 shrink-0">
          <div className="space-y-1">
            <p className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Management
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}

            {activeEvent && (
              <>
                <p className="px-3 pt-5 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Live Control
                </p>
                <Link
                  to={`/admin/events/${activeEvent._id}/live`}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Host Desk
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                </Link>
              </>
            )}
          </div>
        </aside>

        {/* MAIN DASHBOARD CONTENT AREA */}
        <main className="flex-1 p-5 sm:p-8">
          {/* TAB 1: MAIN DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Header with Title & + Create Event CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Event Overview</h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Welcome to the EESA Buzzer & Quiz Platform admin console
                  </p>
                </div>

                <Link
                  to="/admin/events/new"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> Create Event
                </Link>
              </div>

              {/* Stat Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Total Events
                    </span>
                    <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Calendar className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">{events.length}</span>
                    <span className="text-xs text-slate-500">configured</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Active Event
                    </span>
                    <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                      <Play className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">
                      {events.filter((e) => e.status === 'active').length}
                    </span>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live Now
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Question Bank
                    </span>
                    <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
                      <HelpCircle className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">{questions.length}</span>
                    <span className="text-xs text-slate-500">questions loaded</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Engine Status
                    </span>
                    <span className="p-2 rounded-lg bg-teal-50 text-teal-600">
                      <Sparkles className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-sm font-bold text-emerald-700">Real-Time Sync</span>
                    <span className="text-xs text-slate-500">v24 authorizer</span>
                  </div>
                </div>
              </div>

              {/* Active Event Banner if present */}
              {activeEvent && (
                <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs font-mono border border-blue-200">
                        {activeEvent.eventCode}
                      </span>
                      <span className="text-xs font-medium text-slate-500">Active Event</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{activeEvent.title}</h3>
                    <p className="text-xs text-slate-500">{activeEvent.description || 'Live collegiate quiz'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/display/${activeEvent.eventCode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Tv className="w-3.5 h-3.5" /> Projector
                    </Link>
                    <Link
                      to={`/admin/events/${activeEvent._id}/live`}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Host Desk
                    </Link>
                  </div>
                </div>
              )}

              {/* Events Table / Card Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Events Directory</h3>
                  <span className="text-xs text-slate-500">{events.length} Events Total</span>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-500 text-sm">Loading events...</div>
                ) : events.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No events created yet. Click "+ Create Event" to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                          <th className="py-3 px-5">Code</th>
                          <th className="py-3 px-5">Event Name</th>
                          <th className="py-3 px-5">Status</th>
                          <th className="py-3 px-5">Date</th>
                          <th className="py-3 px-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {events.map((ev) => (
                          <tr key={ev._id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-5 font-mono font-bold text-blue-600">
                              {ev.eventCode}
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="font-semibold text-slate-900">{ev.title}</div>
                              <div className="text-xs text-slate-500 line-clamp-1">{ev.organizer}</div>
                            </td>
                            <td className="py-3.5 px-5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  ev.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : ev.status === 'completed'
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    ev.status === 'active'
                                      ? 'bg-emerald-500'
                                      : ev.status === 'completed'
                                      ? 'bg-slate-400'
                                      : 'bg-amber-500'
                                  }`}
                                />
                                {ev.status?.charAt(0).toUpperCase() + ev.status?.slice(1)}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-xs text-slate-500 font-medium">
                              {new Date(ev.date || ev.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => setSelectedEventForQR(ev)}
                                  title="Join QR Code"
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                                >
                                  <QrCode className="w-4 h-4" />
                                </button>
                                <Link
                                  to={`/display/${ev.eventCode}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Projector Display"
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                                >
                                  <Tv className="w-4 h-4 text-blue-600" />
                                </Link>
                                <Link
                                  to={`/admin/events/${ev._id}/results`}
                                  title="Results & CSV"
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                                >
                                  <FileText className="w-4 h-4 text-amber-600" />
                                </Link>
                                <Link
                                  to={`/admin/events/${ev._id}/live`}
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
                                >
                                  Host Desk
                                </Link>
                                <button
                                  onClick={() => setEventToDelete(ev)}
                                  title="Delete Event"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EVENTS DIRECTORY (SAME STRUCTURED VIEW) */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Events Management</h1>
                  <p className="text-sm text-slate-500 mt-0.5">Manage all live and upcoming college quiz events</p>
                </div>
                <Link
                  to="/admin/events/new"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> New Event Wizard
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((ev) => (
                  <div key={ev._id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {ev.eventCode}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {new Date(ev.date || ev.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900">{ev.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{ev.description || 'No description'}</p>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <span className="text-xs text-slate-500">
                        Status: <strong className="text-slate-800 uppercase">{ev.status}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/events/${ev._id}/live`}
                          className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                        >
                          Host
                        </Link>
                        <Link
                          to={`/display/${ev.eventCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                        >
                          Display
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PROFESSIONAL QUESTION BANK */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
                  <p className="text-sm text-slate-500 mt-0.5">Central repository of quiz questions, categories, and keys</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-200 transition self-start sm:self-auto"
                >
                  <FileText className="w-4 h-4" /> Import from PDF
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search questions..."
                      value={qSearch}
                      onChange={(e) => setQSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={qCategory}
                    onChange={(e) => setQCategory(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="all">All Categories</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Digital Electronics">Digital Electronics</option>
                    <option value="Analog Electronics">Analog Electronics</option>
                    <option value="Computing Pioneers">Computing Pioneers</option>
                  </select>

                  <select
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>

                  <select
                    value={qType}
                    onChange={(e) => setQType(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="mcq">MCQ</option>
                    <option value="buzzer">Buzzer</option>
                    <option value="tie_breaker">Tie Breaker</option>
                  </select>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                {filteredQuestions.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
                    No questions found matching your filter criteria.
                  </div>
                ) : (
                  filteredQuestions.map((q, idx) => (
                    <div key={q._id || idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {q.questionType}
                          </span>
                          <span className="text-xs text-slate-500">{q.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            +{q.points} PTS
                          </span>
                          {q._id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q._id)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 transition"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h4 className="font-semibold text-slate-900 text-sm">{q.questionText}</h4>

                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-2 rounded-lg border ${
                                opt.id === q.correctAnswer
                                  ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="font-mono mr-1.5 font-bold">{opt.id}:</span>
                              {opt.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LEADERBOARDS & FINAL STANDINGS */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-200">
                <h1 className="text-2xl font-bold text-slate-900">Event Leaderboards</h1>
                <p className="text-sm text-slate-500 mt-0.5">View live and final event rankings</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((ev) => (
                  <div key={ev._id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-600">{ev.eventCode}</span>
                      <h4 className="font-bold text-slate-900 text-base">{ev.title}</h4>
                      <p className="text-xs text-slate-500">{ev.organizer}</p>
                    </div>

                    <Link
                      to={`/admin/events/${ev._id}/results`}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
                    >
                      View Standings
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* QR Code Modal */}
      {selectedEventForQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 text-center shadow-xl relative">
            <button
              onClick={() => setSelectedEventForQR(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-block mb-2">
              Scan to Join
            </span>
            <h3 className="font-bold text-base text-slate-900 mb-1">{selectedEventForQR.title}</h3>
            <p className="text-xs text-slate-500 mb-4">
              Event Code: <strong className="font-mono text-slate-900 text-sm">{selectedEventForQR.eventCode}</strong>
            </p>

            <div className="p-3 bg-white border border-slate-200 rounded-xl inline-block shadow-sm mx-auto">
              <QRCodeSVG
                value={`${window.location.origin}/join/${selectedEventForQR.eventCode}`}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                readOnly
                value={`${window.location.origin}/join/${selectedEventForQR.eventCode}`}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700 outline-none truncate"
              />
              <button
                onClick={() => handleCopyLink(selectedEventForQR.eventCode)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shrink-0 transition"
                title="Copy Join Link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!eventToDelete}
        title="Delete Event?"
        message={`Are you sure you want to permanently delete "${eventToDelete?.title}" (${eventToDelete?.eventCode}) and all associated data?`}
        confirmText="Yes, Delete Event"
        onConfirm={handleDeleteEvent}
        onCancel={() => setEventToDelete(null)}
      />

      {/* PDF Question Import Modal */}
      <PdfQuestionImportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onImport={handleImportToQuestionBank}
      />
    </div>
  );
}
