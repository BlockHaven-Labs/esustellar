import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useGroupsStore } from '@/stores/groupsStore';
import { groupsApi } from '@/services/api/groupsApi';
import {
  useJoinGroupMutation,
  useLeaveGroupMutation,
  useCreateGroupMutation,
  useUpdateGroupSettingsMutation,
  useContributeMutation,
  usePayoutMutation,
  type OptimisticTransaction,
} from '@/services/optimisticUpdates';
import { queryClient } from '@/services/queryClient';

// Mock groupsApi
jest.mock('@/services/api/groupsApi', () => ({
  groupsApi: {
    joinGroupWithCode: jest.fn(),
    leaveGroup: jest.fn(),
    createGroup: jest.fn(),
    updateGroupSettings: jest.fn(),
    contribute: jest.fn(),
    requestPayout: jest.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Optimistic Updates Hooks', () => {
  const userAddress = 'GB_TEST_USER';

  beforeEach(() => {
    queryClient.clear();
    useGroupsStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('useJoinGroupMutation', () => {
    it('optimistically adds group and rolls back on failure', async () => {
      let rejectPromise: any;
      const apiPromise = new Promise((_, reject) => {
        rejectPromise = () => reject(new Error('Failed to join group'));
      });
      (groupsApi.joinGroupWithCode as jest.Mock).mockReturnValueOnce(apiPromise);

      const initialGroups = [
        { id: 'group_1', name: 'Group 1', creatorAddress: 'other', currentMembers: 1 } as any,
      ];
      useGroupsStore.getState().setGroups(initialGroups);

      queryClient.setQueryData(['groups', 'user', userAddress], {
        success: true,
        data: initialGroups,
      });

      const { result } = renderHook(() => useJoinGroupMutation(userAddress), { wrapper });

      act(() => {
        result.current.mutate({ inviteCode: 'CODE123' });
      });

      // Wait for optimistic state to apply
      await waitFor(() => {
        expect(useGroupsStore.getState().groups).toHaveLength(2);
      });
      expect(useGroupsStore.getState().groups[1].name).toBe('Joining group...');

      const cached = queryClient.getQueryData<any>(['groups', 'user', userAddress]);
      expect(cached.data).toHaveLength(2);
      expect(cached.data[1].name).toBe('Joining group...');

      // Reject the API call to trigger rollback
      act(() => {
        rejectPromise();
      });

      // Wait for rollback check
      await waitFor(() => {
        expect(useGroupsStore.getState().groups).toHaveLength(1);
      });
      const rolledBackCached = queryClient.getQueryData<any>(['groups', 'user', userAddress]);
      expect(rolledBackCached.data).toHaveLength(1);
    });
  });

  describe('useLeaveGroupMutation', () => {
    it('optimistically removes group and rolls back on failure', async () => {
      let rejectPromise: any;
      const apiPromise = new Promise((_, reject) => {
        rejectPromise = () => reject(new Error('Failed to leave group'));
      });
      (groupsApi.leaveGroup as jest.Mock).mockReturnValueOnce(apiPromise);

      const initialGroups = [
        { id: 'group_1', name: 'Group 1', creatorAddress: 'other', currentMembers: 1 } as any,
      ];
      useGroupsStore.getState().setGroups(initialGroups);

      queryClient.setQueryData(['groups', 'user', userAddress], {
        success: true,
        data: initialGroups,
      });

      const { result } = renderHook(() => useLeaveGroupMutation(userAddress), { wrapper });

      act(() => {
        result.current.mutate({ groupId: 'group_1' });
      });

      // Wait for optimistic check to apply
      await waitFor(() => {
        expect(useGroupsStore.getState().groups).toHaveLength(0);
      });

      const cached = queryClient.getQueryData<any>(['groups', 'user', userAddress]);
      expect(cached.data).toHaveLength(0);

      // Trigger rollback
      act(() => {
        rejectPromise();
      });

      // Wait for rollback check
      await waitFor(() => {
        expect(useGroupsStore.getState().groups).toHaveLength(1);
      });
      const rolledBackCached = queryClient.getQueryData<any>(['groups', 'user', userAddress]);
      expect(rolledBackCached.data).toHaveLength(1);
    });
  });

  describe('useCreateGroupMutation', () => {
    it('optimistically creates group and rolls back on failure', async () => {
      let rejectPromise: any;
      const apiPromise = new Promise((_, reject) => {
        rejectPromise = () => reject(new Error('Failed to create group'));
      });
      (groupsApi.createGroup as jest.Mock).mockReturnValueOnce(apiPromise);

      const initialGroups = [
        { id: 'group_1', name: 'Group 1', creatorAddress: 'other', currentMembers: 1 } as any,
      ];
      useGroupsStore.getState().setGroups(initialGroups);

      queryClient.setQueryData(['groups', 'user', userAddress], {
        success: true,
        data: initialGroups,
      });

      const { result } = renderHook(() => useCreateGroupMutation(userAddress), { wrapper });

      act(() => {
        result.current.mutate({ name: 'New Group Request' });
      });

      // Wait for optimistic check to apply
      await waitFor(() => {
        expect(useGroupsStore.getState().groups).toHaveLength(2);
      });
      expect(useGroupsStore.getState().groups[1].name).toBe('New Group Request');

      // Trigger rollback
      act(() => {
        rejectPromise();
      });

      // Wait for rollback check
      await waitFor(() => {
        expect(useGroupsStore.getState().groups).toHaveLength(1);
      });
    });
  });

  describe('useUpdateGroupSettingsMutation', () => {
    it('optimistically updates settings and rolls back on failure', async () => {
      let rejectPromise: any;
      const apiPromise = new Promise((_, reject) => {
        rejectPromise = () => reject(new Error('Failed to update settings'));
      });
      (groupsApi.updateGroupSettings as jest.Mock).mockReturnValueOnce(apiPromise);

      const initialGroups = [
        { id: 'group_1', name: 'Old Name', creatorAddress: userAddress, currentMembers: 1 } as any,
      ];
      useGroupsStore.getState().setGroups(initialGroups);

      queryClient.setQueryData(['groups', 'user', userAddress], {
        success: true,
        data: initialGroups,
      });

      const { result } = renderHook(() => useUpdateGroupSettingsMutation(userAddress), { wrapper });

      act(() => {
        result.current.mutate({ groupId: 'group_1', settings: { name: 'Optimistic Name' } });
      });

      // Wait for optimistic check to apply
      await waitFor(() => {
        expect(useGroupsStore.getState().groups[0].name).toBe('Optimistic Name');
      });

      const cached = queryClient.getQueryData<any>(['groups', 'user', userAddress]);
      expect(cached.data[0].name).toBe('Optimistic Name');

      // Trigger rollback
      act(() => {
        rejectPromise();
      });

      // Wait for rollback check
      await waitFor(() => {
        expect(useGroupsStore.getState().groups[0].name).toBe('Old Name');
      });
      const rolledBackCached = queryClient.getQueryData<any>(['groups', 'user', userAddress]);
      expect(rolledBackCached.data[0].name).toBe('Old Name');
    });
  });

  describe('useContributeMutation', () => {
    const groupId = 'group_1';

    it('optimistically adds a pending contribution and rolls back on failure', async () => {
      let rejectPromise: (reason?: unknown) => void;
      const apiPromise = new Promise<never>((_, reject) => {
        rejectPromise = reject;
      });
      (groupsApi.contribute as jest.Mock).mockReturnValueOnce(apiPromise);

      queryClient.setQueryData<OptimisticTransaction[]>(['transactions', groupId], []);

      const { result } = renderHook(
        () => useContributeMutation(groupId, userAddress),
        { wrapper },
      );

      act(() => {
        result.current.mutate(100);
      });

      // Pending entry appears immediately in cache
      await waitFor(() => {
        const txData = queryClient.getQueryData<OptimisticTransaction[]>(['transactions', groupId]);
        expect(txData).toHaveLength(1);
        expect(txData![0].status).toBe('pending');
        expect(txData![0].amount).toBe(100);
        expect(txData![0].type).toBe('contribution');
      });

      // Reject API call to trigger rollback
      act(() => {
        rejectPromise(new Error('Network error'));
      });

      // Cache should be rolled back to empty array
      await waitFor(() => {
        const txData = queryClient.getQueryData<OptimisticTransaction[]>(['transactions', groupId]);
        expect(txData).toHaveLength(0);
      });
    });

    it('confirms the contribution entry when API succeeds', async () => {
      const txHash = 'tx_abc123';
      let resolvePromise: (value: unknown) => void;
      const apiPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (groupsApi.contribute as jest.Mock).mockReturnValueOnce(apiPromise);

      queryClient.setQueryData<OptimisticTransaction[]>(['transactions', groupId], []);

      const { result } = renderHook(
        () => useContributeMutation(groupId, userAddress),
        { wrapper },
      );

      act(() => {
        result.current.mutate(100);
      });

      await waitFor(() => {
        const txData = queryClient.getQueryData<OptimisticTransaction[]>(['transactions', groupId]);
        expect(txData).toHaveLength(1);
        expect(txData![0].status).toBe('pending');
      });

      act(() => {
        resolvePromise({ success: true, data: { txHash, groupId, amount: 100, timestamp: new Date().toISOString() } });
      });

      await waitFor(() => {
        const txData = queryClient.getQueryData<OptimisticTransaction[]>(['transactions', groupId]);
        expect(txData![0].status).toBe('confirmed');
        expect(txData![0].txHash).toBe(txHash);
      });
    });
  });

  describe('usePayoutMutation', () => {
    const groupId = 'group_1';

    it('optimistically adds a pending payout and rolls back on failure', async () => {
      let rejectPromise: (reason?: unknown) => void;
      const apiPromise = new Promise<never>((_, reject) => {
        rejectPromise = reject;
      });
      (groupsApi.requestPayout as jest.Mock).mockReturnValueOnce(apiPromise);

      queryClient.setQueryData<OptimisticTransaction[]>(['transactions', groupId], []);

      const { result } = renderHook(
        () => usePayoutMutation(groupId, userAddress),
        { wrapper },
      );

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        const txData = queryClient.getQueryData<OptimisticTransaction[]>(['transactions', groupId]);
        expect(txData).toHaveLength(1);
        expect(txData![0].status).toBe('pending');
        expect(txData![0].type).toBe('payout');
      });

      act(() => {
        rejectPromise(new Error('Payout error'));
      });

      await waitFor(() => {
        const txData = queryClient.getQueryData<OptimisticTransaction[]>(['transactions', groupId]);
        expect(txData).toHaveLength(0);
      });
    });

    it('confirms the payout entry when API succeeds', async () => {
      const txHash = 'payout_tx_xyz';
      let resolvePromise: (value: unknown) => void;
      const apiPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (groupsApi.requestPayout as jest.Mock).mockReturnValueOnce(apiPromise);

      queryClient.setQueryData<OptimisticTransaction[]>(['transactions', groupId], []);

      const { result } = renderHook(
        () => usePayoutMutation(groupId, userAddress),
        { wrapper },
      );

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        const txData = queryClient.getQueryData<OptimisticTransaction[]>(['transactions', groupId]);
        expect(txData).toHaveLength(1);
        expect(txData![0].status).toBe('pending');
      });

      act(() => {
        resolvePromise({ success: true, data: { txHash, groupId, amount: 600, timestamp: new Date().toISOString() } });
      });

      await waitFor(() => {
        const txData = queryClient.getQueryData<OptimisticTransaction[]>(['transactions', groupId]);
        expect(txData![0].status).toBe('confirmed');
        expect(txData![0].txHash).toBe(txHash);
      });
    });
  });
});
