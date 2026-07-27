export interface UserFeedback {
  type: 'bug' | 'feature' | 'general';
  message: string;
  rating?: number;
  metadata?: Record<string, unknown>;
}
