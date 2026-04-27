/**
 * Background Sync Service
 * Handles periodic data synchronization when app is in foreground
 */

import { AppState, AppStateStatus } from 'react-native';
import { queryClient } from '../queryClient';
import { groupsApi } from '../api/groupsApi';
import { useAuthStore } from '../../store/authStore';
import { useGroupsStore } from '../../stores/groupsStore';
import { useNotificationsStore } from '../../stores/notificationsStore';

const SYNC_INTERVAL = 1000 * 60 * 5; // 5 minutes
const BACKGROUND_SYNC_INTERVAL = 1000 * 60 * 15; // 15 minutes

interface SyncOptions {
  syncGroups?: boolean;
  syncTransactions?: boolean;
  syncNotifications?: boolean;
}

class BackgroundSyncService {
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private lastSyncTime: number = 0;
  private isSyncing: boolean = false;

  /**
   * Start the background sync service
   */
  start(options: SyncOptions = { syncGroups: true, syncTransactions: true, syncNotifications: true }) {
    if (this.syncTimer) {
      return; // Already running
    }

    // Initial sync
    this.sync(options);

    // Set up periodic sync
    this.syncTimer = setInterval(() => {
      this.sync(options);
    }, SYNC_INTERVAL);

    // Listen for app state changes
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Sync when app comes to foreground
        const timeSinceLastSync = Date.now() - this.lastSyncTime;
        if (timeSinceLastSync > BACKGROUND_SYNC_INTERVAL) {
          this.sync(options);
        }
      }
    });

    console.log('[SyncService] Started background sync');
  }

  /**
   * Stop the background sync service
   */
  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    console.log('[SyncService] Stopped background sync');
  }

  /**
   * Perform sync operation
   */
  async sync(options: SyncOptions = {}) {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress, skipping');
      return;
    }

    const wallet = useAuthStore.getState().wallet;
    if (!wallet?.address) {
      console.log('[SyncService] No wallet connected, skipping sync');
      return;
    }

    this.isSyncing = true;
    console.log('[SyncService] Starting sync...');

    try {
      if (options.syncGroups !== false) {
        await this.syncGroups(wallet.address);
      }

      if (options.syncTransactions !== false) {
        await this.syncTransactions(wallet.address);
      }

      if (options.syncNotifications !== false) {
        await this.syncNotifications();
      }

      this.lastSyncTime = Date.now();
      console.log('[SyncService] Sync completed successfully');
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync groups data
   */
  private async syncGroups(userAddress: string) {
    const result = await groupsApi.getUserGroups(userAddress);
    if (result.success && result.data) {
      useGroupsStore.getState().setGroups(result.data);
      // Update React Query cache
      queryClient.setQueryData(['groups', 'user', userAddress], result);
    }
  }

  /**
   * Sync transactions data
   */
  private async syncTransactions(_userAddress: string) {
    // Placeholder for transaction sync
    // Would integrate with transaction API when available
    console.log('[SyncService] Syncing transactions...');
  }

  /**
   * Sync notifications
   */
  private async syncNotifications() {
    // Placeholder for notification sync
    // Would integrate with notification service when available
    const { setNotifications } = useNotificationsStore.getState();
    console.log('[SyncService] Syncing notifications...');
    
    // For now, just trigger a refresh
    // In production, this would fetch from the notifications API
    setNotifications(useNotificationsStore.getState().notifications);
  }

  /**
   * Force an immediate sync
   */
  async forceSync(options: SyncOptions = {}) {
    this.lastSyncTime = 0; // Reset to force sync
    await this.sync(options);
  }

  /**
   * Get time since last sync
   */
  getTimeSinceLastSync(): number {
    return Date.now() - this.lastSyncTime;
  }
}

// Export singleton instance
export const syncService = new BackgroundSyncService();

// React hook for using sync service
export function useBackgroundSync(options?: SyncOptions) {
  return {
    start: () => syncService.start(options),
    stop: () => syncService.stop(),
    forceSync: () => syncService.forceSync(options),
    getTimeSinceLastSync: () => syncService.getTimeSinceLastSync(),
  };
}