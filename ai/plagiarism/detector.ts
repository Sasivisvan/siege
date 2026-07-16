// ============================================
// SIEGE — Plagiarism Detector
// ============================================
// Lightweight code similarity detection based on
// string-metrics and token Jaccard indexing.
// ============================================

/**
 * Calculates the Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => 
    new Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Deletion
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Tokenize source code into a set of standard tokens.
 * Basic implementation: strip comments, whitespace, and extract keywords/symbols.
 */
function tokenize(code: string): Set<string> {
  const cleanCode = code
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove comments
    .replace(/\s+/g, ' ');                   // Normalize whitespace

  // Split by non-alphanumeric characters, keeping operators
  const tokens = cleanCode.split(/([^\w\s])/).map(t => t.trim()).filter(t => t.length > 0);
  return new Set(tokens);
}

/**
 * Calculates Jaccard similarity between two sets of tokens.
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  
  let intersectionSize = 0;
  for (const token of setA) {
    if (setB.has(token)) intersectionSize++;
  }
  
  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

export interface PlagiarismResult {
  similarityScore: number; // 0 to 100
  isPlagiarized: boolean;  // true if score > threshold
  metrics: {
    levenshteinSimilarity: number;
    jaccardSimilarity: number;
  };
}

/**
 * Calculate similarity between two source code strings.
 * 
 * @param sourceA - First code snippet
 * @param sourceB - Second code snippet
 * @param threshold - Plagiarism threshold (0-100), default 80%
 * @returns PlagiarismResult with final score
 */
export function calculateSimilarity(
  sourceA: string,
  sourceB: string,
  threshold: number = 80
): PlagiarismResult {
  // 1. Token-based Jaccard Similarity (More robust to variable renaming)
  const tokensA = tokenize(sourceA);
  const tokensB = tokenize(sourceB);
  const jaccard = jaccardSimilarity(tokensA, tokensB) * 100;

  // 2. Exact String Similarity (Levenshtein)
  // Optimization: If strings are massive, avoid Levenshtein to prevent hanging
  let levenshteinSim = 0;
  if (sourceA.length < 5000 && sourceB.length < 5000) {
    const distance = levenshteinDistance(sourceA, sourceB);
    const maxLength = Math.max(sourceA.length, sourceB.length);
    levenshteinSim = maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
  } else {
    // Fallback to Jaccard heavily if strings are too huge
    levenshteinSim = jaccard; 
  }

  // Combine scores: Give more weight to structural (Jaccard) token matching
  const finalScore = (jaccard * 0.7) + (levenshteinSim * 0.3);

  return {
    similarityScore: Math.round(finalScore * 100) / 100,
    isPlagiarized: finalScore >= threshold,
    metrics: {
      levenshteinSimilarity: Math.round(levenshteinSim * 100) / 100,
      jaccardSimilarity: Math.round(jaccard * 100) / 100
    }
  };
}
