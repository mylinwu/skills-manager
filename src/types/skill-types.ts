import type { PlatformConfig } from '../platform-types';

export interface Skill {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  dirPath: string;
}

export interface SkillDirEntry {
  name: string;
  path: string;
  isSymlink: boolean;
  exists: boolean;
  hasSkillManifest: boolean;
}

export interface RawSkillDirEntry {
  name: string;
  path: string;
  is_symlink: boolean;
  exists: boolean;
  has_skill_manifest: boolean;
}

export interface SearchResult {
  name: string;
  description: string;
  version: string;
  author: string;
  source: string;
}

export interface InstalledSkillEntry {
  name: string;
  path: string;
}

export type SkillStatusType = 'enabled' | 'disabled' | 'platform-only' | 'invalid-link';

export interface SkillStatus {
  name: string;
  isEnabled: boolean;
  type: SkillStatusType;
  path: string;
  sourcePath: string | null;
  targetPath: string;
  isSymlink: boolean;
}

export interface InstallSkillResult {
  skippedPlatforms: PlatformConfig[];
}
