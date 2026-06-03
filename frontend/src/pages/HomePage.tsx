import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const API_BASE = "https://postgresql-ai-assistant.onrender.com";

interface Project {
  id: number;
  name: string;
  databaseUrl: string;
  tableCount?: number;
  createdAt: string;
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

export function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState("");
  const [pgUrl, setPgUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim() || !pgUrl.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: projectName.trim(), databaseUrl: pgUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create project");
      }
      const project = await res.json();
      setProjects((prev) => [project, ...prev]);
      setProjectName("");
      setPgUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await fetch(`${API_BASE}/api/auth/logout`, {
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
        <div className="bg-card border border-border rounded-lg p-8">
          <h2 className="text-[15px] font-semibold text-foreground mb-5">New Project</h2>
          <form onSubmit={handleCreate}>
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
              {creating ? <><Spinner /> Creating…</> : "Create Project"}
            </button>
          </form>
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