export const PIN_LENGTH = 6;
export const MAX_PIN_ATTEMPTS = 3;
export const PIN_LOCKOUT_MS = 30_000;

export interface PinAttemptState {
  failedAttempts: number;
  lockoutUntil: number | null;
}

export const INITIAL_PIN_ATTEMPT_STATE: PinAttemptState = {
  failedAttempts: 0,
  lockoutUntil: null,
};

export function getRemainingLockoutMs(
  lockoutUntil: number | null,
  now = Date.now()
): number {
  if (!lockoutUntil) {
    return 0;
  }

  return Math.max(0, lockoutUntil - now);
}

export function getRemainingAttempts(
  state: PinAttemptState,
  now = Date.now()
): number {
  if (getRemainingLockoutMs(state.lockoutUntil, now) > 0) {
    return 0;
  }

  return Math.max(0, MAX_PIN_ATTEMPTS - state.failedAttempts);
}

export function getNextPinAttemptState(
  previous: PinAttemptState,
  matched: boolean,
  now = Date.now()
): PinAttemptState {
  if (matched) {
    return INITIAL_PIN_ATTEMPT_STATE;
  }

  if (getRemainingLockoutMs(previous.lockoutUntil, now) > 0) {
    return previous;
  }

  const failedAttempts = previous.failedAttempts + 1;

  if (failedAttempts >= MAX_PIN_ATTEMPTS) {
    return {
      failedAttempts: 0,
      lockoutUntil: now + PIN_LOCKOUT_MS,
    };
  }

  return {
    failedAttempts,
    lockoutUntil: null,
  };
}
