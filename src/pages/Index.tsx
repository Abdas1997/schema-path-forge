import { useState } from "react";
import { Table2, Cable, Snowflake } from "lucide-react";
import TablesTab from "@/components/TablesTab";
import ConnectorsTab from "@/components/ConnectorsTab";

const TABS = [
  { id: "tables", label: "Tables", icon: Table2 },
  { id: "connectors", label: "Connectors", icon: Cable },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>("tables");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-primary/15 flex items-center justify-center">
              <Snowflake className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">File Ingestion Manager</h1>
              <p className="text-[11px] text-muted-foreground">Snowflake Native App</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-secondary rounded-md px-2.5 py-1.5">
            <Snowflake className="h-3 w-3" />
            ACME_PROD.PSOPERATIONAL
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b bg-card/30">
        <div className="max-w-5xl mx-auto px-6 flex gap-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground/70"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-6">
        {activeTab === "tables" ? <TablesTab /> : <ConnectorsTab />}
      </main>
    </div>
  );
}
