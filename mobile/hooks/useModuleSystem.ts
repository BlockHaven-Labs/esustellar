// ─────────────────────────────────────────────────────────────────────────────
// useModuleSystem — React hook interface for the module system
//
// Provides:
//   • isModuleActive(id)  — reactive per-module status
//   • pendingUpdates      — list of available OTA updates
//   • checkForUpdates()   — trigger a manual update check
//   • applyAllUpdates()   — apply all pending updates
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { moduleManager } from '../services/modules/moduleManager';
import { updateManager, PendingUpdate } from '../services/modules/updateManager';
import { ModuleStatus } from '../services/modules/moduleTypes';

// ── Per-module status hook ────────────────────────────────────────────────────

/**
 * Returns the live status of a single module and re-renders on change.
 */
export function useModuleStatus(moduleId: string): ModuleStatus {
  const [status, setStatus] = useState<ModuleStatus>(
    () => moduleManager.getStatus(moduleId),
  );

  useEffect(() => {
    // Sync on mount in case state changed before the hook subscribed
    setStatus(moduleManager.getStatus(moduleId));

    const offActivated = moduleManager.on('activated', (id) => {
      if (id === moduleId) setStatus('active');
    });
    const offDeactivated = moduleManager.on('deactivated', (id) => {
      if (id === moduleId) setStatus('idle');
    });
    const offError = moduleManager.on('error', (id) => {
      if (id === moduleId) setStatus('error');
    });

    return () => {
      offActivated();
      offDeactivated();
      offError();
    };
  }, [moduleId]);

  return status;
}

/**
 * Convenience wrapper: returns true only when the module is fully active.
 */
export function useIsModuleActive(moduleId: string): boolean {
  return useModuleStatus(moduleId) === 'active';
}

// ── Update management hook ────────────────────────────────────────────────────

interface UseModuleUpdatesResult {
  pendingUpdates: PendingUpdate[];
  hasCriticalUpdates: boolean;
  isChecking: boolean;
  isApplying: boolean;
  checkForUpdates: (manifestUrl: string) => Promise<void>;
  applyAllUpdates: () => Promise<{ success: string[]; failed: string[] }>;
}

export function useModuleUpdates(): UseModuleUpdatesResult {
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const checkForUpdates = useCallback(async (manifestUrl: string): Promise<void> => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const updates = await updateManager.checkForUpdates(manifestUrl);
      if (isMounted.current) setPendingUpdates(updates);
    } finally {
      if (isMounted.current) setIsChecking(false);
    }
  }, [isChecking]);

  const applyAllUpdates = useCallback(async () => {
    setIsApplying(true);
    try {
      const result = await updateManager.applyAllUpdates();
      if (isMounted.current) {
        setPendingUpdates(updateManager.getPendingUpdates());
      }
      return result;
    } finally {
      if (isMounted.current) setIsApplying(false);
    }
  }, []);

  return {
    pendingUpdates,
    hasCriticalUpdates: pendingUpdates.some((u) => u.critical),
    isChecking,
    isApplying,
    checkForUpdates,
    applyAllUpdates,
  };
}
