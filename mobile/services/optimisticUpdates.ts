/**
 * Optimistic Update Hooks for Groups
 * Provides optimistic updates with rollback on failure
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryClient';
import { groupsApi, type Group as ApiGroup, type ApiResponse } from './api/groupsApi';
import { useGroupsStore } from '../stores/groupsStore';
import type { Group as StoreGroup } from '../types/group';

interface UseOptimisticGroupsOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Maps an API group interface to the local store group interface
 */
export function mapApiGroupToStoreGroup(apiGroup: ApiGroup): StoreGroup {
  return {
    id: apiGroup.id,
    name: apiGroup.name,
    description: apiGroup.description,
    status: apiGroup.isActive ? 'active' : 'pending',
    contributionAmount: apiGroup.contributionAmount,
    memberCount: apiGroup.currentMembers ?? 0,
    maxMembers: apiGroup.maxMembers,
    payoutFrequency: apiGroup.payoutFrequency,
    creatorAddress: apiGroup.creatorAddress,
  };
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
        setGroups(result.data.map(mapApiGroupToStoreGroup));
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
    
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.groups.user(userAddress) });

      // Snapshot previous value for rollback
      const previousGroups = groups;
      const previousQueryData = queryClient.getQueryData<ApiResponse<ApiGroup[]>>(
        queryKeys.groups.user(userAddress)
      );

      // Optimistically add a pending group
      const optimisticGroup: ApiGroup = {
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

      // Update Zustand store
      setGroups([...groups, mapApiGroupToStoreGroup(optimisticGroup)]);

      // Update React Query cache
      if (previousQueryData && previousQueryData.success && previousQueryData.data) {
        queryClient.setQueryData<ApiResponse<ApiGroup[]>>(
          queryKeys.groups.user(userAddress),
          {
            ...previousQueryData,
            data: [...previousQueryData.data, optimisticGroup],
          }
        );
      } else {
        queryClient.setQueryData<ApiResponse<ApiGroup[]>>(
          queryKeys.groups.user(userAddress),
          {
            success: true,
            data: [optimisticGroup],
          }
        );
      }

      return { previousGroups, previousQueryData };
    },

    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousGroups) {
        setGroups(context.previousGroups);
      }
      if (context?.previousQueryData) {
        queryClient.setQueryData(queryKeys.groups.user(userAddress), context.previousQueryData);
      }
      options?.onError?.(error);
    },

    onSuccess: (result, _variables, context) => {
      if (!result.success) {
        // Rollback if API returned error
        if (context?.previousGroups) {
          setGroups(context.previousGroups);
        }
        if (context?.previousQueryData) {
          queryClient.setQueryData(queryKeys.groups.user(userAddress), context.previousQueryData);
        }
        options?.onError?.(new Error(result.error || 'Failed to join group'));
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
      const previousQueryData = queryClient.getQueryData<ApiResponse<ApiGroup[]>>(
        queryKeys.groups.user(userAddress)
      );

      // Optimistically remove the group from Zustand store
      setGroups(groups.filter(g => g.id !== groupId));

      // Optimistically remove from React Query cache
      if (previousQueryData && previousQueryData.success && previousQueryData.data) {
        queryClient.setQueryData<ApiResponse<ApiGroup[]>>(
          queryKeys.groups.user(userAddress),
          {
            ...previousQueryData,
            data: previousQueryData.data.filter(g => g.id !== groupId),
          }
        );
      }

      return { previousGroups, previousQueryData };
    },

    onError: (error, _variables, context) => {
      if (context?.previousGroups) {
        setGroups(context.previousGroups);
      }
      if (context?.previousQueryData) {
        queryClient.setQueryData(queryKeys.groups.user(userAddress), context.previousQueryData);
      }
      options?.onError?.(error);
    },

    onSuccess: (result, _variables, context) => {
      if (!result.success) {
        // Rollback if API returned error
        if (context?.previousGroups) {
          setGroups(context.previousGroups);
        }
        if (context?.previousQueryData) {
          queryClient.setQueryData(queryKeys.groups.user(userAddress), context.previousQueryData);
        }
        options?.onError?.(new Error(result.error || 'Failed to leave group'));
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
    mutationFn: (groupData: Partial<ApiGroup>) =>
      groupsApi.createGroup(groupData, userAddress),

    onMutate: async (groupData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.groups.user(userAddress) });

      const previousGroups = groups;
      const previousQueryData = queryClient.getQueryData<ApiResponse<ApiGroup[]>>(
        queryKeys.groups.user(userAddress)
      );

      // Optimistically add the new group
      const optimisticGroup: ApiGroup = {
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

      // Update Zustand store
      setGroups([...groups, mapApiGroupToStoreGroup(optimisticGroup)]);

      // Update React Query cache
      if (previousQueryData && previousQueryData.success && previousQueryData.data) {
        queryClient.setQueryData<ApiResponse<ApiGroup[]>>(
          queryKeys.groups.user(userAddress),
          {
            ...previousQueryData,
            data: [...previousQueryData.data, optimisticGroup],
          }
        );
      } else {
        queryClient.setQueryData<ApiResponse<ApiGroup[]>>(
          queryKeys.groups.user(userAddress),
          {
            success: true,
            data: [optimisticGroup],
          }
        );
      }

      return { previousGroups, previousQueryData };
    },

    onError: (error, _variables, context) => {
      if (context?.previousGroups) {
        setGroups(context.previousGroups);
      }
      if (context?.previousQueryData) {
        queryClient.setQueryData(queryKeys.groups.user(userAddress), context.previousQueryData);
      }
      options?.onError?.(error);
    },

    onSuccess: (result, _variables, context) => {
      if (!result.success) {
        // Rollback if API returned error
        if (context?.previousGroups) {
          setGroups(context.previousGroups);
        }
        if (context?.previousQueryData) {
          queryClient.setQueryData(queryKeys.groups.user(userAddress), context.previousQueryData);
        }
        options?.onError?.(new Error(result.error || 'Failed to create group'));
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.user(userAddress) });
      options?.onSuccess?.();
    },
  });
}

/**
 * Hook for updating group settings with optimistic update
 */
export function useUpdateGroupSettingsMutation(userAddress: string, options?: UseOptimisticGroupsOptions) {
  const queryClient = useQueryClient();
  const { setGroups, groups } = useGroupsStore();

  return useMutation({
    mutationFn: ({ groupId, settings }: { groupId: string; settings: Partial<ApiGroup> }) =>
      groupsApi.updateGroupSettings(groupId, userAddress, settings),

    onMutate: async ({ groupId, settings }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.groups.user(userAddress) });

      const previousGroups = groups;
      const previousQueryData = queryClient.getQueryData<ApiResponse<ApiGroup[]>>(
        queryKeys.groups.user(userAddress)
      );

      // Optimistically update Zustand store
      const updatedGroups = groups.map(g => 
        g.id === groupId ? { ...g, ...settings } : g
      );
      setGroups(updatedGroups);

      // Optimistically update React Query cache
      if (previousQueryData && previousQueryData.success && previousQueryData.data) {
        queryClient.setQueryData<ApiResponse<ApiGroup[]>>(
          queryKeys.groups.user(userAddress),
          {
            ...previousQueryData,
            data: previousQueryData.data.map(g => 
              g.id === groupId ? { ...g, ...settings } : g
            ),
          }
        );
      }

      return { previousGroups, previousQueryData };
    },

    onError: (error, _variables, context) => {
      if (context?.previousGroups) {
        setGroups(context.previousGroups);
      }
      if (context?.previousQueryData) {
        queryClient.setQueryData(queryKeys.groups.user(userAddress), context.previousQueryData);
      }
      options?.onError?.(error);
    },

    onSuccess: (result, _variables, context) => {
      if (!result.success) {
        // Rollback if API returned error
        if (context?.previousGroups) {
          setGroups(context.previousGroups);
        }
        if (context?.previousQueryData) {
          queryClient.setQueryData(queryKeys.groups.user(userAddress), context.previousQueryData);
        }
        options?.onError?.(new Error(result.error || 'Failed to update group settings'));
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.user(userAddress) });
      options?.onSuccess?.();
    },
  });
}