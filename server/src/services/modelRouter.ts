// ============================================
// SIEGE Server — AI Model Router
// ============================================

export type TaskType = 'rubric_generation' | 'essay_evaluation' | 'question_generation' | 'skill_analysis';
export type Complexity = 'low' | 'medium' | 'high';
export type ModelTier = 'power' | 'cheap' | 'local';

export interface ModelRoute {
  task: TaskType;
  complexity: Complexity;
  model: ModelTier;
}

export const MODEL_CONFIG = {
  power: { provider: 'openai', model: 'gpt-4o', maxTokens: 4096 },
  cheap: { provider: 'openai', model: 'gpt-4o-mini', maxTokens: 2048 },
  local: { provider: 'ollama', model: 'llama3.1:8b', maxTokens: 2048 },
};

/**
 * Route a task to the most appropriate and cost-effective model tier.
 */
export function routeTask(task: TaskType, complexity: Complexity): ModelTier {
  switch (task) {
    case 'rubric_generation':
      // Always use the power model for generating the base truth
      return 'power';
      
    case 'essay_evaluation':
      if (complexity === 'low') {
        return 'cheap';
      } else if (complexity === 'medium') {
        return 'cheap'; // Will flag for human review if low confidence
      }
      return 'power';

    case 'question_generation':
      // Use cheap model, teacher will review suggestions anyway
      return 'cheap';

    case 'skill_analysis':
      // Use local model for privacy and zero marginal cost since it runs frequently
      return 'local';

    default:
      return 'cheap';
  }
}
