import { invoke } from '@tauri-apps/api/core';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import type { RawSkillDirEntry, SkillDirEntry } from '../types/skill-types';

export const readSkillDirEntries = async (path: string): Promise<SkillDirEntry[]> => {
  const entries = await invoke<RawSkillDirEntry[]>('fs_read_dir', { path });

  return entries.map((entry) => ({
    name: entry.name,
    path: entry.path,
    isSymlink: entry.is_symlink,
    exists: entry.exists,
    hasSkillManifest: entry.has_skill_manifest,
  }));
};

export const copyDirectory = (src: string, dst: string) =>
  invoke<void>('fs_copy_dir', { src, dst });

export const createSymlink = (src: string, dst: string) =>
  invoke<void>('fs_create_symlink', { src, dst });

export const removePath = (path: string) =>
  invoke<void>('fs_remove', { path });

export const readTextFile = (path: string) =>
  invoke<string>('fs_read_text_file', { path });

export const writeTextFile = (path: string, contents: string) =>
  invoke<void>('fs_write_text_file', { path, contents });

export const pathExists = (path: string) =>
  invoke<boolean>('fs_exists', { path });

export const revealPath = (path: string) => revealItemInDir(path);
