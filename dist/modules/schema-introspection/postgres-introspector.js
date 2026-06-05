"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.introspectPostgresSchema = introspectPostgresSchema;
const pg_1 = require("pg");
const introspection_logger_1 = require("./introspection.logger");
function logStepError(step, error, databaseUrl) {
    if ((0, introspection_logger_1.isPostgresConnectionError)(error)) {
        (0, introspection_logger_1.logPostgresConnectionError)(step, error, databaseUrl);
        return;
    }
    (0, introspection_logger_1.logIntrospectionError)(step, error);
}
async function introspectPostgresSchema(databaseUrl) {
    let client = null;
    try {
        (0, introspection_logger_1.logIntrospectionStep)("Creating PostgreSQL client");
        client = new pg_1.Client({ connectionString: databaseUrl });
    }
    catch (error) {
        logStepError("Creating PostgreSQL client", error, databaseUrl);
        throw error;
    }
    try {
        (0, introspection_logger_1.logIntrospectionStep)("Connecting to target database");
        await client.connect();
        (0, introspection_logger_1.logIntrospectionStep)("Connected successfully");
    }
    catch (error) {
        logStepError("Connecting to target database", error, databaseUrl);
        throw error;
    }
    try {
        let tablesResult;
        try {
            (0, introspection_logger_1.logIntrospectionStep)("Fetching tables");
            tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
            (0, introspection_logger_1.logIntrospectionStep)("Fetching tables completed", { tableCount: tablesResult.rows.length });
        }
        catch (error) {
            logStepError("Fetching tables", error, databaseUrl);
            throw error;
        }
        let columnsResult;
        try {
            (0, introspection_logger_1.logIntrospectionStep)("Fetching columns");
            columnsResult = await client.query(`
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `);
            (0, introspection_logger_1.logIntrospectionStep)("Fetching columns completed", { columnCount: columnsResult.rows.length });
        }
        catch (error) {
            logStepError("Fetching columns", error, databaseUrl);
            throw error;
        }
        let relationshipsResult;
        try {
            (0, introspection_logger_1.logIntrospectionStep)("Fetching relationships");
            relationshipsResult = await client.query(`
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
      `);
            (0, introspection_logger_1.logIntrospectionStep)("Fetching relationships completed", {
                relationshipCount: relationshipsResult.rows.length,
            });
        }
        catch (error) {
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
    }
    finally {
        if (client) {
            try {
                await client.end();
            }
            catch (error) {
                (0, introspection_logger_1.logIntrospectionError)("Closing PostgreSQL client", error);
            }
        }
    }
}
