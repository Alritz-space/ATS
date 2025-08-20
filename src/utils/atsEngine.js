import natural from "natural";

// ✅ Clean + tokenize text
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

// ✅ Extract keywords with TF-IDF
function getKeywords(resumeText, jobText) {
  const TfIdf = natural.TfIdf;
  const tfidf = new TfIdf();

  tfidf.addDocument(resumeText, "resume");
  tfidf.addDocument(jobText, "job");

  const jobTerms = [];
  tfidf.listTerms(1).forEach(item => {
    if (item.tfidf > 0.1) {
      jobTerms.push(item.term);
    }
  });

  return jobTerms;
}

// ✅ Scoring function
export function atsScore(resumeText, jobText) {
  const resumeTokens = tokenize(resumeText);
  const jobTokens = tokenize(jobText);

  // Match rate
  const matches = jobTokens.filter(token => resumeTokens.includes(token));
  const score = Math.round((matches.length / jobTokens.length) * 100);

  // Missing keywords
  const missing = jobTokens.filter(token => !resumeTokens.includes(token));

  return {
    score,
    matched: [...new Set(matches)],
    missing: [...new Set(missing)],
  };
}
