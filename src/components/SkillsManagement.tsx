import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore, Skill } from '../store';
import { Package, RefreshCw, Trash2, Zap, ArrowUpCircle } from 'lucide-react';
import { AlertModal, ConfirmModal } from './ui/Modal';

export const SkillsManagement: React.FC = () => {
  const { skillDirs } = useAppStore();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updatableSkills, setUpdatableSkills] = useState<string[]>([]);
  const [alertMsg, setAlertMsg] = useState<{title: string, msg: string} | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<Skill | null>(null);
  const [deletingState, setDeletingState] = useState(false);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const allSkills: Skill[] = [];
      for (const dir of skillDirs) {
        try {
          const rawEntries = await invoke<{ name: string; path: string; is_symlink: boolean }[]>('fs_read_dir', { path: dir });
          for (const entry of rawEntries) {
            allSkills.push({
              name: entry.name,
              author: 'local',
              version: 'unknown',
              dirPath: entry.path,
              description: entry.is_symlink ? '软链接技能' : '本地目录技能',
            });
          }
        } catch (e) {
          console.warn(`Failed to read dir ${dir}:`, e);
        }
      }
      setSkills(allSkills);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setLoading(false), 500); 
    }
  };

  useEffect(() => {
    loadSkills();
  }, [skillDirs]);

  const handleDelete = (skill: Skill) => {
    setDeletingSkill(skill);
  };

  const confirmDelete = async () => {
    if (!deletingSkill) return;
    setDeletingState(true);
    try {
      // 调用后台命令真正从磁盘物理删除
      await invoke('execute_skills_cli', { args: ['remove', deletingSkill.name, '-g', '-y'] });
      
      // 仅更新本地状态，不触发 loadSkills 重新扫描，从而完美保留当前滚动条位置
      setSkills(skills.filter(s => s.name !== deletingSkill.name));
      setUpdatableSkills(prev => prev.filter(name => name !== deletingSkill.name));
      
      setDeletingSkill(null);
    } catch (e) {
      setAlertMsg({ title: "删除失败", msg: String(e) });
    } finally {
      setDeletingState(false);
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const output = await invoke<string>('execute_skills_cli', { args: ['check'] });
      const stripAnsi = (str: string) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
      const lines = output.split('\n');
      const updates: string[] = [];
      for (const rawLine of lines) {
        const line = stripAnsi(rawLine).trim();
        if (line.startsWith('↑')) {
          const skillName = line.replace('↑', '').trim();
          if (skillName) updates.push(skillName);
        }
      }
      setUpdatableSkills(updates);
      if (updates.length > 0) {
        setAlertMsg({ title: "检查完成", msg: `发现 ${updates.length} 个可用更新：\n${updates.join(', ')}` });
      } else {
        setAlertMsg({ title: "检查完成", msg: "当前所有技能均是最新版本。" });
      }
    } catch (e) {
      setAlertMsg({ title: "检查失败", msg: String(e) });
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleUpdateAll = async () => {
    setAlertMsg({ title: "即将推出", msg: "全部更新功能仍在开发中。" });
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">技能管理</h2>
          <p className="text-muted-foreground">当前核心库中已安装的可用技能，提供更新和卸载能力。</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleCheckUpdates}
            disabled={checkingUpdates}
            className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-border/50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checkingUpdates ? 'animate-spin' : ''}`} />
            检查更新
          </button>
          {updatableSkills.length > 0 && (
            <button 
              onClick={handleUpdateAll}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-border/50"
            >
              <Zap className="w-4 h-4" />
              一键更新全部
            </button>
          )}
          <button 
            onClick={loadSkills} 
            className="p-2 border border-border rounded-lg bg-card hover:bg-muted transition-colors"
            title="刷新数据"
          >
            <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
        {skills.length === 0 && !loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Package className="w-12 h-12 mb-4 opacity-50" />
            <p>未在配置的目录中找到任何技能</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-2">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="p-4 font-medium">名称</th>
                  <th className="p-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((skill) => (
                  <tr key={skill.dirPath} className="border-b border-border/10 hover:bg-muted/30 transition-colors group">
                    <td className="p-4">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        {skill.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate max-w-[90%]" title={skill.dirPath}>
                        {skill.dirPath}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        {updatableSkills.includes(skill.name) && (
                          <div 
                            className="flex items-center gap-1.5 px-3 py-1.5 text-amber-500 bg-amber-500/10 rounded-lg text-xs font-bold border border-amber-500/20"
                            title="发现新版本，请使用'一键更新全部'进行升级"
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            有新版本
                          </div>
                        )}
                        <button
                          onClick={() => handleDelete(skill)}
                          className="px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
      />

      <ConfirmModal 
        isOpen={!!deletingSkill} 
        onClose={() => setDeletingSkill(null)} 
        onConfirm={confirmDelete} 
        isLoading={deletingState}
        title="确认删除" 
        type="danger"
        message={
          <>
            删除技能会连带删除所有平台的软链接，确认删除 <span className="font-bold text-foreground">{deletingSkill?.name}</span> 吗？
          </>
        }
      />
    </div>
  );
};
