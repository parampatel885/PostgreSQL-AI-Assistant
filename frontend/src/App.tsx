import { useState, useMemo, type JSX } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { Sidebar } from "@/components/Sidebar";
import type { ApiError, IntrospectionResult, Project, QueryResult } from "@/types/api";

const API_BASE = "http://localhost:3000";

function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "******";
    return parsed.toString();
  } catch {
    return "******";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T | ApiError;
  if (!response.ok) throw new Error((data as ApiError).error ?? "Request failed");
  return data as T;
}

export function App(): JSX.Element {
  const [activePage, setActivePage] = useState("projects");
  const [projectName, setProjectName] = useState("");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [introspection, setIntrospection] = useState<IntrospectionResult | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isIntrospecting, setIsIntrospecting] = useState(false);
  const [isRunningQuery, setIsRunningQuery] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const columnsByTable = useMemo(() => {
    if (!introspection) return new Map<string, IntrospectionResult["columns"]>();
    return introspection.columns.reduce((acc, column) => {
      const existing = acc.get(column.tableName) ?? [];
      existing.push(column);
      acc.set(column.tableName, existing);
      return acc;
    }, new Map<string, IntrospectionResult["columns"]>());
  }, [introspection]);

  async function createProject(): Promise<void> {
    setIsCreatingProject(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: projectName, databaseUrl }),
      });
      const project = await parseResponse<Project>(response);
      setCurrentProject(project);
      setIntrospection(null);
      setQueryResult(null);
      setFeedback("Project created successfully.");
      setActivePage("schema");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create project.");
    } finally {
      setIsCreatingProject(false);
    }
  }

  async function introspectSchema(): Promise<void> {
    if (!currentProject) return;
    setIsIntrospecting(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE}/api/projects/${currentProject.id}/introspect`, {
        method: "POST",
        credentials: "include",
      });
      const result = await parseResponse<IntrospectionResult>(response);
      setIntrospection(result);
      setFeedback("Schema introspection complete.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to introspect schema.");
    } finally {
      setIsIntrospecting(false);
    }
  }

  async function runQuery(): Promise<void> {
    if (!currentProject) return;
    setIsRunningQuery(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId: currentProject.id, question }),
      });
      const result = await parseResponse<QueryResult>(response);
      setQueryResult(result);
      setFeedback("Query completed.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to run query.");
    } finally {
      setIsRunningQuery(false);
    }
  }

  const rows = queryResult?.rows ?? [];
  const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];

  function renderPage() {
    switch (activePage) {
      case "projects":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
              <p className="text-sm text-muted-foreground">Connect a PostgreSQL database to get started.</p>
            </div>

            {(feedback || error) && (
              <Card className={error ? "border-red-300" : "border-green-300"}>
                <CardContent className="pt-4">
                  {feedback && <p className="text-sm text-green-700 dark:text-green-400">{feedback}</p>}
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>New Project</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    placeholder="Sales Analytics"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="database-url">PostgreSQL URL</Label>
                  <Input
                    id="database-url"
                    placeholder="postgresql://user:password@host:5432/dbname"
                    value={databaseUrl}
                    onChange={(e) => setDatabaseUrl(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    onClick={createProject}
                    disabled={!projectName.trim() || !databaseUrl.trim() || isCreatingProject}
                  >
                    {isCreatingProject ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {currentProject && (
              <Card>
                <CardHeader>
                  <CardTitle>Active Project</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">ID: {currentProject.id}</Badge>
                    <Badge variant="outline">{currentProject.name}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {maskDatabaseUrl(currentProject.databaseUrl)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "schema":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Schema</h2>
                <p className="text-sm text-muted-foreground">Introspect and explore your database schema.</p>
              </div>
              <Button onClick={introspectSchema} disabled={!currentProject || isIntrospecting}>
                {isIntrospecting ? "Introspecting..." : "Refresh Schema"}
              </Button>
            </div>

            {!currentProject && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">No project selected. Create one first.</p>
                </CardContent>
              </Card>
            )}

            {!introspection && currentProject && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Click Refresh Schema to introspect your database.</p>
                </CardContent>
              </Card>
            )}

            {introspection && (
              <div className="grid gap-4 md:grid-cols-2">
                {introspection.tables.map((table) => {
                  const columns = columnsByTable.get(table.tableName) ?? [];
                  return (
                    <Card key={table.tableName}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-base">
                          <span>{table.tableName}</span>
                          <Badge variant="secondary">{columns.length} cols</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {columns.map((column) => (
                          <div
                            key={`${column.tableName}-${column.columnName}`}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="font-medium">{column.columnName}</span>
                            <span className="text-muted-foreground text-xs">
                              {column.dataType} {column.isNullable ? "" : "· required"}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "query":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Query Assistant</h2>
              <p className="text-sm text-muted-foreground">Ask questions in plain English.</p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question">Your Question</Label>
                  <Textarea
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Show top 10 customers by total revenue in the last 30 days."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={runQuery}
                  disabled={!currentProject || !question.trim() || isRunningQuery}
                >
                  {isRunningQuery ? "Running..." : "Run Query"}
                </Button>
              </CardContent>
            </Card>

            {queryResult && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Generated SQL</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="overflow-auto rounded-md border bg-muted p-3 text-sm">
                      <code>{queryResult.sql}</code>
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Results
                      <Badge variant="secondary" className="ml-2">{rows.length} rows</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No rows returned.</p>
                    ) : (
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {columnNames.map((col) => (
                                <TableHead key={col}>{col}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((row, i) => (
                              <TableRow key={i}>
                                {columnNames.map((col) => (
                                  <TableCell key={col}>
                                    {row[col] === null ? (
                                      <span className="text-muted-foreground">null</span>
                                    ) : (
                                      String(row[col])
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        );

      case "search":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Semantic Search</h2>
              <p className="text-sm text-muted-foreground">Find relevant tables using natural language.</p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Coming soon — semantic table search powered by vector embeddings.</p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-5xl">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
