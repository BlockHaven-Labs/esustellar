/**
 * Optimistic Update Hooks for Groups
 * Provides optimistic updates with rollback on failure
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { groupsApi, type Group } from './api/groupsApi';
import { useGroupsStore } from '../stores/groupsStore';

interface UseOptimisticGroupsOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for fetching groups with React Query
 */
export function useGroupsQuery(userAddress: string) {
  const { setGroups, setLoading } = useGroupsStore();

  return {
    queryKey: queryKeys.groups.user(userAddress),
    queryFn: async () => {
      setLoading(true);
      const result = await groupsApi.getUserGroups(userAddress);
      if (result.success && result.data) {
        setGroups(result.data);
      }
      setLoading(false);
      return result;
    },
    staleTime: 1000 * 60 * 5,
  };
}

/**
 * Hook for joining a group with optimistic update
 */
export function useJoinGroupMutation(userAddress: string, options?: UseOptimisticGroupsOptions) {
  const queryClient = useQueryClient();
  const { setGroups, groups } = useGroupsStore();

  return useMutation({
    mutationFn: ({ inviteCode }: { inviteCode: string }) =>
      groupsApi.joinGroupWithCode(inviteCode, userAddress),
    
    onMutate: async ({ inviteCode }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.groups.user(userAddress) });

      // Snapshot previous value for rollback
      const previousGroups = groups;

      // Optimistically add a pending group
      const optimisticGroup: Group = {
        id: `temp_${Date.now()}`,
        name: 'Joining group...',
        description: '',
        contractAddress: '',
        contributionAmount: 0,
        payoutFrequency: '',
        maxMembers: 0,
        currentMembers: 0,
        createdAt: new Date().toISOString(),
        creatorAddress: userAddress,
        isActive: false,
      };

      setGroups([...groups, optimisticGroup]);

      return { previousGroups };
    },

    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousGroups) {
        setGroups(context.previousGroups);
      }
      options?.onError?.(error);
    },

    onSuccess: (result, _variables, context) => {
      if (!result.success) {
        // Rollback if API returned error
        if (context?.previousGroups) {
          setGroups(context.previousGroups);
        }
        return;
      }
      // Invalidate to fetch real data
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.user(userAddress) });
      options?.onSuccess?.();
    },
  });
}

/**
 * Hook for leaving a group with optimistic update
 */
export function useLeaveGroupMutation(userAddress: string, options?: UseOptimisticGroupsOptions) {
  const queryClient = useQueryClient();
  const { setGroups, groups } = useGroupsStore();

  return useMutation({
    mutationFn: ({ groupId }: { groupId: string }) =>
      groupsApi.leaveGroup(groupId, userAddress),

    onMutate: async ({ groupId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.groups.user(userAddress) });

      const previousGroups = groups;

      // Optimistically remove the group
      setGroups(groups.filter(g => g.id !== groupId));

      return { previousGroups };
    },

    onError: (error, _variables, context) => {
      if (context?.previousGroups) {
        setGroups(context.previousGroups);
      }
      options?.onError?.(error);
    },

    onSuccess: (result) => {
      if (!result.success) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.user(userAddress) });
      options?.onSuccess?.();
    },
  });
}

/**
 * Hook for creating a group with optimistic update
 */
export function useCreateGroupMutation(userAddress: string, options?: UseOptimisticGroupsOptions) {
  const queryClient = useQueryClient();
  const { setGroups, groups } = useGroupsStore();

  return useMutation({
    mutationFn: (groupData: Partial<Group>) =>
      groupsApi.createGroup(groupData, userAddress),

    onMutate: async (groupData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.groups.user(userAddress) });

      const previousGroups = groups;

      // Optimistically add the new group
      const optimisticGroup: Group = {
        id: `temp_${Date.now()}`,
        name: groupData.name || 'Creating group...',
        description: groupData.description || '',
        contractAddress: '',
        contributionAmount: groupData.contributionAmount || 0,
        payoutFrequency: groupData.payoutFrequency || 'monthly',
        maxMembers: groupData.maxMembers || 10,
        currentMembers: 1,
        createdAt: new Date().toISOString(),
        creatorAddress: userAddress,
        isActive: true,
      };

      setGroups([...groups, optimisticGroup]);

      return { previousGroups };
    },

    onError: (error, _variables, context) => {
      if (context?.previousGroups) {
        setGroups(context.previousGroups);
      }
      options?.onError?.(error);
    },

    onSuccess: (result) => {
      if (!result.success) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.user(userAddress) });
      options?.onSuccess?.();
    },
  });
}