/**
 * Question detection for Query & Question Intelligence report (Report #6).
 * Uses GSC + NLP: extracts "how people really ask" – question-style queries.
 */

const QUESTION_STARTS = [
  /^(what|how|why|when|where|who|which|whose)\b/i,
  /^(can|could|would|should|will|do|does|did|is|are|was|were|has|have|had)\b/i,
  /^(am i|are we|is there|are there)\b/i,
  /^(how to|what is|what are|why do|where can|when should)\b/i,
];

/** Question-like phrase in first 60 chars (e.g. "best tools how to do seo") */
const QUESTION_PHRASE = /\b(how to|what is|what are|can i|should i|why do|where can)\b/i;

const QUESTION_ENDS = /\?$/;

/**
 * Returns true if the query looks like a question (how people really ask).
 */
export function isQuestion(query: string): boolean {
  const q = (query || "").trim();
  if (!q) return false;
  if (QUESTION_ENDS.test(q)) return true;
  if (QUESTION_STARTS.some((re) => re.test(q))) return true;
  if (q.length <= 60 && QUESTION_PHRASE.test(q)) return true;
  return false;
}
