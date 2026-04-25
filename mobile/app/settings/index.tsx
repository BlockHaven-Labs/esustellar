'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import {
  biometricService,
  pinService,
  BiometricType,
  SecurityStatus,
  BiometricCapability,
} from '../../services/security';
import { changeLanguage, getLanguage, languageOptions, loadLanguage } from '../../constants/i18n';

// Stub wallet address — replace with real value from wallet context
const WALLET_ADDRESS = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

// ── Settings Content ────────────────────────────────────────────────────────────

const SettingsContent = React.memo(() => {
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
  const [language, setLanguage] = useState(getLanguage());
  const { t } = useTranslation();

  // ── Copy wallet address ──────────────────────────────────────────────────

  const handleCopyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(WALLET_ADDRESS);
      setCopyToast(t('settings.copyToast'));
    } catch {
      setCopyToast(t('settings.copyFailed'));
    }
    setTimeout(() => setCopyToast(null), 2500);
  }, [t]);

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

      const savedLanguage = await loadLanguage();
      setLanguage(savedLanguage);
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

  const handleBiometricToggle = useCallback(async () => {
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
        setMessage({ text: t('settings.biometricsEnabled'), type: 'success' });
      } else {
        setMessage({ text: result.error ?? t('settings.biometricFailed'), type: 'error' });
      }
    } else {
      // Turning OFF
      setBiometricEnabled(false);
      savePrefs({ biometricEnabled: false });
      setMessage({ text: t('settings.biometricsDisabled'), type: 'info' });
    }
  }, [biometricCap.status, biometricEnabled, savePrefs, t]);

  // ── PIN flow ─────────────────────────────────────────────────────────────

  const startPinSetup = useCallback(() => {
    setPinInput('');
    setPinConfirm('');
    setPinStep('enter');
    setPinError(null);
    setShowPinSetup(true);
  }, []);

  const handlePinSubmit = useCallback(async () => {
    setPinError(null);

    if (pinStep === 'enter') {
      if (!pinService.isValidPin(pinInput)) {
        setPinError(t('settings.pinMustDigits'));
        return;
      }
      setPinStep('confirm');
      setPinConfirm('');
      return;
    }

    // Confirm step
    if (pinInput !== pinConfirm) {
      setPinError(t('settings.pinsDoNotMatch'));
      return;
    }

    try {
      await pinService.setPin(pinInput);
      setPinSet(true);
      setPinEnabled(true);
      savePrefs({ pinEnabled: true });
      setShowPinSetup(false);
      setMessage({ text: t('settings.pinSet'), type: 'success' });
    } catch {
      setPinError(t('settings.failedToSavePin'));
    }
  }, [pinStep, pinInput, pinConfirm, savePrefs, t]);

  const handleRemovePin = useCallback(() => {
    pinService.removePin();
    setPinSet(false);
    setPinEnabled(false);
    savePrefs({ pinEnabled: false });
    setMessage({ text: t('settings.pinRemoved'), type: 'info' });
  }, [savePrefs, t]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const biometricLabel = useCallback((type: BiometricType): string => {
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
  }, []);

  const supportedLabel = useMemo(() =>
    biometricCap.supportedTypes.length > 0 &&
    biometricCap.supportedTypes[0] !== BiometricType.NONE
      ? biometricCap.supportedTypes.map(biometricLabel).join(' / ')
      : 'None',
    [biometricCap.supportedTypes, biometricLabel]
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>

      {/* Copy toast */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50">
          {copyToast}
        </div>
      )}

      {/* ── Wallet Address Section ─────────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-800">{t('settings.walletAddress')}</h2>
        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="flex-1 text-xs text-gray-600 font-mono truncate">{WALLET_ADDRESS}</p>
          <button
            onClick={handleCopyAddress}
            aria-label={t('settings.copyWalletAddress')}
            className="shrink-0 p-1.5 rounded-md hover:bg-gray-200 transition-colors"
            title={t('settings.copyWalletAddress')}
          >
            📋
          </button>
        </div>
      </section>

      {/* ── Language Section ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{t('settings.language')}</h2>
        <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
          <p className="text-sm text-gray-500">{t('settings.languageLabel')}</p>
          <div className="flex flex-wrap gap-2">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={async () => {
                  await changeLanguage(option.value);
                  setLanguage(option.value);
                  setMessage({ text: t('settings.languageChangeSuccess'), type: 'success' });
                }}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  language === option.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
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
        <h2 className="text-lg font-semibold text-gray-800">{t('settings.biometricAuthentication')}</h2>

        {biometricCap.status === SecurityStatus.UNSUPPORTED && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium">
              {t('settings.biometricsNotSupported')}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              {t('settings.setUpPinFallback')}
            </p>
          </div>
        )}

        {biometricCap.status === SecurityStatus.NOT_ENROLLED && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800 font-medium">
              {t('settings.noBiometricsEnrolled')}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              {t('settings.setupBiometricsHelper')}
            </p>
          </div>
        )}

        {biometricCap.status === SecurityStatus.AVAILABLE && (
          <>
            <p className="text-sm text-gray-500">
              {t('settings.supported')}: <span className="font-medium text-gray-700">{supportedLabel}</span>
            </p>
            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t('settings.enableBiometrics')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('settings.useToSignIn', { supportedLabel })}
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
            <span className="text-sm">{t('settings.checkingDeviceCapabilities')}</span>
          </div>
        )}
      </section>

      {/* ── About Section ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{t('settings.about')}</h2>
        <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-1">
          <p className="text-sm text-gray-700">
            {t('settings.version')}{' '}
            <span className="font-medium">
              {Constants.expoConfig?.version ?? 'N/A'}
            </span>
          </p>
          {Constants.expoConfig?.extra?.buildNumber != null && (
            <p className="text-sm text-gray-500">
              {t('settings.build')}: {Constants.expoConfig.extra.buildNumber}
            </p>
          )}
        </div>
      </section>

      {/* ── PIN Section ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{t('settings.pinFallback')}</h2>

        {!pinSet && !showPinSetup && (
          <>
            <p className="text-sm text-gray-500">
              {t('settings.pinDescription')}
            </p>
            <button
              onClick={startPinSetup}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('settings.setUpPin')}
            </button>
          </>
        )}

        {showPinSetup && (
          <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
            <p className="text-sm font-medium text-gray-700">
              {pinStep === 'enter' ? t('settings.enterPin') : t('settings.confirmYourPin')}
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
              placeholder={pinStep === 'enter' ? t('settings.pinDigits') : t('settings.reenterPin')}
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
                {t('settings.cancel')}
              </button>
              <button
                onClick={handlePinSubmit}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {pinStep === 'enter' ? t('settings.next') : t('settings.confirm')}
              </button>
            </div>
          </div>
        )}

        {pinSet && !showPinSetup && (
          <div className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{t('settings.pinSet')}</p>
              <p className="text-xs text-gray-500">
                {t('settings.pinFallbackInfo')}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={startPinSetup}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('settings.change')}
              </button>
              <button
                onClick={handleRemovePin}
                className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                {t('settings.remove')}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
});

export default SettingsContent;