'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  biometricService,
  pinService,
  BiometricType,
  SecurityStatus,
  BiometricCapability,
} from '../../services/security';
import { useRouter } from 'expo-router';

// Stub wallet address — replace with real value from wallet context
const WALLET_ADDRESS = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

// ── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [biometricCap, setBiometricCap] = useState<BiometricCapability>({
    status: SecurityStatus.UNKNOWN,
    supportedTypes: [],
  });
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinSet, setPinSet] = useState(false);

  // PIN flow state
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [pinError, setPinError] = useState<string | null>(null);

  // General status
  const [authenticating, setAuthenticating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // ── Copy wallet address ──────────────────────────────────────────────────

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(WALLET_ADDRESS);
      setCopyToast('Wallet address copied to clipboard');
    } catch {
      setCopyToast('Failed to copy wallet address');
    }
    setTimeout(() => setCopyToast(null), 2500);
  };

  // ── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const cap = await biometricService.getCapability();
      setBiometricCap(cap);

      const hasPin = pinService.isPinSet();
      setPinSet(hasPin);

      // Read persisted preferences
      try {
        const prefs = localStorage.getItem('esustellar_security_prefs');
        if (prefs) {
          const parsed = JSON.parse(prefs);
          if (cap.status === SecurityStatus.AVAILABLE) {
            setBiometricEnabled(parsed.biometricEnabled ?? false);
          }
          setPinEnabled(parsed.pinEnabled ?? false);
        }
      } catch {
        // ignore corrupt prefs
      }
    };
    load();
  }, []);

  // ── Persist helper ───────────────────────────────────────────────────────

  const savePrefs = useCallback(
    (updates: { biometricEnabled?: boolean; pinEnabled?: boolean }) => {
      try {
        const existing = JSON.parse(localStorage.getItem('esustellar_security_prefs') ?? '{}');
        const next = { ...existing, ...updates };
        localStorage.setItem('esustellar_security_prefs', JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    []
  );

  // ── Biometric toggle ─────────────────────────────────────────────────────

  const handleBiometricToggle = async () => {
    if (biometricCap.status !== SecurityStatus.AVAILABLE) return;

    if (!biometricEnabled) {
      // Turning ON — verify user can authenticate first
      setAuthenticating(true);
      const result = await biometricService.authenticate(
        'Enable biometric authentication'
      );
      setAuthenticating(false);

      if (result.success) {
        setBiometricEnabled(true);
        savePrefs({ biometricEnabled: true });
        setMessage({ text: 'Biometric authentication enabled', type: 'success' });
      } else {
        setMessage({ text: result.error ?? 'Biometric verification failed', type: 'error' });
      }
    } else {
      // Turning OFF
      setBiometricEnabled(false);
      savePrefs({ biometricEnabled: false });
      setMessage({ text: 'Biometric authentication disabled', type: 'info' });
    }
  };

  // ── PIN flow ─────────────────────────────────────────────────────────────

  const startPinSetup = () => {
    setPinInput('');
    setPinConfirm('');
    setPinStep('enter');
    setPinError(null);
    setShowPinSetup(true);
  };

  const handlePinSubmit = async () => {
    setPinError(null);

    if (pinStep === 'enter') {
      if (!pinService.isValidPin(pinInput)) {
        setPinError('PIN must be 4-6 digits');
        return;
      }
      setPinStep('confirm');
      setPinConfirm('');
      return;
    }

    // Confirm step
    if (pinInput !== pinConfirm) {
      setPinError('PINs do not match');
      return;
    }

    try {
      await pinService.setPin(pinInput);
      setPinSet(true);
      setPinEnabled(true);
      savePrefs({ pinEnabled: true });
      setShowPinSetup(false);
      setMessage({ text: 'PIN set successfully', type: 'success' });
    } catch {
      setPinError('Failed to save PIN');
    }
  };

  const handleRemovePin = () => {
    pinService.removePin();
    setPinSet(false);
    setPinEnabled(false);
    savePrefs({ pinEnabled: false });
    setMessage({ text: 'PIN removed', type: 'info' });
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const biometricLabel = (type: BiometricType): string => {
    switch (type) {
      case BiometricType.FINGERPRINT:
        return 'Fingerprint';
      case BiometricType.FACIAL_RECOGNITION:
        return 'Face ID';
      case BiometricType.IRIS:
        return 'Iris';
      default:
        return 'Biometrics';
    }
  };

  const supportedLabel =
    biometricCap.supportedTypes.length > 0 &&
    biometricCap.supportedTypes[0] !== BiometricType.NONE
      ? biometricCap.supportedTypes.map(biometricLabel).join(' / ')
      : 'None';

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>

      {/* Copy toast */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50">
          {copyToast}
        </div>
      )}

      {/* ── Wallet Address Section ─────────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-800">Wallet Address</h2>
        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="flex-1 text-xs text-gray-600 font-mono truncate">{WALLET_ADDRESS}</p>
          <button
            onClick={handleCopyAddress}
            aria-label="Copy wallet address"
            className="shrink-0 p-1.5 rounded-md hover:bg-gray-200 transition-colors"
            title="Copy wallet address"
          >
            📋
          </button>
        </div>
      </section>

      {/* ── Notifications Section ───────────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <button
            onClick={() => router.push('/(tabs)/profile/notifications-settings')}
            className="w-full flex items-center justify-between p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Notification Settings</p>
              <p className="text-xs text-gray-500">Manage push notification preferences</p>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>
      </section>

      {/* Flash message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : message.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="float-right font-bold opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Biometric Section ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Biometric Authentication</h2>

        {biometricCap.status === SecurityStatus.UNSUPPORTED && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium">
              Biometrics not supported on this device
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Set up a PIN below as a fallback authentication method.
            </p>
          </div>
        )}

        {biometricCap.status === SecurityStatus.NOT_ENROLLED && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800 font-medium">
              No biometrics enrolled
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Please set up fingerprint or face recognition in your device
              settings, then return here to enable it.
            </p>
          </div>
        )}

        {biometricCap.status === SecurityStatus.AVAILABLE && (
          <>
            <p className="text-sm text-gray-500">
              Supported: <span className="font-medium text-gray-700">{supportedLabel}</span>
            </p>
            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Enable biometrics
                </p>
                <p className="text-xs text-gray-500">
                  Use {supportedLabel} to sign in
                </p>
              </div>
              <button
                onClick={handleBiometricToggle}
                disabled={authenticating}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  biometricEnabled ? 'bg-blue-600' : 'bg-gray-300'
                } ${authenticating ? 'opacity-50' : ''}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    biometricEnabled ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </>
        )}

        {biometricCap.status === SecurityStatus.UNKNOWN && (
          <div className="flex items-center space-x-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Checking device capabilities…</span>
          </div>
        )}
      </section>

      {/* ── PIN Section ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">PIN Fallback</h2>

        {!pinSet && !showPinSetup && (
          <>
            <p className="text-sm text-gray-500">
              Set a 4-6 digit PIN as a fallback when biometrics are unavailable.
            </p>
            <button
              onClick={startPinSetup}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Set up PIN
            </button>
          </>
        )}

        {showPinSetup && (
          <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
            <p className="text-sm font-medium text-gray-700">
              {pinStep === 'enter' ? 'Enter your PIN' : 'Confirm your PIN'}
            </p>

            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinStep === 'enter' ? pinInput : pinConfirm}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (pinStep === 'enter') setPinInput(val);
                else setPinConfirm(val);
              }}
              placeholder={pinStep === 'enter' ? '4-6 digits' : 'Re-enter PIN'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            {pinError && (
              <p className="text-xs text-red-600">{pinError}</p>
            )}

            <div className="flex space-x-2">
              <button
                onClick={() => setShowPinSetup(false)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePinSubmit}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {pinStep === 'enter' ? 'Next' : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        {pinSet && !showPinSetup && (
          <div className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">PIN is set</p>
              <p className="text-xs text-gray-500">
                Used as fallback when biometrics fail
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={startPinSetup}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Change
              </button>
              <button
                onClick={handleRemovePin}
                className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
