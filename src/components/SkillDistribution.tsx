import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Link,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getPlatformBasePath } from '../lib/path';
import { useAppStore } from '../store';
import type { SkillStatus, SkillStatusType } from '../types/skill-types';
import { AlertModal, ConfirmModal, Modal } from './ui/Modal';

type PendingAction = {
  title: string;
  message: React.ReactNode;
  confirmText: string;
  type: 'default' | 'danger';
  run: () => Promise<void>;
};

export const SkillDistribution: React.FC = () => {
  const platforms = useAppStore((state) => state.platforms);
  const skillDirs = useAppStore((state) => state.skillDirs);
  const selectedPlatformId = useAppStore((state) => state.selectedPlatformId);
  const skills = useAppStore((state) => state.distributionSkills);
  const loading = useAppStore((state) => state.distributionLoading);
  const searchQuery = useAppStore((state) => state.distributionSearchQuery);
  const setSearchQuery = useAppStore((state) => state.setDistributionSearchQuery);
  const setSelectedPlatformId = useAppStore((state) => state.setSelectedPlatformId);
  const ensureSelectedPlatform = useAppStore((state) => state.ensureSelectedPlatform);
  const refreshDistributionSkills = useAppStore((state) => state.refreshDistributionSkills);
  const changePlatformSkillState = useAppStore((state) => state.changePlatformSkillState);
  const cleanPlatformSkill = useAppStore((state) => state.cleanPlatformSkill);
  const [askingSkill, setAskingSkill] = useState<SkillStatus | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const selectedPlatform = platforms.find((platform) => platform.id === selectedPlatformId) ?? null;

  useEffect(() => {
    ensureSelectedPlatform();
  }, [ensureSelectedPlatform, platforms.length]);

  useEffect(() => {
    void refreshDistributionSkills();
  }, [refreshDistributionSkills, selectedPlatformId, skillDirs, platforms]);

  const filteredSkills = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return skills;
    }

    return skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(normalizedSearch) ||
        skill.path.toLowerCase().includes(normalizedSearch)
    );
  }, [searchQuery, skills]);

  const runWithAlert = async (task: () => Promise<void>) => {
    try {
      await task();
    } catch (error) {
      setAlertMsg(String(error));
    }
  };

  const confirmToggle = async (
    skill: Pick<SkillStatus, 'name' | 'sourcePath' | 'targetPath'>,
    method: 'copy' | 'symlink',
    isEnabling: boolean
  ) => {
    await runWithAlert(async () => {
      await changePlatformSkillState(skill, method, isEnabling);
      setAskingSkill(null);
    });
  };

  const handleToggle = async (skill: SkillStatus) => {
    if (!selectedPlatform || skill.type === 'platform-only' || skill.type === 'invalid-link') {
      return;
    }

    const shouldEnable = !skill.isEnabled;
    if (shouldEnable) {
      if (selectedPlatform.distributionType === 'ask') {
        setAskingSkill(skill);
        return;
      }

      await confirmToggle(skill, selectedPlatform.distributionType, true);
      return;
    }

    setPendingAction({
      title: '确认禁用技能',
      confirmText: '确认禁用',
      type: 'danger',
      message: (
        <>
          确认从 <span className="font-bold text-foreground">{selectedPlatform.name}</span> 中禁用技能{' '}
          <span className="font-bold text-foreground">{skill.name}</span> 吗？
        </>
      ),
      run: () => changePlatformSkillState(skill, 'symlink', false),
    });
  };

  const handleClean = (skill: SkillStatus) => {
    const title = skill.type === 'invalid-link' ? '清理失效链接' : '删除平台技能';
    const confirmText = skill.type === 'invalid-link' ? '确认清理' : '确认删除';

    setPendingAction({
      title,
      confirmText,
      type: 'danger',
      message: (
        <>
          确认处理技能 <span className="font-bold text-foreground">{skill.name}</span> 吗？此操作会删除平台目录中的当前项。
        </>
      ),
      run: () => cleanPlatformSkill(skill),
    });
  };

  const runPendingAction = async () => {
    if (!pendingAction) {
      return;
    }

    setActionLoading(true);
    try {
      await pendingAction.run();
      setPendingAction(null);
    } catch (error) {
      setAlertMsg(String(error));
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeBadge = (type: SkillStatusType) => {
    switch (type) {
      case 'enabled':
        return { icon: Link, text: '已启用', color: 'text-green-600 bg-green-500/10 border-green-500/20' };
      case 'disabled':
        return {
          icon: XCircle,
          text: '未启用',
          color: 'text-muted-foreground bg-muted/50 border-border',
        };
      case 'platform-only':
        return {
          icon: Monitor,
          text: '仅平台',
          color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        };
      case 'invalid-link':
        return {
          icon: AlertTriangle,
          text: '失效链接',
          color: 'text-destructive bg-destructive/10 border-destructive/20',
        };
    }
  };

  return (
    <div className="flex h-full min-h-0 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex w-72 shrink-0 min-h-0 flex-col rounded-2xl border border-border bg-card/80 p-3">
        <div className="border-b border-border/60 px-3 pt-2 pb-3">
          <h3 className="text-sm font-semibold text-foreground">选择平台</h3>
        </div>
        <div className="scrollbar-thin mt-3 flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatformId(platform.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all',
                selectedPlatform?.id === platform.id
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-foreground hover:border-border hover:bg-muted/70'
              )}
            >
              <span className="truncate pr-3">{platform.name}</span>
              <div
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full bg-current',
                  selectedPlatform?.id === platform.id ? 'opacity-100' : 'opacity-0'
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        {selectedPlatform ? (
          <>
            <div className="border-b border-border bg-muted/20 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-2 text-xl font-bold">
                    <Monitor className="h-5 w-5" />
                    {selectedPlatform.name} 技能分发
                  </h2>
                  <div className="mt-1 flex flex-col font-mono text-[10px] text-muted-foreground">
                    <span>配置目录: {getPlatformBasePath(selectedPlatform)}</span>
                  </div>
                </div>
                <button
                  onClick={() => void runWithAlert(() => refreshDistributionSkills({ force: true }))}
                  className="shrink-0 rounded-lg border border-border p-2 transition-colors hover:bg-muted disabled:opacity-50"
                  disabled={loading}
                >
                  <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin text-primary')} />
                </button>
              </div>
              <div className="relative mt-4 w-full">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索技能名称或路径"
                  className="h-10 w-full rounded-lg border border-border bg-background py-2 pr-10 pl-9 text-sm outline-none transition-colors focus:border-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    title="清空搜索"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-auto p-4">
              {skills.length === 0 && !loading && (
                <div className="flex h-[200px] flex-col items-center justify-center text-muted-foreground opacity-50">
                  <ShieldCheck className="mb-2 h-10 w-10" />
                  <p className="text-sm">未找到任何技能</p>
                </div>
              )}
              {filteredSkills.length === 0 && skills.length > 0 && !loading && (
                <div className="flex h-[200px] flex-col items-center justify-center text-muted-foreground opacity-50">
                  <Search className="mb-2 h-10 w-10" />
                  <p className="text-sm">没有匹配的技能</p>
                </div>
              )}
              {filteredSkills.map((skill) => {
                const badge = getTypeBadge(skill.type);

                return (
                  <div
                    key={skill.name}
                    className="group flex items-center justify-between rounded-xl border border-border/50 p-4 transition-all hover:border-border hover:bg-muted/5"
                  >
                    <div className="flex items-center gap-4">
                      {skill.type !== 'platform-only' && skill.type !== 'invalid-link' ? (
                        <button
                          onClick={() => void handleToggle(skill)}
                          className={cn(
                            'relative h-6 w-10 shrink-0 rounded-full outline-none transition-colors duration-200',
                            skill.isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                          )}
                        >
                          <div
                            className={cn(
                              'absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform duration-200',
                              skill.isEnabled ? 'translate-x-4' : 'translate-x-0'
                            )}
                          />
                        </button>
                      ) : (
                        <div className="flex h-6 w-10 shrink-0 items-center justify-center opacity-30">
                          <div className="h-0.5 w-2 rounded-full bg-foreground" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          {skill.name}
                          <span
                            className={cn(
                              'flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium',
                              badge.color
                            )}
                          >
                            <badge.icon className="h-2.5 w-2.5" />
                            {badge.text}
                          </span>
                        </div>
                        <div
                          className="mt-0.5 max-w-[300px] truncate text-[10px] text-muted-foreground"
                          title={skill.path}
                        >
                          {skill.path || '未知路径'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {skill.type === 'invalid-link' && (
                        <button
                          onClick={() => handleClean(skill)}
                          className="flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive transition-all hover:bg-destructive hover:text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          清理失效
                        </button>
                      )}
                      {skill.type === 'platform-only' && (
                        <button
                          onClick={() => handleClean(skill)}
                          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:border-destructive hover:bg-destructive/5 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <ShieldCheck className="mb-4 h-12 w-12 opacity-20" />
            <p>请先从左侧选择一个平台。</p>
          </div>
        )}

        <Modal isOpen={!!askingSkill} onClose={() => setAskingSkill(null)} title="选择分发方式">
          <div className="space-y-4">
            <p className="mb-2 text-sm text-muted-foreground">
              为技能 <span className="font-semibold text-foreground">{askingSkill?.name}</span> 分发到{' '}
              {selectedPlatform?.name} 时，请选择处理方式：
            </p>

            <div className="space-y-3">
              <button
                onClick={() => askingSkill && void confirmToggle(askingSkill, 'symlink', true)}
                className="group w-full rounded-2xl border border-border px-5 py-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2 text-sm font-bold transition-colors group-hover:text-primary">
                  软链接（Symlink）
                </div>
                <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  推荐。占用空间更小，源目录更新后，平台侧也会同步生效。
                </div>
              </button>

              <button
                onClick={() => askingSkill && void confirmToggle(askingSkill, 'copy', true)}
                className="group w-full rounded-2xl border border-border px-5 py-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2 text-sm font-bold transition-colors group-hover:text-primary">
                  复制（Copy）
                </div>
                <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  复制完整技能目录，适用于不支持软链接或跨磁盘分发的环境。
                </div>
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setAskingSkill(null)}
                className="rounded-xl bg-muted px-6 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 active:scale-95"
              >
                取消
              </button>
            </div>
          </div>
        </Modal>

        <ConfirmModal
          isOpen={!!pendingAction}
          onClose={() => setPendingAction(null)}
          onConfirm={() => void runPendingAction()}
          isLoading={actionLoading}
          title={pendingAction?.title || ''}
          message={pendingAction?.message || ''}
          confirmText={pendingAction?.confirmText || '确认'}
          type={pendingAction?.type || 'default'}
        />

        <AlertModal
          isOpen={!!alertMsg}
          onClose={() => setAlertMsg(null)}
          title="发生错误"
          message={alertMsg || ''}
          type="danger"
        />
      </div>
    </div>
  );
};
