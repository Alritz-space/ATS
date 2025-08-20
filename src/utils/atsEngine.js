const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","else","when","at","by","for","with","about","against","between",
  "into","through","during","before","after","above","below","to","from","up","down","in","out","on","off","over",
  "under","again","further","than","once","here","there","all","any","both","each","few","more","most","other",
  "some","such","no","nor","not","only","own","same","so","too","very","can","will","just","don","should","now",
  "is","are","was","were","be","been","being","of","that","this","it","as","your","you","we","our","i","me","my",
  "they","their","them","he","she","his","her","its"
]);

export function runMockATS(resume, jd) {
  const R = normalize(resume);
  const J = normalize(jd);

  const jdTokens = tokenize(J);
  const resumeTokens = new Set(tokenize(R));
  const jdBigrams = bigrams(jdTokens);

  const weightMap = new Map();
  const requiredBlocks = extractRequiredBlocks(J);

  for (const t of jdTokens) {
    const w = weightMap.get(t) || 0;
    weightMap.set(t, w + (requiredBlocks.has(t) ? 2 : 1));
  }
  for (const [a,b] of jdBigrams) {
    const phrase = `${a} ${b}`;
    const w = weightMap.get(phrase) || 0;
    weightMap.set(phrase, w + 2 + (requiredBlocks.has(a) || requiredBlocks.has(b) ? 1 : 0));
  }

  let matchedWeight = 0;
  let totalWeight = 0;
  const matchedKeywords = new Set();
  const missing = [];

  for (const [kw, w] of weightMap.entries()) {
    totalWeight += w;
    if (kw.includes(" ")) {
      if (R.includes(kw)) { matchedWeight += w; matchedKeywords.add(kw); }
      else { missing.push([kw, w]); }
    } else {
      if (resumeTokens.has(kw)) { matchedWeight += w; matchedKeywords.add(kw); }
      else { missing.push([kw, w]); }
    }
  }

  missing.sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
  const missingKeywords = missing.map(x => x[0]).slice(0,50);

  const score = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;

  const words = tokenize(R);
  const tooShort = words.length < 120;
  const tooLong = words.length > 1200;
  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(resume);
  const hasPhone = /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/.test(resume);

  const suggestions = [];
  if (missingKeywords.length > 0) {
    suggestions.push(`Add 2–3 bullet points that naturally include: ${missingKeywords.slice(0,8).join(", ")}.`);
  }
  suggestions.push("Mirror the exact job title wording once near the top to pass strict keyword filters.");
  if (!hasEmail || !hasPhone) suggestions.push("Include a professional email and phone number in the header.");
  if (tooShort) suggestions.push("Resume appears brief. Aim for 1–2 pages with quantified impact.");
  if (tooLong) suggestions.push("Trim content to 1–2 pages. Remove duplicates and older roles if needed.");
  suggestions.push("Use a clean single-column layout, standard fonts (11–12pt), and consistent MM/YYYY dates.");

  return { score, matchedKeywords, missingKeywords, suggestions };
}

function normalize(s) { return s.replace(/\s+/g, " ").toLowerCase(); }

function tokenize(s) {
  return s.replace(/[^a-z0-9\-\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

function bigrams(tokens) {
  const res = [];
  for (let i = 0; i < tokens.length - 1; i++) res.push([tokens[i], tokens[i+1]]);
  return res;
}

function extractRequiredBlocks(jd) {
  const lines = jd.split(/\n|\./);
  const bag = new Set();
  for (const line of lines) {
    if (/(must\s*have|required|requirements|need to|mandatory)/i.test(line)) {
      for (const t of tokenize(line)) bag.add(t);
    }
  }
  return bag;
}
