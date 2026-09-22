"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_CONFIGS, type DemoScenario } from "@/lib/demo-data";
import { Sparkles, CheckCircle2, AlertCircle, Files, LogOut, Loader2 } from "lucide-react";

interface DemoModeBarProps {
  currentScenario: DemoScenario;
  applicantName: string;
  applicantEmail: string;
}

export function DemoModeBar({ currentScenario, applicantName, applicantEmail }: DemoModeBarProps) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);

  const handleSwitch = async (scenario: DemoScenario) => {
    if (scenario === currentScenario) return;
    setSwitching(scenario);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, next: "/dashboard" }),
      });
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = `/api/auth/demo-login?scenario=${scenario}&next=/dashboard`;
      }
    } catch {
      window.location.href = `/api/auth/demo-login?scenario=${scenario}&next=/dashboard`;
    }
  };

  return (
    <aside aria-label="Demo mode" className="border-b border-border/60 bg-secondary/60">
      <div className="container mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 text-sm sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
            <Sparkles className="size-3.5" aria-hidden="true" /> Demo mode
          </span>
          <span className="text-muted-foreground">
            Viewing as <strong className="font-medium text-foreground">{applicantName}</strong> ({applicantEmail})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-xs text-muted-foreground lg:inline">Try another case:</span>
          {(Object.keys(DEMO_CONFIGS) as DemoScenario[]).map((key) => {
            const config = DEMO_CONFIGS[key];
            const isActive = key === currentScenario;
            const isLoading = switching === key;
            const Icon = key === "ready" ? CheckCircle2 : key === "pending" ? AlertCircle : Files;

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSwitch(key)}
                disabled={isActive || switching !== null}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-default ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" aria-hidden="true" />}
                {config.destination}
              </button>
            );
          })}

          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Exit demo
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
