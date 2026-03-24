import { Download, Package, Send, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

type TabId = 'skills' | 'distribution' | 'install' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'skills' as const, label: '技能管理', icon: Package },
    { id: 'distribution' as const, label: '技能分发', icon: Send },
    { id: 'install' as const, label: '安装技能', icon: Download },
    { id: 'settings' as const, label: '设置', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-sm">
        <div className="p-6">
          <h1 className="flex items-center gap-2 text-xl font-bold text-primary">
            <Package className="h-6 w-6" />
            Skills Manager
          </h1>
        </div>

        <nav className="flex-1 space-y-2 px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                  )}
                />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="text-center text-xs text-muted-foreground">v1.0.0</div>
        </div>
      </aside>

      <main className="relative flex-1 overflow-auto bg-background/50">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-background to-secondary/20" />
        <div className="mx-auto h-full max-w-6xl p-8">{children}</div>
      </main>
    </div>
  );
};
