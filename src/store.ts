import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { cloneDefaultPlatforms, mergePlatformsWithDefaults } from './default-platforms';
import type { PlatformConfig } from './platform-types';
import { pathExists, readTextFile, removePath, writeTextFile } from './services/fs-service';
import { checkForSkillUpdates, searchCommunitySkills } from './services/skills-cli-service';
import {
  disableSkillForPlatform,
  enableSkillForPlatform,
  installSkillWithDistribution,
  loadInstalledSkillEntries,
  loadManagedSkills,
  loadPlatformSkillStatuses,
  removeSkillEverywhere,
  updateAllSkills,
} from './services/skills-service';
import type {
  InstallSkillResult,
  InstalledSkillEntry,
  SearchResult,
  Skill,
  SkillStatus,
} from './types/skill-types';

type AppTab = 'skills' | 'distribution' | 'install' | 'settings';

type LoadOptions = {
  force?: boolean;
};

interface AppState {
  envPassed: boolean;
  activeTab: AppTab;
  skillDirs: string[];
  platforms: PlatformConfig[];
  defaultPlatforms: string[];
  managedSkills: Skill[];
  managedSkillsLoading: boolean;
  managedSkillsLoadedKey: string | null;
  managementSearchQuery: string;
  checkingUpdates: boolean;
  updatingAllSkills: boolean;
  updatableSkills: string[];
  installationQuery: string;
  installationResults: SearchResult[];
  installationLoading: boolean;
  installedCount: number;
  installingSkill: string | null;
  installedEntries: InstalledSkillEntry[];
  installedEntriesLoadedKey: string | null;
  distributionSearchQuery: string;
  selectedPlatformId: string | null;
  distributionSkills: SkillStatus[];
  distributionLoading: boolean;
  distributionLoadedKey: string | null;
  setActiveTab: (tab: AppTab) => void;
  markEnvironmentPassed: () => void;
  resetEnvironmentCheck: () => void;
  setSkillDirs: (dirs: string[]) => void;
  setPlatforms: (configs: PlatformConfig[]) => void;
  setDefaultPlatforms: (platformIds: string[]) => void;
  addPlatform: (config: PlatformConfig) => void;
  updatePlatform: (id: string, config: Partial<PlatformConfig>) => void;
  removePlatform: (id: string) => void;
  resetPlatformsToDefaults: () => void;
  restoreMissingDefaultPlatforms: () => void;
  checkAndAddDefaultDir: () => Promise<void>;
  setManagementSearchQuery: (query: string) => void;
  refreshManagedSkills: (options?: LoadOptions) => Promise<void>;
  checkUpdates: () => Promise<void>;
  updateAllManagedSkills: () => Promise<void>;
  deleteManagedSkill: (skillName: string) => Promise<void>;
  setInstallationQuery: (query: string) => void;
  refreshInstalledEntries: (options?: LoadOptions) => Promise<void>;
  searchInstallationSkills: () => Promise<void>;
  installSkill: (skill: SearchResult) => Promise<InstallSkillResult>;
  resetInstalledCount: () => void;
  setDistributionSearchQuery: (query: string) => void;
  setSelectedPlatformId: (platformId: string | null) => void;
  ensureSelectedPlatform: () => void;
  refreshDistributionSkills: (options?: LoadOptions) => Promise<void>;
  changePlatformSkillState: (
    skill: Pick<SkillStatus, 'name' | 'sourcePath' | 'targetPath'>,
    method: 'copy' | 'symlink',
    isEnabling: boolean
  ) => Promise<void>;
  cleanPlatformSkill: (skill: Pick<SkillStatus, 'targetPath'>) => Promise<void>;
}

const DEFAULT_SKILL_DIR = '~/.agents/skills';

const buildKey = (values: Array<string | null | undefined>) => values.filter(Boolean).join('||');

const tauriStorage: StateStorage = {
  getItem: async (name: string) => {
    try {
      return await readTextFile(`~/.skills-manager/${name}.json`);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      await writeTextFile(`~/.skills-manager/${name}.json`, value);
    } catch (error) {
      console.error('Failed to save state to FS:', error);
    }
  },
  removeItem: async (name: string) => {
    try {
      await removePath(`~/.skills-manager/${name}.json`);
    } catch (error) {
      console.error('Failed to remove state from FS:', error);
    }
  },
};

const invalidateDerivedState = () => ({
  managedSkills: [],
  managedSkillsLoadedKey: null,
  installedEntries: [],
  installedEntriesLoadedKey: null,
  distributionSkills: [],
  distributionLoadedKey: null,
  updatableSkills: [],
});

const normalizeDefaultPlatforms = (platforms: PlatformConfig[], defaultPlatforms: string[]) =>
  defaultPlatforms.filter((id) => platforms.some((platform) => platform.id === id));

const normalizeSelectedPlatformId = (
  platforms: PlatformConfig[],
  selectedPlatformId: string | null
) => {
  if (selectedPlatformId && platforms.some((platform) => platform.id === selectedPlatformId)) {
    return selectedPlatformId;
  }

  return platforms[0]?.id ?? null;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      envPassed: false,
      activeTab: 'skills',
      skillDirs: [],
      platforms: cloneDefaultPlatforms(),
      defaultPlatforms: [],
      managedSkills: [],
      managedSkillsLoading: false,
      managedSkillsLoadedKey: null,
      managementSearchQuery: '',
      checkingUpdates: false,
      updatingAllSkills: false,
      updatableSkills: [],
      installationQuery: '',
      installationResults: [],
      installationLoading: false,
      installedCount: 0,
      installingSkill: null,
      installedEntries: [],
      installedEntriesLoadedKey: null,
      distributionSearchQuery: '',
      selectedPlatformId: null,
      distributionSkills: [],
      distributionLoading: false,
      distributionLoadedKey: null,
      setActiveTab: (tab) => set({ activeTab: tab }),
      markEnvironmentPassed: () => set({ envPassed: true }),
      resetEnvironmentCheck: () => set({ envPassed: false }),
      setSkillDirs: (dirs) =>
        set((state) => ({
          skillDirs: dirs,
          ...invalidateDerivedState(),
          selectedPlatformId: normalizeSelectedPlatformId(state.platforms, state.selectedPlatformId),
        })),
      setPlatforms: (configs) =>
        set((state) => {
          const mergedPlatforms = mergePlatformsWithDefaults(configs);
          return {
            platforms: mergedPlatforms,
            defaultPlatforms: normalizeDefaultPlatforms(mergedPlatforms, state.defaultPlatforms),
            selectedPlatformId: normalizeSelectedPlatformId(mergedPlatforms, state.selectedPlatformId),
            distributionSkills: [],
            distributionLoadedKey: null,
          };
        }),
      setDefaultPlatforms: (platformIds) =>
        set((state) => ({
          defaultPlatforms: normalizeDefaultPlatforms(state.platforms, platformIds),
        })),
      addPlatform: (config) =>
        set((state) => {
          const platforms = [...state.platforms, config];
          return {
            platforms,
            selectedPlatformId: normalizeSelectedPlatformId(platforms, state.selectedPlatformId),
            distributionLoadedKey: null,
            distributionSkills: [],
          };
        }),
      updatePlatform: (id, config) =>
        set((state) => {
          const platforms = state.platforms.map((platform) =>
            platform.id === id ? { ...platform, ...config } : platform
          );
          return {
            platforms,
            defaultPlatforms: normalizeDefaultPlatforms(platforms, state.defaultPlatforms),
            selectedPlatformId: normalizeSelectedPlatformId(platforms, state.selectedPlatformId),
            distributionLoadedKey: null,
            distributionSkills: [],
          };
        }),
      removePlatform: (id) =>
        set((state) => {
          const platforms = state.platforms.filter((platform) => platform.id !== id);
          return {
            platforms,
            defaultPlatforms: state.defaultPlatforms.filter((platformId) => platformId !== id),
            selectedPlatformId: normalizeSelectedPlatformId(
              platforms,
              state.selectedPlatformId === id ? null : state.selectedPlatformId
            ),
            distributionLoadedKey: null,
            distributionSkills: [],
          };
        }),
      resetPlatformsToDefaults: () =>
        set((state) => {
          const platforms = cloneDefaultPlatforms();
          return {
            platforms,
            defaultPlatforms: normalizeDefaultPlatforms(platforms, state.defaultPlatforms),
            selectedPlatformId: normalizeSelectedPlatformId(platforms, state.selectedPlatformId),
            distributionLoadedKey: null,
            distributionSkills: [],
          };
        }),
      restoreMissingDefaultPlatforms: () =>
        set((state) => {
          const platforms = mergePlatformsWithDefaults(state.platforms);
          const defaultPlatforms = normalizeDefaultPlatforms(platforms, state.defaultPlatforms);
          const selectedPlatformId = normalizeSelectedPlatformId(platforms, state.selectedPlatformId);

          if (
            platforms.length === state.platforms.length &&
            defaultPlatforms.length === state.defaultPlatforms.length &&
            selectedPlatformId === state.selectedPlatformId
          ) {
            return state;
          }

          return {
            platforms,
            defaultPlatforms,
            selectedPlatformId,
          };
        }),
      checkAndAddDefaultDir: async () => {
        if (get().skillDirs.length > 0) {
          return;
        }

        try {
          const exists = await pathExists(DEFAULT_SKILL_DIR);
          if (exists) {
            get().setSkillDirs([DEFAULT_SKILL_DIR]);
          }
        } catch (error) {
          console.error('Failed to check default dir:', error);
        }
      },
      setManagementSearchQuery: (query) => set({ managementSearchQuery: query }),
      refreshManagedSkills: async ({ force = false } = {}) => {
        const { skillDirs, managedSkillsLoadedKey } = get();
        const nextKey = buildKey(skillDirs);

        if (!force && nextKey === managedSkillsLoadedKey && get().managedSkills.length > 0) {
          return;
        }

        set({ managedSkillsLoading: true });
        try {
          const managedSkills = await loadManagedSkills(skillDirs);
          set({
            managedSkills,
            managedSkillsLoadedKey: nextKey,
          });
        } finally {
          set({ managedSkillsLoading: false });
        }
      },
      checkUpdates: async () => {
        set({ checkingUpdates: true });
        try {
          const updatableSkills = await checkForSkillUpdates();
          set({ updatableSkills });
        } finally {
          set({ checkingUpdates: false });
        }
      },
      updateAllManagedSkills: async () => {
        set({ updatingAllSkills: true });
        try {
          await updateAllSkills();
          set({ updatableSkills: [] });
          await Promise.all([
            get().refreshManagedSkills({ force: true }),
            get().refreshInstalledEntries({ force: true }),
            get().refreshDistributionSkills({ force: true }),
          ]);
        } finally {
          set({ updatingAllSkills: false });
        }
      },
      deleteManagedSkill: async (skillName) => {
        await removeSkillEverywhere(skillName, get().platforms);
        await Promise.all([
          get().refreshManagedSkills({ force: true }),
          get().refreshInstalledEntries({ force: true }),
          get().refreshDistributionSkills({ force: true }),
        ]);
        set((state) => ({
          updatableSkills: state.updatableSkills.filter((name) => name !== skillName),
        }));
      },
      setInstallationQuery: (query) => set({ installationQuery: query }),
      refreshInstalledEntries: async ({ force = false } = {}) => {
        const { skillDirs, installedEntriesLoadedKey } = get();
        const nextKey = buildKey(skillDirs);

        if (!force && nextKey === installedEntriesLoadedKey && get().installedEntries.length > 0) {
          return;
        }

        const installedEntries = await loadInstalledSkillEntries(skillDirs);
        set({
          installedEntries,
          installedEntriesLoadedKey: nextKey,
        });
      },
      searchInstallationSkills: async () => {
        const query = get().installationQuery.trim();
        if (!query) {
          set({ installationResults: [] });
          return;
        }

        set({ installationLoading: true, installationResults: [] });
        try {
          const installationResults = await searchCommunitySkills(query);
          set({ installationResults });
        } finally {
          set({ installationLoading: false });
        }
      },
      installSkill: async (skill) => {
        set({ installingSkill: skill.name });
        try {
          const result = await installSkillWithDistribution(
            skill,
            get().skillDirs,
            get().platforms,
            get().defaultPlatforms
          );

          await Promise.all([
            get().refreshInstalledEntries({ force: true }),
            get().refreshManagedSkills({ force: true }),
            get().refreshDistributionSkills({ force: true }),
          ]);

          set((state) => ({
            installedCount: state.installedCount + 1,
          }));

          return result;
        } finally {
          set({ installingSkill: null });
        }
      },
      resetInstalledCount: () => set({ installedCount: 0 }),
      setDistributionSearchQuery: (query) => set({ distributionSearchQuery: query }),
      setSelectedPlatformId: (platformId) =>
        set({ selectedPlatformId: platformId, distributionLoadedKey: null }),
      ensureSelectedPlatform: () =>
        set((state) => ({
          selectedPlatformId: normalizeSelectedPlatformId(
            state.platforms,
            state.selectedPlatformId
          ),
        })),
      refreshDistributionSkills: async ({ force = false } = {}) => {
        const { platforms, selectedPlatformId, skillDirs, distributionLoadedKey } = get();
        const selectedPlatform = platforms.find((platform) => platform.id === selectedPlatformId);

        if (!selectedPlatform) {
          set({
            distributionSkills: [],
            distributionLoadedKey: null,
            distributionLoading: false,
          });
          return;
        }

        const nextKey = buildKey([
          ...skillDirs,
          selectedPlatform.id,
          selectedPlatform.unixPath,
          selectedPlatform.windowsPath,
        ]);

        if (!force && nextKey === distributionLoadedKey && get().distributionSkills.length > 0) {
          return;
        }

        set({ distributionLoading: true });
        try {
          const distributionSkills = await loadPlatformSkillStatuses(selectedPlatform, skillDirs);
          set({
            distributionSkills,
            distributionLoadedKey: nextKey,
          });
        } finally {
          set({ distributionLoading: false });
        }
      },
      changePlatformSkillState: async (skill, method, isEnabling) => {
        const { platforms, selectedPlatformId } = get();
        const selectedPlatform = platforms.find((platform) => platform.id === selectedPlatformId);
        if (!selectedPlatform) {
          throw new Error('未选择平台。');
        }

        if (isEnabling) {
          await enableSkillForPlatform(skill, method);
        } else {
          await disableSkillForPlatform(skill);
        }

        await get().refreshDistributionSkills({ force: true });
      },
      cleanPlatformSkill: async (skill) => {
        await disableSkillForPlatform(skill);
        await get().refreshDistributionSkills({ force: true });
      },
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => tauriStorage),
      partialize: (state) => ({
        envPassed: state.envPassed,
        activeTab: state.activeTab,
        skillDirs: state.skillDirs,
        platforms: state.platforms,
        defaultPlatforms: state.defaultPlatforms,
        managementSearchQuery: state.managementSearchQuery,
        installationQuery: state.installationQuery,
        distributionSearchQuery: state.distributionSearchQuery,
        selectedPlatformId: state.selectedPlatformId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }

        state.restoreMissingDefaultPlatforms();
        state.ensureSelectedPlatform();
        void state.checkAndAddDefaultDir();
      },
    }
  )
);

export type { InstallSkillResult, PlatformConfig, SearchResult, Skill, SkillStatus };
