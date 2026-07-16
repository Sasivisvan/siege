// ============================================
// SIEGE Server — Essay Evaluator Service
// ============================================

export interface EssayEvaluationResult {
  score: number;
  confidence: number;
  feedback: string;
  requiresHumanReview: boolean;
}

/**
 * Stub for LLM essay evaluator.
 * In production, this would call LangChain/Ollama/OpenAI
 * to evaluate the student answer against the rubric.
 */
export async function evaluateEssay(
  studentAnswer: string,
  rubric: string,
  _referenceAnswer?: string
): Promise<EssayEvaluationResult> {
  // Simulate LLM processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log(`Analyzing answer length: ${studentAnswer.length}`);
  console.log(`Against rubric: ${rubric}`);

  // Dummy grading logic for stub
  const wordCount = studentAnswer.split(/\s+/).length;
  
  // If the answer is extremely short, confidence is high that it's wrong
  if (wordCount < 10) {
    return {
      score: 10,
      confidence: 0.9,
      feedback: 'The answer is too brief to address the rubric requirements.',
      requiresHumanReview: false
    };
  }

  // Medium answers get an average score and require human review due to low AI confidence
  if (wordCount >= 10 && wordCount < 50) {
    return {
      score: 60,
      confidence: 0.5, // Low confidence triggers human review
      feedback: 'The answer touches on some points but lacks depth. Human review recommended.',
      requiresHumanReview: true
    };
  }

  // Good answers
  return {
    score: 85,
    confidence: 0.85,
    feedback: 'The answer comprehensively addresses the main points in the rubric.',
    requiresHumanReview: false
  };
}
