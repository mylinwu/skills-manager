import './App.css';
import { EnvironmentCheck } from './components/EnvironmentCheck';
import { Layout } from './components/Layout';
import { SettingsPanel } from './components/Settings';
import { SkillDistribution } from './components/SkillDistribution';
import { SkillInstallation } from './components/SkillInstallation';
import { SkillsManagement } from './components/SkillsManagement';
import { useAppStore } from './store';

function App() {
  const envPassed = useAppStore((state) => state.envPassed);
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const markEnvironmentPassed = useAppStore((state) => state.markEnvironmentPassed);

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
