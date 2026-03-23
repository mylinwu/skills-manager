import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store';
import { Search, Download, Check, RefreshCw, PackagePlus } from 'lucide-react';
import { AlertModal } from './ui/Modal';

interface SearchResult {
  name: string;
  description: string;
  version: string;
  author: string;
  stars?: number;
}

export const SkillInstallation: React.FC = () => {
  const { defaultPlatforms } = useAppStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [installedCount, setInstalledCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [installingSkill, setInstallingSkill] = useState<string | null>(null);
  const [installedNames, setInstalledNames] = useState<string[]>([]);

  const { skillDirs } = useAppStore();

  const loadInstalledNames = useCallback(async () => {
    const names: string[] = [];
    for (const dir of skillDirs) {
      try {
        const rawEntries = await invoke<{ name: string; path: string }[]>('fs_read_dir', { path: dir });
        names.push(...rawEntries.map(e => e.name));
      } catch (e) {
        console.warn(`Failed to read dir ${dir}:`, e);
      }
    }
    setInstalledNames(Array.from(new Set(names)));
  }, [skillDirs]);

  useEffect(() => {
    loadInstalledNames();
  }, [loadInstalledNames]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setResults([]);
    setLoading(true);
    try {
      const output = await invoke<string>('execute_skills_cli', { args: ['find', query] });
      const parsedResults: SearchResult[] = [];
      const lines = output.split('\n');
      const stripAnsi = (str: string) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
      for (const rawLine of lines) {
        const line = stripAnsi(rawLine).trim();
        if (line.includes('@') && !line.startsWith('└') && !line.includes('Install with')) {
          const parts = line.split(/\s+/);
          const fullName = parts[0];
          const [authorRepo, skillName] = fullName.split('@');
          parsedResults.push({
            name: skillName || fullName,
            author: authorRepo || 'unknown',
            version: 'latest',
            description: `全网安装量: ${parts[1] || '0'}`,
          });
        }
      }
      setResults(parsedResults);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  const handleInstall = async (skill: SearchResult) => {
    try {
      setInstallingSkill(skill.name);
      if (defaultPlatforms.length > 0) {
        console.log(`开始安装 ${skill.name} 并自动同步到 ${defaultPlatforms.join(', ')}`);
      }
      
      const args = ['add', `${skill.author}@${skill.name}`, '-g', '-y'];
      // if defaultPlatforms are selected, add agents to arguments
      if (defaultPlatforms.length > 0) {
        args.push('--agent');
        args.push(...defaultPlatforms);
      }
      
      await invoke('execute_skills_cli', { args });
      setInstalledCount(c => c + 1);
      await loadInstalledNames();
    } catch(e) {
      setErrorMsg(String(e));
    } finally {
      setInstallingSkill(null);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">安装新技能</h2>
          <p className="text-muted-foreground">搜索并发现社区中的 AI Agent 技能包，一键安装到本地主库。</p>
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
            placeholder="输入技能名 or 关键词，如 'git', 'react', 'python'..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 font-medium text-sm"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "搜索技能"}
        </button>
      </div>

      <div className="flex-1 bg-card rounded-2xl border border-border overflow-hidden flex flex-col relative">
        {results.length === 0 && !loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-4">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center">
              <PackagePlus className="w-10 h-10 opacity-30" />
            </div>
            <div className="max-w-xs">
              <p className="text-lg font-semibold text-foreground">没有找到技能？</p>
              <p className="text-sm mt-1">请输入搜索内容并回车。我们将通过调用 `skills find` 指令为您查找。</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-6 grid lg:grid-cols-2 gap-4 auto-rows-min">
            {results.map(skill => (
              <div key={skill.name} className="p-5 rounded-2xl border border-border/50 bg-background/50 hover:bg-card hover:border-primary/50 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{skill.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4">{skill.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground border border-border/20">@{skill.author}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleInstall(skill)}
                    disabled={installedNames.includes(skill.name)}
                    className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm ${
                      installedNames.includes(skill.name) 
                      ? "bg-secondary text-secondary-foreground cursor-default border border-border/50" 
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {installedNames.includes(skill.name) ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        已安装到本地
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        立即安装
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Global Installation Overlay */}
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
        已成功安装 {installedCount} 个新技能！
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
