import { create } from "zustand";
import { persist } from "zustand/middleware";

type User = {
  id: string;
  email?: string;
  walletAddress?: string;
  name?: string;
};

type AuthStore = {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  connectWallet: (address: string) => void;
};

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (user) => set({ user, isAuthenticated: true }),

      logout: () => set({ user: null, isAuthenticated: false }),

      connectWallet: (address) =>
        set((state) => ({
          user: { ...state.user, id: address, walletAddress: address } as User,
          isAuthenticated: true,
        })),
    }),
    {
      name: "auth-storage",
    },
  ),
);
