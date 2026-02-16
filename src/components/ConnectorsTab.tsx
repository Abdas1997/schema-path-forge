import { useState } from "react";
import {
  Plus,
  Cable,
  Trash2,
  ChevronRight,
  Copy,
  Server,
  Clock,
  Upload,
  CheckCircle2,
  Rocket,
  FolderOpen,
  Key,
  User,
  Pencil,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  MOCK_CONNECTORS,
  MOCK_TABLES,
  type Connector,
  type Credential,
  type ConnectorTable,
} from "@/lib/mock-data";

type View = "list" | "create" | "detail" | "edit";

export default function ConnectorsTab() {
  const [view, setView] = useState<View>("list");
  const [connectors, setConnectors] = useState<Connector[]>(MOCK_CONNECTORS);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);

  // Create/Edit form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [credentials, setCredentials] = useState<Credential[]>([{ username: "", public_key: "" }]);
  const [scheduleType, setScheduleType] = useState<"cron" | "on_landing">("on_landing");
  const [cronExpr, setCronExpr] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [connectorTableNames, setConnectorTableNames] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleViewDetail = (c: Connector) => {
    setSelectedConnector(c);
    setView("detail");
  };

  const handleCreate = () => {
    setView("create");
    resetForm();
  };

  const handleEdit = (c: Connector) => {
    setSelectedConnector(c);
    setName(c.name);
    setDescription(c.description);
    setCredentials([...c.credentials]);
    setScheduleType(c.schedule_type);
    setCronExpr(c.schedule_cron || "");
    setSelectedTables(c.tables.map((t) => t.table_id));
    const tableNameMap: Record<string, string> = {};
    c.tables.forEach((t) => { tableNameMap[t.table_id] = t.connector_table_name; });
    setConnectorTableNames(tableNameMap);
    setSaved(false);
    setDeployed(false);
    setView("edit");
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCredentials([{ username: "", public_key: "" }]);
    setScheduleType("on_landing");
    setCronExpr("");
    setSelectedTables([]);
    setConnectorTableNames({});
    setSaved(false);
    setDeployed(false);
  };

  const simulateLoading = (cb: () => void) => {
    setLoading(true);
    setTimeout(() => { cb(); setLoading(false); }, 800);
  };

  const handleSave = () => {
    simulateLoading(() => {
      const tables: ConnectorTable[] = selectedTables.map((tid) => {
        const t = MOCK_TABLES.find((mt) => mt.id === tid);
        const ctName = connectorTableNames[tid] || t?.name || tid;
        return {
          table_id: tid,
          table_name: t?.name || tid,
          connector_table_name: ctName,
          s3_path: getS3Path(name, ctName),
        };
      });

      if (view === "edit" && selectedConnector) {
        const updated: Connector = {
          ...selectedConnector,
          description,
          credentials: [...credentials],
          schedule_type: scheduleType,
          schedule_cron: scheduleType === "cron" ? cronExpr : undefined,
          tables,
          status: "saved",
        };
        setConnectors((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setSelectedConnector(updated);
      } else {
        const newConn: Connector = {
          id: `c-${Date.now()}`,
          name,
          description,
          credentials: [...credentials],
          schedule_type: scheduleType,
          schedule_cron: scheduleType === "cron" ? cronExpr : undefined,
          tables,
          status: "saved",
          created_at: new Date().toISOString(),
        };
        setConnectors((prev) => [...prev, newConn]);
        setSelectedConnector(newConn);
      }
      setSaved(true);
      setDeployed(false);
    });
  };

  const handleDeploy = () => {
    simulateLoading(() => {
      if (selectedConnector || view === "edit") {
        const id = selectedConnector?.id;
        setConnectors((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "deployed" as const } : c))
        );
      }
      setDeployed(true);
    });
  };

  const addCredential = () => {
    setCredentials((prev) => [...prev, { username: "", public_key: "" }]);
  };

  const updateCredential = (index: number, field: keyof Credential, value: string) => {
    setCredentials((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const removeCredential = (index: number) => {
    setCredentials((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTable = (tableId: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  const updateConnectorTableName = (tableId: string, ctName: string) => {
    setConnectorTableNames((prev) => ({ ...prev, [tableId]: ctName }));
  };

  const getS3Path = (connName: string, tableName: string) =>
    `s3://fi-ingest-prod/${connName || "<connector-name>"}/${tableName}/`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Determine which tables are available to add (not yet attached in edit mode)
  const availableTables = MOCK_TABLES;

  // ===== LIST VIEW =====
  if (view === "list") {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Cable className="h-4 w-4 text-primary" />
            Connectors
          </h3>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Connector
          </Button>
        </div>

        <div className="space-y-2">
          {connectors.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer group"
              onClick={() => handleViewDetail(c)}
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          ))}

          {connectors.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No connectors yet. Create one to get started.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== DETAIL VIEW =====
  if (view === "detail" && selectedConnector) {
    const c = selectedConnector;
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("list")} className="text-muted-foreground">
            ← Back
          </Button>
          <h3 className="text-sm font-semibold text-foreground font-mono">{c.name}</h3>
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
          <div className="ml-auto">
            <Button size="sm" variant="outline" onClick={() => handleEdit(c)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Connector
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="mt-0.5">{c.description}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Schedule</Label>
              <p className="mt-0.5 font-mono text-xs">
                {c.schedule_type === "cron" ? `Cron: ${c.schedule_cron}` : "On file landing"}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Credentials</Label>
            <div className="mt-1 space-y-1">
              {c.credentials.map((cred, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-mono bg-secondary rounded p-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {cred.username}
                  <Key className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                  <span className="text-muted-foreground truncate max-w-[200px]">{cred.public_key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tables with S3 paths */}
        <div className="rounded-lg border bg-card p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Attached Tables & Upload Paths
          </h4>
          <div className="space-y-3">
            {c.tables.map((t) => (
              <div key={t.table_id} className="rounded-md border bg-secondary/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    <span className="font-mono text-sm font-medium">{t.table_name}</span>
                    {t.connector_table_name !== t.table_name && (
                      <span className="text-xs text-muted-foreground">→ {t.connector_table_name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-card rounded p-2">
                  <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <code className="text-xs font-mono text-primary flex-1">{t.s3_path}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(t.s3_path); }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Upload className="h-3 w-3" />
                  Upload files via SFTP/FTP to this path. Files will be processed{" "}
                  {c.schedule_type === "cron" ? `on schedule (${c.schedule_cron})` : "as soon as they land"}.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===== CREATE / EDIT VIEW =====
  const isEdit = view === "edit";
  const formTitle = isEdit ? `Edit Connector — ${selectedConnector?.name}` : "New Connector";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setView(isEdit ? "detail" : "list")} className="text-muted-foreground">
          ← Back
        </Button>
        <h3 className="text-sm font-semibold text-foreground">{formTitle}</h3>
        {isEdit && (
          <Badge variant="outline" className="bg-secondary text-muted-foreground">editing</Badge>
        )}
      </div>

      {/* Basic info */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Connector Name *</Label>
            <Input
              className="bg-secondary font-mono text-sm"
              placeholder="e.g. acme-ingest"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isEdit}
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground mt-1">Name cannot be changed after creation.</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Description *</Label>
            <Textarea className="bg-secondary text-sm resize-none h-9 min-h-[36px]" placeholder="What this connector does" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        {/* S3 Path preview */}
        {name && (
          <div className="flex items-center gap-2 bg-secondary rounded-md p-2.5 animate-fade-in">
            <Server className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Base S3 path:</span>
            <code className="text-xs font-mono text-primary">s3://fi-ingest-prod/{name}/</code>
          </div>
        )}
      </section>

      {/* Credentials */}
      <section className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">SFTP Credentials</h4>
          <Button size="sm" variant="outline" onClick={addCredential}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
        {credentials.map((cred, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Username</Label>
              <Input className="bg-secondary text-sm" placeholder="sftp_user" value={cred.username} onChange={(e) => updateCredential(i, "username", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Public Key</Label>
              <Input className="bg-secondary text-sm font-mono" placeholder="ssh-rsa AAAA..." value={cred.public_key} onChange={(e) => updateCredential(i, "public_key", e.target.value)} />
            </div>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeCredential(i)} disabled={credentials.length <= 1}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </section>

      {/* Schedule */}
      <section className="rounded-lg border bg-card p-5 space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Schedule</h4>
        <div className="flex gap-3">
          <Button
            variant={scheduleType === "on_landing" ? "default" : "outline"}
            size="sm"
            onClick={() => setScheduleType("on_landing")}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" /> On File Landing
          </Button>
          <Button
            variant={scheduleType === "cron" ? "default" : "outline"}
            size="sm"
            onClick={() => setScheduleType("cron")}
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" /> Cron Schedule
          </Button>
        </div>
        {scheduleType === "cron" && (
          <div className="animate-fade-in">
            <Label className="text-xs text-muted-foreground mb-1 block">Cron Expression</Label>
            <Input className="bg-secondary font-mono text-sm max-w-xs" placeholder="0 */6 * * *" value={cronExpr} onChange={(e) => setCronExpr(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">e.g. "0 */6 * * *" = every 6 hours</p>
          </div>
        )}
      </section>

      {/* Tables */}
      <section className="rounded-lg border bg-card p-5 space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attach Tables</h4>
        {availableTables.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tables available. Create tables in the Tables tab first.</p>
        ) : (
          <div className="space-y-2">
            {availableTables.map((t) => {
              const isSelected = selectedTables.includes(t.id);
              const ctName = connectorTableNames[t.id] || t.name;
              return (
                <div
                  key={t.id}
                  className={`rounded-md border p-3 cursor-pointer transition-colors ${
                    isSelected ? "border-primary/50 bg-primary/5" : "bg-secondary/50 hover:border-primary/30"
                  }`}
                  onClick={() => toggleTable(t.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded border flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className="font-mono text-sm">{t.name}</span>
                      <Badge variant="outline" className="text-xs">{t.format}</Badge>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-2 space-y-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Connector–Table Name</Label>
                        <Input
                          className="bg-card font-mono text-xs h-8 max-w-xs"
                          value={ctName}
                          onChange={(e) => updateConnectorTableName(t.id, e.target.value)}
                          placeholder={t.name}
                        />
                      </div>
                      {name && (
                        <div className="flex items-center gap-2 bg-card rounded p-2">
                          <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <code className="text-xs font-mono text-primary">{getS3Path(name, ctName)}</code>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleSave} disabled={!name || loading}>
          {loading && !saved ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving…</>
          ) : saved ? (
            <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Saved</>
          ) : isEdit ? "Save Changes" : "Save Connector"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleDeploy} disabled={!saved || loading}>
          {loading && saved && !deployed ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Deploying…</>
          ) : (
            <><Rocket className="h-3.5 w-3.5 mr-1.5" />{deployed ? "Deployed ✓" : isEdit ? "Redeploy" : "Deploy"}</>
          )}
        </Button>
      </div>

      {deployed && (
        <div className="rounded-md border border-success/40 bg-success/10 p-3 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-sm text-success">
            {isEdit
              ? "Connector updated and redeployed successfully."
              : "Connector deployed and marked eligible for deployment."}
          </span>
        </div>
      )}
    </div>
  );
}
