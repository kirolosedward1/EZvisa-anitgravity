"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalizedHref } from "@/components/locale-link";
import { DEMO_CONFIGS, type DemoScenario } from "@/lib/demo-data";
import { useSiteLocale } from "@/components/locale-provider";
import { Loader2, CheckCircle2, AlertCircle, Files, ArrowRight } from "lucide-react";

/** Visible copy only. The English scenario records stay the source for names and emails. */
const AR_SCENARIO: Record<DemoScenario, { title: string; badge: string; description: string }> = {
  ready: {
    title: "ملف مكتمل (فرنسا)",
    badge: "الملف جاهز",
    description: "طلب مدفوع وملف جاهز للتنزيل والطباعة على A4",
  },
  pending: {
    title: "مستندات معلّقة (إسبانيا)",
    badge: "إجراء مطلوب",
    description: "طلب مدفوع بانتظار جواز السفر والصورة وكشف الحساب وشهادة عدم الممانعة",
  },
  multi: {
    title: "طلبات عائلة متعددة (إيطاليا وألمانيا)",
    badge: "طلبان",
    description: "ملفان نشطان لتجربة التنقل بين أكثر من طلب",
  },
};

interface DemoLoginButtonsProps {
  next?: string;
  className?: string;
  variant?: "card" | "inline" | "banner";
}

export function DemoLoginButtons({ next = "/dashboard", className = "", variant = "card" }: DemoLoginButtonsProps) {
  const arabic = useSiteLocale() === "ar";
  const t = (en: string, ar: string) => (arabic ? ar : en);
  const router = useRouter();
  const localize = useLocalizedHref();
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
        router.push(localize(data.redirect || next));
        router.refresh();
      } else {
        // Fallback to GET navigation
        window.location.href = `/api/auth/demo-login?scenario=${scenario}&next=${encodeURIComponent(localize(next))}`;
      }
    } catch {
      window.location.href = `/api/auth/demo-login?scenario=${scenario}&next=${encodeURIComponent(localize(next))}`;
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
    <div className={`rounded-2xl border border-primary/20 bg-[#F7F8FA] p-5 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-xs">
          {t("Demo Sandbox", "النسخة التجريبية")}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">{t("Instant 1-Click Access", "دخول بنقرة واحدة")}</span>
      </div>

      <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1">
        {t("Explore Applicant Dashboard Scenarios", "استعرض حالات لوحة الطلب")}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {t(
          "Select a pre-populated test profile to view live case tracking, post-payment upload desk, and consular dossier printing:",
          "اختر ملفًا تجريبيًا جاهزًا لعرض متابعة الطلب، ورفع المستندات بعد الدفع، وطباعة ملف القنصلية:",
        )}
      </p>

      <div className="space-y-2.5">
        {(Object.keys(DEMO_CONFIGS) as DemoScenario[]).map((scenarioKey) => {
          const config = DEMO_CONFIGS[scenarioKey];
          const copy = arabic ? AR_SCENARIO[scenarioKey] : config;
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
                    <span className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {copy.title}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${getBadgeClass(config.badgeVariant)}`}>
                      {copy.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {t("Applicant:", "مقدّم الطلب:")} <strong>{config.name}</strong> &bull; {copy.description}
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
        <span>{t("No password or verification code required", "لا حاجة إلى كلمة مرور أو رمز تحقق")}</span>
        <span className="font-mono">{t("UAE • Schengen 2026", "الإمارات • شنغن 2026")}</span>
      </div>
    </div>
  );
}
