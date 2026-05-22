"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testPlatformDbConnection = testPlatformDbConnection;
const pg_1 = require("pg");
const env_1 = require("./env");
exports.pool = new pg_1.Pool({
    connectionString: env_1.env.databaseUrl,
});
async function testPlatformDbConnection() {
    await exports.pool.query("SELECT 1");
}
