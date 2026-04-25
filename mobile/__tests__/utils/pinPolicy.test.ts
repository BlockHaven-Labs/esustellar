import {
  getNextPinAttemptState,
  getRemainingAttempts,
  getRemainingLockoutMs,
  INITIAL_PIN_ATTEMPT_STATE,
  PIN_LOCKOUT_MS,
} from '../../services/security/pinPolicy';

describe('pinPolicy', () => {
  it('tracks remaining attempts before lockout', () => {
    const firstFailure = getNextPinAttemptState(INITIAL_PIN_ATTEMPT_STATE, false, 1000);
    const secondFailure = getNextPinAttemptState(firstFailure, false, 2000);

    expect(getRemainingAttempts(firstFailure, 1000)).toBe(2);
    expect(getRemainingAttempts(secondFailure, 2000)).toBe(1);
  });

  it('locks the PIN after the third failed attempt', () => {
    const firstFailure = getNextPinAttemptState(INITIAL_PIN_ATTEMPT_STATE, false, 1000);
    const secondFailure = getNextPinAttemptState(firstFailure, false, 2000);
    const thirdFailure = getNextPinAttemptState(secondFailure, false, 3000);

    expect(getRemainingAttempts(thirdFailure, 3000)).toBe(0);
    expect(getRemainingLockoutMs(thirdFailure.lockoutUntil, 3000)).toBe(PIN_LOCKOUT_MS);
  });

  it('resets attempts after a successful PIN entry', () => {
    const failedState = getNextPinAttemptState(INITIAL_PIN_ATTEMPT_STATE, false, 1000);
    const resetState = getNextPinAttemptState(failedState, true, 2000);

    expect(resetState).toEqual(INITIAL_PIN_ATTEMPT_STATE);
  });
});
