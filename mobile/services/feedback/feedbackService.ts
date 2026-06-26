import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserFeedback } from './feedbackTypes';

const FEEDBACK_STORAGE_KEY = 'esustellar.feedback.history';

export async function submitFeedback(
  type: UserFeedback['type'],
  message: string,
  metadata?: Record<string, unknown>,
  rating?: number,
): Promise<void> {
  const feedback: UserFeedback = {
    type,
    message,
    ...(rating !== undefined && { rating }),
    ...(metadata !== undefined && { metadata }),
  };

  console.log('[feedbackService] Submitting feedback:', feedback);

  const history = await getFeedbackHistory();
  history.push({ ...feedback, metadata: { ...feedback.metadata, submittedAt: new Date().toISOString() } });
  await AsyncStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(history));
}

export async function getFeedbackHistory(): Promise<UserFeedback[]> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as UserFeedback[];
  } catch {
    return [];
  }
}

export async function clearFeedbackHistory(): Promise<void> {
  await AsyncStorage.removeItem(FEEDBACK_STORAGE_KEY);
}
