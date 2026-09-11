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
    <aside aria-label="Demo mode navigation bar" className="bg-slate-900 text-white border-b border-slate-800 py-2.5 px-4 sticky top-16 z-30 shadow-md">
      <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full text-[11px] border border-amber-400/30">
            <Sparkles className="w-3 h-3" /> DEMO MODE
          </span>
          <span className="text-slate-300">
            Viewing as <strong className="text-white">{applicantName}</strong> ({applicantEmail})
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 text-[11px] mr-1 hidden md:inline">Switch Case:</span>
          {(Object.keys(DEMO_CONFIGS) as DemoScenario[]).map((key) => {
            const config = DEMO_CONFIGS[key];
            const isActive = key === currentScenario;
            const isLoading = switching === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSwitch(key)}
                disabled={isActive || switching !== null}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : key === "ready" ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : key === "pending" ? (
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                ) : (
                  <Files className="w-3 h-3 text-blue-400" />
                )}
                <span>{config.destination}</span>
              </button>
            );
          })}

          <form action="/api/auth/signout" method="POST" className="inline-block ml-1.5">
            <button
              type="submit"
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-950/60 text-red-300 hover:bg-red-900 border border-red-800/40 transition-colors flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Exit Demo</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
