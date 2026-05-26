import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Tabs from "../../components/common/Tabs";
import SurveysTab from "./SurveysTab";
import RewardsTab from "./RewardsTab";

export default function ReportsPage() {
  const [defaultTab, setDefaultTab] = useState<string>("surveys");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "premios") setDefaultTab("rewards");
    else if (hash === "pesquisas") setDefaultTab("surveys");
  }, []);

  return (
    <>
      <PageMeta title="Relatórios | Premify" description="Pesquisas de satisfação e prêmios distribuídos." />
      <PageBreadcrumb pageTitle="Relatórios" />

      <Tabs
        defaultKey={defaultTab}
        tabs={[
          { key: "surveys", label: "Pesquisas", icon: "📊", content: <SurveysTab /> },
          { key: "rewards", label: "Prêmios", icon: "🎁", content: <RewardsTab /> },
        ]}
      />
    </>
  );
}
