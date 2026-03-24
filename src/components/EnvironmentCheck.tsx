import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, RotateCw } from 'lucide-react';
import { runEnvironmentCheck } from '../services/skills-cli-service';

export const EnvironmentCheck: React.FC<{ onPass: () => void }> = ({ onPass }) => {
  const [status, setStatus] = useState<'checking' | 'passed' | 'failed'>('checking');
  const [errorText, setErrorText] = useState('');

  const checkEnv = async () => {
    setStatus('checking');
    setErrorText('');

    try {
      const isOk = await runEnvironmentCheck();
      if (isOk) {
        setStatus('passed');
        window.setTimeout(onPass, 1000);
        return;
      }

      setStatus('failed');
    } catch (error) {
      console.error(error);
      setStatus('failed');
      setErrorText(String(error));
    }
  };

  useEffect(() => {
    void checkEnv();
  }, []);

  const copyCommand = () => {
    void navigator.clipboard.writeText('npm i -g @linwu/skills-cli');
  };

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute top-1/4 -left-1/4 h-96 w-96 animate-pulse rounded-full bg-primary/20 opacity-50 blur-3xl mix-blend-multiply" />
      <div
        className="absolute right-[-25%] bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-blue-500/20 opacity-50 blur-3xl mix-blend-multiply"
        style={{ animationDelay: '1s' }}
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="flex flex-col items-center space-y-6 text-center">
          {status === 'checking' && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-spin">
                <RotateCw className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">正在检查运行环境</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  正在验证 Node.js 和 Skills CLI 是否可用...
                </p>
              </div>
            </>
          )}

          {status === 'passed' && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-green-500">环境检查通过</h2>
                <p className="mt-2 text-sm text-muted-foreground">正在进入主界面...</p>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-destructive">环境检查失败</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  未检测到可用的 Skills CLI 或 Node.js 环境异常。
                </p>
                {errorText && <p className="mt-2 text-xs text-destructive/80">{errorText}</p>}
              </div>

              <div className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
                <code className="text-sm">npm i -g @linwu/skills-cli</code>
                <button
                  onClick={copyCommand}
                  className="rounded-md p-2 transition-colors hover:bg-muted"
                  title="复制命令"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="mt-4 flex w-full gap-3">
                <button
                  onClick={onPass}
                  className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  跳过（调试）
                </button>
                <button
                  onClick={() => void checkEnv()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90"
                >
                  <RotateCw className="h-4 w-4" />
                  重新检查
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
