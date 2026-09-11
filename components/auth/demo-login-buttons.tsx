"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_CONFIGS, type DemoScenario } from "@/lib/demo-data";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Files, ArrowRight } from "lucide-react";

interface DemoLoginButtonsProps {
  next?: string;
  className?: string;
  variant?: "card" | "inline" | "banner";
}

export function DemoLoginButtons({ next = "/dashboard", className = "", variant = "card" }: DemoLoginButtonsProps) {
  const router = useRouter();
  const [loadingScenario, setLoadingScenario] = useState<DemoScenario | null>(null);

  const handleDemoSelect = async (scenario: DemoScenario) => {
    setLoadingScenario(scenario);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, next }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(data.redirect || next);
        router.refresh();
      } else {
        // Fallback to GET navigation
        window.location.href = `/api/auth/demo-login?scenario=${scenario}&next=${encodeURIComponent(next)}`;
      }
    } catch {
      window.location.href = `/api/auth/demo-login?scenario=${scenario}&next=${encodeURIComponent(next)}`;
    }
  };

  const getScenarioIcon = (id: DemoScenario) => {
    switch (id) {
      case "ready":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case "pending":
        return <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case "multi":
        return <Files className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
    }
  };

  const getBadgeClass = (variant: "emerald" | "amber" | "blue") => {
    switch (variant) {
      case "emerald":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "amber":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "blue":
        return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20";
    }
  };

  return (
    <div className={`rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 via-primary/[0.02] to-transparent p-5 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-xs">
          <Sparkles className="w-3 h-3" /> Demo Sandbox
        </span>
        <span className="text-xs font-semibold text-muted-foreground">Instant 1-Click Access</span>
      </div>

      <h3 className="text-sm sm:text-base font-bold text-foreground mb-1">
        Explore Applicant Dashboard Scenarios
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Select a pre-populated test profile to view live case tracking, post-payment upload desk, and consular dossier printing:
      </p>

      <div className="space-y-2.5">
        {(Object.keys(DEMO_CONFIGS) as DemoScenario[]).map((scenarioKey) => {
          const config = DEMO_CONFIGS[scenarioKey];
          const isLoading = loadingScenario === scenarioKey;

          return (
            <button
              key={scenarioKey}
              type="button"
              onClick={() => handleDemoSelect(scenarioKey)}
              disabled={loadingScenario !== null}
              className={`w-full text-left p-3 sm:p-3.5 rounded-xl border border-border/80 bg-white dark:bg-slate-900/90 hover:border-primary/50 hover:shadow-md transition-all duration-200 group flex items-center justify-between gap-3 ${
                isLoading ? "opacity-75 ring-2 ring-primary/40" : ""
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5">{getScenarioIcon(scenarioKey)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {config.title}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${getBadgeClass(config.badgeVariant)}`}>
                      {config.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Applicant: <strong>{config.name}</strong> &bull; {config.description}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center pl-2">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>No password or verification code required</span>
        <span className="font-mono">UAE &bull; Schengen 2026</span>
      </div>
    </div>
  );
}
