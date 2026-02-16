import { useState } from "react";
import {
  Upload,
  Table2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  ChevronDown,
  Pencil,
  Trash2,
  ArrowUpDown,
  RefreshCw,
  Shield,
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
import {
  MOCK_TABLES,
  MOCK_VALIDATION_PASS,
  MOCK_VALIDATION_WARNING,
  MOCK_VALIDATION_FAIL,
  MOCK_SCHEMA_CONFLICT,
  type SchemaColumn,
  type ValidationResult,
  type SchemaConflict,
} from "@/lib/mock-data";

const FILE_FORMATS = ["CSV", "TSV", "JSON", "Parquet"] as const;

const SNOWFLAKE_TYPES = [
  "VARCHAR(32)", "VARCHAR(64)", "VARCHAR(128)", "VARCHAR(256)",
  "NUMBER(18,2)", "NUMBER(10,2)", "NUMBER(38,0)",
  "BOOLEAN", "DATE", "TIMESTAMP_NTZ", "TIMESTAMP_LTZ",
  "VARIANT", "ARRAY", "OBJECT",
];

export default function TablesTab() {
  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedTable, setSelectedTable] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [fileFormat, setFileFormat] = useState<string>("CSV");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaColumn[]>([]);
  const [schemaInferred, setSchemaInferred] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showConflict, setShowConflict] = useState(false);
  const [conflictResolved, setConflictResolved] = useState(false);
  const [schemaSaved, setSchemaSaved] = useState(false);

  const handleInferSchema = () => {
    // Mock: use schema from selected table or generate new
    const table = MOCK_TABLES.find((t) => t.id === selectedTable);
    if (table) {
      setSchema([...table.schema]);
    } else {
      setSchema([
        { name: "id", type: "VARCHAR(64)", nullable: false, order: 1 },
        { name: "name", type: "VARCHAR(256)", nullable: false, order: 2 },
        { name: "value", type: "NUMBER(18,2)", nullable: true, order: 3 },
        { name: "created_at", type: "TIMESTAMP_NTZ", nullable: false, order: 4 },
      ]);
    }
    setSchemaInferred(true);
    setValidationResult(null);
    setShowConflict(false);
    setConflictResolved(false);
    setSchemaSaved(false);
  };

  const handleUploadFile = () => {
    setUploadedFile("sample_data_2026-02-16.csv");
    setValidationResult(null);
  };

  const handleRunValidation = () => {
    // Cycle through mock results for demo
    const results = [MOCK_VALIDATION_PASS, MOCK_VALIDATION_WARNING, MOCK_VALIDATION_FAIL];
    const random = results[Math.floor(Math.random() * results.length)];
    setValidationResult(random);
  };

  const handleApplySchema = () => {
    // Simulate conflict on first click
    if (!showConflict && !conflictResolved) {
      setShowConflict(true);
    } else {
      setSchemaSaved(true);
      setShowConflict(false);
    }
  };

  const handleResolveConflict = (resolution: "overwrite" | "refresh") => {
    if (resolution === "refresh") {
      setSchema([...MOCK_SCHEMA_CONFLICT.table_columns]);
    }
    setConflictResolved(true);
    setShowConflict(false);
    setSchemaSaved(true);
  };

  const updateColumn = (index: number, field: keyof SchemaColumn, value: string | boolean | number) => {
    setSchema((prev) =>
      prev.map((col, i) => (i === index ? { ...col, [field]: value } : col))
    );
  };

  const addColumn = () => {
    setSchema((prev) => [
      ...prev,
      { name: "new_column", type: "VARCHAR(256)", nullable: true, order: prev.length + 1 },
    ]);
  };

  const removeColumn = (index: number) => {
    setSchema((prev) => prev.filter((_, i) => i !== index));
  };

  const resultIcon = (result: string) => {
    switch (result) {
      case "PASS": return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "WARNING": return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "FAIL": return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const resultBadgeClass = (result: string) => {
    switch (result) {
      case "PASS": return "bg-success/15 text-success border-success/30";
      case "WARNING": return "bg-warning/15 text-warning border-warning/30";
      case "FAIL": return "bg-destructive/15 text-destructive border-destructive/30";
      default: return "";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Step 1: Create or Select */}
      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Table2 className="h-4 w-4 text-primary" />
          Table Selection
        </h3>
        <div className="flex gap-3 mb-4">
          <Button
            variant={mode === "select" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("select")}
          >
            Select Existing
          </Button>
          <Button
            variant={mode === "create" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("create")}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Create New
          </Button>
        </div>

        {mode === "select" ? (
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger className="w-full max-w-md bg-secondary">
              <SelectValue placeholder="Choose a table…" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_TABLES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="font-mono text-xs">{t.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">({t.format})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="max-w-md bg-secondary"
            placeholder="e.g. customer_orders"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
          />
        )}
      </section>

      {/* Step 2: File Upload & Format */}
      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          File Upload & Format
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">File</Label>
            <div
              className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:border-primary/50 transition-colors bg-secondary/50"
              onClick={handleUploadFile}
            >
              {uploadedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-mono text-sm">{uploadedFile}</span>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
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
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Flatten nested</Label>
                <div className="flex items-center h-9 gap-2">
                  <Switch defaultChecked />
                  <span className="text-xs text-muted-foreground">Auto-flatten</span>
                </div>
              </div>
            )}
            {fileFormat === "Parquet" && (
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
            )}
          </div>
        </div>
        <div className="mt-4">
          <Button size="sm" onClick={handleInferSchema} disabled={!uploadedFile}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Infer Schema
          </Button>
        </div>
      </section>

      {/* Step 3: Schema Editor */}
      {schemaInferred && (
        <section className="rounded-lg border bg-card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-primary" />
              Schema Editor
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addColumn}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Column
              </Button>
              <Button size="sm" onClick={handleApplySchema}>
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                {schemaSaved ? "Schema Applied ✓" : "Save / Apply Schema"}
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
                  <th className="text-left py-2 px-3 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {schema.map((col, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="py-2 px-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="py-2 px-3">
                      <Input
                        className="h-8 bg-secondary font-mono text-xs"
                        value={col.name}
                        onChange={(e) => updateColumn(i, "name", e.target.value)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Select value={col.type} onValueChange={(v) => updateColumn(i, "type", v)}>
                        <SelectTrigger className="h-8 bg-secondary font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SNOWFLAKE_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="font-mono text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 px-3">
                      <Switch
                        checked={col.nullable}
                        onCheckedChange={(v) => updateColumn(i, "nullable", v)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeColumn(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Schema Conflict UI */}
          {showConflict && (
            <div className="mt-4 rounded-md border border-warning/40 bg-warning/5 p-4 animate-fade-in">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-warning">Schema Conflict Detected</p>
                  <p className="text-xs text-muted-foreground mt-1">{MOCK_SCHEMA_CONFLICT.diff_summary}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Table Columns (actual)</p>
                  <div className="bg-secondary rounded p-2 font-mono space-y-0.5">
                    {MOCK_SCHEMA_CONFLICT.table_columns.map((c, i) => (
                      <div key={i}>{c.name} <span className="text-muted-foreground">{c.type}</span></div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Metadata Columns (app)</p>
                  <div className="bg-secondary rounded p-2 font-mono space-y-0.5">
                    {MOCK_SCHEMA_CONFLICT.metadata_columns.map((c, i) => (
                      <div key={i}>{c.name} <span className="text-muted-foreground">{c.type}</span></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="default" onClick={() => handleResolveConflict("overwrite")}>
                  Overwrite with Our Version
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleResolveConflict("refresh")}>
                  Refresh Metadata from Table
                </Button>
              </div>
            </div>
          )}

          {schemaSaved && !showConflict && (
            <div className="mt-4 rounded-md border border-success/40 bg-success/10 p-3 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm text-success">Schema applied successfully via APPLY_SCHEMA. DDL executed and metadata synced.</span>
            </div>
          )}
        </section>
      )}

      {/* Step 4: Validation */}
      {uploadedFile && schemaInferred && (
        <section className="rounded-lg border bg-card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Validation
            </h3>
            <Button size="sm" onClick={handleRunValidation}>
              Run Validation
            </Button>
          </div>

          {validationResult && (
            <div className="animate-fade-in space-y-3">
              {/* Result badge */}
              <div className="flex items-center gap-3">
                {resultIcon(validationResult.result)}
                <Badge variant="outline" className={`text-sm px-3 py-1 ${resultBadgeClass(validationResult.result)}`}>
                  {validationResult.result}
                </Badge>
                {validationResult.row_count && (
                  <span className="text-xs text-muted-foreground">{validationResult.row_count.toLocaleString()} rows</span>
                )}
                {validationResult.validated_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(validationResult.validated_at).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Summary */}
              <p className="text-sm text-foreground/80 bg-secondary rounded-md p-3">{validationResult.summary}</p>

              {/* Errors */}
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

              {/* Warnings */}
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
                  {/* Optional: Apply schema update from warning */}
                  {validationResult.result === "WARNING" && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={handleApplySchema}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Apply Schema Update from File
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
