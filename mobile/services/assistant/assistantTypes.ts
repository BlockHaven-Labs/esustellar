export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface SavingsTip {
  title: string;
  description: string;
  category: 'budgeting' | 'goals' | 'contributions' | 'general';
}
