import React, { useState } from 'react';
import { useAppStore, PlatformConfig } from '../store';
import { Plus, Trash2, Folder, Monitor, AlertTriangle, Edit2, Check } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { AlertModal, ConfirmModal } from './ui/Modal';

export const SettingsPanel: React.FC = () => {
  const { skillDirs, platforms, defaultPlatforms, setSkillDirs, setDefaultPlatforms, addPlatform, updatePlatform, removePlatform } = useAppStore();
  const [newDir, setNewDir] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlatformConfig>>({});
  const [alertMsg, setAlertMsg] = useState<{title: string, msg: string, success?: boolean} | null>(null);
  const [confirmingPlatform, setConfirmingPlatform] = useState<PlatformConfig | null>(null);

  const handleAddDir = () => {
    if (newDir.trim() && !skillDirs.includes(newDir.trim())) {
      setSkillDirs([...skillDirs, newDir.trim()]);
      setNewDir('');
    }
  };

  const handleRemoveDir = (dir: string) => {
    setSkillDirs(skillDirs.filter(d => d !== dir));
  };

  const toggleDefaultPlatform = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (defaultPlatforms.includes(id)) {
      setDefaultPlatforms(defaultPlatforms.filter(p => p !== id));
    } else {
      setDefaultPlatforms([...defaultPlatforms, id]);
    }
  };

  const startEdit = (p: PlatformConfig) => {
    setEditingId(p.id);
    setEditForm(p);
  };

  const saveEdit = () => {
    if (editingId && editForm.name && editForm.id) {
      if (editingId === 'new') {
        addPlatform(editForm as PlatformConfig);
      } else {
        updatePlatform(editingId, editForm);
      }
    }
    setEditingId(null);
  };

  const handleAddPlatform = () => {
    setEditingId('new');
    setEditForm({
      id: `custom-${Date.now()}`,
      name: '',
      unixPath: '',
      windowsPath: '',
      distributionType: 'symlink'
    });
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

  const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('windows');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">系统设置</h2>
        <p className="text-muted-foreground">管理技能存放路径与目标分发平台。</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">技能目录配置</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          您可以在此配置多个技能目录。同名技能时，列表底部的目录优先（覆盖）。
        </p>

        <div className="space-y-3">
          {skillDirs.map((dir, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
              <code className="text-sm break-all flex-1">{dir}</code>
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
              placeholder="输入并添加新的技能目录路径 (如 ~/.agents/skills)"
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
            <h3 className="text-lg font-semibold">分发平台配置 & 默认自动分发</h3>
          </div>
          <button onClick={handleAddPlatform} className="text-sm px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg flex items-center gap-1 transition-colors">
            <Plus className="w-4 h-4" /> 新增平台
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          配置目标平台以便在“技能分发”控制台中管理。可设置各平台对应的本地路径和分发模式。勾选的平台会在新安装技能时自动分发。
        </p>

        <div className="space-y-4">
          {platforms.map(platform => {
            const isDefault = defaultPlatforms.includes(platform.id);
            const isEditing = editingId === platform.id || (editingId === 'new' && platform.id === editForm.id);
            
            if (isEditing) {
              return (
                <div key={platform.id} className="p-4 rounded-xl border border-primary/50 bg-primary/5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">ID (唯一标识)</label>
                      <input 
                        type="text" 
                        value={editForm.id || ''} 
                        onChange={(e) => setEditForm({...editForm, id: e.target.value})} 
                        className="w-full text-sm px-3 py-2 border rounded-lg bg-background"
                        disabled={editingId !== 'new'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">平台名称</label>
                      <input 
                        type="text" 
                        value={editForm.name || ''} 
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                        className="w-full text-sm px-3 py-2 border rounded-lg bg-background"
                      />
                    </div>
                    {isWindows ? (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">平台配置目录</label>
                        <input 
                          type="text" 
                          value={editForm.windowsPath || ''} 
                          onChange={(e) => setEditForm({...editForm, windowsPath: e.target.value})} 
                          className="w-full text-sm px-3 py-2 border rounded-lg bg-background"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">平台配置目录 (macOS/Linux)</label>
                        <input 
                          type="text" 
                          value={editForm.unixPath || ''} 
                          onChange={(e) => setEditForm({...editForm, unixPath: e.target.value})} 
                          className="w-full text-sm px-3 py-2 border rounded-lg bg-background"
                        />
                      </div>
                    )}
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs text-muted-foreground block mb-1">分发方式</label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name={`dist-${editForm.id}`} 
                            value="ask" 
                            checked={editForm.distributionType === 'ask'} 
                            onChange={() => setEditForm({...editForm, distributionType: 'ask'})} 
                            className="accent-primary w-4 h-4 cursor-pointer"
                          />
                          询问管理器 (Ask)
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name={`dist-${editForm.id}`} 
                            value="copy" 
                            checked={editForm.distributionType === 'copy'} 
                            onChange={() => setEditForm({...editForm, distributionType: 'copy'})} 
                            className="accent-primary w-4 h-4 cursor-pointer"
                          />
                          复制并监控 (Copy)
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name={`dist-${editForm.id}`} 
                            value="symlink" 
                            checked={editForm.distributionType === 'symlink'} 
                            onChange={() => setEditForm({...editForm, distributionType: 'symlink'})} 
                            className="accent-primary w-4 h-4 cursor-pointer"
                          />
                          软链接 (Symlink)
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 border rounded-lg text-sm bg-background hover:bg-muted">取消</button>
                    <button onClick={saveEdit} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-1"><Check className="w-4 h-4"/> 确认保存</button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={platform.id} 
                className="p-4 rounded-xl border border-border hover:border-border/80 bg-background transition-all flex flex-col md:flex-row gap-4 justify-between items-start md:items-center group"
              >
                <div className="flex-1 flex items-start gap-4">
                  <button 
                    onClick={(e) => toggleDefaultPlatform(platform.id, e)}
                    className={`mt-1 shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isDefault ? "border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                    title={isDefault ? "取消自动分发" : "设为自动分发"}
                  >
                    {isDefault && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </button>
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      {platform.name}
                      <span className="px-2 py-0.5 border text-xs rounded text-muted-foreground font-normal">{platform.distributionType}</span>
                    </div>
                    {isWindows ? (
                      <div className="text-xs text-muted-foreground break-all mt-1">
                        <span className="opacity-60 inline-block w-8">Path:</span> <code className="bg-muted px-1.5 py-0.5 rounded">{platform.windowsPath}</code>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground break-all mt-1">
                        <span className="opacity-60 inline-block w-8">Path:</span> <code className="bg-muted px-1.5 py-0.5 rounded">{platform.unixPath}</code>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 transition-opacity">
                  <button onClick={() => startEdit(platform)} className="p-2 border rounded-lg hover:bg-muted text-muted-foreground" title="编辑">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleRemovePlatform(platform)} className="p-2 border rounded-lg hover:bg-destructive hover:text-white text-destructive transition-colors" title="删除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {editingId === 'new' && (
             <div className="p-4 rounded-xl border border-primary/50 bg-primary/5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">ID (唯一标识)</label>
                      <input 
                        type="text" 
                        value={editForm.id || ''} 
                        onChange={(e) => setEditForm({...editForm, id: e.target.value})} 
                        className="w-full text-sm px-3 py-2 border rounded-lg bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">平台名称</label>
                      <input 
                        type="text" 
                        value={editForm.name || ''} 
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                        className="w-full text-sm px-3 py-2 border rounded-lg bg-background"
                      />
                    </div>
                    {isWindows ? (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">技能根目录 (Windows)</label>
                        <input 
                          type="text" 
                          value={editForm.windowsPath || ''} 
                          onChange={(e) => setEditForm({...editForm, windowsPath: e.target.value})} 
                          className="w-full text-sm px-3 py-2 border rounded-lg bg-background"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">技能根目录 (macOS/Linux)</label>
                        <input 
                          type="text" 
                          value={editForm.unixPath || ''} 
                          onChange={(e) => setEditForm({...editForm, unixPath: e.target.value})} 
                          className="w-full text-sm px-3 py-2 border rounded-lg bg-background"
                        />
                      </div>
                    )}
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs text-muted-foreground block mb-1">分发方式</label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name={`new-dist`} 
                            value="ask" 
                            checked={editForm.distributionType === 'ask'} 
                            onChange={() => setEditForm({...editForm, distributionType: 'ask'})} 
                            className="accent-primary w-4 h-4 cursor-pointer"
                          />
                          询问管理器 (Ask)
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name={`new-dist`} 
                            value="copy" 
                            checked={editForm.distributionType === 'copy'} 
                            onChange={() => setEditForm({...editForm, distributionType: 'copy'})} 
                            className="accent-primary w-4 h-4 cursor-pointer"
                          />
                          复制并监控 (Copy)
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name={`new-dist`} 
                            value="symlink" 
                            checked={editForm.distributionType === 'symlink'} 
                            onChange={() => setEditForm({...editForm, distributionType: 'symlink'})} 
                            className="accent-primary w-4 h-4 cursor-pointer"
                          />
                          软链接 (Symlink)
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 border rounded-lg text-sm bg-background hover:bg-muted">取消</button>
                    <button onClick={saveEdit} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-1"><Check className="w-4 h-4"/> 新增保存</button>
                  </div>
             </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">环境异常排查</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          如果在执行技能安装、更新以及调用终端命令行任务时持续出现异常，有可能是由于您的 Node.js 或 Skills CLI 环境变量发生了变更或被破坏。点击下方按钮手动重新检测核心环境依赖。
        </p>

        <button
          onClick={async () => {
            try {
               const ok = await invoke<boolean>('check_environment');
               if (ok) {
                 setAlertMsg({ title: "检测通过", msg: "✅ 当前 Node.js 与 Skills CLI 均正常工作。", success: true });
               } else {
                 localStorage.removeItem('env_checked_passed');
                 window.location.reload();
               }
            } catch (e) {
               localStorage.removeItem('env_checked_passed');
               window.location.reload();
            }
          }}
          className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors rounded-lg text-sm font-medium border border-border/50 flex items-center gap-2"
        >
          立即重新检测环境
        </button>
      </div>

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
        title="确认删除" 
        type="danger"
        message={
          <>
            确认删除平台 <span className="font-bold text-foreground">{confirmingPlatform?.name}</span> 吗？此操作将从管理列表中移除该平台配置。
          </>
        }
      />
    </div>
  );
};
