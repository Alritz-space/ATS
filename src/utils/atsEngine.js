// src/utils/atsEngine.js
// Open-source, client-side ATS scoring engine.
// Deterministic, transparent: TF-IDF + cosine similarity + keyword coverage.
// Returns structured JSON: { score, matchedKeywords, missingKeywords, suggestions, details }

const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","else","when","at","by","for","with","about","against","between",
  "into","through","during","before","after","above","below","to","from","up","down","in","out","on","off","over",
  "under","again","further","than","once","here","there","all","any","both","each","few","more","most","other",
  "some","such","no","nor","not","only","own","same","so","too","very","can","will","just","don","should","now",
  "is","are","was","were","be","been","being","of","that","this","it","as","your","you","we","our","i","me","my",
  "they","their","them","he","she","his","her","its"
]);

// ----- Helpers -----

function normalizeText(s) {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function tokenize(s) {
  // Remove punctuation (keep hyphens inside words), split on whitespace.
  const cleaned = s.replace(/[^a-z0-9\- ]/g, " ");
  const raw = cleaned.split(/\s+/).filter(Boolean);
  // filter stopwords and pure numbers
  return raw.filter(t => !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

function extractBigrams(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    out.push(tokens[i] + " " + tokens[i+1]);
  }
  return out;
}

function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  // convert to object
  return tf;
}

function topKFromMap(map, k=20) {
  const arr = Array.from(map.entries());
  arr.sort((a,b) => b[1] - a[1]);
  return arr.slice(0,k).map(x => x[0]);
}

function vectorFromVocab(vocab, tfMap) {
  // produce dense vector aligned with vocab (array)
  return vocab.map(term => (tfMap.get(term) || 0));
}

function cosineSimilarity(a, b) {
  // compute cos sim of two numeric arrays
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function computeIDF(docsTF) {
  // docsTF: array of Map(term -> freq)
  const N = docsTF.length;
  const df = new Map();
  for (const tf of docsTF) {
    for (const term of tf.keys()) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }
  const idf = new Map();
  for (const [term, cnt] of df.entries()) {
    idf.set(term, Math.log((N + 1) / (cnt + 1)) + 1); // smoothed idf
  }
  return idf;
}

function tfidfVectorFromTF(tfMap, vocab, idf) {
  // tfMap: Map(term->count), vocab: array, idf: Map
  // Use TF (raw count) * IDF, then optionally L2-normalize externally
  return vocab.map(term => {
    const tf = tfMap.get(term) || 0;
    const idfv = idf.get(term) || 0;
    return tf * idfv;
  });
}

// ----- Main exported function -----

/**
 * runRealATS(resumeText, jdText, opts)
 * Returns:
 * {
 *   score: number (0-100),
 *   matchedKeywords: Set<string>,
 *   missingKeywords: Array<string>,
 *   suggestions: Array<string>,
 *   details: {
 *     cosineSimilarity: number (0-1),
 *     keywordCoverage: number (0-1),
 *     jdTopKeywords: Array<string>
 *   }
 * }
 *
 * Deterministic and explainable. Works fully client-side.
 */
export function runRealATS(resumeText, jdText, opts = {}) {
  // Options and sanity
  const opt = {
    topKKeywords: opts.topKKeywords || 30,
    phraseBoostWeight: opts.phraseBoostWeight || 1.5, // weight for bigrams when extracting keywords
    coverageWeight: opts.coverageWeight || 0.25, // contribution of keyword coverage to final score
    similarityWeight: opts.similarityWeight || 0.75, // contribution of tfidf-cosine similarity
  };

  // 1) Normalize + tokenize
  const Rraw = normalizeText(resumeText);
  const Jraw = normalizeText(jdText);

  const rTokens = tokenize(Rraw);
  const jTokens = tokenize(Jraw);

  // 2) Build unigram & bigram pools
  const jBigrams = extractBigrams(jTokens);
  const rBigrams = extractBigrams(rTokens);

  // 3) Term frequency maps (unigrams + bigrams merged)
  const jTF = termFreq(jTokens);
  const rTF = termFreq(rTokens);

  // Merge bigrams into TF with boosted counts (helps phrase matching)
  for (const b of jBigrams) {
    jTF.set(b, (jTF.get(b) || 0) + Math.round(opt.phraseBoostWeight * 1));
  }
  for (const b of rBigrams) {
    rTF.set(b, (rTF.get(b) || 0) + Math.round(1));
  }

  // 4) Build vocabulary from both docs (union) and select top-N job keywords for coverage check
  const combinedTerms = new Set([...jTF.keys(), ...rTF.keys()]);
  const combinedVocab = Array.from(combinedTerms);

  // IDF computed across the two docs (resume + job)
  const idf = computeIDF([jTF, rTF]);

  // 5) TF-IDF vectors
  const jVec = tfidfVectorFromTF(jTF, combinedVocab, idf);
  const rVec = tfidfVectorFromTF(rTF, combinedVocab, idf);

  // Compute cosine similarity of TF-IDF vectors (0..1)
  const cosSim = cosineSimilarity(jVec, rVec);

  // 6) Keyword extraction from JD: pick top K terms by tf*idf in JD
  const jTermScores = [];
  for (const term of combinedVocab) {
    const score = (jTF.get(term) || 0) * (idf.get(term) || 0);
    if (score > 0) jTermScores.push([term, score]);
  }
  jTermScores.sort((a,b) => b[1] - a[1]);
  const jdTopKeywords = jTermScores.slice(0, opt.topKKeywords).map(x => x[0]);

  // 7) Keyword coverage: how many of jdTopKeywords appear in resume (match exact unigram or bigram phrase)
  const resumeSet = new Set([...rTokens, ...rBigrams]);
  const matchedKeywords = new Set();
  const missingKeywords = [];
  for (const kw of jdTopKeywords) {
    if (resumeSet.has(kw)) matchedKeywords.add(kw);
    else missingKeywords.push(kw);
  }
  const coverage = jdTopKeywords.length > 0 ? (matchedKeywords.size / jdTopKeywords.length) : 0;

  // 8) Final score aggregation (weighted)
  // Normalize cosine similarity to 0..1 already; combine with coverage
  const finalNormalized = (opt.similarityWeight * cosSim) + (opt.coverageWeight * coverage);
  const finalScore = Math.round(Math.max(0, Math.min(1, finalNormalized)) * 100);

  // 9) Heuristic suggestions (deterministic, concrete)
  const suggestions = [];
  if (missingKeywords.length > 0) {
    suggestions.push(
      `Consider adding or rephrasing bullets to include: ${missingKeywords.slice(0, 8).join(", ")}. ` +
      `Prioritize the first 3 missing keywords in role summary or top 1-2 bullets.`
    );
  } else {
    suggestions.push("Great — most high-value JD keywords are present in the resume.");
  }

  // Formatting / contact heuristics
  if (!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(resumeText)) {
    suggestions.push("Add a professional email address in the resume header.");
  }
  if (!/(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/.test(resumeText)) {
    suggestions.push("Add a phone number in the resume header.");
  }

  const wordsCount = rTokens.length;
  if (wordsCount < 120) suggestions.push("Resume is short (<120 tokens). Consider 1 page with more quantified achievements.");
  else if (wordsCount > 1200) suggestions.push("Resume is long (>1200 tokens). Trim older or low-value roles.");

  suggestions.push("Use a clean single-column layout and consistent date formatting (MM/YYYY).");

  // 10) Package the response
  return {
    score: finalScore,
    matchedKeywords: Array.from(matchedKeywords),
    missingKeywords: missingKeywords,
    suggestions,
    details: {
      cosineSimilarity: parseFloat(cosSim.toFixed(4)),
      keywordCoverage: parseFloat(coverage.toFixed(4)),
      jdTopKeywords: jdTopKeywords.slice(0, Math.min(jdTopKeywords.length, 50))
    }
  };
}

// Export a compatibility wrapper for the old mock function name if you want to swap easily.
export { runRealATS as runATS };
