I want to build a project called “PostgreSQL Query Assistant”.

Goal:
Build an AI-powered developer tool where a user can connect their PostgreSQL database, ask questions in natural language, and get:
1. generated PostgreSQL SQL query,
2. a short explanation of the query,
3. optional execution results from the connected database.

This is NOT a generic chatbot. It is a schema-aware, safe text-to-SQL assistant for PostgreSQL.

Core flow:
1. User creates a project in the app.
2. User adds a PostgreSQL connection string for their own database.
3. Backend introspects the user’s database schema.
4. We store schema metadata in our own platform database.
5. User asks something like: “Show the 5 most recent orders with customer name and total amount.”
6. AI uses the schema context to generate a PostgreSQL SELECT query.
7. Backend validates the SQL for safety.
8. If safe, backend executes it on the user’s database.
9. Return:
   - generated SQL
   - short explanation
   - rows/result

Important constraints:
- Only PostgreSQL is supported.
- Only read-only queries for MVP.
- Only SELECT queries allowed in MVP.
- Block UPDATE, DELETE, INSERT, DROP, ALTER, TRUNCATE, multi-statement SQL.
- Add row limits and query timeout.
- Treat this as a serious developer tool, not a toy demo.

Architecture:
- TypeScript backend
- Node.js
- Express or Fastify
- PostgreSQL
- pg library for database access
- Environment variables via dotenv
- We will start backend-first
- Frontend can come later

There are TWO databases in this project:

1. Platform database (our own PostgreSQL database)
This stores:
- projects
- saved database connections
- schema metadata
- query logs
- feedback

2. User database (customer PostgreSQL database)
This is the database the assistant connects to in order to:
- introspect schema
- run safe SELECT queries

The app should never run migrations on the user database.
The user database is only for schema reading and safe query execution.

Initial MVP scope:
- Project creation API
- Store PostgreSQL connection string
- Test database connection
- Introspect public schema tables/columns
- Save schema metadata
- Ask natural language question
- Generate SQL from schema context
- Validate SQL
- Execute safe SQL
- Return result

Please help me build this step by step.
Do not overengineer.
Start with a backend-first implementation.

Suggested backend folder structure:
src/
  config/
    env.ts
    db.ts
    ai.ts
  modules/
    projects/
      project.routes.ts
      project.controller.ts
      project.service.ts
    schema-introspection/
      introspection.routes.ts
      introspection.controller.ts
      introspection.service.ts
      postgres-introspector.ts
    query-assistant/
      query.routes.ts
      query.controller.ts
      query.service.ts
      prompt-builder.ts
      sql-validator.ts
      sql-runner.ts
      sql-explainer.ts
  shared/
    utils/
    errors/
  server.ts
  app.ts

Initial database tables for our platform DB:
1. projects
- id
- name
- database_url
- created_at

2. schema_tables
- id
- project_id
- table_name
- created_at

3. schema_columns
- id
- table_id
- column_name
- data_type
- is_nullable

4. query_logs
- id
- project_id
- user_question
- generated_sql
- status
- created_at

Implementation priorities:
1. Setup Express/Fastify + TypeScript backend
2. Connect platform PostgreSQL database
3. Create projects table
4. Build POST /projects
5. Build schema introspection service for user database
6. Build endpoint to fetch/store schema
7. Add AI SQL generation stub
8. Add SQL validation
9. Execute safe SELECT query

Coding preferences:
- Keep code simple and modular
- Use TypeScript properly
- Add clear comments
- Use async/await
- Add basic error handling
- Avoid unnecessary abstractions early
- Prefer working MVP over perfect architecture

For now, start by generating:
1. project folder/file structure,
2. package dependencies,
3. basic backend bootstrap files,
4. database connection setup,
5. SQL to create the initial platform tables,
6. first API endpoint for creating a project.