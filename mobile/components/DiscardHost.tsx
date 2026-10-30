// The discard confirmation (canvas DiscardConfirm.dc.html): an action sheet with Globi, "Discard the Spain draft?",
// what is saved and that nothing paid is refunded, the red "Discard draft" and a separate "Keep it".
import { useEffect, useState } from "react";
import { ActionSheet } from "./ui";
import { setDiscardHost, type DiscardInfo } from "../lib/discard";
import { error as hError } from "../lib/haptics";
import { useT } from "../lib/i18n";

export function DiscardHost() {
  const { t } = useT();
  const [req, setReq] = useState<{ run: () => void; info: DiscardInfo } | null>(null);
  useEffect(() => { setDiscardHost((r) => { hError(); setReq(r); }); return () => setDiscardHost(null); }, []);
  if (!req) return null;
  const { country, answers, draft = true } = req.info;
  const title = country
    ? (draft ? t("Discard the {c} draft?", { c: t(country) }) : t("Discard the {c} application?", { c: t(country) }))
    : (draft ? t("Discard this draft?") : t("Discard this application?"));
  const saved = answers ? (answers === 1 ? t("One answer is saved.") : t("{n} answers are saved.", { n: answers })) : "";
  const message = [saved, t("Nothing was paid, so nothing is refunded. This can't be undone.")].filter(Boolean).join(" ");
  return (
    <ActionSheet visible onClose={() => setReq(null)} pose="thinking" title={title} message={message}
      destructiveLabel={draft ? t("Discard draft") : t("Discard")} onDestructive={() => { const r = req; setReq(null); r.run(); }} cancelLabel={t("Keep it")} />
  );
}
