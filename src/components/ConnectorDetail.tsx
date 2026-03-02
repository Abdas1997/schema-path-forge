import { useState } from "react";
import {
  ArrowLeft,
  Cable,
  Clock,
  Copy,
  FolderOpen,
  Key,
  Pencil,
  Plus,
  Rocket,
  Server,
  Upload,
  User,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { callProc } from "@/lib/call-proc";
import SharedTableUI from "@/components/SharedTableUI";
import type { Connector, ConnectorTable, TableDef, ValidationResult } from "@/lib/mock-data";
import { MOCK_TABLES } from "@/lib/mock-data";

const FILE_FORMATS = ["CSV", "TSV", "JSON", "Parquet"] as const;

interface ConnectorDetailProps {
  connector: Connector;
  tenantName: string;
  onBack: () => void;
  onConnectorUpdate: (updated: Connector) => void;
}

export default function ConnectorDetail({ connector, tenantName, onBack, onConnectorUpdate }: ConnectorDetailProps) {
  const [tableUIMode, setTableUIMode] = useState<"create" | "edit" | null>(null);
  const [editingTable, setEditingTable] = useState<TableDef | undefined>(undefined);

  // Per-table inline upload & validation
  const [tableUploads, setTableUploads] = useState<Record<string, string>>({});
  const [tableValidations, setTableValidations] = useState<Record<string, ValidationResult | null>>({});
  const [validatingTable, setValidatingTable] = useState<string | null>(null);

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const handleCreateTable = () => {
    setEditingTable(undefined);
    setTableUIMode("create");
  };

  const handleEditTable = (ct: ConnectorTable) => {
    const tableDef = MOCK_TABLES.find((t) => t.id === ct.table_id) || {
      id: ct.table_id,
      name: ct.table_name,
      database: "PSOPERATIONAL",
      schemaName: "FILE_INGESTION",
      schema: [],
      format: "CSV",
      created_at: "",
    };
    setEditingTable(tableDef);
    setTableUIMode("edit");
  };

  const handleTableSaved = (table: TableDef) => {
    if (tableUIMode === "create") {
      // Add table to connector
      const newCt: ConnectorTable = {
        table_id: table.id,
        table_name: table.name,
        connector_table_name: table.name,
        s3_path: `s3://fi-ingest-prod/${connector.name}/${table.name}/`,
      };
      onConnectorUpdate({
        ...connector,
        tables: [...connector.tables, newCt],
      });
    } else {
      // Update existing table reference
      onConnectorUpdate({
        ...connector,
        tables: connector.tables.map((ct) =>
          ct.table_id === table.id
            ? { ...ct, table_name: table.name, connector_table_name: table.name }
            : ct
        ),
      });
    }
    setTableUIMode(null);
    setEditingTable(undefined);
  };

  const handlePerTableUpload = (tableId: string) => {
    setTableUploads((prev) => ({
      ...prev,
      [tableId]: `upload_${Date.now()}.csv`,
    }));
    // Clear previous validation
    setTableValidations((prev) => ({ ...prev, [tableId]: null }));
  };

  const handlePerTableValidate = async (tableId: string) => {
    setValidatingTable(tableId);
    const res = await callProc("VALIDATE_FILE", { table_id: tableId });
    setValidatingTable(null);
    if (res.success && res.data) {
      setTableValidations((prev) => ({ ...prev, [tableId]: res.data as ValidationResult }));
    }
  };

  const handleOpenEditFromValidation = (ct: ConnectorTable) => {
    handleEditTable(ct);
  };

  const resultBadgeClass = (result: string) => {
    switch (result) {
      case "PASS": return "bg-success/15 text-success border-success/30";
      case "WARNING": return "bg-warning/15 text-warning border-warning/30";
      case "FAIL": return "bg-destructive/15 text-destructive border-destructive/30";
      default: return "";
    }
  };

  const resultIcon = (result: string) => {
    switch (result) {
      case "PASS": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "WARNING": return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "FAIL": return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Home
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cable className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono">{connector.name}</h2>
              <p className="text-xs text-muted-foreground">{connector.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                connector.status === "deployed"
                  ? "bg-success/15 text-success border-success/30"
                  : "bg-secondary text-muted-foreground"
              }
            >
              {connector.status}
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-secondary rounded-md px-2.5 py-1.5">
              <Clock className="h-3 w-3" />
              {connector.schedule_type === "cron" ? connector.schedule_cron : "On file landing"}
            </div>
          </div>
        </div>

        {/* Connector info summary */}
        <div className="rounded-lg border bg-card p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Credentials</Label>
              <div className="mt-1 space-y-1">
                {connector.credentials.map((cred, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono bg-secondary rounded px-2 py-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    {cred.username}
                    <Key className="h-3 w-3 text-muted-foreground ml-1" />
                    <span className="text-muted-foreground truncate max-w-[140px]">{cred.public_key}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Base S3 Path</Label>
              <div className="mt-1 flex items-center gap-2 bg-secondary rounded px-2 py-1.5">
                <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <code className="text-xs font-mono text-primary">s3://fi-ingest-prod/{connector.name}/</code>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Created</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(connector.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Tables List (INLINE) */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tables ({connector.tables.length})
            </h3>
            <Button size="sm" onClick={handleCreateTable}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Table
            </Button>
          </div>

          {connector.tables.length === 0 ? (
            <div className="text-center py-10">
              <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No tables yet</p>
              <Button size="sm" onClick={handleCreateTable}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Table
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {connector.tables.map((ct) => {
                const uploaded = tableUploads[ct.table_id];
                const validation = tableValidations[ct.table_id];
                const isValidating = validatingTable === ct.table_id;

                return (
                  <div key={ct.table_id} className="rounded-lg border bg-secondary/30 p-4 space-y-3">
                    {/* Table row header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        <span className="font-mono text-sm font-medium">{ct.table_name}</span>
                        {ct.connector_table_name !== ct.table_name && (
                          <span className="text-xs text-muted-foreground">→ {ct.connector_table_name}</span>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleEditTable(ct)}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </div>

                    {/* S3 Path + SFTP hint */}
                    <div className="flex items-center gap-2 bg-card rounded p-2">
                      <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <code className="text-xs font-mono text-primary flex-1">{ct.s3_path}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => copyToClipboard(ct.s3_path)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Upload className="h-3 w-3" />
                      Upload files via SFTP/FTP to this path. Files will be processed{" "}
                      {connector.schedule_type === "cron" ? `on schedule (${connector.schedule_cron})` : "as soon as they land"}.
                    </p>

                    {/* Per-table file upload */}
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handlePerTableUpload(ct.table_id)}>
                        <Upload className="h-3 w-3 mr-1" /> Upload File
                      </Button>
                      {uploaded && (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-card rounded px-2 py-1">
                            <FileText className="h-3 w-3" /> {uploaded}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handlePerTableValidate(ct.table_id)} disabled={isValidating}>
                            {isValidating ? (
                              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Validating…</>
                            ) : "Validate"}
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Inline validation result */}
                    {validation && (
                      <div className="rounded-md border bg-card p-3 space-y-2 animate-fade-in">
                        <div className="flex items-center gap-2">
                          {resultIcon(validation.result)}
                          <Badge variant="outline" className={`text-xs px-2 py-0.5 ${resultBadgeClass(validation.result)}`}>
                            {validation.result}
                          </Badge>
                          {validation.row_count && (
                            <span className="text-xs text-muted-foreground">{validation.row_count.toLocaleString()} rows</span>
                          )}
                        </div>
                        <p className="text-xs text-foreground/80 bg-secondary rounded p-2">{validation.summary}</p>

                        {validation.errors.length > 0 && (
                          <div className="space-y-1">
                            {validation.errors.map((e, i) => (
                              <div key={i} className="flex items-start gap-2 rounded bg-destructive/5 border border-destructive/20 p-1.5 text-xs">
                                <XCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                                <span className="font-mono text-destructive/80">{e.error_code}</span>
                                <span className="text-foreground/70">{e.message}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {validation.warnings.length > 0 && (
                          <div className="space-y-1">
                            {validation.warnings.map((w, i) => (
                              <div key={i} className="flex items-start gap-2 rounded bg-warning/5 border border-warning/20 p-1.5 text-xs">
                                <AlertTriangle className="h-3 w-3 text-warning mt-0.5 shrink-0" />
                                <span className="font-mono text-warning/80">{w.warning_code}</span>
                                <span className="text-foreground/70">{w.message}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {validation.result === "WARNING" && (
                          <Button size="sm" variant="outline" className="mt-1" onClick={() => handleOpenEditFromValidation(ct)}>
                            Open in Edit (Apply schema update)
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Shared Table UI modal */}
      {tableUIMode && (
        <SharedTableUI
          mode={tableUIMode}
          connectorName={connector.name}
          tenantName={tenantName}
          existingTable={editingTable}
          onClose={() => { setTableUIMode(null); setEditingTable(undefined); }}
          onSaved={handleTableSaved}
        />
      )}
    </>
  );
}
