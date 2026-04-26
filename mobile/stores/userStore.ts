import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserState {
  displayName: string;
  theme: 'dark' | 'light' | 'system';
  setDisplayName: (name: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      displayName: '',
      theme: 'system',
      setDisplayName: (name) => set({ displayName: name }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'esustellar-user',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
