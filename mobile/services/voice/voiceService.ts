import { VoiceCommand } from './voiceTypes';

type VoiceListener = (command: VoiceCommand) => void;

let isListening = false;
let listeners: VoiceListener[] = [];

export function onCommand(listener: VoiceListener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export async function startListening(): Promise<void> {
  if (isListening) {
    return;
  }
  isListening = true;
  console.log('[voiceService] Started listening for voice commands...');
}

export async function stopListening(): Promise<void> {
  if (!isListening) {
    return;
  }
  isListening = false;
  console.log('[voiceService] Stopped listening.');
}

export function isListeningActive(): boolean {
  return isListening;
}

export async function processCommand(text: string): Promise<VoiceCommand> {
  const normalized = text.toLowerCase().trim();

  let command: string;
  let params: Record<string, string> = {};
  let confidence: number;

  if (normalized.includes('check balance') || normalized.includes('balance')) {
    command = 'check_balance';
    params = {};
    confidence = 0.92;
  } else if (
    normalized.includes('make contribution') ||
    normalized.includes('contribute')
  ) {
    command = 'make_contribution';
    const match = normalized.match(/(\d+)/);
    params = { amount: match ? match[1] : '0' };
    confidence = 0.85;
  } else if (
    normalized.includes('show groups') ||
    normalized.includes('my groups') ||
    normalized.includes('list groups')
  ) {
    command = 'show_groups';
    params = {};
    confidence = 0.9;
  } else if (normalized.includes('help')) {
    command = 'help';
    params = {};
    confidence = 0.95;
  } else {
    command = 'unknown';
    params = { raw: text };
    confidence = 0.3;
  }

  const voiceCommand: VoiceCommand = { command, params, confidence };

  console.log(
    `[voiceService] Processed command: ${command} (confidence: ${confidence})`,
  );

  listeners.forEach((l) => l(voiceCommand));

  return voiceCommand;
}
