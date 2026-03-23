import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store';
import { Search, Download, Check, RefreshCw, PackagePlus } from 'lucide-react';
import { AlertModal } from './ui/Modal';

interface SearchResult {
  name: string;
  description: string;
  version: string;
  author: string;
  source: string;
}

interface InstalledSkillEntry {
  name: string;
  path: string;
}

const stripAnsi = (str: string) =>
  str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

const matchesInstalledSkill = (installedName: string, skillName: string) =>
  installedName === skillName || installedName.startsWith(`${skillName}-`);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const SkillInstallation: React.FC = () => {
  const { defaultPlatforms, skillDirs } = useAppStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [installedCount, setInstalledCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [installingSkill, setInstallingSkill] = useState<string | null>(null);
  const [installedEntries, setInstalledEntries] = useState<InstalledSkillEntry[]>([]);

  const loadInstalledEntries = useCallback(async (): Promise<InstalledSkillEntry[]> => {
    const entries: InstalledSkillEntry[] = [];
    for (const dir of skillDirs) {
      try {
        const rawEntries = await invoke<InstalledSkillEntry[]>('fs_read_dir', { path: dir });
        entries.push(...rawEntries);
      } catch (e) {
        console.warn(`Failed to read dir ${dir}:`, e);
      }
    }
    setInstalledEntries(entries);
    return entries;
  }, [skillDirs]);

  useEffect(() => {
    loadInstalledEntries();
  }, [loadInstalledEntries]);

  const installedNames = useMemo(
    () => Array.from(new Set(installedEntries.map((entry) => entry.name))),
    [installedEntries]
  );

  const isInstalled = useCallback(
    (skillName: string) => installedNames.some((name) => matchesInstalledSkill(name, skillName)),
    [installedNames]
  );

  const handleSearch = async () => {
    if (!query.trim()) return;

    setResults([]);
    setLoading(true);
    try {
      const output = await invoke<string>('execute_skills_cli', { args: ['find', query.trim()] });
      const parsedResults: SearchResult[] = [];
      const seen = new Set<string>();

      for (const rawLine of output.split('\n')) {
        const line = stripAnsi(rawLine).trim();
        if (!line || line.includes('Install with')) continue;

        const firstToken = line.split(/\s+/)[0];
        const match = /^([^@\s]+)@([^\s]+)$/.exec(firstToken);
        if (!match) continue;

        const [, source, skillName] = match;
        const key = `${source}@${skillName}`;
        if (seen.has(key)) continue;
        seen.add(key);

        parsedResults.push({
          name: skillName,
          author: source,
          source,
          version: 'latest',
          description: line,
        });
      }

      setResults(parsedResults);
    } catch (e) {
      setErrorMsg(String(e));
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const waitUntilInstalledInSkillDirs = async (skillName: string) => {
    const retryDelays = [0, 300, 800, 1500];

    for (const delay of retryDelays) {
      if (delay > 0) await sleep(delay);
      const refreshedEntries = await loadInstalledEntries();
      if (refreshedEntries.some((entry) => matchesInstalledSkill(entry.name, skillName))) {
        return true;
      }
    }

    return false;
  };

  const handleInstall = async (skill: SearchResult) => {
    try {
      setInstallingSkill(skill.name);

      // Step 1: always install into the configured skill repository first.
      await invoke('execute_skills_cli', {
        args: ['add', skill.source, '--skill', skill.name, '-g', '-y'],
      });

      const installedInRepo = await waitUntilInstalledInSkillDirs(skill.name);
      if (!installedInRepo) {
        throw new Error(`安装命令已执行，但未在“技能目录”中检测到技能 "${skill.name}"。`);
      }

      // Step 2: distribute to default agents, but do not use this as the source of truth
      // for "installed" state in the UI.
      if (defaultPlatforms.length > 0) {
        const distributeArgs = ['add', skill.source, '--skill', skill.name, '-g', '-y'];
        for (const platformId of defaultPlatforms) {
          distributeArgs.push('--agent', platformId);
        }
        await invoke('execute_skills_cli', { args: distributeArgs });
      }

      setInstalledCount((count) => count + 1);
    } catch (e) {
      setErrorMsg(String(e));
    } finally {
      setInstallingSkill(null);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">安装技能</h2>
          <p className="text-muted-foreground">搜索社区技能，并安装到本地技能仓库。</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入技能名或关键词，例如 react、frontend、python"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 font-medium text-sm"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : '搜索技能'}
        </button>
      </div>

      <div className="flex-1 bg-card rounded-2xl border border-border overflow-hidden flex flex-col relative">
        {results.length === 0 && !loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-4">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center">
              <PackagePlus className="w-10 h-10 opacity-30" />
            </div>
            <div className="max-w-xs">
              <p className="text-lg font-semibold text-foreground">还没有搜索结果</p>
              <p className="text-sm mt-1">输入关键词后回车或点击搜索，应用会调用 `skills find` 查找技能。</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-6 grid lg:grid-cols-2 gap-4 auto-rows-min">
            {results.map((skill) => (
              <div
                key={`${skill.source}@${skill.name}`}
                className="p-5 rounded-2xl border border-border/50 bg-background/50 hover:bg-card hover:border-primary/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      {skill.name}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4">{skill.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground border border-border/20">
                      {skill.source}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleInstall(skill)}
                    disabled={isInstalled(skill.name)}
                    className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm ${
                      isInstalled(skill.name)
                        ? 'bg-secondary text-secondary-foreground cursor-default border border-border/50'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {isInstalled(skill.name) ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        已安装
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        安装
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {installingSkill && (
          <div className="fixed inset-0 bg-background/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative bg-primary text-primary-foreground p-5 rounded-full shadow-2xl">
                <RefreshCw className="w-10 h-10 animate-spin" />
              </div>
            </div>
          </div>
        )}
      </div>

      {installedCount > 0 && (
        <div className="fixed bottom-8 right-8 animate-in slide-in-from-right-10 flex items-center gap-3 bg-green-500 text-white px-6 py-4 rounded-2xl font-bold z-50">
          <Check className="w-5 h-5" />
          已安装 {installedCount} 个技能
        </div>
      )}

      <AlertModal
        isOpen={!!errorMsg}
        onClose={() => setErrorMsg(null)}
        title="安装失败"
        message={errorMsg || ''}
        type="danger"
      />
    </div>
  );
};
