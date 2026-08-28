// Moderation completely disabled per user request

export interface ModerationResult {
  isViolating: boolean;
  category: string;
  actionDescription: string;
  detectedSnippet: string;
}

export function analyzeContent(_text: string): ModerationResult {
  return {
    isViolating: false,
    category: "",
    actionDescription: "",
    detectedSnippet: "",
  };
}

export function isInappropriateContent(_text: string): boolean {
  return false;
}
