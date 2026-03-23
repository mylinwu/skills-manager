import React, { useMemo, useState } from 'react';
import { useAppStore, PlatformConfig } from '../store';
import { AlertTriangle, Check, Edit2, Folder, FolderOpen, Monitor, Plus, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { AlertModal, ConfirmModal, Modal } from './ui/Modal';

const createNewPlatform = (): PlatformConfig => ({
  id: `custom-${Date.now()}`,
  name: '',
  unixPath: '',
  windowsPath: '',
  distributionType: 'symlink',
});

export const SettingsPanel: React.FC = () => {
  const {
    skillDirs,
    platforms,
    defaultPlatforms,
    setSkillDirs,
    setDefaultPlatforms,
    addPlatform,
    updatePlatform,
    removePlatform,
    resetPlatformsToDefaults,
  } = useAppStore();

  const [newDir, setNewDir] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PlatformConfig>(createNewPlatform());
  const [alertMsg, setAlertMsg] = useState<{ title: string; msg: string; success?: boolean } | null>(null);
  const [confirmingPlatform, setConfirmingPlatform] = useState<PlatformConfig | null>(null);

  const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('windows');
  const isModalOpen = editingId !== null;
  const isCreating = editingId === 'new';
  const currentPathValue = isWindows ? editForm.windowsPath : editForm.unixPath;
  const modalTitle = useMemo(() => (isCreating ? '新增平台' : '编辑平台'), [isCreating]);

  const handleAddDir = () => {
    if (newDir.trim() && !skillDirs.includes(newDir.trim())) {
      setSkillDirs([...skillDirs, newDir.trim()]);
      setNewDir('');
    }
  };

  const handleRemoveDir = (dir: string) => {
    setSkillDirs(skillDirs.filter((item) => item !== dir));
  };

  const handleRevealPath = async (path: string) => {
    if (!path.trim()) return;

    try {
      await revealItemInDir(path);
    } catch (e) {
      setAlertMsg({ title: '打开文件夹失败', msg: String(e) });
    }
  };

  const handlePickPlatformPath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: currentPathValue.trim() || undefined,
      });

      if (!selected || Array.isArray(selected)) return;

      setEditForm({
        ...editForm,
        ...(isWindows ? { windowsPath: selected } : { unixPath: selected }),
      });
    } catch (e) {
      setAlertMsg({ title: '选择文件夹失败', msg: String(e) });
    }
  };

  const toggleDefaultPlatform = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    if (!editForm.id.trim() || !editForm.name.trim()) return;

    if (editingId === 'new') {
      addPlatform(editForm);
    } else if (editingId) {
      updatePlatform(editingId, editForm);
    }

    closeEditModal();
  };

  const handleRemovePlatform = (platform: PlatformConfig) => {
    setConfirmingPlatform(platform);
  };

  const confirmDeletePlatform = () => {
    if (confirmingPlatform) {
      removePlatform(confirmingPlatform.id);
      setConfirmingPlatform(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">设置</h2>
        <p className="text-muted-foreground">管理技能目录、平台配置和环境检测。</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">技能目录</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">配置本地技能仓库目录。应用会从这些目录中扫描技能。</p>

        <div className="space-y-3">
          {skillDirs.map((dir, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg border border-border">
              <div className="min-w-0 flex-1 text-sm text-foreground">
                <span className="inline-flex max-w-full items-center align-top">
                  <code className="truncate">{dir}</code>
                  <button
                    onClick={() => handleRevealPath(dir)}
                    className="inline-flex shrink-0 ml-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="在文件夹中打开"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
              <button
                onClick={() => handleRemoveDir(dir)}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                title="删除目录"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={newDir}
              onChange={(e) => setNewDir(e.target.value)}
              placeholder="输入技能目录路径，例如 ~/.agents/skills"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddDir()}
            />
            <button
              onClick={handleAddDir}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              添加目录
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">平台与默认分发</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetPlatformsToDefaults}
              className="text-sm px-3 py-1.5 border border-border bg-background hover:bg-muted rounded-lg transition-colors"
            >
              重置为默认
            </button>
            <button
              onClick={openCreateModal}
              className="text-sm px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增平台
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">配置技能要分发到哪些平台，并设置默认自动分发目标。</p>

        <div className="space-y-4">
          {platforms.map((platform) => {
            const isDefault = defaultPlatforms.includes(platform.id);
            const displayPath = isWindows ? platform.windowsPath : platform.unixPath;

            return (
              <div
                key={platform.id}
                className="p-4 rounded-xl border border-border hover:border-border/80 bg-background transition-all flex flex-col md:flex-row gap-4 justify-between items-start md:items-center group"
              >
                <div className="flex-1 flex items-start gap-4 min-w-0">
                  <button
                    onClick={(e) => toggleDefaultPlatform(platform.id, e)}
                    className={`mt-1 shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isDefault ? 'border-primary' : 'border-muted-foreground/30 hover:border-primary/50'
                    }`}
                    title={isDefault ? '取消自动分发' : '设为自动分发'}
                  >
                    {isDefault && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </button>
                  <div className="space-y-1 min-w-0">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      {platform.name}
                      <span className="px-2 py-0.5 border text-xs rounded text-muted-foreground font-normal">
                        {platform.distributionType}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 min-w-0">
                      <span className="opacity-60 shrink-0 w-9 text-right">Path:</span>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <code className="block flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap bg-muted px-1.5 py-0.5 rounded">
                          {displayPath}
                        </code>
                        {displayPath && (
                          <button
                            onClick={() => handleRevealPath(displayPath)}
                            className="inline-flex shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="在文件夹中打开"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 transition-opacity">
                  <button
                    onClick={() => openEditModal(platform)}
                    className="p-2 border rounded-lg hover:bg-muted text-muted-foreground"
                    title="编辑平台"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemovePlatform(platform)}
                    className="p-2 border rounded-lg hover:bg-destructive hover:text-white text-destructive transition-colors"
                    title="删除平台"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">环境检测</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          如果技能安装、更新或命令执行持续异常，可能是 Node.js 或 Skills CLI 环境发生了变化。可以在这里重新检测依赖环境。
        </p>

        <button
          onClick={async () => {
            try {
              const ok = await invoke<boolean>('check_environment');
              if (ok) {
                setAlertMsg({
                  title: '检测通过',
                  msg: '当前 Node.js 与 Skills CLI 工作正常。',
                  success: true,
                });
              } else {
                localStorage.removeItem('env_checked_passed');
                window.location.reload();
              }
            } catch {
              localStorage.removeItem('env_checked_passed');
              window.location.reload();
            }
          }}
          className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors rounded-lg text-sm font-medium border border-border/50 flex items-center gap-2"
        >
          重新检测环境
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
              className="px-4 py-2 border rounded-lg text-sm bg-background hover:bg-muted"
            >
              取消
            </button>
            <button
              onClick={saveEdit}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
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
              onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
              className="w-full text-sm px-3 py-2 border rounded-lg bg-background text-foreground"
              disabled={!isCreating}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">平台名称</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full text-sm px-3 py-2 border rounded-lg bg-background text-foreground"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">{isWindows ? 'Windows 路径' : 'macOS/Linux 路径'}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={currentPathValue}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    ...(isWindows ? { windowsPath: e.target.value } : { unixPath: e.target.value }),
                  })
                }
                className="flex-1 text-sm px-3 py-2 border rounded-lg bg-background text-foreground"
              />
              <button
                onClick={handlePickPlatformPath}
                className="px-3 py-2 border rounded-lg bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="选择文件夹"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">分发方式</label>
            <div className="flex gap-6 pt-1 text-foreground">
              {(['ask', 'copy', 'symlink'] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="platform-distribution-type"
                    checked={editForm.distributionType === type}
                    onChange={() => setEditForm({ ...editForm, distributionType: type })}
                    className="accent-primary w-4 h-4 cursor-pointer"
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
        onClose={() => {
          setAlertMsg(null);
          if (alertMsg?.success) window.location.reload();
        }}
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
            删除平台 <span className="font-bold text-foreground">{confirmingPlatform?.name}</span> 后，将不会再作为分发目标显示。
          </>
        }
      />
    </div>
  );
};
