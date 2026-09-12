import React, { useState, useRef } from 'react';
import { apiRequest } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  X,
  Upload,
  FileText,
  Check,
  AlertCircle,
  Trash2,
  Sparkles,
  Layers,
  Clock,
  Award,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';

export default function PdfQuestionImportModal({
  isOpen,
  onClose,
  onImport,
  rounds = [],
  currentRoundIndex = 0,
}) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'text'
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default parameters for extraction
  const [category, setCategory] = useState('Electronics');
  const [difficulty, setDifficulty] = useState('medium');
  const [defaultPoints, setDefaultPoints] = useState(10);
  const [defaultTimeLimit, setDefaultTimeLimit] = useState(15);
  const [targetRoundIndex, setTargetRoundIndex] = useState(currentRoundIndex || 0);

  // Review step state
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [step, setStep] = useState('input'); // 'input' | 'review'
  const [fileName, setFileName] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid PDF file (.pdf)');
        return;
      }
      setFile(selected);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (!dropped.name.toLowerCase().endsWith('.pdf')) {
        setError('Please drop a valid PDF file (.pdf)');
        return;
      }
      setFile(dropped);
      setError('');
    }
  };

  const handleExtractPdf = async () => {
    if (!file) {
      setError('Please select a PDF file first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('difficulty', difficulty);
      formData.append('points', defaultPoints);
      formData.append('timeLimit', defaultTimeLimit);

      const res = await apiRequest('/questions/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.success || !res.questions || res.questions.length === 0) {
        throw new Error(
          'No multiple-choice questions could be detected. Please ensure the PDF has numbered questions with options A, B, C, D.'
        );
      }

      // Attach chosen roundIndex to all extracted questions
      const enhanced = res.questions.map((q) => ({
        ...q,
        roundIndex: targetRoundIndex,
      }));

      setParsedQuestions(enhanced);
      setSelectedIndices(new Set(enhanced.map((_, i) => i)));
      setFileName(file.name);
      setStep('review');
    } catch (err) {
      setError(err.message || 'Failed to extract questions from PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractText = async () => {
    if (!pastedText.trim()) {
      setError('Please enter or paste questions text');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiRequest('/questions/extract-text', {
        method: 'POST',
        body: JSON.stringify({
          text: pastedText,
          category,
          difficulty,
          points: defaultPoints,
          timeLimit: defaultTimeLimit,
        }),
      });

      if (!res.success || !res.questions || res.questions.length === 0) {
        throw new Error(
          'No questions detected in the pasted text. Make sure questions are numbered (e.g. 1.) with options (A, B, C, D).'
        );
      }

      const enhanced = res.questions.map((q) => ({
        ...q,
        roundIndex: targetRoundIndex,
      }));

      setParsedQuestions(enhanced);
      setSelectedIndices(new Set(enhanced.map((_, i) => i)));
      setFileName('Pasted Text');
      setStep('review');
    } catch (err) {
      setError(err.message || 'Failed to extract questions');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === parsedQuestions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parsedQuestions.map((_, i) => i)));
    }
  };

  const toggleSelectQuestion = (index) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const handleUpdateQuestion = (index, field, value) => {
    const updated = [...parsedQuestions];
    updated[index][field] = value;
    setParsedQuestions(updated);
  };

  const handleUpdateOption = (qIndex, optId, newText) => {
    const updated = [...parsedQuestions];
    const opt = updated[qIndex].options.find((o) => o.id === optId);
    if (opt) {
      opt.text = newText;
      setParsedQuestions(updated);
    }
  };

  const handleDeleteQuestion = (index) => {
    const updated = parsedQuestions.filter((_, i) => i !== index);
    setParsedQuestions(updated);

    const nextSelected = new Set();
    updated.forEach((_, i) => {
      if (selectedIndices.has(i >= index ? i + 1 : i)) {
        nextSelected.add(i);
      }
    });
    setSelectedIndices(nextSelected);
    showToast(`Question Q${index + 1} discarded`, 'info');
  };

  const handleConfirmImport = () => {
    const questionsToImport = parsedQuestions.filter((_, i) => selectedIndices.has(i));
    if (questionsToImport.length === 0) {
      setError('Please select at least one question to import');
      return;
    }

    onImport(questionsToImport);
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setStep('input');
    setFile(null);
    setPastedText('');
    setParsedQuestions([]);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Extract Quiz Questions with PDF Parser
              </h3>
              <p className="text-xs text-slate-500">
                {step === 'input'
                  ? 'Upload question bank PDF or exam paper to automatically parse MCQs'
                  : `Review & verify extracted questions (${parsedQuestions.length} detected)`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-5">
              {/* Tab Selector */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                    activeTab === 'upload'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload PDF Document
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('text')}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                    activeTab === 'text'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Paste Raw Text / Clipboard
                </button>
              </div>

              {/* Upload PDF View */}
              {activeTab === 'upload' ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                    file
                      ? 'border-emerald-400 bg-emerald-50/40'
                      : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition ${
                      file ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {file ? <FileText className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {file ? file.name : 'Click to select or drag & drop PDF here'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {file
                        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for parsing`
                        : 'Supports exam papers, test series, and question bank PDFs (up to 15MB)'}
                    </p>
                  </div>

                  {!file && (
                    <span className="text-xs font-semibold px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 shadow-sm">
                      Browse Files
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Paste MCQ Questions Text
                  </label>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`1. What is the SI unit of electric resistance?
A) Volt
B) Ampere
C) Ohm
D) Henry
Answer: C

2. Which logic gate is universal?
A) AND
B) OR
C) NAND
D) NOT
Answer: C`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm font-mono text-slate-800 focus:bg-white focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              )}

              {/* Extraction Parameters */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Default Question Settings
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Electronics"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Points
                    </label>
                    <input
                      type="number"
                      value={defaultPoints}
                      onChange={(e) => setDefaultPoints(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-mono font-bold text-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Time (Sec)
                    </label>
                    <input
                      type="number"
                      value={defaultTimeLimit}
                      onChange={(e) => setDefaultTimeLimit(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                {rounds && rounds.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Assign to Round
                    </label>
                    <select
                      value={targetRoundIndex}
                      onChange={(e) => setTargetRoundIndex(Number(e.target.value))}
                      className="w-full sm:w-1/2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                    >
                      {rounds.map((r, idx) => (
                        <option key={idx} value={idx}>
                          {r.title || `Round ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Supported Format Guide */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-2.5 text-xs text-slate-600">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Tip:</strong> The parser detects standard MCQ layouts: Question numbers (e.g.{' '}
                  <code className="text-blue-700 bg-white px-1 py-0.5 rounded border border-blue-200">1.</code> or{' '}
                  <code className="text-blue-700 bg-white px-1 py-0.5 rounded border border-blue-200">Q1.</code>), options (
                  <code className="text-blue-700 bg-white px-1 py-0.5 rounded border border-blue-200">A)</code> or{' '}
                  <code className="text-blue-700 bg-white px-1 py-0.5 rounded border border-blue-200">(A)</code>), and answers (
                  <code className="text-blue-700 bg-white px-1 py-0.5 rounded border border-blue-200">Answer: B</code> or{' '}
                  <code className="text-blue-700 bg-white px-1 py-0.5 rounded border border-blue-200">Ans: C</code>).
                </p>
              </div>
            </div>
          ) : (
            /* Review Step */
            <div className="space-y-4">
              {/* Batch Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 transition"
                  >
                    {selectedIndices.size === parsedQuestions.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    Select All ({selectedIndices.size}/{parsedQuestions.length})
                  </button>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs text-slate-500 font-medium">
                    Source: <strong className="text-slate-700">{fileName}</strong>
                  </span>
                </div>

                {rounds && rounds.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Batch assign round:</span>
                    <select
                      onChange={(e) => {
                        const rIdx = Number(e.target.value);
                        setParsedQuestions((prev) =>
                          prev.map((q) => ({ ...q, roundIndex: rIdx }))
                        );
                      }}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none"
                    >
                      {rounds.map((r, idx) => (
                        <option key={idx} value={idx}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Questions List */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {parsedQuestions.map((q, idx) => {
                  const isSelected = selectedIndices.has(idx);
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition space-y-3 ${
                        isSelected
                          ? 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-100'
                          : 'bg-slate-50/70 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSelectQuestion(idx)}
                            className="text-blue-600 transition"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            Q{idx + 1}
                          </span>
                          {!q.detectedAnswer && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Select Key
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(idx)}
                            className="text-slate-400 hover:text-red-600 transition p-1 rounded hover:bg-slate-100"
                            title="Discard question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <textarea
                        rows={2}
                        value={q.questionText}
                        onChange={(e) => handleUpdateQuestion(idx, 'questionText', e.target.value)}
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 resize-none"
                      />

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt) => {
                          const isCorrect = q.correctAnswer === opt.id;
                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                                isCorrect
                                  ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleUpdateQuestion(idx, 'correctAnswer', opt.id)}
                                className={`w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center transition shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                                title={`Mark ${opt.id} as correct answer`}
                              >
                                {opt.id}
                              </button>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => handleUpdateOption(idx, opt.id, e.target.value)}
                                placeholder={`Option ${opt.id}`}
                                className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium"
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-500">
                            Correct Answer:{' '}
                            <strong className="text-emerald-700 font-bold font-mono">
                              {q.correctAnswer}
                            </strong>
                          </span>
                          {rounds && rounds.length > 0 && (
                            <select
                              value={q.roundIndex ?? 0}
                              onChange={(e) =>
                                handleUpdateQuestion(idx, 'roundIndex', Number(e.target.value))
                              }
                              className="bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] text-slate-700 outline-none"
                            >
                              {rounds.map((r, rIdx) => (
                                <option key={rIdx} value={rIdx}>
                                  {r.title}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Points:</span>
                          <input
                            type="number"
                            value={q.points}
                            onChange={(e) =>
                              handleUpdateQuestion(idx, 'points', Number(e.target.value))
                            }
                            className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-blue-700 font-mono font-bold outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {step === 'input' ? (
            <>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={activeTab === 'upload' ? handleExtractPdf : handleExtractText}
                disabled={loading || (activeTab === 'upload' && !file) || (activeTab === 'text' && !pastedText.trim())}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-blue-200 transition"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Extracting Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Extract Questions
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Upload
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={selectedIndices.size === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-emerald-200 transition"
                >
                  <Check className="w-4 h-4" /> Import {selectedIndices.size} Questions
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
