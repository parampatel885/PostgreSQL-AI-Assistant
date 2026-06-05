import { Client } from "pg";
import {
  isPostgresConnectionError,
  logIntrospectionError,
  logIntrospectionStep,
  logPostgresConnectionError,
} from "./introspection.logger";

export interface IntrospectedTable {
  tableName: string;
}

export interface IntrospectedColumn {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
}

export interface IntrospectedRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface IntrospectionResult {
  tables: IntrospectedTable[];
  columns: IntrospectedColumn[];
  relationships: IntrospectedRelationship[];
}

function logStepError(step: string, error: unknown, databaseUrl: string): void {
  if (isPostgresConnectionError(error)) {
    logPostgresConnectionError(step, error, databaseUrl);
    return;
  }
  logIntrospectionError(step, error);
}

export async function introspectPostgresSchema(databaseUrl: string): Promise<IntrospectionResult> {
  let client: Client | null = null;

  try {
    logIntrospectionStep("Creating PostgreSQL client");
    client = new Client({ connectionString: databaseUrl });
  } catch (error) {
    logStepError("Creating PostgreSQL client", error, databaseUrl);
    throw error;
  }

  try {
    logIntrospectionStep("Connecting to target database");
    await client.connect();
    logIntrospectionStep("Connected successfully");
  } catch (error) {
    logStepError("Connecting to target database", error, databaseUrl);
    throw error;
  }

  try {
    let tablesResult;
    try {
      logIntrospectionStep("Fetching tables");
      tablesResult = await client.query<{ table_name: string }>(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
      );
      logIntrospectionStep("Fetching tables completed", { tableCount: tablesResult.rows.length });
    } catch (error) {
      logStepError("Fetching tables", error, databaseUrl);
      throw error;
    }

    let columnsResult;
    try {
      logIntrospectionStep("Fetching columns");
      columnsResult = await client.query<{
        table_name: string;
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>(
        `
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `
      );
      logIntrospectionStep("Fetching columns completed", { columnCount: columnsResult.rows.length });
    } catch (error) {
      logStepError("Fetching columns", error, databaseUrl);
      throw error;
    }

    let relationshipsResult;
    try {
      logIntrospectionStep("Fetching relationships");
      relationshipsResult = await client.query<{
        from_table: string;
        from_column: string;
        to_table: string;
        to_column: string;
      }>(
        `
        SELECT
          tc.table_name AS from_table,
          kcu.column_name AS from_column,
          ccu.table_name AS to_table,
          ccu.column_name AS to_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public';
      `
      );
      logIntrospectionStep("Fetching relationships completed", {
        relationshipCount: relationshipsResult.rows.length,
      });
    } catch (error) {
      logStepError("Fetching relationships", error, databaseUrl);
      throw error;
    }

    return {
      tables: tablesResult.rows.map((row) => ({
        tableName: row.table_name,
      })),
      columns: columnsResult.rows.map((row) => ({
        tableName: row.table_name,
        columnName: row.column_name,
        dataType: row.data_type,
        isNullable: row.is_nullable === "YES",
      })),
      relationships: relationshipsResult.rows.map((row) => ({
        fromTable: row.from_table,
        fromColumn: row.from_column,
        toTable: row.to_table,
        toColumn: row.to_column,
      })),
    };
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (error) {
        logIntrospectionError("Closing PostgreSQL client", error);
      }
    }
  }
}
