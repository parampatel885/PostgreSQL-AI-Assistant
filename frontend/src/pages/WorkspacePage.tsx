import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Database, MessageSquare, Table2, Clock, Settings2,
  ArrowLeft, LogOut, Sun, Moon,
  RefreshCw, Eye, EyeOff, Check, X,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";


import { apiUrl } from "@/config/api";

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

function Sidebar({ activeTab, onTabChange, onLogout }: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onLogout: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { theme, toggle } = useTheme();

  const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "query", label: "Query", icon: MessageSquare },
    { id: "schema", label: "Schema", icon: Table2 },
    { id: "logs", label: "Logs", icon: Clock },
    { id: "settings", label: "Settings", icon: Settings2 },
  ];

  const itemBase = "w-full flex items-center gap-3 py-2 rounded-md text-sm transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ring";
  const itemPad = !hovered ? "justify-center px-0" : "px-3";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex flex-col h-screen bg-card border-r border-border flex-shrink-0 transition-all duration-200 ${!hovered ? "w-14" : "w-56"}`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 p-4 border-b border-border ${!hovered ? "justify-center" : ""}`}>
        <div className="relative flex items-center justify-center w-7 h-7 rounded-md bg-primary flex-shrink-0">
          <Database className="w-[15px] h-[15px] text-primary-foreground" strokeWidth={2} />
          <svg className="absolute top-[4px] right-[4px] w-2.5 h-2.5 text-primary-foreground drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M6 0 L6.6 4.8 L11 6 L6.6 7.2 L6 12 L5.4 7.2 L1 6 L5.4 4.8 Z" />
          </svg>
        </div>
        {hovered && (
          <span className="text-[13px] font-medium text-foreground tracking-tight leading-none animate-in fade-in duration-150" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
            title={!hovered ? label : undefined}
            className={`${itemBase} ${itemPad} ${activeTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
            {hovered && <span className="animate-in fade-in duration-150">{label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-border space-y-0.5">
        <button onClick={toggle} className={`${itemBase} ${itemPad} text-muted-foreground hover:bg-muted hover:text-foreground`}>
          {theme === "dark" ? <Sun className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} /> : <Moon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />}
          {hovered && <span className="animate-in fade-in duration-150">{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>
        <button onClick={onLogout} className={`${itemBase} ${itemPad} text-muted-foreground hover:bg-muted hover:text-foreground`}>
          <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
          {hovered && <span className="animate-in fade-in duration-150">Logout</span>}
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
interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text?: string;
  sql?: string;
  rows?: QueryResult["rows"];
  error?: string;
  isLoading?: boolean;
}

interface QueryTabProps {
  projectId: number;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onQuerySuccess: () => void;
}

const suggestions = [
  {
    title: "List database tables",
    description: "Get a list of all tables available in your database schema.",
    query: "Show all tables in the database",
  },
  {
    title: "Check row count",
    description: "Find out how many total records are stored in the main table.",
    query: "Select the total count of rows from the primary table.",
  },
  {
    title: "Inspect table structure",
    description: "Show the columns and data types of your tables.",
    query: "List the details of columns for my tables.",
  },
  {
    title: "Sample table data",
    description: "Retrieve a quick sample of the first 5 records in a table.",
    query: "Show 5 records from one of the tables.",
  },
];

function QueryTab({ projectId, messages, setMessages, onQuerySuccess }: QueryTabProps) {
  const [inputVal, setInputVal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const threadEndRef = React.useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function executeQuery(queryText: string) {
    if (!queryText.trim() || submitting) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: queryText.trim(),
    };

    // Add assistant loading message
    const assistantLoadingMsgId = Math.random().toString();
    const loadingMsg: ChatMessage = {
      id: assistantLoadingMsgId,
      sender: "assistant",
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInputVal("");
    setSubmitting(true);

    try {
      const res = await fetch(apiUrl("/api/query"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId, question: queryText.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Query failed");
      }

      const data = await res.json();

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantLoadingMsgId
            ? { id: assistantLoadingMsgId, sender: "assistant", sql: data.sql, rows: data.rows }
            : msg
        )
      );
      onQuerySuccess();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Query failed";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantLoadingMsgId
            ? { id: assistantLoadingMsgId, sender: "assistant", error: errMsg }
            : msg
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    executeQuery(inputVal);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeQuery(inputVal);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] w-full animate-in fade-in duration-300">
      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="py-12 max-w-xl mx-auto text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div className="space-y-2">
              <h2 className="text-[17px] font-semibold text-foreground">PG Query Assistant</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-normal">
                Ask any question about your database schema in plain English. I'll construct the SQL query and fetch the results for you.
              </p>
            </div>
            <div className="pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Suggestions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => executeQuery(s.query)}
                    className="text-left p-3.5 rounded-lg border border-border bg-card hover:bg-muted/40 text-sm transition-all duration-150 active:scale-[0.98] flex flex-col gap-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <span className="font-semibold text-[13px] text-foreground">{s.title}</span>
                    <span className="text-[11.5px] text-muted-foreground leading-normal">{s.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div key={msg.id} className="animate-in slide-in-from-bottom-2 duration-200">
                  {isUser ? (
                    /* User Bubble */
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-tr-none px-4 py-2.5 text-[13.5px] font-medium shadow-sm leading-normal">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    /* Assistant Block */
                    <div className="flex justify-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-[10.5px] border border-border mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        AI
                      </div>
                      <div className="flex-1 space-y-4 max-w-[92%]">
                        {msg.isLoading && (
                          <div className="flex items-center gap-2 text-muted-foreground text-[13px] py-1">
                            <Spinner />
                            <span className="animate-pulse">Thinking…</span>
                          </div>
                        )}

                        {msg.error && (
                          <div className="px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 max-w-xl">
                            <p className="text-sm text-destructive">{msg.error}</p>
                          </div>
                        )}

                        {msg.sql && (
                          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm max-w-2xl">
                            <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-muted/20">
                              <span className="text-[12px] font-semibold text-foreground">Generated SQL</span>
                              <button
                                onClick={() => navigator.clipboard?.writeText(msg.sql || "")}
                                className="h-6 px-2 text-[10px] font-medium text-muted-foreground hover:text-foreground border border-border rounded hover:bg-muted transition-colors duration-150"
                              >
                                Copy
                              </button>
                            </div>
                            <div className="p-4 bg-[#0d0d0f] overflow-x-auto">
                              <pre className="text-[13px] text-gray-200 leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {msg.sql}
                              </pre>
                            </div>
                          </div>
                        )}

                        {msg.rows && (
                          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm max-w-full">
                            <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-muted/20">
                              <span className="text-[12px] font-semibold text-foreground">Results</span>
                              <span className="text-[11px] text-muted-foreground">{msg.rows.length} rows</span>
                            </div>
                            {msg.rows.length === 0 ? (
                              <div className="px-4 py-6 text-center">
                                <p className="text-sm text-muted-foreground">No rows returned.</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto max-h-72">
                                <table className="w-full">
                                  <thead className="bg-muted/10 sticky top-0 bg-card z-10">
                                    <tr className="border-b border-border">
                                      {Object.keys(msg.rows?.[0] || {}).map((col) => (
                                        <th key={col} className="text-left px-4 py-2 text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider bg-card border-b border-border" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                          {col}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {msg.rows.map((row, i) => (
                                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors duration-100">
                                        {Object.keys(msg.rows?.[0] || {}).map((col) => (
                                          <td key={col} className="px-4 py-2.5 text-xs text-foreground font-mono">
                                            {row[col] === null ? (
                                              <span className="text-muted-foreground/50 italic">null</span>
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
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Input Form */}
      <div className="flex-shrink-0 bg-background border-t border-border pt-4">
        <form onSubmit={handleSubmitForm} className="relative rounded-lg border border-border bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring focus-within:border-ring overflow-hidden">
          <textarea
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your database (Enter to send, Shift+Enter for newline)..."
            rows={2}
            disabled={submitting}
            className="w-full resize-none bg-transparent px-4 py-3 text-[13.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 bg-muted/5">
            <p className="text-[11px] text-muted-foreground">
              Make sure to introspect your schema first
            </p>
            <button
              type="submit"
              disabled={submitting || !inputVal.trim()}
              className="h-8 px-4 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 active:scale-[0.98] focus:outline-none transition-all duration-150 flex items-center gap-1.5"
            >
              {submitting ? <Spinner /> : "Send"}
            </button>
          </div>
        </form>
      </div>
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
    fetch(apiUrl(`/api/projects/${projectId}/schema`), { credentials: "include" })
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
      const res = await fetch(apiUrl(`/api/projects/${projectId}/introspect`), {
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
    fetch(apiUrl(`/api/query/${projectId}/logs`), { credentials: "include" })
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

interface ConnectionStep {
  label: string;
  status: "pending" | "loading" | "success" | "error";
  error?: string;
}

interface ConnectionProgressProps {
  steps: ConnectionStep[];
  onTryAgain?: () => void;
}

function ConnectionProgress({ steps, onTryAgain }: ConnectionProgressProps) {
  const hasError = steps.some((s) => s.status === "error");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Database Connection Progress
        </h3>
      </div>
      <div className="relative pl-6 space-y-6">
        {/* Vertical line between steps */}
        <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 bg-border -translate-x-1/2 z-0" />

        {steps.map((step, idx) => {
          const isPending = step.status === "pending";
          const isLoading = step.status === "loading";
          const isSuccess = step.status === "success";
          const isError = step.status === "error";

          return (
            <div key={idx} className="relative z-10 flex items-start gap-4">
              {/* Step indicator */}
              <div className="flex items-center justify-center flex-shrink-0">
                {isPending && (
                  <div className="w-5 h-5 rounded-full border-2 border-muted bg-card flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                  </div>
                )}
                {isLoading && (
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                    <Spinner />
                  </div>
                )}
                {isSuccess && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                )}
                {isError && (
                  <div className="w-5 h-5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center">
                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className={`text-[13px] font-medium transition-colors duration-200 ${
                  isPending ? "text-muted-foreground/50" :
                  isLoading ? "text-foreground font-semibold" :
                  isSuccess ? "text-foreground/80" :
                  "text-destructive"
                }`}>
                  {step.label}
                </p>
                {isError && step.error && (
                  <p className="mt-1.5 text-[11px] text-destructive bg-destructive/5 border border-destructive/10 rounded px-2.5 py-1.5 break-words font-mono">
                    {step.error}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasError && onTryAgain && (
        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onTryAgain}
            className="h-9 px-4 text-sm font-medium border border-border text-foreground rounded-md hover:bg-muted active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

function SettingsTab({
  project,
  onDelete,
  onUpdate,
}: {
  project: Project;
  onDelete: () => void;
  onUpdate: (updated: Project) => void;
}) {
  const [name, setName] = useState(project.name);
  const [databaseUrl, setDatabaseUrl] = useState(project.databaseUrl);
  const [showUrl, setShowUrl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Connection stepper states
  const [showProgress, setShowProgress] = useState(false);
  const [connectionSteps, setConnectionSteps] = useState<ConnectionStep[]>([]);

  function handleReset() {
    setShowProgress(false);
    setConnectionSteps([]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !databaseUrl.trim()) return;

    const initialSteps: ConnectionStep[] = [
      { label: "Validating connection string format", status: "loading" },
      { label: "Connecting to database", status: "pending" },
      { label: "Introspecting schema", status: "pending" },
      { label: "Generating embeddings", status: "pending" },
      { label: "Done ✓", status: "pending" },
    ];
    setConnectionSteps(initialSteps);
    setShowProgress(true);
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      // Step 1: Validate connection string format
      if (!databaseUrl.trim().startsWith("postgresql://")) {
        setConnectionSteps((prev) => {
          const next = [...prev];
          next[0] = { ...next[0], status: "error", error: "Connection string must start with 'postgresql://'" };
          return next;
        });
        throw new Error("Validation failed");
      }

      setConnectionSteps((prev) => {
        const next = [...prev];
        next[0] = { ...next[0], status: "success" };
        next[1] = { ...next[1], status: "loading" };
        return next;
      });

      // Step 2: PATCH /api/projects/:id to save/update settings
      const res = await fetch(apiUrl(`/api/projects/${project.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), databaseUrl: databaseUrl.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        const errMsg = data.error ?? "Failed to save changes";
        setConnectionSteps((prev) => {
          const next = [...prev];
          next[1] = { ...next[1], status: "error", error: errMsg };
          return next;
        });
        throw new Error(errMsg);
      }

      const updated = (await res.json()) as Project;

      setConnectionSteps((prev) => {
        const next = [...prev];
        next[1] = { ...next[1], status: "success" };
        next[2] = { ...next[2], status: "loading" };
        return next;
      });

      // Step 3: POST /api/projects/:id/introspect
      const introspectRes = await fetch(apiUrl(`/api/projects/${project.id}/introspect`), {
        method: "POST",
        credentials: "include",
      });

      if (!introspectRes.ok) {
        const data = await introspectRes.json();
        const errMsg = data.error ?? "Introspection failed";
        setConnectionSteps((prev) => {
          const next = [...prev];
          next[2] = { ...next[2], status: "error", error: errMsg };
          return next;
        });
        throw new Error(errMsg);
      }

      setConnectionSteps((prev) => {
        const next = [...prev];
        next[2] = { ...next[2], status: "success" };
        next[3] = { ...next[3], status: "loading" };
        return next;
      });

      // Step 4: Generating table embeddings
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setConnectionSteps((prev) => {
        const next = [...prev];
        next[3] = { ...next[3], status: "success" };
        next[4] = { ...next[4], status: "loading" };
        return next;
      });

      // Step 5: Done
      await new Promise((resolve) => setTimeout(resolve, 500));

      setConnectionSteps((prev) => {
        const next = [...prev];
        next[4] = { ...next[4], status: "success" };
        return next;
      });

      onUpdate(updated);

      await new Promise((resolve) => setTimeout(resolve, 800));
      setSuccess(true);
      setShowProgress(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(apiUrl(`/api/projects/${project.id}`), {
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
        {showProgress ? (
          <ConnectionProgress steps={connectionSteps} onTryAgain={handleReset} />
        ) : (
          <>
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
                    value={databaseUrl}
                    onChange={(e) => setDatabaseUrl(e.target.value)}
                    className="w-full h-9 px-3 pr-10 text-sm bg-muted border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors duration-150"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowUrl((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150 focus:outline-none">
                    {showUrl ? <EyeOff className="w-[15px] h-[15px]" strokeWidth={1.75} /> : <Eye className="w-[15px] h-[15px]" strokeWidth={1.75} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={saving} className="h-9 px-4 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150">
                {saving ? "Saving…" : "Save & Connect"}
              </button>
            </form>
          </>
        )}
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
  const [logRefreshKey, setLogRefreshKey] = useState(0);
  const [schemaTables, setSchemaTables] = useState<SchemaTable[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    fetch(apiUrl(`/api/projects/${id}`), { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Project not found");
        return res.json();
      })
      .then((data) => setProject(data))
      .catch(() => navigate("/projects"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleLogout() {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
    navigate("/login");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-sm text-muted-foreground">Loading…</p></div>;
  if (!project) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar project={project} onBack={() => navigate("/projects")} />
        <main className="flex-1 overflow-hidden p-6 bg-background">
          {activeTab === "query" && (
            <QueryTab
              projectId={project.id}
              messages={chatMessages}
              setMessages={setChatMessages}
              onQuerySuccess={() => setLogRefreshKey((k) => k + 1)}
            />
          )}
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
          {activeTab === "settings" && (
            <SettingsTab
              project={project}
              onDelete={() => navigate("/projects")}
              onUpdate={setProject}
            />
          )}
        </main>
      </div>
    </div>
  );
}