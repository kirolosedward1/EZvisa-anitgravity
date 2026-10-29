// Autosave status and the "newer copy" prompt for the wizard (state lives in lib/form.tsx).
// The indicator is truthful: "Saved" only after the server confirmed the answers on screen; "Not saved" otherwise.
import { View, AccessibilityInfo } from "react-native";
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { Text, Icon, PressScale, showSaved, SheetScaffold, PrimaryButton, SecondaryButton } from "../ui";
import { useColors, S, R } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { useForm, type SyncStatus } from "../../lib/form";
import { draftPosition } from "../../lib/questions";
import type { WizardForm } from "../../lib/wizard";
import { medium } from "../../lib/haptics";

/** Autosave status (canvas AutoSave.dc.html): a 1.5 s "Saved" pill when the server confirms, no timestamps. Saves are
 *  optimistic, so "Saving…" and "saved on this phone" show nothing; only a problem stays on screen (tap retries). */
export function SyncIndicator({ hasAnswers }: { hasAnswers: boolean }) {
  const c = useColors(); const { t } = useT(); const { sync, retrySync, syncError } = useForm();
  const prev = useRef<SyncStatus>(sync);
  // The pill appears once per confirmed save; VoiceOver hears problems once (the toast announces "Saved" itself).
  useEffect(() => {
    if (prev.current !== sync && sync === "saved" && hasAnswers) showSaved();
    if (prev.current !== sync && (sync === "error" || sync === "offline")) AccessibilityInfo.announceForAccessibility(label(sync, t));
    prev.current = sync;
  }, [sync]);
  if (!hasAnswers || sync === "local" || sync === "saving" || sync === "saved" || sync === "conflict") return null;
  const color = c.orange;
  const icon = sync === "offline" ? "wifi.slash" : "exclamationmark.circle.fill";
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: S.xxs }}>
      <Icon name={icon} size={12} color={color} weight="semibold" />
      <Text variant="caption" weight="500" color={color} numberOfLines={1} testID="saved-indicator">{label(sync, t)}</Text>
    </View>
  );
  if (sync !== "error" && sync !== "retrying") return <View accessible accessibilityLabel={label(sync, t)}>{body}</View>;
  return <PressScale onPress={retrySync} accessibilityRole="button" accessibilityLabel={label(sync, t)} accessibilityHint={syncError ?? t("Try again")} hitSlop={S.sm}>{body}</PressScale>;
}
function label(s: SyncStatus, t: (k: string) => string) {
  switch (s) {
    case "saving": return t("Saving…");
    case "saved": return t("Saved");
    case "local": return t("Saved on this phone");
    case "offline": return t("Not saved · Offline");
    case "retrying": return t("Not saved · Retrying");
    case "error": return t("Not saved · Tap to retry");
    default: return t("Not saved");
  }
}

/** Asks which copy to keep when the server copy changed elsewhere (canvas DraftConflict.dc.html: the two copies side by
 *  side, then one button per copy). Nothing is overwritten without a choice. */
export function DraftConflictSheet() {
  const c = useColors(); const { t } = useT(); const { conflict, resolveConflict, form, page } = useForm();
  useEffect(() => { if (conflict) medium(); }, [!!conflict]);
  if (!conflict) return null;
  const s = conflict.server;
  const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const web = s?.editedOn === "website";
  const where = web ? t("on the website") : t("on another device");
  const summary = (f: Partial<WizardForm> | undefined, p: string) => {
    if (!f) return "";
    const pos = draftPosition(f as WizardForm, p);
    return [f.firstName ? t("Name answered.") : t("Name not yet entered."), t("Up to question {i}.", { i: pos.i })].join(" ");
  };
  const newer = conflict.reason === "newer";
  const copy = newer ? { title: t("This application changed on another device"), main: web ? t("Keep the website version") : t("Keep the other version"), alt: t("Keep this phone's version") }
    : conflict.reason === "existing" ? { title: t("Application in progress"), body: t("You already have a {c} application saved to your account.", { c: t(s?.form.destination || "") }), main: t("Continue it"), alt: t("Start a separate one") }
    : conflict.reason === "closed" ? { title: t("Already submitted"), body: t("This application was submitted {where}.", { where }), main: t("Open application"), alt: null }
    : { title: t("Draft removed"), body: t("This draft was discarded {where}.", { where }), main: t("Save as new"), alt: t("Discard") };
  const main = () => {
    if (conflict.reason === "gone") { resolveConflict("mine"); return; }
    if (conflict.reason === "closed" && s) { resolveConflict("server"); router.replace(`/applications/${s.id}`, { withAnchor: true }); return; }
    resolveConflict("server");
  };
  const alt = () => resolveConflict(conflict.reason === "gone" ? "discard" : "mine");
  const col = (head: string, when: string, line: string) => (
    <View style={{ flex: 1, backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: R.button, padding: 12 }} accessible accessibilityLabel={`${head}. ${when}. ${line}`}>
      <Text variant="caption" weight="600" tone="secondary" style={{ textTransform: "uppercase", letterSpacing: 0.3 }}>{head}</Text>
      {!!when && <Text variant="callout" weight="600" style={{ marginTop: 4 }}>{when}</Text>}
      <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>{line}</Text>
    </View>
  );
  return (
    <SheetScaffold visible onClose={() => {}} pose="puzzled" title={copy.title} line={"body" in copy ? copy.body : undefined} testID="draft-conflict"
      actions={<>
        <PrimaryButton title={copy.main} onPress={main} testID="conflict-main" />
        {copy.alt && <SecondaryButton title={copy.alt} onPress={alt} testID="conflict-alt" />}
      </>}>
      {newer && (
        <View style={{ flexDirection: "row", gap: S.xs }}>
          {col(web ? t("On the website") : t("On another device"), fmt(s?.updatedAt), summary(s?.form, s?.question ? `q:${s.question}` : "review"))}
          {col(t("On this phone"), "", summary(form, page))}
        </View>
      )}
    </SheetScaffold>
  );
}
