import React, { useMemo, useState } from "react";
import { Upload, FileText, TextQuote, Sparkles, CheckCircle2, AlertTriangle, Download, BarChart3 } from "lucide-react";
import { RadialBarChart, RadialBar, PolarAngleAxis, Tooltip } from "recharts";
import Card from "./components/Card";
import FileDrop from "./components/FileDrop";
import StepPill from "./components/StepPill";
import { runMockATS } from "./utils/atsEngine";
import { readFileText } from "./utils/pdfReader";

function classNames(...xs) { return xs.filter(Boolean).join(" "); }

export default function ATSResumeMatcher() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Mock Results
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);

  const handleResumeFile = async (file) => {
    setError("");
    try {
      const txt = await readFileText(file);
      setResumeText((prev) => (prev ? prev + "\n\n" : "") + txt);
    } catch {
      setError("Could not read resume file. Use PDF (.pdf) or Text (.txt).");
    }
  };

  const handleJDFile = async (file) => {
    setError("");
    try {
      const txt = await readFileText(file);
      setJdText((prev) => (prev ? prev + "\n\n" : "") + txt);
    } catch {
      setError("Could not read job description file. Use PDF (.pdf) or Text (.txt).");
    }
  };

  const analyze = async () => {
    setError("");
    if (!jdText.trim()) { setError("Job description is required. Paste text or upload .txt/.pdf."); return; }
    if (!resumeText.trim()) { setError("Resume is required. Paste text or upload .txt/.pdf."); return; }
    setLoading(true);
    try {
      const res = runMockATS(resumeText, jdText);
      setResults(res);
      setStep(2);
    } catch (e) {
      console.error(e);
      setError("Analysis failed. Please verify inputs and try again.");
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
    const blob = new Blob(
      [JSON.stringify({
        generatedAt: new Date().toISOString(),
        score: Math.round(results.score),
        matchedKeywords: Array.from(results.matchedKeywords),
        missingKeywords: results.missingKeywords,
        suggestions: results.suggestions,
      }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ats-mock-report.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-sky-600"/>
            <span className="font-semibold text-lg">ATS Resume Matcher</span>
          </div>
          <div className="text-xs text-slate-500">Free • Open-Source • Client-Side</div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6">
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StepPill active={step===1} title="1. Upload" subtitle="PDF or Text for both"/>
          <StepPill active={step===2} title="2. Mock Results" subtitle="Deterministic scoring"/>
          <StepPill active={false} title="3. Real Scoring" subtitle="Open-source NLP (next)" dim/>
        </ol>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5"/> {error}
          </div>
        )}

        {step === 1 && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-sky-600"/><h2 className="font-semibold">Resume Input</h2>
              </div>
              <p className="text-sm text-slate-600 mb-3">Upload a <strong>PDF (.pdf)</strong> or <strong>Text (.txt)</strong>, and/or paste your resume text.</p>
              <div className="grid gap-3">
                <FileDrop onFile={handleResumeFile} accept={".pdf,.txt"} label="Drop PDF/TXT here or click to choose"/>
                <textarea
                  className="w-full min-h-[160px] rounded-2xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Or paste resume text here..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">Privacy: Parsing happens in your browser. No uploads to any server.</p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-2">
                <TextQuote className="h-5 w-5 text-emerald-600"/><h2 className="font-semibold">Job Description Input</h2>
              </div>
              <p className="text-sm text-slate-600 mb-3">Upload a <strong>PDF (.pdf)</strong> or <strong>Text (.txt)</strong>, and/or paste the JD.</p>
              <div className="grid gap-3">
                <FileDrop onFile={handleJDFile} accept={".pdf,.txt"} label="Drop PDF/TXT here or click to choose"/>
                <textarea
                  className="w-full min-h-[160px] rounded-2xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Or paste the job description here..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
              </div>
              <div className="mt-3 text-xs text-slate-500">Tip: Include sections like “Requirements”, “Responsibilities”, and “Preferred”.</div>
            </Card>

            <div className="lg:col-span-2 flex items-center justify-between">
              <div className="text-sm text-slate-600"><strong>Clarity over cleverness:</strong> This phase uses a transparent keyword overlap method — no ambiguous AI output.</div>
              <button
                onClick={analyze}
                disabled={loading}
                className={classNames(
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-medium shadow-sm",
                  loading ? "bg-slate-300 text-slate-600" : "bg-sky-600 text-white hover:bg-sky-700"
                )}
              >
                <Sparkles className="h-4 w-4"/>
                {loading ? "Analyzing..." : "Analyze (Mock)"}
              </button>
            </div>
          </section>
        )}

        {step === 2 && results && (
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-sky-600"/><h2 className="font-semibold">ATS Compatibility (Mock)</h2></div>
                <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5">Deterministic</span>
              </div>
              <div className="flex items-center justify-center">
                <RadialBarChart width={260} height={220} innerRadius="70%" outerRadius="90%" data={scoreData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0,100]} tick={false} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <RadialBar minAngle={15} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </div>
              <div className="text-center -mt-6 text-4xl font-extrabold">{Math.round(results.score)}%</div>
              <p className="text-center text-xs text-slate-500 mt-1">Score = weighted keyword coverage of JD by resume.</p>
              <div className="mt-4 flex justify-center">
                <button onClick={downloadReport} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm bg-slate-900 text-white hover:bg-black">
                  <Download className="h-4 w-4"/>Download JSON Report
                </button>
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold mb-2">High-Value Keywords You’re Missing</h2>
              <ul className="space-y-1 text-sm">
                {results.missingKeywords.length === 0 && (
                  <li className="text-emerald-700">Excellent — no high-value gaps detected.</li>
                )}
                {results.missingKeywords.slice(0,15).map((kw) => (
                  <li key={kw} className="flex items-start gap-2"><span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-sky-500"/> <span className="break-words">{kw}</span></li>
                ))}
              </ul>
            </Card>

            <Card>
              <h2 className="font-semibold mb-2">Concrete Suggestions</h2>
              <ol className="list-decimal pl-5 text-sm space-y-2">
                {results.suggestions.map((s, i) => (<li key={i} className="break-words">{s}</li>))}
              </ol>
            </Card>

            <Card className="xl:col-span-2">
              <h2 className="font-semibold mb-2">Matched Keywords</h2>
              <div className="text-sm flex flex-wrap gap-2">
                {Array.from(results.matchedKeywords).sort().map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">{k}</span>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold mb-2">Next Step: Real ATS Scoring (Open-Source)</h2>
              <ul className="text-sm space-y-2">
                <li><strong>Phrase-aware matching:</strong> noun-chunk extraction with spaCy (free) and weighted phrase overlap.</li>
                <li><strong>Semantic similarity:</strong> sentence-transformers <code>all-MiniLM-L6-v2</code> for embeddings + cosine similarity.</li>
                <li><strong>No paid APIs:</strong> run locally or free serverless (Cloudflare Workers/Pages Functions, Render free). Cache models.</li>
                <li><strong>Strict outputs:</strong> JSON with <code>score</code>, <code>matched</code>, <code>missing</code>, <code>explanations</code>. Avoid vague text.</li>
              </ul>
              <p className="text-xs text-slate-500 mt-2">This page is the foundation. Swap the mock engine with the real scorer when ready.</p>
            </Card>

            <div className="xl:col-span-3 flex justify-between items-center">
              <button onClick={() => setStep(1)} className="rounded-2xl bg-slate-200 px-3 py-2 text-sm">Back to Upload</button>
              <div className="text-xs text-slate-500">Classic resume wisdom still applies: single-column, simple fonts, consistent dates.</div>
            </div>
          </section>
        )}
      </main>

      <footer className="py-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} • Free & open — no data leaves your browser.
      </footer>
    </div>
  );
}
