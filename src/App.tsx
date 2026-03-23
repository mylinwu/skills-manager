import { useState } from "react";
import "./App.css";
import { EnvironmentCheck } from "./components/EnvironmentCheck";
import { Layout } from "./components/Layout";
import { SettingsPanel } from "./components/Settings";
import { SkillsManagement } from "./components/SkillsManagement";
import { SkillDistribution } from "./components/SkillDistribution";
import { SkillInstallation } from "./components/SkillInstallation";

function App() {
  const [envPassed, setEnvPassed] = useState(() => localStorage.getItem('env_checked_passed') === 'true');
  const [activeTab, setActiveTab] = useState("skills");

  const handleEnvPass = () => {
    localStorage.setItem('env_checked_passed', 'true');
    setEnvPassed(true);
  };

  if (!envPassed) {
    return <EnvironmentCheck onPass={handleEnvPass} />;
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
