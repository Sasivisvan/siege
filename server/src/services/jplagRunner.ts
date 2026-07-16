// ============================================
// SIEGE Server — JPlag Subprocess Runner
// ============================================

import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const JPLAG_JAR_PATH = path.join(process.cwd(), 'bin', 'jplag.jar');

export interface JPlagMatch {
  firstSubmissionId: string;
  secondSubmissionId: string;
  similarity: number; // 0.0 to 1.0
  matchedSegments: Array<{
    start1: number;
    end1: number;
    start2: number;
    end2: number;
  }>;
}

/**
 * Execute JPlag via child process.
 * Writes submissions to a temporary directory, runs the JAR, and parses results.
 */
export async function runJPlagAnalysis(
  questionId: string,
  submissions: Array<{ id: string; code: string }>
): Promise<JPlagMatch[]> {
  // If JPlag JAR does not exist, return an empty array (graceful fallback for dev)
  if (!fs.existsSync(JPLAG_JAR_PATH)) {
    console.warn(`[JPlag] JAR not found at ${JPLAG_JAR_PATH}. Falling back to default plagiarism scoring.`);
    return [];
  }

  const tempDir = path.join(process.cwd(), 'tmp', `jplag-${questionId}-${Date.now()}`);
  const outputDir = path.join(tempDir, 'output');

  try {
    // Ensure directories exist
    fs.mkdirSync(outputDir, { recursive: true });

    // Write all submissions to temp files
    for (const sub of submissions) {
      const subFolder = path.join(tempDir, 'submissions', sub.id);
      fs.mkdirSync(subFolder, { recursive: true });
      fs.writeFileSync(path.join(subFolder, 'solution.txt'), sub.code, 'utf8');
    }

    // Run JPlag command
    // java -jar jplag.jar -l text -r outputDir inputDir
    await execFileAsync('java', [
      '-jar', JPLAG_JAR_PATH,
      '-l', 'text', // Fallback to plain-text JPlag if language-specific extensions are omitted
      '-r', outputDir,
      path.join(tempDir, 'submissions')
    ]);

    // Parse the JPlag output JSON reports (typically index.html / overview.json depending on version)
    // For this implementation, we will parse the generated overview metrics
    const resultsFile = path.join(outputDir, 'overview.json');
    if (fs.existsSync(resultsFile)) {
      const rawData = fs.readFileSync(resultsFile, 'utf8');
      const data = JSON.parse(rawData);
      return (data.comparisons || []).map((comp: any) => ({
        firstSubmissionId: comp.firstSubmissionId,
        secondSubmissionId: comp.secondSubmissionId,
        similarity: comp.similarity,
        matchedSegments: comp.matches || []
      }));
    }

    return [];
  } catch (error) {
    console.error('[JPlag] Subprocess runner error:', error);
    return [];
  } finally {
    // Cleanup temporary files
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('[JPlag] Temp folder cleanup failed:', cleanupError);
    }
  }
}
