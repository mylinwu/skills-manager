import type { PlatformConfig } from '../platform-types';
import { getPlatformSkillsPath, joinPath } from '../lib/path';
import { copyDirectory, createSymlink, readSkillDirEntries, removePath } from './fs-service';
import {
  installSkillFromRegistry,
  removeSkillFromRepository,
  updateAllSkillsInRepository,
} from './skills-cli-service';
import type {
  InstallSkillResult,
  InstalledSkillEntry,
  SearchResult,
  Skill,
  SkillDirEntry,
  SkillStatus,
} from '../types/skill-types';

const INSTALL_RETRY_DELAYS = [0, 300, 800, 1500];

export const matchesInstalledSkill = (installedName: string, skillName: string) =>
  installedName === skillName || installedName.startsWith(`${skillName}-`);

const sortByName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((left, right) => left.name.localeCompare(right.name));

const buildRootSkillMap = async (skillDirs: string[]) => {
  const entriesByName = new Map<string, SkillDirEntry>();

  for (const dir of skillDirs) {
    try {
      const entries = await readSkillDirEntries(dir);
      for (const entry of entries) {
        if (entry.exists && entry.hasSkillManifest) {
          entriesByName.set(entry.name, entry);
        }
      }
    } catch (error) {
      console.warn(`Failed to read dir ${dir}:`, error);
    }
  }

  return entriesByName;
};

export const loadInstalledSkillEntries = async (
  skillDirs: string[]
): Promise<InstalledSkillEntry[]> => {
  const rootSkills = await buildRootSkillMap(skillDirs);
  return sortByName(
    Array.from(rootSkills.values()).map((entry) => ({
      name: entry.name,
      path: entry.path,
    }))
  );
};

export const loadManagedSkills = async (skillDirs: string[]): Promise<Skill[]> => {
  const rootSkills = await buildRootSkillMap(skillDirs);

  return sortByName(
    Array.from(rootSkills.values()).map((entry) => ({
      name: entry.name,
      author: 'local',
      version: 'unknown',
      dirPath: entry.path,
      description: entry.isSymlink ? '符号链接技能' : '本地技能目录',
    }))
  );
};

const toPlatformTargetPath = (platform: PlatformConfig, skillName: string) =>
  joinPath(getPlatformSkillsPath(platform), skillName);

export const loadPlatformSkillStatuses = async (
  platform: PlatformConfig,
  skillDirs: string[]
): Promise<SkillStatus[]> => {
  const rootSkills = await buildRootSkillMap(skillDirs);
  const platformEntries = (await readSkillDirEntries(getPlatformSkillsPath(platform))).filter(
    (entry) => entry.hasSkillManifest || (entry.isSymlink && !entry.exists)
  );
  const platformEntriesByName = new Map(platformEntries.map((entry) => [entry.name, entry]));
  const allNames = new Set([...rootSkills.keys(), ...platformEntriesByName.keys()]);

  const loadedSkills: SkillStatus[] = [];
  for (const name of allNames) {
    const rootEntry = rootSkills.get(name);
    const platformEntry = platformEntriesByName.get(name);
    const targetPath = toPlatformTargetPath(platform, name);

    if (platformEntry?.isSymlink && !platformEntry.exists) {
      loadedSkills.push({
        name,
        isEnabled: false,
        type: 'invalid-link',
        path: platformEntry.path,
        sourcePath: rootEntry?.path ?? null,
        targetPath,
        isSymlink: true,
      });
      continue;
    }

    if (rootEntry && platformEntry?.exists) {
      loadedSkills.push({
        name,
        isEnabled: true,
        type: 'enabled',
        path: platformEntry.path,
        sourcePath: rootEntry.path,
        targetPath,
        isSymlink: platformEntry.isSymlink,
      });
      continue;
    }

    if (rootEntry) {
      loadedSkills.push({
        name,
        isEnabled: false,
        type: 'disabled',
        path: rootEntry.path,
        sourcePath: rootEntry.path,
        targetPath,
        isSymlink: false,
      });
      continue;
    }

    if (platformEntry) {
      loadedSkills.push({
        name,
        isEnabled: true,
        type: 'platform-only',
        path: platformEntry.path,
        sourcePath: null,
        targetPath,
        isSymlink: platformEntry.isSymlink,
      });
    }
  }

  return sortByName(loadedSkills);
};

export const enableSkillForPlatform = async (
  skill: Pick<SkillStatus, 'name' | 'sourcePath' | 'targetPath'>,
  method: 'copy' | 'symlink'
) => {
  if (!skill.sourcePath) {
    throw new Error('Root skill path is missing');
  }

  await removePath(skill.targetPath);
  if (method === 'copy') {
    await copyDirectory(skill.sourcePath, skill.targetPath);
    return;
  }

  await createSymlink(skill.sourcePath, skill.targetPath);
};

export const disableSkillForPlatform = async (skill: Pick<SkillStatus, 'targetPath'>) => {
  await removePath(skill.targetPath);
};

const waitForInstalledSkill = async (skillName: string, skillDirs: string[]) => {
  for (const delay of INSTALL_RETRY_DELAYS) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const installedEntries = await loadInstalledSkillEntries(skillDirs);
    if (installedEntries.some((entry) => matchesInstalledSkill(entry.name, skillName))) {
      return installedEntries;
    }
  }

  throw new Error(`安装命令已执行，但未在技能目录中检测到技能 "${skillName}"。`);
};

export const installSkillWithDistribution = async (
  skill: SearchResult,
  skillDirs: string[],
  platforms: PlatformConfig[],
  defaultPlatformIds: string[]
): Promise<InstallSkillResult> => {
  await installSkillFromRegistry(skill.source, skill.name);
  const installedEntries = await waitForInstalledSkill(skill.name, skillDirs);
  const installedSkill = installedEntries.find((entry) => matchesInstalledSkill(entry.name, skill.name));

  if (!installedSkill) {
    throw new Error(`安装完成后未找到技能 "${skill.name}"。`);
  }

  const skippedPlatforms: PlatformConfig[] = [];
  const targetPlatforms = platforms.filter((platform) => defaultPlatformIds.includes(platform.id));

  for (const platform of targetPlatforms) {
    if (platform.distributionType === 'ask') {
      skippedPlatforms.push(platform);
      continue;
    }

    await enableSkillForPlatform(
      {
        name: installedSkill.name,
        sourcePath: installedSkill.path,
        targetPath: toPlatformTargetPath(platform, installedSkill.name),
      },
      platform.distributionType
    );
  }

  return { skippedPlatforms };
};

export const removeSkillEverywhere = async (skillName: string, platforms: PlatformConfig[]) => {
  await removeSkillFromRepository(skillName);

  for (const platform of platforms) {
    await removePath(toPlatformTargetPath(platform, skillName));
  }
};

export const updateAllSkills = async () => {
  await updateAllSkillsInRepository();
};
