import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Database, MessageSquare, Table2, Clock, Settings2,
  ChevronLeft, ChevronRight, ArrowLeft, LogOut, Sun, Moon,
  RefreshCw, Eye, EyeOff,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const API_BASE = "http://localhost:3000";

type Tab = "query" | "schema" | "logs" | "settings";

interface Project {
  id: number;
  name: string;
  databaseUrl: string;
  tableCount?: number;
  createdAt: string;
}

interface Column {
  columnName: string;
  dataType: string;
  isNullable: boolean;
}

interface SchemaTable {
  tableName: string;
  columns: Column[];
}

interface QueryLog {
  id: number;
  query: string;
  sql: string;
  createdAt: string;
}

interface QueryResult {
  sql: string;
  rows: Record<string, unknown>[];
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1d ago";
  return `${diffDays}d ago`;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ activeTab, onTabChange, collapsed, onToggleCollapse, onLogout }: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
}) {
  const { theme, toggle } = useTheme();

  const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "query", label: "Query", icon: MessageSquare },
    { id: "schema", label: "Schema", icon: Table2 },
    { id: "logs", label: "Logs", icon: Clock },
    { id: "settings", label: "Settings", icon: Settings2 },
  ];

  const itemBase = "w-full flex items-center gap-3 py-2 rounded-md text-sm transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ring";
  const itemPad = collapsed ? "justify-center px-0" : "px-3";

  return (
    <div className={`flex flex-col h-screen bg-card border-r border-border flex-shrink-0 transition-all duration-200 ${collapsed ? "w-14" : "w-56"}`}>
      {/* Logo */}
      <div className={`flex items-center gap-2.5 p-4 border-b border-border ${collapsed ? "justify-center" : ""}`}>
        <div className="relative flex items-center justify-center w-7 h-7 rounded-md bg-primary flex-shrink-0">
          <Database className="w-[15px] h-[15px] text-primary-foreground" strokeWidth={2} />
          <svg className="absolute top-[4px] right-[4px] w-2.5 h-2.5 text-primary-foreground drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M6 0 L6.6 4.8 L11 6 L6.6 7.2 L6 12 L5.4 7.2 L1 6 L5.4 4.8 Z" />
          </svg>
        </div>
        {!collapsed && (
          <span className="text-[13px] font-medium text-foreground tracking-tight leading-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            PG Query Assistant
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            title={collapsed ? label : undefined}
            className={`${itemBase} ${itemPad} ${activeTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-border space-y-0.5">
        <button onClick={onToggleCollapse} className={`${itemBase} ${itemPad} text-muted-foreground hover:bg-muted hover:text-foreground`}>
          {collapsed ? <ChevronRight className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} /> : <><ChevronLeft className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} /><span>Collapse</span></>}
        </button>
        <button onClick={toggle} className={`${itemBase} ${itemPad} text-muted-foreground hover:bg-muted hover:text-foreground`}>
          {theme === "dark" ? <Sun className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} /> : <Moon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />}
          {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>
        <button onClick={onLogout} className={`${itemBase} ${itemPad} text-muted-foreground hover:bg-muted hover:text-foreground`}>
          <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({ project, onBack }: { project: Project; onBack: () => void }) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ring">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
        </button>
        <span className="text-[14px] font-semibold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {project.name}
        </span>
      </div>
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        <span className="text-[11px] font-semibold text-primary-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PP</span>
      </div>
    </header>
  );
}

// ─── Query tab ────────────────────────────────────────────────────────────────
interface QueryTabProps {
  projectId: number;
  question: string;
  setQuestion: (q: string) => void;
  result: QueryResult | null;
  setResult: (r: QueryResult | null) => void;
  error: string | null;
  setError: (e: string | null) => void;
  onQuerySuccess: () => void;
}

function QueryTab({ projectId, question, setQuestion, result, setResult, error, setError,onQuerySuccess }: QueryTabProps) {
  const [loading, setLoading] = useState(false);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId, question }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Query failed");
      }
      const data = await res.json();
      setResult(data);
      onQuerySuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }

  const rows = result?.rows ?? [];
  const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-5 w-full">
      <div className="bg-card border border-border rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            placeholder="Ask a question about your database..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={5}
            className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors duration-150 resize-none"
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-[12px] text-muted-foreground">
              Make sure to introspect your schema from the Schema tab first
            </p>
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="h-9 px-4 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2 flex-shrink-0"
            >
              {loading ? <><Spinner /> Running…</> : "Send"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Generated SQL */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground">Generated SQL</span>
              <button
                onClick={() => navigator.clipboard?.writeText(result.sql)}
                className="h-6 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border rounded hover:bg-muted transition-colors duration-150"
              >
                Copy
              </button>
            </div>
            <div className="p-4 bg-[#0d0d0f] overflow-x-auto">
              <pre className="text-sm text-gray-200 leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {result.sql}
              </pre>
            </div>
          </div>

          {/* Results table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground">Results</span>
              <span className="text-[12px] text-muted-foreground">{rows.length} rows</span>
            </div>
            {rows.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">No rows returned.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {columnNames.map((col) => (
                        <th key={col} className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors duration-100">
                        {columnNames.map((col) => (
                          <td key={col} className="px-4 py-2.5 text-sm text-foreground">
                            {row[col] === null ? (
                              <span className="text-muted-foreground/50 italic text-[12px]">null</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Schema tab ───────────────────────────────────────────────────────────────

interface SchemaTabProps {
  projectId: number;
  tables: SchemaTable[];
  setTables: (tables: SchemaTable[]) => void;
}

function SchemaTab({ projectId, tables, setTables }: SchemaTabProps) {
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetch(`${API_BASE}/api/projects/${projectId}/schema`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.tables) {
          const grouped = data.tables.map((t: { tableName: string }) => ({
            tableName: t.tableName,
            columns: data.columns.filter((c: any) => c.tableName === t.tableName),
          }));
          setTables(grouped);
        }
      })
      .catch(() => {});
  }, [projectId]);

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/introspect`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Introspection failed");
      const data = await res.json();

      const grouped = data.tables.map((t: { tableName: string }) => ({
        tableName: t.tableName,
        columns: data.columns.filter((c: Column & { tableName: string }) => c.tableName === t.tableName),
      }));
      setTables(grouped);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-foreground">Database Schema</h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="h-9 px-4 text-sm font-medium border border-border text-foreground rounded-md hover:bg-muted flex items-center gap-2 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.75} />
          Refresh Schema
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No schema yet. Click Refresh Schema to introspect your database.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {tables.map((table) => (
          <div key={table.tableName} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-foreground truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {table.tableName}
              </span>
              <span className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-secondary text-secondary-foreground flex-shrink-0">
                {table.columns.length} cols
              </span>
            </div>
            <div>
              {table.columns.map((col, i) => (
                <div key={col.columnName} className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-2.5 ${i < table.columns.length - 1 ? "border-b border-border" : ""}`}>
                  <span className="text-sm font-medium text-foreground shrink-0">{col.columnName}</span>
                  <div className="flex items-center gap-1.5 ml-auto min-w-0">
                    <span className="text-[11px] text-muted-foreground truncate max-w-[100px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {col.dataType}
                    </span>
                    {col.isNullable && (
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">null</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

// ─── Logs tab ─────────────────────────────────────────────────────────────────
interface LogsTabProps {
  projectId: number;
  refreshKey: number;  
}
function LogsTab({ projectId, refreshKey }: LogsTabProps) {
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/query/${projectId}/logs`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setLogs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId,refreshKey]);

  if (loading) return <div className="py-16 text-center"><p className="text-sm text-muted-foreground">Loading logs…</p></div>;

  if (logs.length === 0) return <div className="py-16 text-center"><p className="text-sm text-muted-foreground">No queries run yet.</p></div>;

  return (
    <div className="max-w-full">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide w-[42%]">Question</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Generated SQL</th>
              <th className="text-right px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide w-24">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <React.Fragment key={log.id}>
                <tr
                  className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/20 transition-colors duration-100"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <td className="px-4 py-3 text-sm text-foreground">{log.query}</td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {log.sql.split("\n")[0].substring(0, 48)}…
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground text-right">
                    {formatRelativeDate(log.createdAt)}
                  </td>
                </tr>
                {expandedId === log.id && (
                  <tr className="border-b border-border last:border-0 bg-muted/10">
                    <td colSpan={3} className="px-4 py-4">
                      <pre className="text-[12px] text-gray-200 bg-[#0d0d0f] rounded-md p-4 overflow-x-auto leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {log.sql}
                      </pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

function SettingsTab({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const [name, setName] = useState(project.name);
  const [showUrl, setShowUrl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSuccess(true);
    } catch {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${project.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      onDelete();
    } catch {
      setError("Failed to delete project");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-card border border-border rounded-lg p-8">
        <h2 className="text-[20px] font-semibold text-foreground leading-tight mb-6">Project Settings</h2>

        {error && <div className="mb-4 px-3 py-2 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"><p className="text-sm text-red-600 dark:text-red-400">{error}</p></div>}
        {success && <div className="mb-4 px-3 py-2 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"><p className="text-sm text-green-600 dark:text-green-400">Changes saved!</p></div>}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="settings-name" className="block text-[13px] font-medium text-foreground">Project Name</label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-muted border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors duration-150"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="settings-url" className="block text-[13px] font-medium text-foreground">PostgreSQL URL</label>
            <div className="relative">
              <input
                id="settings-url"
                type={showUrl ? "text" : "password"}
                defaultValue={project.databaseUrl}
                className="w-full h-9 px-3 pr-10 text-sm bg-muted border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors duration-150"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowUrl((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150 focus:outline-none">
                {showUrl ? <EyeOff className="w-[15px] h-[15px]" strokeWidth={1.75} /> : <Eye className="w-[15px] h-[15px]" strokeWidth={1.75} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={saving} className="h-9 px-4 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="bg-card border border-border rounded-lg p-8">
        <h3 className="text-[13px] font-semibold text-destructive mb-5">Danger Zone</h3>
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[13px] font-medium text-foreground mb-1">Delete Project</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">This will permanently delete all schema and query history.</p>
          </div>
          <button onClick={handleDelete} disabled={deleting} className="h-9 px-4 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 flex-shrink-0">
            {deleting ? "Deleting…" : "Delete Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WorkspacePage ────────────────────────────────────────────────────────────

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("query");
  const [collapsed, setCollapsed] = useState(false);
  const [logRefreshKey, setLogRefreshKey] = useState(0);
  
  const [schemaTables, setSchemaTables] = useState<SchemaTable[]>([]);
  const [question, setQuestion] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/projects/${id}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Project not found");
        return res.json();
      })
      .then((data) => setProject(data))
      .catch(() => navigate("/projects"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleLogout() {
    await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    navigate("/login");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-sm text-muted-foreground">Loading…</p></div>;
  if (!project) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar project={project} onBack={() => navigate("/projects")} />
        <main className="flex-1 overflow-auto p-6">
          {activeTab === "query" && 
          (<QueryTab 
            projectId={project.id}
            question={question}
            setQuestion={setQuestion}
            result={queryResult}
            setResult={setQueryResult}
            error={queryError}
            setError={setQueryError}
            onQuerySuccess={() => setLogRefreshKey(k => k + 1)}  
          />)}
          {activeTab === "schema" && (
            <SchemaTab 
             projectId={project.id}
             tables={schemaTables}
             setTables={setSchemaTables} 
          />)}
          {activeTab === "logs" && (
            <LogsTab 
            projectId={project.id}
            refreshKey={logRefreshKey} 
            />
          )}
          {activeTab === "settings" && <SettingsTab project={project} onDelete={() => navigate("/projects")} />}
        </main>
      </div>
    </div>
  );
}