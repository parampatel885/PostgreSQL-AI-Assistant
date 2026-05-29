import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed top-4 right-4 z-50 flex items-center justify-center w-8 h-8 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {theme === "dark" ? (
        <Sun className="w-[15px] h-[15px]" strokeWidth={1.75} />
      ) : (
        <Moon className="w-[15px] h-[15px]" strokeWidth={1.75} />
      )}
    </button>
  );
}