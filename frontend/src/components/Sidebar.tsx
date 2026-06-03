import { useState } from "react";

import { ThemeToggle } from "./ThemeToggle";
import { Separator } from "@/components/ui/separator";

import {
  Database,
  FolderOpen,
  Search,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
 
} from "lucide-react";

const API_BASE = "https://postgresql-ai-assistant.onrender.com";

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "schema", label: "Schema", icon: Database },
  { id: "search", label: "Semantic Search", icon: Search },
  { id: "query", label: "Query Assistant", icon: MessageSquare },
];

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);


  async function handleLogout() {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/login";
  }

  return (
    <aside
      className={`relative flex flex-col h-screen bg-card border-r transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 h-16">
        <Database className="shrink-0 text-primary" size={22} />
        {!collapsed && (
          <span className="font-bold text-sm tracking-tight truncate">
            PG Query Assistant
          </span>
        )}
      </div>

      <Separator />

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors w-full text-left
              ${activePage === id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      <Separator />

      {/* Bottom Section */}
      <div className="p-3 space-y-2">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors w-full"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 bg-card border rounded-full p-1 hover:bg-muted transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}