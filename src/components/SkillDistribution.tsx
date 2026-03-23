import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore, PlatformConfig } from '../store';
import { Monitor, Link, AlertTriangle, ShieldCheck, Trash2, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { AlertModal, Modal } from './ui/Modal';

// Helper to remove ANSI escape codes from CLI output
const stripAnsi = (text: string) => {
  return text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
};

interface RawDirEntry {
  name: string;
  path: string;
  is_symlink: boolean;
}

interface SkillStatus {
  name: string;
  isEnabled: boolean;
  type: 'enabled' | 'disabled' | 'platform-only' | 'invalid-link';
  path: string; // Description or path
}

// Correctly identify platform
const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('windows');

const joinPath = (...parts: string[]) => {
  const separator = isWindows ? '\\' : '/';
  return parts.join(separator).replace(new RegExp(`\\${separator}{2,}`, 'g'), separator);
};

export const SkillDistribution: React.FC = () => {
  const { platforms, skillDirs } = useAppStore();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(platforms[0] || null);
  const [skills, setSkills] = useState<SkillStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [askingSkill, setAskingSkill] = useState<SkillStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPlatformSkills = useCallback(async () => {
    if (!selectedPlatform) return;
    setLoading(true);
    try {
      // 1. Load Root Skills
      const rootSkillsMap = new Map<string, string>(); // name -> path
      for (const dir of skillDirs) {
        try {
          const entries = await invoke<RawDirEntry[]>('fs_read_dir', { path: dir });
          for (const entry of entries) {
            rootSkillsMap.set(entry.name, entry.path);
          }
        } catch (e) {
          console.warn(`Failed to read root skill dir ${dir}`, e);
        }
      }

      // 2. Load Platform Skills
      const platformSkillsMap = new Map<string, RawDirEntry>();
      const platformBasePath = isWindows ? selectedPlatform.windowsPath : selectedPlatform.unixPath;
      const basePath = joinPath(platformBasePath, 'skills');
      
      try {
        const entries = await invoke<RawDirEntry[]>('fs_read_dir', { path: basePath });
        for (const entry of entries) {
          platformSkillsMap.set(entry.name, entry);
        }
      } catch (e) {
        console.warn(`Failed to read platform skill dir ${basePath}`, e);
      }

      // 3. Merge and compute states
      const allNames = new Set([...rootSkillsMap.keys(), ...platformSkillsMap.keys()]);
      const loadedSkills: SkillStatus[] = [];

      for (const name of allNames) {
        const inRoot = rootSkillsMap.has(name);
        const inPlatform = platformSkillsMap.has(name);
        const rootPath = rootSkillsMap.get(name);
        const platformEntry = platformSkillsMap.get(name);

        let type: SkillStatus['type'] = 'disabled';
        let isEnabled = false;
        let p = platformEntry?.path || rootPath || '';

        if (inRoot && inPlatform) {
          type = 'enabled';
          isEnabled = true;
        } else if (inRoot && !inPlatform) {
          type = 'disabled';
          isEnabled = false;
        } else if (!inRoot && inPlatform) {
          type = 'platform-only';
          isEnabled = true;
        }

        loadedSkills.push({
          name,
          isEnabled,
          type,
          path: p,
        });
      }

      // Sort by skill name sequentially
      loadedSkills.sort((a, b) => a.name.localeCompare(b.name));

      setSkills(loadedSkills);
    } catch (e) {
      console.error(e);
      setSkills([]);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  }, [selectedPlatform, skillDirs]);

  useEffect(() => {
    loadPlatformSkills();
  }, [loadPlatformSkills]);

  const handleToggle = async (skill: SkillStatus) => {
    if (skill.type === 'platform-only' || skill.type === 'invalid-link' || !selectedPlatform) return;
    
    // Toggle state using `npx skills`
    const newStatus = !skill.isEnabled;
    if (newStatus && selectedPlatform.distributionType === 'ask') {
      setAskingSkill(skill);
      return;
    }

    await confirmToggle(skill, selectedPlatform.distributionType === 'ask' ? 'symlink' : selectedPlatform.distributionType, newStatus);
  };

  const confirmToggle = async (skill: SkillStatus, method: string, isEnabling: boolean) => {
    if (!selectedPlatform) return;
    const platformBasePath = isWindows ? selectedPlatform.windowsPath : selectedPlatform.unixPath;
    const targetPath = joinPath(platformBasePath, 'skills', skill.name);
    
    try {
      if (isEnabling) {
        if (!skill.path) throw new Error("Root skill path is missing");
        if (method === 'copy') {
          await invoke('fs_copy_dir', { src: skill.path, dst: targetPath });
        } else {
          await invoke('fs_create_symlink', { src: skill.path, dst: targetPath });
        }
      } else {
        await invoke('fs_remove', { path: targetPath });
      }
      setAskingSkill(null);
      loadPlatformSkills();
    } catch (e) {
      const cleanError = stripAnsi(String(e));
      setErrorMsg("操作失败\n\n" + cleanError);
      setAskingSkill(null);
    }
  };

  const handleClean = async (skill: SkillStatus) => {
    if (!selectedPlatform) return;
    const platformBasePath = isWindows ? selectedPlatform.windowsPath : selectedPlatform.unixPath;
    const targetPath = joinPath(platformBasePath, 'skills', skill.name);
    
    try {
      await invoke('fs_remove', { path: targetPath });
      loadPlatformSkills();
    } catch (e) {
      const cleanError = stripAnsi(String(e));
      setErrorMsg("清理失败\n\n" + cleanError);
    }
  };

  const getTypeBadge = (type: SkillStatus['type']) => {
    switch (type) {
      case 'enabled': return { icon: Link, text: '已启用', color: 'text-green-600 bg-green-500/10 border-green-500/20' };
      case 'disabled': return { icon: XCircle, text: '未启用', color: 'text-muted-foreground bg-muted/50 border-border' };
      case 'platform-only': return { icon: Monitor, text: '仅平台', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case 'invalid-link': return { icon: AlertTriangle, text: '失效链接', color: 'text-destructive bg-destructive/10 border-destructive/20' };
    }
  };

  return (
    <div className="flex h-full gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-64 flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground px-2 mb-2">选择平台</h3>
        {platforms.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPlatform(p)}
            className={cn(
              "flex items-center justify-between px-4 py-3 rounded-xl transition-all border text-sm font-medium text-left",
              selectedPlatform?.id === p.id 
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            )}
          >
            <span>{p.name}</span>
            <div className={cn("w-1.5 h-1.5 rounded-full bg-current", selectedPlatform?.id === p.id ? "opacity-100" : "opacity-0")} />
          </button>
        ))}
      </div>

      <div className="flex-1 bg-card rounded-2xl border border-border flex flex-col overflow-hidden relative">
        {selectedPlatform ? (
          <>
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  {selectedPlatform.name} 技能分发
                </h2>
                <div className="text-[10px] text-muted-foreground mt-1 font-mono flex flex-col">
                  <span>配置目录: {isWindows ? selectedPlatform.windowsPath : selectedPlatform.unixPath}</span>
                </div>
              </div>
              <button 
                onClick={loadPlatformSkills}
                className="p-2 hover:bg-muted rounded-lg border border-border transition-colors disabled:opacity-50"
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin text-primary")} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {skills.length === 0 && !loading && (
                <div className="flex h-[200px] flex-col items-center justify-center text-muted-foreground opacity-50">
                  <ShieldCheck className="w-10 h-10 mb-2" />
                  <p className="text-sm">未查查找任何技能</p>
                </div>
              )}
              {skills.map(skill => {
                const badge = getTypeBadge(skill.type);
                return (
                  <div key={skill.name} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-border transition-all hover:bg-muted/5 group">
                    <div className="flex items-center gap-4">
                      {/* Switch Toggle */}
                      {skill.type !== 'platform-only' && skill.type !== 'invalid-link' ? (
                        <button
                          onClick={() => handleToggle(skill)}
                          className={cn(
                            "w-10 h-6 rounded-full relative transition-colors duration-200 outline-none shrink-0 cursor-pointer",
                            skill.isEnabled ? "bg-primary" : "bg-muted-foreground/30"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
                            skill.isEnabled ? "translate-x-4" : "translate-x-0"
                          )} />
                        </button>
                      ) : (
                        <div className="w-10 h-6 shrink-0 flex items-center justify-center opacity-30">
                           <div className="w-2 h-0.5 bg-foreground rounded-full" />
                        </div>
                      )}

                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {skill.name}
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border", badge?.color)}>
                            {badge && <badge.icon className="w-2.5 h-2.5" />}
                            {badge?.text}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[300px] truncate" title={skill.path}>
                          {skill.path || '未知路径'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {skill.type === 'invalid-link' && (
                        <button 
                          onClick={() => handleClean(skill)}
                          className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-bold hover:bg-destructive hover:text-white transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 清理失效
                        </button>
                      )}
                      {skill.type === 'platform-only' && (
                        <button 
                          onClick={() => handleClean(skill)}
                          className="px-3 py-1.5 border border-border text-muted-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 删除
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
            <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
            <p>请选择左侧一个平台开始查看其技能分发状态</p>
          </div>
        )}

        <Modal
          isOpen={!!askingSkill}
          onClose={() => setAskingSkill(null)}
          title="选择分发方式"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2">
              为技能 <span className="font-semibold text-foreground">{askingSkill?.name}</span> 分发到 {selectedPlatform?.name} 时，您希望：
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => askingSkill && confirmToggle(askingSkill, 'symlink', true)}
                className="w-full text-left px-5 py-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group active:scale-[0.98]"
              >
                <div className="font-bold text-sm flex items-center gap-2 group-hover:text-primary transition-colors">
                  软链接 (Symlink)
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  推荐。占用磁盘空间极小，当技能原目录更新后，在多平台自动同步生效。
                </div>
              </button>
              
              <button 
                onClick={() => askingSkill && confirmToggle(askingSkill, 'copy', true)}
                className="w-full text-left px-5 py-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group active:scale-[0.98]"
              >
                <div className="font-bold text-sm flex items-center gap-2 group-hover:text-primary transition-colors">
                  复制 (Copy)
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  将此技能目录完全复制打包一份过去，适用于不支持软链接或跨磁盘挂载的环境。
                </div>
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => setAskingSkill(null)}
                className="px-6 py-2 bg-muted text-muted-foreground font-medium rounded-xl text-sm hover:bg-muted/80 transition-colors active:scale-95"
              >
                取消
              </button>
            </div>
          </div>
        </Modal>

        <AlertModal 
          isOpen={!!errorMsg} 
          onClose={() => setErrorMsg(null)} 
          title="发生错误" 
          message={errorMsg || ''} 
          type="danger" 
        />
      </div>
    </div>
  );
};
