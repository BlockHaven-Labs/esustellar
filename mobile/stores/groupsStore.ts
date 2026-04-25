import { create } from 'zustand';
import type { Group } from '../types/group';

interface GroupsState {
  groups: Group[];
  isLoading: boolean;
  lastFetched: number | null;
  setGroups: (groups: Group[]) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

export const useGroupsStore = create<GroupsState>((set) => ({
  groups: [],
  isLoading: false,
  lastFetched: null,
  setGroups: (groups) => set({ groups, lastFetched: Date.now() }),
  setLoading: (v) => set({ isLoading: v }),
  reset: () => set({ groups: [], isLoading: false, lastFetched: null }),
}));
