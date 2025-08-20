// src/App.jsx
import React, { useMemo, useState } from "react";
import { Upload, FileText, TextQuote, Sparkles, CheckCircle2, AlertTriangle, Download, BarChart3 } from "lucide-react";
import { RadialBarChart, RadialBar, PolarAngleAxis, Tooltip } from "recharts";

import Card from "./components/Card";
import FileDrop from "./components/FileDrop";
import StepPill from "./components/StepPill";

import { runRealATS } from "./utils/atsEngine";
import { readFileText } from "./utils/pdfReader"; // must exist (client-side pdf.js)

function classNames(...xs) { return xs.filter(Boolean).join(" "); }

export default function ATSResumeMatcher() {
  // Inputs & UI state
  const [step, setStep] = useState(1);
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);

  // File handlers: PDF (.pdf) and Text (.txt)
  const handleResumeFile = async (file) => {
    setError("");
    try {
      const txt = await readFileText(file);
      setResumeText(prev => (prev ? prev + "\n\n" : "") + txt);
    } catch (e) {
      console.error(e);
      setError("Could not read resume file. Use PDF (.pdf) or Text (.txt).");
    }
  };

  const handleJDFile = async (file) => {
    setError("");
    try {
      const txt = await readFileText(file);
      setJdText(prev => (prev ? prev + "\n\n" : "") + txt);
    } catch (e) {
      console.error(e);
      setError("Could not read job description file. Use PDF (.pdf) or Text (.txt).");
    }
  };

  // Run the real ATS engine
  const analyze = async () => {
    setError("");
    if (!jdText.trim()) { setError("Job description is required."); return; }
    if (!resumeText.trim()) { setError("Resume is required."); return; }

    setLoading(true);
    try {
      // deterministic, explainable scoring
      const res = runRealATS(resumeText, jdText, {
        topKKeywords: 40, // tweak as desired
        phraseBoostWeight: 1.6,
        coverageWeight: 0.25,
        similarityWeight: 0.75
      });
      setResults(res);
      setStep(2);
    } catch (e) {
      console.error(e);
      setError("Analysis failed. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  const scoreData = useMemo(() => {
    if (!results) return [];
    return [{ name: "ATS", value: Math.round(results.score) }];
  }, [results]);

  const downloadReport = () => {
    if (!results) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      score: Math.round(results.score),
      matchedKeywords: results.matchedKeywords,
      missingKeywords: results.missingKeywords,
      suggestions: results.suggestions,
      details: results.details
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ats-real-report.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-sky-600" />
            <span className="font-semibold text-lg">ATS Resume Matcher (Real Scoring)</span>
          </div>
          <div className="text-xs text-slate-500">Open-Source • Client-Side • Deterministic</div>
        </div>
      </header>

      {/* Stepper */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StepPill active={step===1} title="1. Upload" subtitle="PDF or Text for both" />
          <StepPill active={step===2} title="2. Results" subtitle="TF-IDF + keyword coverage" />
          <StepPill active={false} title="3. Iterate" subtitle="Improve scoring & UI" dim />
        </ol>
      </div>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" /> {error}
          </div>
        )}

        {step === 1 && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resume input */}
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-sky-600" />
                <h2 className="font-semibold">Resume Input (PDF or Text)</h2>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Upload <strong>.pdf</strong> or <strong>.txt</strong>, or paste resume text below. PDFs are parsed client-side.
              </p>
              <div className="grid gap-3">
                <FileDrop onFile={handleResumeFile} accept={".pdf,.txt"} label="Drop resume PDF/TXT or click to choose" />
                <textarea
                  className="w-full min-h-[160px] rounded-2xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Paste resume text here..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">Privacy: All parsing and scoring happen in your browser by default.</p>
            </Card>

            {/* JD input */}
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <TextQuote className="h-5 w-5 text-emerald-600" />
                <h2 className="font-semibold">Job Description Input (PDF or Text)</h2>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Upload <strong>.pdf</strong> or <strong>.txt</strong>, or paste the full JD. Include Requirements / Responsibilities sections for best results.
              </p>
              <div className="grid gap-3">
                <FileDrop onFile={handleJDFile} accept={".pdf,.txt"} label="Drop JD PDF/TXT or click to choose" />
                <textarea
                  className="w-full min-h-[160px] rounded-2xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Paste job description here..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
              </div>
              <div className="mt-3 text-xs text-slate-500">Tip: Include both required and preferred sections for richer keyword extraction.</div>
            </Card>

            <div className="lg:col-span-2 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                <strong>Scoring breakdown:</strong> TF-IDF cosine similarity (semantic overlap) + keyword coverage (phrase-aware).
              </div>
              <button
                onClick={analyze}
                disabled={loading}
                className={classNames(
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-medium shadow-sm",
                  loading ? "bg-slate-300 text-slate-600" : "bg-sky-600 text-white hover:bg-sky-700"
                )}
              >
                <Sparkles className="h-4 w-4" />
                {loading ? "Analyzing..." : "Analyze (Real)"}
              </button>
            </div>
          </section>
        )}

        {step === 2 && results && (
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Score */}
            <Card>
              <div clas
