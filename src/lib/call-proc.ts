// Centralized stored procedure shim
// All data operations go through this — no direct DML/DDL from the app.
// CI-20188: listing, inference, connector ops
// CI-20192: APPLY_SCHEMA (DDL + metadata sync, conflict handling)
// CI-20195: validation, preview

import {
  MOCK_TABLES,
  MOCK_CONNECTORS,
  MOCK_VALIDATION_PASS,
  MOCK_VALIDATION_WARNING,
  MOCK_VALIDATION_FAIL,
  MOCK_SCHEMA_CONFLICT,
  type SchemaColumn,
  type Connector,
  type TableDef,
  type ValidationResult,
  type SchemaConflict,
} from "./mock-data";

// Simulated latency
const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

// Mocked preview rows based on schema
function generatePreviewRows(schema: SchemaColumn[], count = 5): Record<string, string | number | boolean | null>[] {
  const rows: Record<string, string | number | boolean | null>[] = [];
  for (let r = 0; r < count; r++) {
    const row: Record<string, string | number | boolean | null> = {};
    schema.forEach((col) => {
      if (col.type.startsWith("VARCHAR")) row[col.name] = `sample_${col.name}_${r + 1}`;
      else if (col.type.startsWith("NUMBER")) row[col.name] = +(Math.random() * 1000).toFixed(2);
      else if (col.type === "BOOLEAN") row[col.name] = r % 2 === 0;
      else if (col.type.startsWith("TIMESTAMP") || col.type === "DATE") row[col.name] = new Date(Date.now() - r * 86400000).toISOString();
      else if (col.type === "VARIANT" || col.type === "OBJECT") row[col.name] = `{"key_${r}": "value"}`;
      else if (col.type === "ARRAY") row[col.name] = `["item_${r}"]`;
      else row[col.name] = `val_${r}`;
    });
    rows.push(row);
  }
  return rows;
}

type ProcResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

/**
 * Central procedure caller. All app operations MUST go through this.
 * In production, this calls Snowflake stored procedures via session.
 */
export async function callProc(name: string, kwargs: Record<string, unknown> = {}): Promise<ProcResult> {
  await delay();

  switch (name) {
    // ===== CI-20188: Listing =====
    case "LIST_TENANTS":
      return { success: true, data: [{ id: "tenant-1", name: "ACME_PROD" }] };

    case "LIST_CONNECTORS":
      return { success: true, data: MOCK_CONNECTORS };

    case "GET_CONNECTOR":
      return {
        success: true,
        data: MOCK_CONNECTORS.find((c) => c.id === kwargs.connector_id) || null,
      };

    case "LIST_TABLES":
      return { success: true, data: MOCK_TABLES };

    case "LIST_CONNECTOR_TABLES": {
      const conn = MOCK_CONNECTORS.find((c) => c.id === kwargs.connector_id);
      return { success: true, data: conn?.tables || [] };
    }

    // ===== CI-20188: Inference =====
    case "INFER_SCHEMA": {
      const existingTable = MOCK_TABLES.find((t) => t.id === kwargs.table_id);
      if (existingTable) {
        return { success: true, data: { columns: existingTable.schema } };
      }
      // New table: generate from mock file
      return {
        success: true,
        data: {
          columns: [
            { name: "id", type: "VARCHAR(64)", nullable: false, order: 1 },
            { name: "name", type: "VARCHAR(256)", nullable: false, order: 2 },
            { name: "value", type: "NUMBER(18,2)", nullable: true, order: 3 },
            { name: "created_at", type: "TIMESTAMP_NTZ", nullable: false, order: 4 },
          ] as SchemaColumn[],
        },
      };
    }

    // ===== CI-20195: Preview =====
    case "PREVIEW_DATA": {
      const schema = kwargs.schema as SchemaColumn[] | undefined;
      if (!schema || schema.length === 0) {
        return { success: false, error: "No schema provided for preview." };
      }
      // Simulate parse error for certain conditions
      const hasVariant = schema.some((c) => c.type === "VARIANT");
      if (hasVariant && schema.length > 6) {
        return { success: false, error: "Parse error: unable to cast nested VARIANT at column 7." };
      }
      return { success: true, data: { rows: generatePreviewRows(schema), total_rows: 1247 } };
    }

    // ===== CI-20195: Validation =====
    case "VALIDATE_FILE": {
      const results = [MOCK_VALIDATION_PASS, MOCK_VALIDATION_WARNING, MOCK_VALIDATION_FAIL];
      return { success: true, data: results[Math.floor(Math.random() * results.length)] };
    }

    // ===== CI-20192: Apply Schema =====
    case "APPLY_SCHEMA": {
      // First call: simulate conflict; subsequent: success
      const forceConflict = kwargs._force_conflict as boolean | undefined;
      if (forceConflict) {
        return { success: true, data: { conflict: MOCK_SCHEMA_CONFLICT } };
      }
      return { success: true, data: { applied: true, schema_version: 2 } };
    }

    case "RESOLVE_CONFLICT": {
      return { success: true, data: { resolved: true, resolution: kwargs.resolution } };
    }

    // ===== CI-20188: Connector ops =====
    case "SAVE_CONNECTOR":
      return { success: true, data: { connector_id: kwargs.connector_id || `c-${Date.now()}`, status: "saved" } };

    case "DEPLOY_CONNECTOR":
      return { success: true, data: { connector_id: kwargs.connector_id, status: "deployed" } };

    case "CREATE_TABLE": {
      return {
        success: true,
        data: {
          id: `t-${Date.now()}`,
          name: kwargs.table_name,
          schema: kwargs.schema,
          format: kwargs.format || "CSV",
          created_at: new Date().toISOString(),
        } as TableDef,
      };
    }

    default:
      return { success: false, error: `Unknown procedure: ${name}` };
  }
}
