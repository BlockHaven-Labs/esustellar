export interface VoiceCommand {
  command: string;
  params: Record<string, string>;
  confidence: number;
}
