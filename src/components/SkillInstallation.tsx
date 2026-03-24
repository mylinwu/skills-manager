import React, { useEffect, useMemo, useState } from 'react';
import { Check, Download, PackagePlus, RefreshCw, Search } from 'lucide-react';
import { matchesInstalledSkill } from '../services/skills-service';
import { useAppStore } from '../store';
import type { SearchResult } from '../types/skill-types';
import { AlertModal } from './ui/Modal';

export const SkillInstallation: React.FC = () => {
  const query = useAppStore((state) => state.installationQuery);
  const skillDirs = useAppStore((state) => state.skillDirs);
  const loading = useAppStore((state) => state.installationLoading);
  const results = useAppStore((state) => state.installationResults);
  const installedCount = useAppStore((state) => state.installedCount);
  const installingSkill = useAppStore((state) => state.installingSkill);
  const installedEntries = useAppStore((state) => state.installedEntries);
  const setQuery = useAppStore((state) => state.setInstallationQuery);
  const refreshInstalledEntries = useAppStore((state) => state.refreshInstalledEntries);
  const searchInstallationSkills = useAppStore((state) => state.searchInstallationSkills);
  const installSkill = useAppStore((state) => state.installSkill);
  const resetInstalledCount = useAppStore((state) => state.resetInstalledCount);
  const [alertMsg, setAlertMsg] = useState<{
    title: string;
    message: string;
    type?: 'default' | 'danger' | 'warning';
  } | null>(null);

  useEffect(() => {
    void refreshInstalledEntries();
  }, [refreshInstalledEntries, skillDirs]);

  useEffect(() => {
    if (installedCount <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      resetInstalledCount();
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [installedCount, resetInstalledCount]);

  const installedNames = useMemo(
    () => Array.from(new Set(installedEntries.map((entry) => entry.name))),
    [installedEntries]
  );

  const isInstalled = (skillName: string) =>
    installedNames.some((name) => matchesInstalledSkill(name, skillName));

  const handleSearch = async () => {
    try {
      await searchInstallationSkills();
    } catch (error) {
      setAlertMsg({
        title: '搜索失败',
        message: String(error),
        type: 'danger',
      });
    }
  };

  const handleInstall = async (skill: SearchResult) => {
    try {
      const result = await installSkill(skill);

      if (result.skippedPlatforms.length > 0) {
        setAlertMsg({
          title: '已完成安装',
          message: `技能已安装到本地仓库。以下默认平台因分发方式为 ask，未自动处理：${result.skippedPlatforms
            .map((platform) => platform.name)
            .join('、')}。请在“技能分发”页手动启用。`,
          type: 'warning',
        });
      }
    } catch (error) {
      setAlertMsg({
        title: '安装失败',
        message: String(error),
        type: 'danger',
      });
    }
  };

  return (
    <div className="relative flex h-full flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight">安装技能</h2>
          <p className="text-muted-foreground">搜索社区技能，并安装到本地技能仓库。</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="group relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleSearch();
              }
            }}
            placeholder="输入技能名或关键词，例如 react、frontend、python"
            className="w-full rounded-xl border border-border bg-card py-3 pr-4 pl-10 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button
          onClick={() => void handleSearch()}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : '搜索技能'}
        </button>
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        {results.length === 0 && !loading ? (
          <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-12 text-center text-muted-foreground">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
              <PackagePlus className="h-10 w-10 opacity-30" />
            </div>
            <div className="max-w-xs">
              <p className="text-lg font-semibold text-foreground">还没有搜索结果</p>
              <p className="mt-1 text-sm">
                输入关键词后回车或点击搜索，应用会调用 `skills find` 查询技能。
              </p>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 auto-rows-min gap-4 overflow-auto p-6 lg:grid-cols-2">
            {results.map((skill) => (
              <div
                key={`${skill.source}@${skill.name}`}
                className="group flex flex-col justify-between rounded-2xl border border-border/50 bg-background/50 p-5 transition-all hover:border-primary/50 hover:bg-card"
              >
                <div>
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                      {skill.name}
                    </h3>
                  </div>
                  <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {skill.description}
                  </p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded border border-border/20 bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {skill.source}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => void handleInstall(skill)}
                    disabled={isInstalled(skill.name)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                      isInstalled(skill.name)
                        ? 'cursor-default border border-border/50 bg-secondary text-secondary-foreground'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    } flex items-center justify-center gap-2`}
                  >
                    {isInstalled(skill.name) ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        已安装
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 p-4 backdrop-blur-[1px] animate-in fade-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="relative rounded-full bg-primary p-5 text-primary-foreground shadow-2xl">
                <RefreshCw className="h-10 w-10 animate-spin" />
              </div>
            </div>
          </div>
        )}
      </div>

      {installedCount > 0 && (
        <div className="fixed right-8 bottom-8 z-50 flex items-center gap-3 rounded-2xl bg-green-500 px-6 py-4 font-bold text-white animate-in slide-in-from-right-10">
          <Check className="h-5 w-5" />
          已安装 {installedCount} 个技能
        </div>
      )}

      <AlertModal
        isOpen={!!alertMsg}
        onClose={() => setAlertMsg(null)}
        title={alertMsg?.title || ''}
        message={alertMsg?.message || ''}
        type={alertMsg?.type || 'default'}
      />
    </div>
  );
};
