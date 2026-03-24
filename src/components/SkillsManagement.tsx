import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpCircle,
  FolderOpen,
  Package,
  RefreshCw,
  Search,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { revealPath } from '../services/fs-service';
import { useAppStore } from '../store';
import type { Skill } from '../types/skill-types';
import { AlertModal, ConfirmModal } from './ui/Modal';

export const SkillsManagement: React.FC = () => {
  const skills = useAppStore((state) => state.managedSkills);
  const skillDirs = useAppStore((state) => state.skillDirs);
  const loading = useAppStore((state) => state.managedSkillsLoading);
  const checkingUpdates = useAppStore((state) => state.checkingUpdates);
  const updatingAllSkills = useAppStore((state) => state.updatingAllSkills);
  const updatableSkills = useAppStore((state) => state.updatableSkills);
  const searchQuery = useAppStore((state) => state.managementSearchQuery);
  const setSearchQuery = useAppStore((state) => state.setManagementSearchQuery);
  const refreshManagedSkills = useAppStore((state) => state.refreshManagedSkills);
  const checkUpdates = useAppStore((state) => state.checkUpdates);
  const updateAllManagedSkills = useAppStore((state) => state.updateAllManagedSkills);
  const deleteManagedSkill = useAppStore((state) => state.deleteManagedSkill);
  const [alertMsg, setAlertMsg] = useState<{
    title: string;
    msg: string;
    type?: 'default' | 'danger' | 'success';
  } | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<Skill | null>(null);
  const [deletingState, setDeletingState] = useState(false);

  useEffect(() => {
    void refreshManagedSkills();
  }, [refreshManagedSkills, skillDirs]);

  const filteredSkills = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return skills;
    }

    return skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(normalizedSearch) ||
        skill.dirPath.toLowerCase().includes(normalizedSearch)
    );
  }, [searchQuery, skills]);

  const confirmDelete = async () => {
    if (!deletingSkill) {
      return;
    }

    setDeletingState(true);
    try {
      await deleteManagedSkill(deletingSkill.name);
      setDeletingSkill(null);
    } catch (error) {
      setAlertMsg({ title: '删除失败', msg: String(error), type: 'danger' });
    } finally {
      setDeletingState(false);
    }
  };

  const handleCheckUpdates = async () => {
    try {
      await checkUpdates();
      const updates = useAppStore.getState().updatableSkills;
      setAlertMsg({
        title: '检查完成',
        msg:
          updates.length > 0
            ? `共发现 ${updates.length} 个可更新技能：${updates.join('、')}`
            : '当前没有可更新的技能。',
        type: 'success',
      });
    } catch (error) {
      setAlertMsg({ title: '检查更新失败', msg: String(error), type: 'danger' });
    }
  };

  const handleUpdateAll = async () => {
    try {
      await updateAllManagedSkills();
      setAlertMsg({ title: '更新完成', msg: '已完成全部技能更新。', type: 'success' });
    } catch (error) {
      setAlertMsg({ title: '批量更新失败', msg: String(error), type: 'danger' });
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshManagedSkills({ force: true });
    } catch (error) {
      setAlertMsg({ title: '刷新失败', msg: String(error), type: 'danger' });
    }
  };

  const handleOpenSkillDir = async (path: string) => {
    try {
      await revealPath(path);
    } catch (error) {
      setAlertMsg({ title: '打开文件夹失败', msg: String(error), type: 'danger' });
    }
  };

  return (
    <div className="flex h-full flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between gap-6">
        <div className="flex-1">
          <h2 className="mb-2 text-2xl font-bold tracking-tight">技能管理</h2>
          <p className="text-muted-foreground">查看本地技能仓库，支持搜索、检查更新、批量更新和删除。</p>
          <div className="relative mt-4 max-w-md">
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
        <div className="flex gap-3">
          <button
            onClick={() => void handleCheckUpdates()}
            disabled={checkingUpdates}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${checkingUpdates ? 'animate-spin' : ''}`} />
            检查更新
          </button>
          {updatableSkills.length > 0 && (
            <button
              onClick={() => void handleUpdateAll()}
              disabled={updatingAllSkills}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Zap className={`h-4 w-4 ${updatingAllSkills ? 'animate-pulse' : ''}`} />
              批量更新
            </button>
          )}
          <button
            onClick={() => void handleRefresh()}
            className="rounded-lg border border-border bg-card p-2 transition-colors hover:bg-muted"
            title="刷新列表"
          >
            <RefreshCw className={`h-5 w-5 text-muted-foreground ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
        {skills.length === 0 && !loading ? (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <Package className="mb-4 h-12 w-12 opacity-50" />
            <p>当前技能目录中没有检测到技能。</p>
          </div>
        ) : filteredSkills.length === 0 && !loading ? (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <Search className="mb-4 h-12 w-12 opacity-50" />
            <p>没有匹配的技能。</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-2">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="p-4 font-medium">技能</th>
                  <th className="p-4 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredSkills.map((skill) => (
                  <tr
                    key={skill.dirPath}
                    className="group border-b border-border/10 transition-colors hover:bg-muted/30"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {skill.name}
                      </div>
                      <div className="mt-1 max-w-[90%] text-xs text-muted-foreground">
                        <span className="inline-flex max-w-full items-center align-top">
                          <span className="truncate" title={skill.dirPath}>
                            {skill.dirPath}
                          </span>
                          <button
                            onClick={() => void handleOpenSkillDir(skill.dirPath)}
                            className="ml-1 inline-flex shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="在文件夹中打开"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-50 transition-opacity group-hover:opacity-100">
                        {updatableSkills.includes(skill.name) && (
                          <div
                            className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-500"
                            title="该技能存在可用更新"
                          >
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                            可更新
                          </div>
                        )}
                        <button
                          onClick={() => setDeletingSkill(skill)}
                          className="flex items-center gap-1 rounded bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertModal
        isOpen={!!alertMsg}
        onClose={() => setAlertMsg(null)}
        title={alertMsg?.title || ''}
        message={alertMsg?.msg || ''}
        type={alertMsg?.type || 'default'}
      />

      <ConfirmModal
        isOpen={!!deletingSkill}
        onClose={() => setDeletingSkill(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={deletingState}
        title="确认删除"
        type="danger"
        message={
          <>
            删除技能 <span className="font-bold text-foreground">{deletingSkill?.name}</span>{' '}
            后，会同步清理各平台目录中同名的分发副本或链接。是否继续？
          </>
        }
      />
    </div>
  );
};
