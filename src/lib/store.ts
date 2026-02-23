import { create } from "zustand";
import type { ConnectionStatus, ProjectWithTotals } from "@/types";

interface AppState {
  // Connection status
  connections: ConnectionStatus;
  setConnections: (connections: ConnectionStatus) => void;

  // Sync status
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncedAt: (date: Date | null) => void;

  // Projects cache
  projects: ProjectWithTotals[];
  setProjects: (projects: ProjectWithTotals[]) => void;

  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Mobile nav state
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Connection status
  connections: {
    quickbooks: {
      connected: false,
      companyName: undefined,
      lastSyncedAt: undefined,
    },
    googleDrive: {
      connected: false,
      email: undefined,
      lastSyncedAt: undefined,
    },
  },
  setConnections: (connections) => set({ connections }),

  // Sync status
  lastSyncedAt: null,
  isSyncing: false,
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

  // Projects cache
  projects: [],
  setProjects: (projects) => set({ projects }),

  // Sidebar state
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Mobile nav state
  mobileNavOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));
