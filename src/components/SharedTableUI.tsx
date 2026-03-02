import { useState, useCallback } from "react";
import {
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Upload,
  FileText,
  RefreshCw,
  Shield,
  Eye,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { callProc } from "@/lib/call-proc";
import type { SchemaColumn, ValidationResult, TableDef } from "@/lib/mock-data";

const FILE_FORMATS = ["CSV", "TSV", "JSON", "Parquet"] as const;

const SNOWFLAKE_TYPES = [
  "VARCHAR(32)", "VARCHAR(64)", "VARCHAR(128)", "VARCHAR(256)",
  "NUMBER(18,2)", "NUMBER(10,2)", "NUMBER(38,0)",
  "BOOLEAN", "DATE", "TIMESTAMP_NTZ", "TIMESTAMP_LTZ",
  "VARIANT", "ARRAY", "OBJECT",
];

interface SharedTableUIProps {
  mode: "create" | "edit";
  connectorName: string;
  tenantName: string;
  existingTable?: TableDef;
  onClose: () => void;
  onSaved: (table: TableDef) => void;
}

export default function SharedTableUI({
  mode,
  connectorName,
  tenantName,
  existingTable,
  onClose,
  onSaved,
}: SharedTableUIProps) {
  const isEdit = mode === "edit";

  // Form state
  const [tableName, setTableName] = useState(existingTable?.name || "");
  const [fileFormat, setFileFormat] = useState<string>(existingTable?.format || "CSV");
  const [uploadedFile, setUploadedFile] = useState<string | null>(isEdit ? "existing_data.csv" : null);

  // Schema
  const [schema, setSchema] = useState<SchemaColumn[]>(existingTable?.schema ? [...existingTable.schema] : []);
  const [schemaInferred, setSchemaInferred] = useState(isEdit);
  const [schemaDirty, setSchemaDirty] = useState(false);

  // Preview
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Validation
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Conflict
  const [conflict, setConflict] = useState<{ diff_summary: string; table_columns: SchemaColumn[]; metadata_columns: SchemaColumn[] } | null>(null);

  // Loading states
  const [inferLoading, setInferLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [validateLoading, setValidateLoading] = useState(false);

  const database = existingTable?.database || "PSOPERATIONAL";
  const schemaName = existingTable?.schemaName || "FILE_INGESTION";

  // === Handlers ===

  const handleUploadFile = () => {
    setUploadedFile(`sample_data_${Date.now()}.${fileFormat.toLowerCase()}`);
    setValidationResult(null);
  };

  const handleInferSchema = async () => {
    setInferLoading(true);
    const res = await callProc("INFER_SCHEMA", {
      table_id: existingTable?.id,
      file: uploadedFile,
      format: fileFormat,
    });
    setInferLoading(false);
    if (res.success && res.data) {
      const cols = (res.data as { columns: SchemaColumn[] }).columns;
      setSchema(cols);
      setSchemaInferred(true);
      setSchemaDirty(true);
      setPreviewRows(null);
      setValidationResult(null);
      setConflict(null);
    }
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    const res = await callProc("PREVIEW_DATA", { schema, file: uploadedFile, format: fileFormat });
    setPreviewLoading(false);
    if (res.success && res.data) {
      const d = res.data as { rows: Record<string, unknown>[]; total_rows: number };
      setPreviewRows(d.rows);
      setSchemaDirty(false);
    } else {
      setPreviewError(res.error || "Preview failed.");
      setPreviewRows(null);
    }
  };

  const handleValidate = async () => {
    setValidateLoading(true);
    const res = await callProc("VALIDATE_FILE", { schema, file: uploadedFile, format: fileFormat });
    setValidateLoading(false);
    if (res.success && res.data) {
      setValidationResult(res.data as ValidationResult);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    // First call: may return conflict
    const res = await callProc("APPLY_SCHEMA", {
      table_id: existingTable?.id,
      table_name: tableName,
      schema,
      format: fileFormat,
      _force_conflict: !isEdit && !conflict, // simulate conflict on first create
    });
    setSaveLoading(false);

    if (res.success && res.data) {
      const d = res.data as { conflict?: { diff_summary: string; table_columns: SchemaColumn[]; metadata_columns: SchemaColumn[] }; applied?: boolean };
      if (d.conflict) {
        setConflict(d.conflict);
        return;
      }
      // Success
      const saved: TableDef = existingTable
        ? { ...existingTable, name: tableName, schema: [...schema], format: fileFormat }
        : {
            id: `t-${Date.now()}`,
            name: tableName,
            database,
            schemaName,
            schema: [...schema],
            format: fileFormat,
            created_at: new Date().toISOString(),
          };
      onSaved(saved);
    }
  };

  const handleResolveConflict = async (resolution: "overwrite" | "refresh") => {
    setSaveLoading(true);
    if (resolution === "refresh" && conflict) {
      setSchema([...conflict.table_columns]);
    }
    await callProc("RESOLVE_CONFLICT", { resolution, table_name: tableName });
    setSaveLoading(false);
    setConflict(null);

    // After resolution, apply
    const saved: TableDef = existingTable
      ? { ...existingTable, name: tableName, schema: resolution === "refresh" && conflict ? [...conflict.table_columns] : [...schema], format: fileFormat }
      : {
          id: `t-${Date.now()}`,
          name: tableName,
          database,
          schemaName,
          schema: [...schema],
          format: fileFormat,
          created_at: new Date().toISOString(),
        };
    onSaved(saved);
  };

  const updateColumn = (index: number, field: keyof SchemaColumn, value: string | boolean | number) => {
    setSchema((prev) =>
      prev.map((col, i) => (i === index ? { ...col, [field]: value } : col))
    );
    setSchemaDirty(true);
  };

  const addColumn = () => {
    setSchema((prev) => [
      ...prev,
      { name: "new_column", type: "VARCHAR(256)", nullable: true, order: prev.length + 1 },
    ]);
    setSchemaDirty(true);
  };

  const removeColumn = (index: number) => {
    setSchema((prev) => prev.filter((_, i) => i !== index));
    setSchemaDirty(true);
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
      case "PASS": return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "WARNING": return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "FAIL": return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const canSave = tableName && schema.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto">
      <div className="w-full max-w-4xl my-6 mx-4 rounded-xl border bg-card shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-bold">
              {isEdit ? "Edit Table" : "Create Table"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connector: <span className="font-mono text-primary">{connectorName}</span>
              {" · "}Tenant: <span className="font-mono">{tenantName}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Context & Scope */}
          <section className="rounded-lg border bg-secondary/30 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Context & Scope</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Database</Label>
                <Input className="bg-secondary font-mono text-xs" value={database} readOnly disabled />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Schema</Label>
                <Input className="bg-secondary font-mono text-xs" value={schemaName} readOnly disabled />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Table Name *</Label>
                <Input
                  className="bg-secondary font-mono text-xs"
                  placeholder="e.g. customer_orders"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  disabled={isEdit}
                />
              </div>
            </div>
          </section>

          {/* File Upload & Format */}
          <section className="rounded-lg border bg-secondary/30 p-4 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Upload className="h-3.5 w-3.5" /> File Upload & Format
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">File</Label>
                <div
                  className="border-2 border-dashed rounded-md p-5 text-center cursor-pointer hover:border-primary/50 transition-colors bg-secondary/50"
                  onClick={handleUploadFile}
                >
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-mono text-xs">{uploadedFile}</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      <Upload className="h-7 w-7 mx-auto mb-1.5 opacity-40" />
                      Click to upload or drag & drop
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">File Format</Label>
                  <Select value={fileFormat} onValueChange={setFileFormat}>
                    <SelectTrigger className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_FORMATS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Format-specific options */}
                {(fileFormat === "CSV" || fileFormat === "TSV") && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Delimiter</Label>
                      <Input className="bg-secondary font-mono text-xs" value={fileFormat === "CSV" ? "," : "\\t"} readOnly />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Header Row</Label>
                      <div className="flex items-center h-9 gap-2">
                        <Switch defaultChecked />
                        <span className="text-xs text-muted-foreground">Yes</span>
                      </div>
                    </div>
                  </div>
                )}
                {fileFormat === "JSON" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Flatten nested</Label>
                      <div className="flex items-center h-9 gap-2">
                        <Switch defaultChecked />
                        <span className="text-xs text-muted-foreground">Auto-flatten</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Compression</Label>
                      <Select defaultValue="none">
                        <SelectTrigger className="bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="gzip">Gzip</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {fileFormat === "Parquet" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Compression</Label>
                      <Select defaultValue="snappy">
                        <SelectTrigger className="bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="snappy">Snappy</SelectItem>
                          <SelectItem value="gzip">Gzip</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Timestamp handling</Label>
                      <Select defaultValue="ntz">
                        <SelectTrigger className="bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ntz">TIMESTAMP_NTZ</SelectItem>
                          <SelectItem value="ltz">TIMESTAMP_LTZ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Button size="sm" onClick={handleInferSchema} disabled={!uploadedFile || inferLoading}>
              {inferLoading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Inferring…</>
              ) : (
                <><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Infer Schema</>
              )}
            </Button>
          </section>

          {/* Schema Editor */}
          {schemaInferred && schema.length > 0 && (
            <section className="rounded-lg border bg-secondary/30 p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5" /> Schema Editor
                </h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={addColumn}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Column
                  </Button>
                  <Button size="sm" variant="outline" onClick={handlePreview} disabled={previewLoading || schema.length === 0}>
                    {previewLoading ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Loading…</>
                    ) : (
                      <><Eye className="h-3.5 w-3.5 mr-1.5" /> Preview</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2 px-3 font-medium">#</th>
                      <th className="text-left py-2 px-3 font-medium">Column Name</th>
                      <th className="text-left py-2 px-3 font-medium">Type</th>
                      <th className="text-left py-2 px-3 font-medium">Nullable</th>
                      <th className="text-left py-2 px-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {schema.map((col, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="py-1.5 px-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="py-1.5 px-3">
                          <Input
                            className="h-7 bg-secondary font-mono text-xs"
                            value={col.name}
                            onChange={(e) => updateColumn(i, "name", e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <Select value={col.type} onValueChange={(v) => updateColumn(i, "type", v)}>
                            <SelectTrigger className="h-7 bg-secondary font-mono text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SNOWFLAKE_TYPES.map((t) => (
                                <SelectItem key={t} value={t} className="font-mono text-xs">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-1.5 px-3">
                          <Switch
                            checked={col.nullable}
                            onCheckedChange={(v) => updateColumn(i, "nullable", v)}
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeColumn(i)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {schemaDirty && (
                <p className="text-xs text-warning mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Schema modified. Click Preview to see data with current schema.
                </p>
              )}
            </section>
          )}

          {/* Data Preview */}
          {(previewRows || previewError) && (
            <section className="rounded-lg border bg-secondary/30 p-4 animate-fade-in">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                <Eye className="h-3.5 w-3.5" /> Data Preview
              </h3>
              {previewError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-destructive font-medium">Preview Error</p>
                    <p className="text-xs text-destructive/80 mt-0.5">{previewError}</p>
                    <p className="text-xs text-muted-foreground mt-1">Adjust schema and re-preview.</p>
                  </div>
                </div>
              ) : previewRows && (
                <>
                  <div className="rounded-md border border-info/30 bg-info/5 px-3 py-2 mb-3">
                    <p className="text-xs text-info">Preview based on current schema draft — showing {previewRows.length} sample rows.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          {schema.map((col) => (
                            <th key={col.name} className="text-left py-1.5 px-2 font-medium font-mono">{col.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, ri) => (
                          <tr key={ri} className="border-b border-border/30 hover:bg-accent/20">
                            {schema.map((col) => (
                              <td key={col.name} className="py-1.5 px-2 font-mono text-foreground/80 max-w-[200px] truncate">
                                {String(row[col.name] ?? "NULL")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}

          {/* Validation */}
          {uploadedFile && schemaInferred && (
            <section className="rounded-lg border bg-secondary/30 p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Validation
                </h3>
                <Button size="sm" variant="outline" onClick={handleValidate} disabled={validateLoading}>
                  {validateLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Validating…</>
                  ) : "Run Validation"}
                </Button>
              </div>

              {validationResult && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center gap-3">
                    {resultIcon(validationResult.result)}
                    <Badge variant="outline" className={`text-sm px-3 py-1 ${resultBadgeClass(validationResult.result)}`}>
                      {validationResult.result}
                    </Badge>
                    {validationResult.row_count && (
                      <span className="text-xs text-muted-foreground">{validationResult.row_count.toLocaleString()} rows</span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 bg-secondary rounded-md p-3">{validationResult.summary}</p>

                  {validationResult.errors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-destructive mb-1.5">Errors ({validationResult.errors.length})</p>
                      <div className="space-y-1">
                        {validationResult.errors.map((e, i) => (
                          <div key={i} className="flex items-start gap-2 rounded bg-destructive/5 border border-destructive/20 p-2 text-xs">
                            <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                            <span className="font-mono text-destructive/80">{e.error_code}</span>
                            <span className="font-mono text-muted-foreground">{e.column_name}</span>
                            <span className="text-foreground/70">{e.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-warning mb-1.5">Warnings ({validationResult.warnings.length})</p>
                      <div className="space-y-1">
                        {validationResult.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 rounded bg-warning/5 border border-warning/20 p-2 text-xs">
                            <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                            <span className="font-mono text-warning/80">{w.warning_code}</span>
                            <span className="font-mono text-muted-foreground">{w.column_name}</span>
                            <span className="text-foreground/70">{w.message}</span>
                          </div>
                        ))}
                      </div>
                      {validationResult.result === "WARNING" && (
                        <Button size="sm" variant="outline" className="mt-2" onClick={handleInferSchema}>
                          Apply schema update from file
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Conflict Panel */}
          {conflict && (
            <section className="rounded-lg border border-warning/40 bg-warning/5 p-4 animate-fade-in">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-warning">Schema Conflict Detected</p>
                  <p className="text-xs text-muted-foreground mt-1">{conflict.diff_summary}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Table Columns (actual)</p>
                  <div className="bg-secondary rounded p-2 font-mono space-y-0.5">
                    {conflict.table_columns.map((c, i) => (
                      <div key={i}>{c.name} <span className="text-muted-foreground">{c.type}</span></div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Metadata Columns (app)</p>
                  <div className="bg-secondary rounded p-2 font-mono space-y-0.5">
                    {conflict.metadata_columns.map((c, i) => (
                      <div key={i}>{c.name} <span className="text-muted-foreground">{c.type}</span></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleResolveConflict("overwrite")} disabled={saveLoading}>
                  Overwrite with Our Version
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleResolveConflict("refresh")} disabled={saveLoading}>
                  Refresh Metadata from Table
                </Button>
              </div>
            </section>
          )}

          {/* Save Action */}
          <div className="flex items-center justify-between border-t pt-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave || saveLoading || !!conflict}>
              {saveLoading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving…</>
              ) : (
                <><Shield className="h-3.5 w-3.5 mr-1.5" /> {isEdit ? "Save Changes" : "Save & Create"}</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
