// ============================================
// SIEGE Server — Heuristic AI Code Detector
// ============================================

/**
 * Heuristically scores a code string for likelihood of being AI-generated (e.g. GPT-4, Claude).
 * Returns a score between 0.0 (highly organic) and 1.0 (highly likely AI-generated).
 */
export function detectAICodeProbability(code: string): number {
  if (!code || code.trim().length < 50) return 0.0;

  const lines = code.split('\n').map(l => l.trim()).filter(Boolean);
  let totalScore = 0;
  let checksRun = 0;

  // 1. Comment Density Check
  // LLMs typically generate code with descriptive header comments or comments at every step.
  const commentLines = lines.filter(l => l.startsWith('//') || l.startsWith('#') || l.startsWith('/*') || l.includes('*/')).length;
  const commentRatio = commentLines / lines.length;
  
  // High comment ratio (>25% comments) increases probability
  if (commentRatio > 0.25) {
    totalScore += 0.3;
  }
  checksRun++;

  // 2. Generic Variable Name Entropy Check
  // LLMs prefer generic identifiers like 'result', 'temp', 'data', 'arr', 'element', 'value', 'output'
  const genericKeywords = ['result', 'temp', 'data', 'arr', 'element', 'value', 'output', 'helper', 'ans', 'idx'];
  let genericCount = 0;
  
  const words = code.toLowerCase().match(/\b[a-z_]\w*\b/g) || [];
  for (const word of words) {
    if (genericKeywords.includes(word)) {
      genericCount++;
    }
  }

  const genericRatio = words.length > 0 ? genericCount / words.length : 0;
  if (genericRatio > 0.08) {
    totalScore += 0.25;
  }
  checksRun++;

  // 3. Perfect Structure / Spacing Check
  // LLM code has pristine formatting: proper braces, standard 2 or 4-space indentation, consistent quotes.
  // We check for lack of idiosyncratic typing styles (e.g. mixed quotes or sloppy spacing).
  const hasMixedQuotes = code.includes("'") && code.includes('"');
  if (!hasMixedQuotes) {
    totalScore += 0.15; // Pristine consistent quotes
  }
  checksRun++;

  // 4. Time Complexity / Boilerplate comments signature
  // LLMs often add complexity notes at the bottom or top of functions
  const complexitySignatures = [
    'time complexity',
    'space complexity',
    'o(n)',
    'o(1)',
    'o(log n)',
    'optimal solution',
  ];
  let hasComplexityNote = false;
  for (const sig of complexitySignatures) {
    if (code.toLowerCase().includes(sig)) {
      hasComplexityNote = true;
      break;
    }
  }

  if (hasComplexityNote) {
    totalScore += 0.3;
  }
  checksRun++;

  // Normalize final score to a maximum of 1.0
  return Math.min(totalScore, 1.0);
}
