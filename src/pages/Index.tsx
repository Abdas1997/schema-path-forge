import { useState, useCallback } from "react";
import {
  Cable,
  ChevronRight,
  FolderOpen,
  Plus,
  Pencil,
  Snowflake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConnectorDetail from "@/components/ConnectorDetail";
import ConnectorForm from "@/components/ConnectorForm";
import { MOCK_CONNECTORS, MOCK_TENANTS, type Connector } from "@/lib/mock-data";

type View = "home" | "detail" | "create" | "edit";

export default function Index() {
  const [view, setView] = useState<View>("home");
  const [connectors, setConnectors] = useState<Connector[]>(MOCK_CONNECTORS);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [selectedTenant, setSelectedTenant] = useState(MOCK_TENANTS[0].id);

  const tenantName = MOCK_TENANTS.find((t) => t.id === selectedTenant)?.name || "";
  const showTenantSelector = MOCK_TENANTS.length > 1;

  const handleClickConnector = (c: Connector) => {
    setSelectedConnector(c);
    setView("detail");
  };

  const handleEditConnector = (c: Connector) => {
    setSelectedConnector(c);
    setView("edit");
  };

  const handleBackToHome = useCallback(() => {
    setView("home");
    setSelectedConnector(null);
  }, []);

  const handleConnectorSaved = useCallback((updated: Connector) => {
    setConnectors((prev) => {
      const exists = prev.find((c) => c.id === updated.id);
      if (exists) return prev.map((c) => (c.id === updated.id ? updated : c));
      return [...prev, updated];
    });
    setSelectedConnector(updated);
    setView("detail");
  }, []);

  const handleConnectorUpdate = useCallback((updated: Connector) => {
    setConnectors((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedConnector(updated);
  }, []);

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
          <div className="flex items-center gap-3">
            {showTenantSelector && (
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger className="bg-secondary text-xs font-mono w-auto min-w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_TENANTS.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="font-mono text-xs">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-secondary rounded-md px-2.5 py-1.5">
              <Snowflake className="h-3 w-3" />
              {tenantName}.PSOPERATIONAL
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-6">
        {view === "home" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Cable className="h-4 w-4 text-primary" />
                Connectors
              </h2>
              <Button size="sm" onClick={() => setView("create")}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Connector
              </Button>
            </div>

            <div className="space-y-2">
              {connectors.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer group"
                  onClick={() => handleClickConnector(c)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                        <Cable className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm font-mono">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={
                          c.status === "deployed"
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-secondary text-muted-foreground"
                        }
                      >
                        {c.status}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {c.tables.length} table{c.tables.length !== 1 ? "s" : ""}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); handleEditConnector(c); }}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              ))}

              {connectors.length === 0 && (
                <div className="text-center py-16">
                  <Cable className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">No connectors yet. Create one to get started.</p>
                  <Button size="sm" onClick={() => setView("create")}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Create Connector
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {view === "detail" && selectedConnector && (
          <ConnectorDetail
            connector={selectedConnector}
            tenantName={tenantName}
            onBack={handleBackToHome}
            onConnectorUpdate={handleConnectorUpdate}
          />
        )}

        {view === "create" && (
          <ConnectorForm
            mode="create"
            onBack={handleBackToHome}
            onSaved={handleConnectorSaved}
          />
        )}

        {view === "edit" && selectedConnector && (
          <ConnectorForm
            mode="edit"
            connector={selectedConnector}
            onBack={() => { setView("detail"); }}
            onSaved={handleConnectorSaved}
          />
        )}
      </main>
    </div>
  );
}
