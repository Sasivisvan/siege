// ============================================
// SIEGE — Liveness Check
// ============================================
// Anti-spoof verification using face landmarks.
// Defeats virtual camera / looping video attacks.
// ============================================

export type LivenessPrompt = 'LOOK_LEFT' | 'LOOK_RIGHT' | 'SMILE' | 'BLINK';

export interface LivenessResult {
  prompt: LivenessPrompt;
  passed: boolean;
  confidence: number;
  timestamp: number;
}

/**
 * Generate a random liveness prompt for the candidate.
 */
export function getRandomPrompt(): LivenessPrompt {
  const prompts: LivenessPrompt[] = ['LOOK_LEFT', 'LOOK_RIGHT', 'SMILE', 'BLINK'];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

/**
 * Verify that the candidate performed the requested action.
 *
 * @param prompt - The action requested
 * @param imageData - Frame captured after the prompt
 * @returns Whether the liveness check passed
 *
 * TODO (Dev 3): Implement using face-api.js landmarks/blendshapes
 */
export async function verifyLiveness(
  prompt: LivenessPrompt,
  imageData: ImageData
): Promise<LivenessResult> {
  // TODO: Analyze facial landmarks to verify movement
  return {
    prompt,
    passed: true,
    confidence: 0,
    timestamp: Date.now(),
  };
}
