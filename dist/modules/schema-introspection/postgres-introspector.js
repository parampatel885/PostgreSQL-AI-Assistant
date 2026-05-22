"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.introspectPostgresSchema = introspectPostgresSchema;
const pg_1 = require("pg");
async function introspectPostgresSchema(databaseUrl) {
    const client = new pg_1.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
        const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
        const columnsResult = await client.query(`
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `);
        const relationshipsResult = await client.query(`
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
        await client.end();
    }
}
