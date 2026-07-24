import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import {
  getNextPinAttemptState,
  getRemainingAttempts,
  getRemainingLockoutMs,
  INITIAL_PIN_ATTEMPT_STATE,
  MAX_PIN_ATTEMPTS,
  PIN_LENGTH,
  PinAttemptState,
} from './pinPolicy';

const PIN_STORAGE_KEY = 'esustellar.pin.record';
const PIN_ATTEMPT_STATE_KEY = 'esustellar.pin.attempt-state';

interface StoredPinRecord {
  salt: string;
  hash: string;
}

export interface PinVerificationResult {
  success: boolean;
  locked: boolean;
  remainingAttempts: number;
  remainingLockoutMs: number;
}

export interface PinStatus extends PinVerificationResult {
  isPinSet: boolean;
}

class PinService {
  private static instance: PinService;

  private constructor() {}

  static getInstance(): PinService {
    if (!PinService.instance) {
      PinService.instance = new PinService();
    }

    return PinService.instance;
  }

  private async readPinRecord(): Promise<StoredPinRecord | null> {
    const raw = await SecureStore.getItemAsync(PIN_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<StoredPinRecord>;

      if (typeof parsed.salt === 'string' && typeof parsed.hash === 'string') {
        return { salt: parsed.salt, hash: parsed.hash };
      }
    } catch {
      return null;
    }

    return null;
  }

  private async readAttemptState(): Promise<PinAttemptState> {
    try {
      const raw = await AsyncStorage.getItem(PIN_ATTEMPT_STATE_KEY);

      if (!raw) {
        return INITIAL_PIN_ATTEMPT_STATE;
      }

      const parsed = JSON.parse(raw) as Partial<PinAttemptState>;

      if (
        typeof parsed.failedAttempts === 'number' &&
        (typeof parsed.lockoutUntil === 'number' || parsed.lockoutUntil === null)
      ) {
        return {
          failedAttempts: parsed.failedAttempts,
          lockoutUntil: parsed.lockoutUntil,
        };
      }
    } catch {
      return INITIAL_PIN_ATTEMPT_STATE;
    }

    return INITIAL_PIN_ATTEMPT_STATE;
  }

  private async writeAttemptState(state: PinAttemptState): Promise<void> {
    await AsyncStorage.setItem(PIN_ATTEMPT_STATE_KEY, JSON.stringify(state));
  }

  private createSalt(): string {
    const bytes = Crypto.getRandomBytes(16);

    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  private async hashPin(pin: string, salt: string): Promise<string> {
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${salt}:${pin}`
    );
  }

  isValidPin(pin: string): boolean {
    return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
  }

  async isPinSet(): Promise<boolean> {
    return Boolean(await SecureStore.getItemAsync(PIN_STORAGE_KEY));
  }

  async setPin(pin: string): Promise<void> {
    if (!this.isValidPin(pin)) {
      throw new Error(`PIN must be exactly ${PIN_LENGTH} digits`);
    }

    const salt = this.createSalt();
    const hash = await this.hashPin(pin, salt);

    await SecureStore.setItemAsync(
      PIN_STORAGE_KEY,
      JSON.stringify({ salt, hash })
    );
    await this.writeAttemptState(INITIAL_PIN_ATTEMPT_STATE);
  }

  async verifyPin(pin: string): Promise<PinVerificationResult> {
    const [record, currentState] = await Promise.all([
      this.readPinRecord(),
      this.readAttemptState(),
    ]);

    const remainingLockoutMs = getRemainingLockoutMs(currentState.lockoutUntil);

    if (remainingLockoutMs > 0) {
      return {
        success: false,
        locked: true,
        remainingAttempts: 0,
        remainingLockoutMs,
      };
    }

    if (!record) {
      return {
        success: false,
        locked: false,
        remainingAttempts: MAX_PIN_ATTEMPTS,
        remainingLockoutMs: 0,
      };
    }

    const matched =
      this.isValidPin(pin) &&
      (await this.hashPin(pin, record.salt)) === record.hash;

    const nextState = getNextPinAttemptState(currentState, matched);
    const nextLockoutMs = getRemainingLockoutMs(nextState.lockoutUntil);

    await this.writeAttemptState(nextState);

    return {
      success: matched,
      locked: nextLockoutMs > 0,
      remainingAttempts: matched ? MAX_PIN_ATTEMPTS : getRemainingAttempts(nextState),
      remainingLockoutMs: nextLockoutMs,
    };
  }

  async getStatus(): Promise<PinStatus> {
    const [isPinSet, state] = await Promise.all([
      this.isPinSet(),
      this.readAttemptState(),
    ]);
    const remainingLockoutMs = getRemainingLockoutMs(state.lockoutUntil);

    return {
      isPinSet,
      success: false,
      locked: remainingLockoutMs > 0,
      remainingAttempts: getRemainingAttempts(state),
      remainingLockoutMs,
    };
  }

  async changePin(
    currentPin: string,
    nextPin: string
  ): Promise<PinVerificationResult> {
    const verification = await this.verifyPin(currentPin);

    if (!verification.success) {
      return verification;
    }

    await this.setPin(nextPin);

    return {
      success: true,
      locked: false,
      remainingAttempts: MAX_PIN_ATTEMPTS,
      remainingLockoutMs: 0,
    };
  }

  async removePin(): Promise<void> {
    await SecureStore.deleteItemAsync(PIN_STORAGE_KEY);
    await this.writeAttemptState(INITIAL_PIN_ATTEMPT_STATE);
  }
}

export const pinService = PinService.getInstance();
