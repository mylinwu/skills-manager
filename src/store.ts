import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface Skill {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  dirPath: string;
}

export interface PlatformConfig {
  id: string;
  name: string;
  unixPath: string; // Used for macOS and Linux
  windowsPath: string;
  distributionType: 'ask' | 'copy' | 'symlink';
}

interface AppState {
  skillDirs: string[];
  platforms: PlatformConfig[];
  defaultPlatforms: string[]; // List of platform IDs to distribute automatically
  skillsCount: number;

  setSkillDirs: (dirs: string[]) => void;
  setPlatforms: (configs: PlatformConfig[]) => void;
  setDefaultPlatforms: (platformIds: string[]) => void;
  addPlatform: (config: PlatformConfig) => void;
  updatePlatform: (id: string, config: Partial<PlatformConfig>) => void;
  removePlatform: (id: string) => void;
  checkAndAddDefaultDir: () => Promise<void>;
}

const DEFAULT_PLATFORMS: PlatformConfig[] = [
  { id: 'claude-code', name: 'Claude Code', unixPath: '~/.claude', windowsPath: '%USERPROFILE%\\.claude', distributionType: 'ask' },
  { id: 'cursor', name: 'Cursor', unixPath: '~/.cursor', windowsPath: '%USERPROFILE%\\.cursor', distributionType: 'ask' },
  { id: 'codex', name: 'Codex', unixPath: '~/.codex', windowsPath: '%USERPROFILE%\\.codex', distributionType: 'ask' },
  { id: 'opencode', name: 'OpenCode', unixPath: '~/.config/opencode', windowsPath: '%USERPROFILE%\\.config\\opencode', distributionType: 'ask' },
  { id: 'amp', name: 'AMP', unixPath: '~/.config/amp', windowsPath: '%USERPROFILE%\\.config\\amp', distributionType: 'ask' },
  { id: 'kilocode', name: 'Kilocode', unixPath: '~/.kilocode', windowsPath: '%USERPROFILE%\\.kilocode', distributionType: 'ask' },
  { id: 'roo', name: 'Roo Code', unixPath: '~/.roo', windowsPath: '%USERPROFILE%\\.roo', distributionType: 'ask' },
  { id: 'goose', name: 'Goose', unixPath: '~/.config/goose', windowsPath: '%USERPROFILE%\\.config\\goose', distributionType: 'ask' },
  { id: 'gemini', name: 'Gemini (Antigravity)', unixPath: '~/.gemini/antigravity', windowsPath: '%USERPROFILE%\\.gemini\\antigravity', distributionType: 'ask' }
];

const tauriStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await invoke<string>('fs_read_text_file', { path: `~/.skills-manager/${name}.json` });
    } catch {
      return null; // Return null if file not found to use default state
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
      platforms: DEFAULT_PLATFORMS,
      defaultPlatforms: [],
      skillsCount: 0,
      setSkillDirs: (dirs) => set({ skillDirs: dirs }),
      setPlatforms: (configs) => set({ platforms: configs }),
      setDefaultPlatforms: (platformIds) => set({ defaultPlatforms: platformIds }),
      addPlatform: (config) => set((state) => ({ platforms: [...state.platforms, config] })),
      updatePlatform: (id, config) => set((state) => ({
        platforms: state.platforms.map(p => p.id === id ? { ...p, ...config } : p)
      })),
      removePlatform: (id) => set((state) => ({
        platforms: state.platforms.filter(p => p.id !== id),
        defaultPlatforms: state.defaultPlatforms.filter(pid => pid !== id)
      })),
      checkAndAddDefaultDir: async () => {
        const currentDirs = useAppStore.getState().skillDirs;
        if (currentDirs.length > 0) return; // 只有在没有配置任何技能目录时才进行初始化

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
          state.checkAndAddDefaultDir();
        }
      },
    }
  )
);
