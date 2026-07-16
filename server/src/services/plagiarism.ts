// ============================================
// SIEGE Server — Plagiarism Detection Engine
// ============================================
// 3-Layer pipeline inspired by JPlag, copydetect,
// and resava. Deterministic, no ML.
// ============================================

import stringSimilarity from 'string-similarity';
import { Submission, ISubmissionDocument } from '../models/Submission.js';
import { Session } from '../models/Session.js';

// ============================================
// Layer 0: Code Normalization
// ============================================

/**
 * Normalize code for comparison.
 * Strips comments, collapses whitespace, standardizes identifiers.
 */
function normalizeCode(code: string): string {
  let normalized = code;

  // Strip single-line comments: // ... and # ...
  normalized = normalized.replace(/\/\/.*$/gm, '');
  normalized = normalized.replace(/#.*$/gm, '');

  // Strip multi-line comments: /* ... */
  normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');

  // Strip string literals (replace with placeholder)
  normalized = normalized.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '"S"');

  // Collapse all whitespace to single space
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Standardize variable declarations
  // let/const/var/int/float/double/string + identifier → generic
  normalized = normalized.replace(
    /\b(let|const|var|int|float|double|string|boolean|char)\s+([a-zA-Z_]\w*)/g,
    '$1 V'
  );

  // Standardize function names
  normalized = normalized.replace(
    /\bfunction\s+([a-zA-Z_]\w*)/g,
    'function F'
  );

  // Lowercase everything
  normalized = normalized.toLowerCase();

  return normalized;
}

// ============================================
// Layer 1: Quick Screen (Sørensen-Dice)
// ============================================

/**
 * Fast string-level similarity using Sørensen-Dice coefficient.
 * O(n) — used to skip obviously unique submissions.
 */
function quickCompare(code1: string, code2: string): number {
  const norm1 = normalizeCode(code1);
  const norm2 = normalizeCode(code2);

  if (norm1.length === 0 && norm2.length === 0) return 1;
  if (norm1.length === 0 || norm2.length === 0) return 0;

  return stringSimilarity.compareTwoStrings(norm1, norm2);
}

// ============================================
// Layer 2: Token Fingerprinting (Winnowing)
// ============================================

type TokenType = 'KW' | 'ID' | 'LIT' | 'OP' | 'DELIM';

interface Token {
  type: TokenType;
  value: string;
}

/**
 * Tokenize normalized code into a token stream.
 */
function tokenize(code: string): Token[] {
  const normalized = normalizeCode(code);
  const tokens: Token[] = [];

  const KEYWORDS = new Set([
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
    'continue', 'return', 'function', 'class', 'new', 'this', 'try',
    'catch', 'throw', 'import', 'export', 'from', 'let', 'const',
    'var', 'int', 'float', 'double', 'void', 'public', 'private',
    'static', 'def', 'print', 'println', 'async', 'await',
  ]);

  const OPERATORS = new Set([
    '+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==',
    '<', '>', '<=', '>=', '&&', '||', '!', '++', '--',
    '+=', '-=', '*=', '/=', '=>',
  ]);

  // Simple tokenizer using regex
  const wordPattern = /[a-z_]\w*/g;
  const numPattern = /\d+(\.\d+)?/g;
  const opPattern = /[+\-*/%=<>!&|]+/g;
  const delimPattern = /[{}()\[\];,.:]/g;

  // Combined pattern
  const combinedPattern = /[a-z_]\w*|\d+(?:\.\d+)?|[+\-*/%=<>!&|]+|[{}()\[\];,.:]|"[^"]*"/g;

  let match;
  while ((match = combinedPattern.exec(normalized)) !== null) {
    const val = match[0];

    if (KEYWORDS.has(val)) {
      tokens.push({ type: 'KW', value: val });
    } else if (/^[a-z_]\w*$/.test(val)) {
      tokens.push({ type: 'ID', value: 'ID' }); // Normalize identifiers
    } else if (/^\d/.test(val) || val.startsWith('"')) {
      tokens.push({ type: 'LIT', value: 'LIT' }); // Normalize literals
    } else if (OPERATORS.has(val)) {
      tokens.push({ type: 'OP', value: val });
    } else {
      tokens.push({ type: 'DELIM', value: val });
    }
  }

  return tokens;
}

/**
 * Generate k-gram fingerprints using winnowing.
 */
function generateFingerprints(tokens: Token[], k: number = 5): Set<number> {
  if (tokens.length < k) return new Set();

  const fingerprints = new Set<number>();

  // Create k-grams and hash them
  const hashes: number[] = [];
  for (let i = 0; i <= tokens.length - k; i++) {
    const kgram = tokens
      .slice(i, i + k)
      .map((t) => t.value)
      .join('|');
    hashes.push(simpleHash(kgram));
  }

  // Winnowing: select minimum hash from each window
  const windowSize = Math.max(1, k - 1);
  for (let i = 0; i <= hashes.length - windowSize; i++) {
    const window = hashes.slice(i, i + windowSize);
    const minHash = Math.min(...window);
    fingerprints.add(minHash);
  }

  return fingerprints;
}

/**
 * Simple hash function for k-gram strings.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0; // Convert to 32-bit int
  }
  return hash;
}

/**
 * Compare two fingerprint sets using Jaccard similarity.
 */
function fingerprintCompare(fp1: Set<number>, fp2: Set<number>): number {
  if (fp1.size === 0 && fp2.size === 0) return 1;
  if (fp1.size === 0 || fp2.size === 0) return 0;

  let intersection = 0;
  for (const hash of fp1) {
    if (fp2.has(hash)) intersection++;
  }

  const union = fp1.size + fp2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ============================================
// Layer 3: Structural Comparison (GST)
// ============================================

/**
 * Greedy String Tiling — finds longest common token subsequences.
 * Inspired by JPlag's algorithm.
 */
function greedyStringTiling(
  tokens1: Token[],
  tokens2: Token[],
  minMatchLength: number = 9
): number {
  const marked1 = new Array(tokens1.length).fill(false);
  const marked2 = new Array(tokens2.length).fill(false);
  let totalCovered = 0;

  let maxMatch: number;

  do {
    maxMatch = 0;
    const matches: Array<{ start1: number; start2: number; length: number }> = [];

    // Find all maximal matches
    for (let i = 0; i < tokens1.length; i++) {
      if (marked1[i]) continue;

      for (let j = 0; j < tokens2.length; j++) {
        if (marked2[j]) continue;

        let matchLen = 0;
        while (
          i + matchLen < tokens1.length &&
          j + matchLen < tokens2.length &&
          !marked1[i + matchLen] &&
          !marked2[j + matchLen] &&
          tokens1[i + matchLen].value === tokens2[j + matchLen].value
        ) {
          matchLen++;
        }

        if (matchLen >= minMatchLength) {
          if (matchLen > maxMatch) {
            maxMatch = matchLen;
            matches.length = 0; // Clear shorter matches
          }
          if (matchLen === maxMatch) {
            matches.push({ start1: i, start2: j, length: matchLen });
          }
        }
      }
    }

    // Mark all maximal matches as tiled
    for (const match of matches) {
      let allUnmarked = true;
      for (let k = 0; k < match.length; k++) {
        if (marked1[match.start1 + k] || marked2[match.start2 + k]) {
          allUnmarked = false;
          break;
        }
      }

      if (allUnmarked) {
        for (let k = 0; k < match.length; k++) {
          marked1[match.start1 + k] = true;
          marked2[match.start2 + k] = true;
        }
        totalCovered += match.length;
      }
    }
  } while (maxMatch >= minMatchLength);

  const totalTokens = Math.max(tokens1.length, tokens2.length);
  return totalTokens === 0 ? 0 : totalCovered / totalTokens;
}

// ============================================
// Public API
// ============================================

interface PlagiarismResult {
  otherSubmissionId: string;
  otherCandidateId: string;
  quickScore: number;
  fingerprintScore: number;
  structuralScore: number;
  finalScore: number;
  matchedRegions: Array<{ startLine: number; endLine: number }>;
}

/**
 * Check a submission against all other submissions for the same question.
 * Runs the full 3-layer pipeline.
 */
export async function checkPlagiarism(submissionId: string): Promise<void> {
  const submission = await Submission.findById(submissionId);
  if (!submission || !submission.code) return;

  // Find the session to get the examId
  const session = await Session.findById(submission.sessionId);
  if (!session) return;

  // Find all OTHER submissions for the same question in the same exam
  const otherSubmissions = await Submission.find({
    questionId: submission.questionId,
    _id: { $ne: submission._id },
    code: { $exists: true, $ne: null },
  }).populate({
    path: 'sessionId',
    match: { examId: session.examId },
    select: 'candidateId examId',
  });

  // Filter to only submissions from the same exam
  const validOthers = otherSubmissions.filter(
    (s) => s.sessionId !== null && typeof s.sessionId === 'object'
  );

  const results: PlagiarismResult[] = [];
  let maxScore = 0;

  for (const other of validOthers) {
    if (!other.code) continue;

    const otherSession = other.sessionId as unknown as { candidateId: string };

    // Layer 1: Quick screen
    const quickScore = quickCompare(submission.code, other.code);

    // Skip deep analysis if obviously unique
    if (quickScore < 0.30) {
      results.push({
        otherSubmissionId: other._id.toString(),
        otherCandidateId: otherSession.candidateId.toString(),
        quickScore,
        fingerprintScore: 0,
        structuralScore: 0,
        finalScore: quickScore * 0.20,
        matchedRegions: [],
      });
      continue;
    }

    // Layer 2: Token fingerprinting
    const tokens1 = tokenize(submission.code);
    const tokens2 = tokenize(other.code);
    const fp1 = generateFingerprints(tokens1);
    const fp2 = generateFingerprints(tokens2);
    const fingerprintScore = fingerprintCompare(fp1, fp2);

    // Layer 3: Structural comparison (GST)
    const structuralScore = greedyStringTiling(tokens1, tokens2);

    // Weighted final score
    const finalScore =
      quickScore * 0.20 +
      fingerprintScore * 0.35 +
      structuralScore * 0.45;

    maxScore = Math.max(maxScore, finalScore);

    results.push({
      otherSubmissionId: other._id.toString(),
      otherCandidateId: otherSession.candidateId.toString(),
      quickScore: Math.round(quickScore * 100) / 100,
      fingerprintScore: Math.round(fingerprintScore * 100) / 100,
      structuralScore: Math.round(structuralScore * 100) / 100,
      finalScore: Math.round(finalScore * 100) / 100,
      matchedRegions: [], // Note: Extracting precise line ranges requires AST-based parsing, which is out of scope for the current text-based tokenizer.
    });
  }

  // Update submission with plagiarism results
  submission.plagiarismScore = Math.round(maxScore * 100) / 100;
  submission.plagiarismDetails = results;
  await submission.save();

  // If high plagiarism, flag the session
  if (maxScore >= 0.85) {
    const candidateSession = await Session.findById(submission.sessionId);
    if (candidateSession && candidateSession.status === 'active') {
      console.warn(
        `🚨 High plagiarism detected (${Math.round(maxScore * 100)}%) ` +
        `for session ${candidateSession._id}`
      );
    }
  }
}
