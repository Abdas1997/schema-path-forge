import { useState } from "react";
import {
  ArrowLeft,
  Cable,
  CheckCircle2,
  Clock,
  Key,
  Loader2,
  Plus,
  Rocket,
  Server,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { callProc } from "@/lib/call-proc";
import type { Connector, Credential, ConnectorTable } from "@/lib/mock-data";
import { MOCK_TABLES } from "@/lib/mock-data";

interface ConnectorFormProps {
  mode: "create" | "edit";
  connector?: Connector;
  onBack: () => void;
  onSaved: (connector: Connector) => void;
}

export default function ConnectorForm({ mode, connector, onBack, onSaved }: ConnectorFormProps) {
  const isEdit = mode === "edit";

  const [name, setName] = useState(connector?.name || "");
  const [description, setDescription] = useState(connector?.description || "");
  const [credentials, setCredentials] = useState<Credential[]>(
    connector?.credentials ? [...connector.credentials] : [{ username: "", public_key: "" }]
  );
  const [scheduleType, setScheduleType] = useState<"cron" | "on_landing">(connector?.schedule_type || "on_landing");
  const [cronExpr, setCronExpr] = useState(connector?.schedule_cron || "");
  const [selectedTables, setSelectedTables] = useState<string[]>(
    connector?.tables.map((t) => t.table_id) || []
  );
  const [connectorTableNames, setConnectorTableNames] = useState<Record<string, string>>(
    () => {
      const m: Record<string, string> = {};
      connector?.tables.forEach((t) => { m[t.table_id] = t.connector_table_name; });
      return m;
    }
  );

  const [saved, setSaved] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [loading, setLoading] = useState(false);

  const getS3Path = (connName: string, tableName: string) =>
    `s3://fi-ingest-prod/${connName || "<connector>"}/${tableName}/`;

  const handleSave = async () => {
    setLoading(true);
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

    await callProc("SAVE_CONNECTOR", {
      connector_id: connector?.id,
      name,
      description,
      credentials,
      schedule_type: scheduleType,
      schedule_cron: scheduleType === "cron" ? cronExpr : undefined,
      tables,
    });

    const result: Connector = {
      id: connector?.id || `c-${Date.now()}`,
      name,
      description,
      credentials: [...credentials],
      schedule_type: scheduleType,
      schedule_cron: scheduleType === "cron" ? cronExpr : undefined,
      tables,
      status: "saved",
      created_at: connector?.created_at || new Date().toISOString(),
    };

    setLoading(false);
    setSaved(true);
    setDeployed(false);
    onSaved(result);
  };

  const handleDeploy = async () => {
    setLoading(true);
    await callProc("DEPLOY_CONNECTOR", { connector_id: connector?.id });
    setLoading(false);
    setDeployed(true);
  };

  const toggleTable = (tableId: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <h3 className="text-sm font-semibold">{isEdit ? `Edit Connector — ${connector?.name}` : "New Connector"}</h3>
        {isEdit && <Badge variant="outline" className="bg-secondary text-muted-foreground">editing</Badge>}
      </div>

      {/* Basic info */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Connector Name *</Label>
            <Input className="bg-secondary font-mono text-sm" placeholder="e.g. acme-ingest" value={name} onChange={(e) => setName(e.target.value)} disabled={isEdit} />
            {isEdit && <p className="text-xs text-muted-foreground mt-1">Name cannot be changed after creation.</p>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Description *</Label>
            <Textarea className="bg-secondary text-sm resize-none h-9 min-h-[36px]" placeholder="What this connector does" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
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
          <Button size="sm" variant="outline" onClick={() => setCredentials((p) => [...p, { username: "", public_key: "" }])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
        {credentials.map((cred, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Username</Label>
              <Input className="bg-secondary text-sm" placeholder="sftp_user" value={cred.username} onChange={(e) => setCredentials((p) => p.map((c, j) => j === i ? { ...c, username: e.target.value } : c))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Public Key</Label>
              <Input className="bg-secondary text-sm font-mono" placeholder="ssh-rsa AAAA..." value={cred.public_key} onChange={(e) => setCredentials((p) => p.map((c, j) => j === i ? { ...c, public_key: e.target.value } : c))} />
            </div>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive" onClick={() => setCredentials((p) => p.filter((_, j) => j !== i))} disabled={credentials.length <= 1}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </section>

      {/* Schedule */}
      <section className="rounded-lg border bg-card p-5 space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Schedule</h4>
        <div className="flex gap-3">
          <Button variant={scheduleType === "on_landing" ? "default" : "outline"} size="sm" onClick={() => setScheduleType("on_landing")}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> On File Landing
          </Button>
          <Button variant={scheduleType === "cron" ? "default" : "outline"} size="sm" onClick={() => setScheduleType("cron")}>
            <Clock className="h-3.5 w-3.5 mr-1.5" /> Cron Schedule
          </Button>
        </div>
        {scheduleType === "cron" && (
          <div className="animate-fade-in">
            <Label className="text-xs text-muted-foreground mb-1 block">Cron Expression</Label>
            <Input className="bg-secondary font-mono text-sm max-w-xs" placeholder="0 */6 * * *" value={cronExpr} onChange={(e) => setCronExpr(e.target.value)} />
          </div>
        )}
      </section>

      {/* Attach Tables */}
      <section className="rounded-lg border bg-card p-5 space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attach Tables</h4>
        {MOCK_TABLES.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tables available. Create tables first.</p>
        ) : (
          <div className="space-y-2">
            {MOCK_TABLES.map((t) => {
              const isSelected = selectedTables.includes(t.id);
              const ctName = connectorTableNames[t.id] || t.name;
              return (
                <div
                  key={t.id}
                  className={`rounded-md border p-3 cursor-pointer transition-colors ${isSelected ? "border-primary/50 bg-primary/5" : "bg-secondary/50 hover:border-primary/30"}`}
                  onClick={() => toggleTable(t.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded border flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="font-mono text-sm">{t.name}</span>
                    <Badge variant="outline" className="text-xs">{t.format}</Badge>
                  </div>
                  {isSelected && (
                    <div className="mt-2 space-y-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Connector–Table Name</Label>
                        <Input
                          className="bg-card font-mono text-xs h-8 max-w-xs"
                          value={ctName}
                          onChange={(e) => setConnectorTableNames((p) => ({ ...p, [t.id]: e.target.value }))}
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
            {isEdit ? "Connector updated and redeployed successfully." : "Connector deployed and marked eligible for deployment."}
          </span>
        </div>
      )}
    </div>
  );
}
