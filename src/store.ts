import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { cloneDefaultPlatforms, mergePlatformsWithDefaults } from './default-platforms';
import type { PlatformConfig } from './platform-types';

export interface Skill {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  dirPath: string;
}

interface AppState {
  skillDirs: string[];
  platforms: PlatformConfig[];
  defaultPlatforms: string[];
  skillsCount: number;
  setSkillDirs: (dirs: string[]) => void;
  setPlatforms: (configs: PlatformConfig[]) => void;
  setDefaultPlatforms: (platformIds: string[]) => void;
  addPlatform: (config: PlatformConfig) => void;
  updatePlatform: (id: string, config: Partial<PlatformConfig>) => void;
  removePlatform: (id: string) => void;
  resetPlatformsToDefaults: () => void;
  restoreMissingDefaultPlatforms: () => void;
  checkAndAddDefaultDir: () => Promise<void>;
}

const tauriStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await invoke<string>('fs_read_text_file', { path: `~/.skills-manager/${name}.json` });
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await invoke('fs_write_text_file', { path: `~/.skills-manager/${name}.json`, contents: value });
    } catch (e) {
      console.error('Failed to save state to FS:', e);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await invoke('fs_remove', { path: `~/.skills-manager/${name}.json` });
    } catch (e) {
      console.error('Failed to remove state from FS:', e);
    }
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      skillDirs: [],
      platforms: cloneDefaultPlatforms(),
      defaultPlatforms: [],
      skillsCount: 0,
      setSkillDirs: (dirs) => set({ skillDirs: dirs }),
      setPlatforms: (configs) => set({ platforms: configs }),
      setDefaultPlatforms: (platformIds) =>
        set((state) => ({
          defaultPlatforms: platformIds.filter((id) => state.platforms.some((platform) => platform.id === id)),
        })),
      addPlatform: (config) => set((state) => ({ platforms: [...state.platforms, config] })),
      updatePlatform: (id, config) =>
        set((state) => ({
          platforms: state.platforms.map((platform) =>
            platform.id === id ? { ...platform, ...config } : platform
          ),
        })),
      removePlatform: (id) =>
        set((state) => ({
          platforms: state.platforms.filter((platform) => platform.id !== id),
          defaultPlatforms: state.defaultPlatforms.filter((platformId) => platformId !== id),
        })),
      resetPlatformsToDefaults: () =>
        set({
          platforms: cloneDefaultPlatforms(),
          defaultPlatforms: [],
        }),
      restoreMissingDefaultPlatforms: () =>
        set((state) => {
          const mergedPlatforms = mergePlatformsWithDefaults(state.platforms);
          const normalizedDefaults = state.defaultPlatforms.filter((id) =>
            mergedPlatforms.some((platform) => platform.id === id)
          );

          if (
            mergedPlatforms.length === state.platforms.length &&
            normalizedDefaults.length === state.defaultPlatforms.length
          ) {
            return state;
          }

          return {
            platforms: mergedPlatforms,
            defaultPlatforms: normalizedDefaults,
          };
        }),
      checkAndAddDefaultDir: async () => {
        const currentDirs = useAppStore.getState().skillDirs;
        if (currentDirs.length > 0) return;

        const defaultPath = '~/.agents/skills';
        try {
          const exists = await invoke<boolean>('fs_exists', { path: defaultPath });
          if (exists) {
            set({ skillDirs: [defaultPath] });
          }
        } catch (e) {
          console.error('Failed to check default dir:', e);
        }
      },
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => tauriStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.restoreMissingDefaultPlatforms();
          state.checkAndAddDefaultDir();
        }
      },
    }
  )
);

export type { PlatformConfig };
