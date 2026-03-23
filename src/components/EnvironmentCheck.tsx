import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AlertCircle, CheckCircle2, RotateCw, Copy } from 'lucide-react';

export const EnvironmentCheck: React.FC<{ onPass: () => void }> = ({ onPass }) => {
  const [status, setStatus] = useState<'checking' | 'passed' | 'failed'>('checking');
  const [errorText, setErrorText] = useState('');

  const checkEnv = async () => {
    setStatus('checking');
    try {
      const isOk = await invoke<boolean>('check_environment');
      if (isOk) {
        setStatus('passed');
        setTimeout(onPass, 1000);
      } else {
        setStatus('failed');
      }
    } catch (e) {
      console.error(e);
      setStatus('failed');
      setErrorText(String(e));
    }
  };

  useEffect(() => {
    checkEnv();
  }, []);

  const copyCommand = () => {
    navigator.clipboard.writeText('npm install -g skills');
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-pulse" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="bg-card w-full max-w-lg rounded-2xl p-8 border border-border shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center space-y-6">
          {status === 'checking' && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-spin">
                <RotateCw className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">正在检测核心环境</h2>
                <p className="text-muted-foreground mt-2 text-sm">正在验证 Node.js 与 Skills CLI 是否可用...</p>
              </div>
            </>
          )}

          {status === 'passed' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-green-500">环境检测通过</h2>
                <p className="text-muted-foreground mt-2 text-sm">正在进入系统主界面...</p>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-destructive">环境检测失败</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  未检测到 `skills` 工具
                  或 Node.js 环境异常。
                </p>
                {errorText && <p className="text-xs text-destructive/80 mt-2">{errorText}</p>}
              </div>

              <div className="w-full bg-muted/50 p-4 rounded-lg flex items-center justify-between border border-border">
                <code className="text-sm">npm i -g @linwu/skills-cli</code>
                <button
                  onClick={copyCommand}
                  className="p-2 hover:bg-muted rounded-md transition-colors"
                  title="复制命令"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex w-full gap-3 mt-4">
                <button
                  onClick={onPass}
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors font-medium text-sm"
                >
                  跳过 (调试)
                </button>
                <button
                  onClick={checkEnv}
                  className="flex-1 flex gap-2 items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium text-sm shadow-md"
                >
                  <RotateCw className="w-4 h-4" />
                  重新检测
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
