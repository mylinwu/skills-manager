import { invoke } from '@tauri-apps/api/core';
import { stripAnsi } from '../lib/ansi';
import type { SearchResult } from '../types/skill-types';

export const executeSkillsCli = (args: string[]) =>
  invoke<string>('execute_skills_cli', { args });

export const runEnvironmentCheck = () => invoke<boolean>('check_environment');

export const searchCommunitySkills = async (query: string): Promise<SearchResult[]> => {
  const output = await executeSkillsCli(['find', query.trim()]);
  const parsedResults: SearchResult[] = [];
  const seen = new Set<string>();

  for (const rawLine of output.split('\n')) {
    const line = stripAnsi(rawLine).trim();
    if (!line || line.includes('Install with')) {
      continue;
    }

    const firstToken = line.split(/\s+/)[0];
    const match = /^([^@\s]+)@([^\s]+)$/.exec(firstToken);
    if (!match) {
      continue;
    }

    const [, source, skillName] = match;
    const key = `${source}@${skillName}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    parsedResults.push({
      name: skillName,
      author: source,
      source,
      version: 'latest',
      description: line,
    });
  }

  return parsedResults;
};

export const installSkillFromRegistry = (source: string, skillName: string) =>
  executeSkillsCli(['add', source, '--skill', skillName, '-g', '-y']);

export const removeSkillFromRepository = (skillName: string) =>
  executeSkillsCli(['remove', skillName, '-g', '-y']);

export const updateAllSkillsInRepository = () => executeSkillsCli(['update']);

export const checkForSkillUpdates = async (): Promise<string[]> => {
  const output = await executeSkillsCli(['check']);
  const updates = new Set<string>();

  for (const rawLine of output.split('\n')) {
    const line = stripAnsi(rawLine).trim();
    if (!line || /checking|up to date|no updates|summary/i.test(line)) {
      continue;
    }

    if (line.startsWith('↻') || line.startsWith('->') || line.startsWith('=>')) {
      const name = line.replace(/^[^\w-]+/, '').split(/\s+/)[0];
      if (name) {
        updates.add(name);
      }
    }
  }

  return Array.from(updates);
};
