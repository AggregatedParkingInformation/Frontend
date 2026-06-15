"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light" | "system";

function getSystemTheme(): "dark" | "light" {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
        const candidates: Theme[] = ["dark", "light", "system"];
        const currentIndex = candidates.indexOf(theme);

        let next = candidates[(currentIndex + 1) % candidates.length];
        const nextResolved = next === "system" ? getSystemTheme() : next;

        if (nextResolved === resolvedTheme) {
            next = candidates[(currentIndex + 2) % candidates.length];
        }

        setTheme(next);
    };

    return (
        <Button
            variant="outline"
            size="icon"
            className={cn("size-6", className)}
            onClick={toggleTheme}
            aria-label="Theme wechseln">
            <Sun className="h-2 w-2 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-2 w-2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
    );
}
