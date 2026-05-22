export interface Project {
  id: number;
  name: string;
  databaseUrl: string;
  createdAt: string;
}

export interface IntrospectionColumn {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
}

export interface IntrospectionResult {
  tables: Array<{ tableName: string }>;
  columns: IntrospectionColumn[];
  relationships: Array<{
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
  }>;
}

export interface QueryResult {
  sql: string;
  rows: Record<string, unknown>[];
}

export interface ApiError {
  error: string;
}
