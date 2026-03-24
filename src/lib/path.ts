import type { PlatformConfig } from '../platform-types';

const trimEdgeSeparators = (value: string) => value.replace(/^[\\/]+|[\\/]+$/g, '');

export const isWindowsClient =
  typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('windows');

export const joinPath = (...parts: string[]) => {
  const separator = isWindowsClient ? '\\' : '/';
  const filteredParts = parts.filter(Boolean);

  return filteredParts
    .map((part, index) => (index === 0 ? part.replace(/[\\/]+$/g, '') : trimEdgeSeparators(part)))
    .join(separator);
};

export const getPlatformBasePath = (platform: PlatformConfig) =>
  isWindowsClient ? platform.windowsPath : platform.unixPath;

export const getPlatformSkillsPath = (platform: PlatformConfig) =>
  joinPath(getPlatformBasePath(platform), 'skills');
