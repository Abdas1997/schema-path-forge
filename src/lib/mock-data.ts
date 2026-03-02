// Mock data and types for the File Ingestion app

export interface Tenant {
  id: string;
  name: string;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  order: number;
}

export interface ValidationError {
  error_code: string;
  column_name: string;
  message: string;
}

export interface ValidationWarning {
  warning_code: string;
  column_name: string;
  message: string;
}

export interface ValidationResult {
  result: "PASS" | "WARNING" | "FAIL";
  summary: string;
  row_count?: number;
  validated_at?: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface TableDef {
  id: string;
  name: string;
  database?: string;
  schemaName?: string;
  schema: SchemaColumn[];
  format: string;
  created_at: string;
}

export interface Credential {
  username: string;
  public_key: string;
}

export interface ConnectorTable {
  table_id: string;
  table_name: string;
  connector_table_name: string;
  s3_path: string;
}

export interface Connector {
  id: string;
  name: string;
  description: string;
  credentials: Credential[];
  schedule_type: "cron" | "on_landing";
  schedule_cron?: string;
  tables: ConnectorTable[];
  status: "saved" | "deployed";
  created_at: string;
}

export interface SchemaConflict {
  has_conflict: boolean;
  diff_summary: string;
  table_columns: SchemaColumn[];
  metadata_columns: SchemaColumn[];
}

// Mock tenants (single = hide selector)
export const MOCK_TENANTS: Tenant[] = [
  { id: "tenant-1", name: "ACME_PROD" },
];

// Mock existing tables
export const MOCK_TABLES: TableDef[] = [
  {
    id: "t-001",
    name: "customer_transactions",
    database: "PSOPERATIONAL",
    schemaName: "FILE_INGESTION",
    schema: [
      { name: "transaction_id", type: "VARCHAR(64)", nullable: false, order: 1 },
      { name: "customer_id", type: "VARCHAR(32)", nullable: false, order: 2 },
      { name: "amount", type: "NUMBER(18,2)", nullable: false, order: 3 },
      { name: "currency", type: "VARCHAR(3)", nullable: true, order: 4 },
      { name: "transaction_date", type: "TIMESTAMP_NTZ", nullable: false, order: 5 },
    ],
    format: "CSV",
    created_at: "2025-12-10T14:30:00Z",
  },
  {
    id: "t-002",
    name: "product_catalog",
    database: "PSOPERATIONAL",
    schemaName: "FILE_INGESTION",
    schema: [
      { name: "product_id", type: "VARCHAR(32)", nullable: false, order: 1 },
      { name: "name", type: "VARCHAR(256)", nullable: false, order: 2 },
      { name: "category", type: "VARCHAR(64)", nullable: true, order: 3 },
      { name: "price", type: "NUMBER(10,2)", nullable: false, order: 4 },
    ],
    format: "JSON",
    created_at: "2025-12-12T09:00:00Z",
  },
  {
    id: "t-003",
    name: "user_events",
    database: "PSOPERATIONAL",
    schemaName: "FILE_INGESTION",
    schema: [
      { name: "event_id", type: "VARCHAR(64)", nullable: false, order: 1 },
      { name: "user_id", type: "VARCHAR(32)", nullable: false, order: 2 },
      { name: "event_type", type: "VARCHAR(32)", nullable: false, order: 3 },
      { name: "payload", type: "VARIANT", nullable: true, order: 4 },
      { name: "created_at", type: "TIMESTAMP_NTZ", nullable: false, order: 5 },
    ],
    format: "Parquet",
    created_at: "2026-01-05T11:15:00Z",
  },
];

// Mock connectors
export const MOCK_CONNECTORS: Connector[] = [
  {
    id: "c-001",
    name: "acme-prod-ingest",
    description: "Primary production data ingestion connector for ACME Corp",
    credentials: [
      { username: "acme_sftp_user", public_key: "ssh-rsa AAAAB3Nza...truncated" },
    ],
    schedule_type: "cron",
    schedule_cron: "0 */6 * * *",
    tables: [
      {
        table_id: "t-001",
        table_name: "customer_transactions",
        connector_table_name: "transactions",
        s3_path: "s3://fi-ingest-prod/acme-prod-ingest/transactions/",
      },
    ],
    status: "deployed",
    created_at: "2026-01-10T08:00:00Z",
  },
  {
    id: "c-002",
    name: "partner-feed",
    description: "Partner data feed – product catalog sync",
    credentials: [
      { username: "partner_upload", public_key: "ssh-rsa AAAAB3Nzb...truncated" },
    ],
    schedule_type: "on_landing",
    tables: [
      {
        table_id: "t-002",
        table_name: "product_catalog",
        connector_table_name: "products",
        s3_path: "s3://fi-ingest-prod/partner-feed/products/",
      },
    ],
    status: "saved",
    created_at: "2026-01-15T10:00:00Z",
  },
];

// Mock validation results
export const MOCK_VALIDATION_PASS: ValidationResult = {
  result: "PASS",
  summary: "All 1,247 rows passed validation. Schema matches, no type errors.",
  row_count: 1247,
  validated_at: "2026-02-16T12:30:00Z",
  errors: [],
  warnings: [],
};

export const MOCK_VALIDATION_WARNING: ValidationResult = {
  result: "WARNING",
  summary: "1,180 of 1,200 rows valid. 2 warnings detected: extra column and nullable mismatch.",
  row_count: 1200,
  validated_at: "2026-02-16T12:32:00Z",
  errors: [],
  warnings: [
    { warning_code: "W001", column_name: "loyalty_tier", message: "Extra column 'loyalty_tier' found in file but not in schema" },
    { warning_code: "W002", column_name: "currency", message: "Column 'currency' has NULL values but schema marks it as NOT NULL" },
  ],
};

export const MOCK_VALIDATION_FAIL: ValidationResult = {
  result: "FAIL",
  summary: "Validation failed: 45 rows with type errors, 3 missing required columns.",
  row_count: 980,
  validated_at: "2026-02-16T12:35:00Z",
  errors: [
    { error_code: "E001", column_name: "amount", message: "Type mismatch: expected NUMBER(18,2), found VARCHAR in 45 rows" },
    { error_code: "E002", column_name: "transaction_id", message: "Required column 'transaction_id' missing from file" },
    { error_code: "E003", column_name: "transaction_date", message: "Required column 'transaction_date' missing from file" },
  ],
  warnings: [
    { warning_code: "W001", column_name: "notes", message: "Extra column 'notes' found in file but not in schema" },
  ],
};

export const MOCK_SCHEMA_CONFLICT: SchemaConflict = {
  has_conflict: true,
  diff_summary: "Table was altered outside the app: column 'loyalty_tier' was added, column 'currency' type changed from VARCHAR(3) to VARCHAR(10).",
  table_columns: [
    { name: "transaction_id", type: "VARCHAR(64)", nullable: false, order: 1 },
    { name: "customer_id", type: "VARCHAR(32)", nullable: false, order: 2 },
    { name: "amount", type: "NUMBER(18,2)", nullable: false, order: 3 },
    { name: "currency", type: "VARCHAR(10)", nullable: true, order: 4 },
    { name: "transaction_date", type: "TIMESTAMP_NTZ", nullable: false, order: 5 },
    { name: "loyalty_tier", type: "VARCHAR(16)", nullable: true, order: 6 },
  ],
  metadata_columns: [
    { name: "transaction_id", type: "VARCHAR(64)", nullable: false, order: 1 },
    { name: "customer_id", type: "VARCHAR(32)", nullable: false, order: 2 },
    { name: "amount", type: "NUMBER(18,2)", nullable: false, order: 3 },
    { name: "currency", type: "VARCHAR(3)", nullable: true, order: 4 },
    { name: "transaction_date", type: "TIMESTAMP_NTZ", nullable: false, order: 5 },
  ],
};
