import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Edit2,
  Folder,
  FolderOpen,
  Monitor,
  Plus,
  Trash2,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { isWindowsClient } from '../lib/path';
import { revealPath } from '../services/fs-service';
import { runEnvironmentCheck } from '../services/skills-cli-service';
import { useAppStore } from '../store';
import type { PlatformConfig } from '../platform-types';
import { AlertModal, ConfirmModal, Modal } from './ui/Modal';

const createNewPlatform = (): PlatformConfig => ({
  id: `custom-${Date.now()}`,
  name: '',
  unixPath: '',
  windowsPath: '',
  distributionType: 'symlink',
});

export const SettingsPanel: React.FC = () => {
  const skillDirs = useAppStore((state) => state.skillDirs);
  const platforms = useAppStore((state) => state.platforms);
  const defaultPlatforms = useAppStore((state) => state.defaultPlatforms);
  const setSkillDirs = useAppStore((state) => state.setSkillDirs);
  const setDefaultPlatforms = useAppStore((state) => state.setDefaultPlatforms);
  const addPlatform = useAppStore((state) => state.addPlatform);
  const updatePlatform = useAppStore((state) => state.updatePlatform);
  const removePlatform = useAppStore((state) => state.removePlatform);
  const resetPlatformsToDefaults = useAppStore((state) => state.resetPlatformsToDefaults);
  const resetEnvironmentCheck = useAppStore((state) => state.resetEnvironmentCheck);
  const [newDir, setNewDir] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PlatformConfig>(createNewPlatform());
  const [alertMsg, setAlertMsg] = useState<{ title: string; msg: string; success?: boolean } | null>(null);
  const [confirmingPlatform, setConfirmingPlatform] = useState<PlatformConfig | null>(null);

  const isModalOpen = editingId !== null;
  const isCreating = editingId === 'new';
  const currentPathValue = isWindowsClient ? editForm.windowsPath : editForm.unixPath;
  const modalTitle = useMemo(() => (isCreating ? '新增平台' : '编辑平台'), [isCreating]);

  const handleAddDir = () => {
    const nextDir = newDir.trim();
    if (!nextDir) {
      return;
    }

    if (skillDirs.includes(nextDir)) {
      setAlertMsg({ title: '目录已存在', msg: '该技能目录已经在列表中。' });
      return;
    }

    setSkillDirs([...skillDirs, nextDir]);
    setNewDir('');
  };

  const handleRemoveDir = (dir: string) => {
    setSkillDirs(skillDirs.filter((item) => item !== dir));
  };

  const handleRevealPath = async (path: string) => {
    if (!path.trim()) {
      return;
    }

    try {
      await revealPath(path);
    } catch (error) {
      setAlertMsg({ title: '打开文件夹失败', msg: String(error) });
    }
  };

  const handlePickPlatformPath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: currentPathValue.trim() || undefined,
      });

      if (!selected || Array.isArray(selected)) {
        return;
      }

      setEditForm((current) => ({
        ...current,
        ...(isWindowsClient ? { windowsPath: selected } : { unixPath: selected }),
      }));
    } catch (error) {
      setAlertMsg({ title: '选择文件夹失败', msg: String(error) });
    }
  };

  const toggleDefaultPlatform = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (defaultPlatforms.includes(id)) {
      setDefaultPlatforms(defaultPlatforms.filter((platformId) => platformId !== id));
      return;
    }

    setDefaultPlatforms([...defaultPlatforms, id]);
  };

  const openCreateModal = () => {
    setEditingId('new');
    setEditForm(createNewPlatform());
  };

  const openEditModal = (platform: PlatformConfig) => {
    setEditingId(platform.id);
    setEditForm({ ...platform });
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditForm(createNewPlatform());
  };

  const saveEdit = () => {
    const nextPlatform: PlatformConfig = {
      ...editForm,
      id: editForm.id.trim(),
      name: editForm.name.trim(),
      unixPath: editForm.unixPath.trim(),
      windowsPath: editForm.windowsPath.trim(),
    };

    if (!nextPlatform.id || !nextPlatform.name) {
      setAlertMsg({ title: '信息不完整', msg: '平台 ID 和名称不能为空。' });
      return;
    }

    if (isCreating && platforms.some((platform) => platform.id === nextPlatform.id)) {
      setAlertMsg({ title: '平台 ID 重复', msg: `已存在 ID 为 ${nextPlatform.id} 的平台。` });
      return;
    }

    if (editingId === 'new') {
      addPlatform(nextPlatform);
    } else if (editingId) {
      updatePlatform(editingId, nextPlatform);
    }

    closeEditModal();
  };

  const confirmDeletePlatform = () => {
    if (!confirmingPlatform) {
      return;
    }

    removePlatform(confirmingPlatform.id);
    setConfirmingPlatform(null);
  };

  const rerunEnvironmentCheck = async () => {
    try {
      const ok = await runEnvironmentCheck();
      if (ok) {
        setAlertMsg({
          title: '检查通过',
          msg: '当前 Node.js 与 Skills CLI 工作正常。',
          success: true,
        });
        return;
      }
    } catch (error) {
      console.error(error);
    }

    resetEnvironmentCheck();
    window.location.reload();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h2 className="mb-4 text-2xl font-bold tracking-tight">设置</h2>
        <p className="text-muted-foreground">管理技能目录、平台配置和环境检查。</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Folder className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">技能目录</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          配置本地技能仓库目录。应用会从这些目录中扫描技能。
        </p>

        <div className="space-y-3">
          {skillDirs.map((dir, index) => (
            <div
              key={`${dir}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 p-3"
            >
              <div className="min-w-0 flex-1 text-sm text-foreground">
                <span className="inline-flex max-w-full items-center align-top">
                  <code className="truncate">{dir}</code>
                  <button
                    onClick={() => void handleRevealPath(dir)}
                    className="ml-1 inline-flex shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="在文件夹中打开"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
              <button
                onClick={() => handleRemoveDir(dir)}
                className="rounded-md p-2 text-destructive transition-colors hover:bg-destructive/10"
                title="删除目录"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={newDir}
              onChange={(event) => setNewDir(event.target.value)}
              placeholder="输入技能目录路径，例如 ~/.agents/skills"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleAddDir();
                }
              }}
            />
            <button
              onClick={handleAddDir}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              添加目录
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">平台与默认分发</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetPlatformsToDefaults}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              重置为默认
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/20"
            >
              <Plus className="h-4 w-4" />
              新增平台
            </button>
          </div>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          配置技能要分发到哪些平台，并设置默认自动分发目标。
        </p>

        <div className="space-y-4">
          {platforms.map((platform) => {
            const isDefault = defaultPlatforms.includes(platform.id);
            const displayPath = isWindowsClient ? platform.windowsPath : platform.unixPath;

            return (
              <div
                key={platform.id}
                className="group flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-background p-4 transition-all hover:border-border/80 md:flex-row md:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <button
                    onClick={(event) => toggleDefaultPlatform(platform.id, event)}
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isDefault
                        ? 'border-primary'
                        : 'border-muted-foreground/30 hover:border-primary/50'
                    }`}
                    title={isDefault ? '取消自动分发' : '设为自动分发'}
                  >
                    {isDefault && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </button>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      {platform.name}
                      <span className="rounded border px-2 py-0.5 text-xs font-normal text-muted-foreground">
                        {platform.distributionType}
                      </span>
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-9 shrink-0 text-right opacity-60">Path:</span>
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <code className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded bg-muted px-1.5 py-0.5">
                          {displayPath}
                        </code>
                        {displayPath && (
                          <button
                            onClick={() => void handleRevealPath(displayPath)}
                            className="inline-flex shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="在文件夹中打开"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 transition-opacity">
                  <button
                    onClick={() => openEditModal(platform)}
                    className="rounded-lg border p-2 text-muted-foreground hover:bg-muted"
                    title="编辑平台"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmingPlatform(platform)}
                    className="rounded-lg border p-2 text-destructive transition-colors hover:bg-destructive hover:text-white"
                    title="删除平台"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">环境检查</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          如果技能安装、更新或命令执行出现异常，可以在这里重新检测 Node.js 与 Skills CLI 环境。
        </p>

        <button
          onClick={() => void rerunEnvironmentCheck()}
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          重新检查环境
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeEditModal}
        title={modalTitle}
        footer={
          <>
            <button
              onClick={closeEditModal}
              className="rounded-lg border bg-background px-4 py-2 text-sm hover:bg-muted"
            >
              取消
            </button>
            <button
              onClick={saveEdit}
              className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              <Check className="h-4 w-4" />
              保存
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">平台 ID</label>
            <input
              type="text"
              value={editForm.id}
              onChange={(event) => setEditForm({ ...editForm, id: event.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
              disabled={!isCreating}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">平台名称</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">
              {isWindowsClient ? 'Windows 路径' : 'macOS/Linux 路径'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={currentPathValue}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    ...(isWindowsClient
                      ? { windowsPath: event.target.value }
                      : { unixPath: event.target.value }),
                  })
                }
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
              />
              <button
                onClick={() => void handlePickPlatformPath()}
                className="rounded-lg border bg-background px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="选择文件夹"
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">分发方式</label>
            <div className="flex gap-6 pt-1 text-foreground">
              {(['ask', 'copy', 'symlink'] as const).map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="platform-distribution-type"
                    checked={editForm.distributionType === type}
                    onChange={() => setEditForm({ ...editForm, distributionType: type })}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <AlertModal
        isOpen={!!alertMsg}
        onClose={() => setAlertMsg(null)}
        title={alertMsg?.title || ''}
        message={alertMsg?.msg || ''}
        type={alertMsg?.success ? 'success' : 'default'}
      />

      <ConfirmModal
        isOpen={!!confirmingPlatform}
        onClose={() => setConfirmingPlatform(null)}
        onConfirm={confirmDeletePlatform}
        title="确认删除平台"
        type="danger"
        message={
          <>
            删除平台 <span className="font-bold text-foreground">{confirmingPlatform?.name}</span>{' '}
            后，将不再作为分发目标显示，但不会直接删除该平台目录中的现有文件。
          </>
        }
      />
    </div>
  );
};
