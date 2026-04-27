export function logSecurityEvent(message: string) {
  console.warn(`[Security Alert] ${message}`);

  // Future production extension:
  // send logs to backend monitoring service
}
