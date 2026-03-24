import './App.css';
import { LoaderCircle } from 'lucide-react';
import { EnvironmentCheck } from './components/EnvironmentCheck';
import { Layout } from './components/Layout';
import { SettingsPanel } from './components/Settings';
import { SkillDistribution } from './components/SkillDistribution';
import { SkillInstallation } from './components/SkillInstallation';
import { SkillsManagement } from './components/SkillsManagement';
import { useAppStore } from './store';

function App() {
  const hasHydrated = useAppStore((state) => state.hasHydrated);
  const envPassed = useAppStore((state) => state.envPassed);
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const markEnvironmentPassed = useAppStore((state) => state.markEnvironmentPassed);

  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium">正在恢复本地配置...</span>
        </div>
      </div>
    );
  }

  if (!envPassed) {
    return <EnvironmentCheck onPass={markEnvironmentPassed} />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'skills' && <SkillsManagement />}
      {activeTab === 'distribution' && <SkillDistribution />}
      {activeTab === 'install' && <SkillInstallation />}
      {activeTab === 'settings' && <SettingsPanel />}
    </Layout>
  );
}

export default App;
