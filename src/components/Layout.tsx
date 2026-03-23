import { Package, Send, Download, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'skills', label: '技能管理', icon: Package },
    { id: 'distribution', label: '技能分发', icon: Send },
    { id: 'install', label: '安装技能', icon: Download },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
            <Package className="w-6 h-6" />
            Skills Manager
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            v1.0.0
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto relative bg-background/50">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/20 -z-10" />
        <div className="p-8 h-full max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
