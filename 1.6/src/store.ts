import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AppState {
  user: User | null;
  isAdmin: boolean;
  isBanned: boolean;
  isRegistered: boolean;
  setUser: (user: User | null, isAdmin: boolean, isBanned: boolean, isRegistered: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAdmin: false,
  isBanned: false,
  isRegistered: false,
  setUser: (user, isAdmin, isBanned, isRegistered) => set({ user, isAdmin, isBanned, isRegistered }),
}));
