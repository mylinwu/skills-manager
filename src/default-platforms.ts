import type { PlatformConfig } from './platform-types';

type UpstreamAgentDefinition = {
  id: string;
  name: string;
  globalSkillsPath: string;
};

const stripTrailingSkillsSegment = (path: string) =>
  path.replace(/[\\/]+skills[\\/]?$/i, '');

const toWindowsHomePath = (path: string) => {
  if (path.startsWith('~/')) {
    return path.replace(/^~\//, '%USERPROFILE%\\').replace(/\//g, '\\');
  }
  return path.replace(/\//g, '\\');
};

const upstreamAgents: UpstreamAgentDefinition[] = [
  { id: 'amp', name: 'Amp', globalSkillsPath: '~/.config/agents/skills/' },
  { id: 'kimi-cli', name: 'Kimi Code CLI', globalSkillsPath: '~/.config/agents/skills/' },
  { id: 'replit', name: 'Replit', globalSkillsPath: '~/.config/agents/skills/' },
  { id: 'universal', name: 'Universal', globalSkillsPath: '~/.config/agents/skills/' },
  { id: 'antigravity', name: 'Antigravity', globalSkillsPath: '~/.gemini/antigravity/skills/' },
  { id: 'augment', name: 'Augment', globalSkillsPath: '~/.augment/skills/' },
  { id: 'claude-code', name: 'Claude Code', globalSkillsPath: '~/.claude/skills/' },
  { id: 'openclaw', name: 'OpenClaw', globalSkillsPath: '~/.openclaw/skills/' },
  { id: 'cline', name: 'Cline', globalSkillsPath: '~/.agents/skills/' },
  { id: 'warp', name: 'Warp', globalSkillsPath: '~/.agents/skills/' },
  { id: 'codebuddy', name: 'CodeBuddy', globalSkillsPath: '~/.codebuddy/skills/' },
  { id: 'codex', name: 'Codex', globalSkillsPath: '~/.codex/skills/' },
  { id: 'command-code', name: 'Command Code', globalSkillsPath: '~/.commandcode/skills/' },
  { id: 'continue', name: 'Continue', globalSkillsPath: '~/.continue/skills/' },
  { id: 'cortex', name: 'Cortex Code', globalSkillsPath: '~/.snowflake/cortex/skills/' },
  { id: 'crush', name: 'Crush', globalSkillsPath: '~/.config/crush/skills/' },
  { id: 'cursor', name: 'Cursor', globalSkillsPath: '~/.cursor/skills/' },
  { id: 'deepagents', name: 'Deep Agents', globalSkillsPath: '~/.deepagents/agent/skills/' },
  { id: 'droid', name: 'Droid', globalSkillsPath: '~/.factory/skills/' },
  { id: 'gemini-cli', name: 'Gemini CLI', globalSkillsPath: '~/.gemini/skills/' },
  { id: 'github-copilot', name: 'GitHub Copilot', globalSkillsPath: '~/.copilot/skills/' },
  { id: 'goose', name: 'Goose', globalSkillsPath: '~/.config/goose/skills/' },
  { id: 'junie', name: 'Junie', globalSkillsPath: '~/.junie/skills/' },
  { id: 'iflow-cli', name: 'iFlow CLI', globalSkillsPath: '~/.iflow/skills/' },
  { id: 'kilo', name: 'Kilo Code', globalSkillsPath: '~/.kilocode/skills/' },
  { id: 'kiro-cli', name: 'Kiro CLI', globalSkillsPath: '~/.kiro/skills/' },
  { id: 'kode', name: 'Kode', globalSkillsPath: '~/.kode/skills/' },
  { id: 'mcpjam', name: 'MCPJam', globalSkillsPath: '~/.mcpjam/skills/' },
  { id: 'mistral-vibe', name: 'Mistral Vibe', globalSkillsPath: '~/.vibe/skills/' },
  { id: 'mux', name: 'Mux', globalSkillsPath: '~/.mux/skills/' },
  { id: 'opencode', name: 'OpenCode', globalSkillsPath: '~/.config/opencode/skills/' },
  { id: 'openhands', name: 'OpenHands', globalSkillsPath: '~/.openhands/skills/' },
  { id: 'pi', name: 'Pi', globalSkillsPath: '~/.pi/agent/skills/' },
  { id: 'qoder', name: 'Qoder', globalSkillsPath: '~/.qoder/skills/' },
  { id: 'qwen-code', name: 'Qwen Code', globalSkillsPath: '~/.qwen/skills/' },
  { id: 'roo', name: 'Roo Code', globalSkillsPath: '~/.roo/skills/' },
  { id: 'trae', name: 'Trae', globalSkillsPath: '~/.trae/skills/' },
  { id: 'trae-cn', name: 'Trae CN', globalSkillsPath: '~/.trae-cn/skills/' },
  { id: 'windsurf', name: 'Windsurf', globalSkillsPath: '~/.codeium/windsurf/skills/' },
  { id: 'zencoder', name: 'Zencoder', globalSkillsPath: '~/.zencoder/skills/' },
  { id: 'neovate', name: 'Neovate', globalSkillsPath: '~/.neovate/skills/' },
  { id: 'pochi', name: 'Pochi', globalSkillsPath: '~/.pochi/skills/' },
  { id: 'adal', name: 'AdaL', globalSkillsPath: '~/.adal/skills/' },
];

export const DEFAULT_PLATFORMS: PlatformConfig[] = upstreamAgents.map((agent) => {
  const basePath = stripTrailingSkillsSegment(agent.globalSkillsPath);
  return {
    id: agent.id,
    name: agent.name,
    unixPath: basePath,
    windowsPath: toWindowsHomePath(basePath),
    distributionType: 'ask',
  };
});

export const cloneDefaultPlatforms = (): PlatformConfig[] =>
  DEFAULT_PLATFORMS.map((platform) => ({ ...platform }));

const OFFICIAL_DEFAULTS_BY_ID = new Map(DEFAULT_PLATFORMS.map((platform) => [platform.id, platform]));

const LEGACY_ID_ALIASES: Record<string, string> = {
  kilocode: 'kilo',
  gemini: 'antigravity',
};

const normalizeLegacyPlatform = (platform: PlatformConfig): PlatformConfig => {
  const aliasedId = LEGACY_ID_ALIASES[platform.id] ?? platform.id;
  const defaults = OFFICIAL_DEFAULTS_BY_ID.get(aliasedId);

  if (!defaults) {
    return { ...platform, id: aliasedId };
  }

  const hasLegacyAmpPath =
    aliasedId === 'amp' &&
    (
      platform.unixPath === '~/.config/amp' ||
      platform.windowsPath === '%USERPROFILE%\\.config\\amp' ||
      platform.windowsPath === '~\\.config\\amp'
    );

  const hasLegacyHomeTildeWindowsPath = platform.windowsPath.startsWith('~\\');

  return {
    ...platform,
    id: aliasedId,
    name: defaults.name,
    unixPath: hasLegacyAmpPath ? defaults.unixPath : platform.unixPath,
    windowsPath: hasLegacyAmpPath || hasLegacyHomeTildeWindowsPath ? defaults.windowsPath : platform.windowsPath,
  };
};

export const mergePlatformsWithDefaults = (platforms: PlatformConfig[]): PlatformConfig[] => {
  const normalizedPlatforms = platforms.map(normalizeLegacyPlatform);
  const byId = new Map(normalizedPlatforms.map((platform) => [platform.id, platform]));
  const merged: PlatformConfig[] = [];

  for (const defaults of DEFAULT_PLATFORMS) {
    merged.push({ ...(byId.get(defaults.id) ?? defaults) });
    byId.delete(defaults.id);
  }

  for (const platform of normalizedPlatforms) {
    if (byId.has(platform.id)) {
      merged.push({ ...platform });
      byId.delete(platform.id);
    }
  }

  return merged;
};
