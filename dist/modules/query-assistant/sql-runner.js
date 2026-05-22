"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSelectSql = runSelectSql;
const pg_1 = require("pg");
async function runSelectSql(databaseUrl, sql) {
    const client = new pg_1.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
        const result = await client.query(sql);
        return result.rows;
    }
    finally {
        await client.end();
    }
}
