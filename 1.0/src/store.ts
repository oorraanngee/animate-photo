import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AppState {
  user: User | null;
  isAdmin: boolean;
  isBanned: boolean;
  setUser: (user: User | null, isAdmin: boolean, isBanned: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAdmin: false,
  isBanned: false,
  setUser: (user, isAdmin, isBanned) => set({ user, isAdmin, isBanned }),
}));
