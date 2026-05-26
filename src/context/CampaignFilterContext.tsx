import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { listCampaigns, type Campaign } from "../api/campaigns";
import { useAuth } from "./AuthContext";

interface CampaignFilterContextValue {
  campaigns: Campaign[];
  selectedId: number | null; // null = todas
  setSelectedId: (id: number | null) => void;
  loading: boolean;
  reload: () => Promise<void>;
}

const CampaignFilterContext = createContext<CampaignFilterContextValue | undefined>(undefined);

export function CampaignFilterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listCampaigns();
      setCampaigns(data);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();
    else setCampaigns([]);
  }, [user?.userId]);

  return (
    <CampaignFilterContext.Provider value={{ campaigns, selectedId, setSelectedId, loading, reload: load }}>
      {children}
    </CampaignFilterContext.Provider>
  );
}

export function useCampaignFilter() {
  const ctx = useContext(CampaignFilterContext);
  if (!ctx) throw new Error("useCampaignFilter precisa estar dentro de <CampaignFilterProvider>");
  return ctx;
}
