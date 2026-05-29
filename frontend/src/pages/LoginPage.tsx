import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Database, Eye, EyeOff } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";



const API_BASE = "http://localhost:3000";

function Spinner() {
  return (
    <svg
      className="w-3.5 h-3.5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Login failed");
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      {/* Theme toggle top right */}
      <ThemeToggle />

      <div className="w-full max-w-[400px]">
        {/* Card */}
        <div className="bg-card border border-border rounded-lg p-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="relative flex items-center justify-center w-7 h-7 rounded-md bg-primary flex-shrink-0">
              <Database className="w-[15px] h-[15px] text-primary-foreground" strokeWidth={2} />
              <svg
                className="absolute top-[4px] right-[4px] w-2.5 h-2.5 text-primary-foreground drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]"
                viewBox="0 0 12 12"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M6 0 L6.6 4.8 L11 6 L6.6 7.2 L6 12 L5.4 7.2 L1 6 L5.4 4.8 Z" />
              </svg>
            </div>
            <span
              className="text-[13px] font-medium text-foreground tracking-tight leading-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              PG Query Assistant
            </span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-[20px] font-semibold text-foreground leading-tight mb-1.5">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground leading-none">
              Sign in to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-foreground">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-9 px-3 text-sm bg-muted border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors duration-150"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[13px] font-medium text-foreground">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-9 px-3 pr-10 text-sm bg-muted border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors duration-150"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-[15px] h-[15px]" strokeWidth={1.75} />
                  ) : (
                    <Eye className="w-[15px] h-[15px]" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 mt-1 px-4 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-center text-[13px] text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-foreground font-medium hover:underline underline-offset-4 transition-colors duration-150"
              >
                Register
              </Link>
            </p>
          </div>
        </div>

        <p
          className="mt-5 text-center text-[11px] text-muted-foreground/40 tracking-wide"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          v1.0.0-beta
        </p>
      </div>
    </div>
  );
}