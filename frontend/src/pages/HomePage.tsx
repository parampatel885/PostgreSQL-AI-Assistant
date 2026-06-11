import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Sun, Moon, Check, X } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

import { apiUrl } from "@/config/api";

interface Project {
  id: number;
  name: string;
  databaseUrl: string;
  tableCount?: number;
  createdAt: string;
}

interface ConnectionStep {
  label: string;
  status: "pending" | "loading" | "success" | "error";
  error?: string;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
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
                <p className={`text-[13px] font-medium transition-colors duration-200 ${isPending ? "text-muted-foreground/50" :
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

export function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState("");
  const [pgUrl, setPgUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  // Progress UI States
  const [showProgress, setShowProgress] = useState(false);
  const [connectionSteps, setConnectionSteps] = useState<ConnectionStep[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch(apiUrl("/api/projects"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data);
    } catch {
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setShowProgress(false);
    setConnectionSteps([]);
  }

  async function handleCreateAndConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim() || !pgUrl.trim()) return;

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
    setCreating(true);

    let currentProjectId: number | null = null;

    try {
      // Step 1: Validate connection string format on frontend
      if (!pgUrl.trim().startsWith("postgresql://")) {
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

      // Step 2: POST /api/projects to create project
      const createRes = await fetch(apiUrl("/api/projects"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: projectName.trim(), databaseUrl: pgUrl.trim() }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        const errMsg = data.error ?? "Failed to create project";
        setConnectionSteps((prev) => {
          const next = [...prev];
          next[1] = { ...next[1], status: "error", error: errMsg };
          return next;
        });
        throw new Error(errMsg);
      }

      const project = await createRes.json();
      currentProjectId = project.id;

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

      // Step 4: Generating embeddings (Simulated delay for backend embeddings)
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

      // Refresh project list
      await fetchProjects();

      // Clear input fields
      setProjectName("");
      setPgUrl("");

      await new Promise((resolve) => setTimeout(resolve, 800));
      navigate(`/projects/${project.id}`);
    } catch (err) {
      if (currentProjectId !== null) {
        try {
          await fetch(apiUrl(`/api/projects/${currentProjectId}`), {
            method: "DELETE",
            credentials: "include",
          });
        } catch (deleteErr) {
          console.error("Failed to delete project on cleanup:", deleteErr);
        }
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await fetch(apiUrl("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
    });
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top bar */}
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Left — Logo/Avatar */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-semibold text-primary-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                PP
              </span>
            </div>
            <span className="text-[13px] font-medium text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              PG Query Assistant
            </span>
          </div>
          {/* Right — Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="h-8 px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted flex items-center gap-1.5 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
              Logout
            </button>
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {theme === "dark" ? (
                <Sun className="w-[15px] h-[15px]" strokeWidth={1.75} />
              ) : (
                <Moon className="w-[15px] h-[15px]" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-[20px] font-semibold text-foreground leading-tight mb-6">
          Your Projects
        </h1>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* New project card */}
        <div className="bg-card border border-border rounded-lg p-8 animate-in fade-in duration-300">
          {showProgress ? (
            <ConnectionProgress steps={connectionSteps} onTryAgain={handleReset} />
          ) : (
            <>
              <h2 className="text-[15px] font-semibold text-foreground mb-5">New Project</h2>
              <form onSubmit={handleCreateAndConnect}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label htmlFor="proj-name" className="block text-[13px] font-medium text-foreground">
                      Project Name
                    </label>
                    <input
                      id="proj-name"
                      type="text"
                      placeholder="analytics_db"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full h-9 px-3 text-sm bg-muted border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors duration-150"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="pg-url" className="block text-[13px] font-medium text-foreground">
                      PostgreSQL URL
                    </label>
                    <input
                      id="pg-url"
                      type="text"
                      placeholder="postgresql://user:pass@host/db"
                      value={pgUrl}
                      onChange={(e) => setPgUrl(e.target.value)}
                      className="w-full h-9 px-3 text-sm bg-muted border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors duration-150"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={creating || !projectName.trim() || !pgUrl.trim()}
                  className="h-9 px-4 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2"
                >
                  {creating ? <><Spinner /> Connecting…</> : "Create & Connect"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Project list */}
        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Loading projects…</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No projects yet. Create your first one above.
              </p>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="bg-card border border-border rounded-lg px-6 py-4 flex items-center gap-4 hover:bg-muted/20 transition-colors duration-150"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13px] font-semibold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {project.name}
                    </span>
                    <span className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-secondary text-secondary-foreground flex-shrink-0">
                      {project.tableCount ?? 0} tables
                    </span>
                  </div>
                </div>
                <span className="text-[12px] text-muted-foreground flex-shrink-0">
                  {formatRelativeDate(project.createdAt)}
                </span>
                <button
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="h-8 px-3 text-[13px] font-medium border border-border text-foreground rounded-md hover:bg-muted flex-shrink-0 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  View
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}