import { rankCountries } from "../../../components/CountryPicker";
// Account details: Personal (name, email, phone, citizenship), Sign-in (methods, password) and Member since.
// Edits open in bottom sheets and save through supabase.auth.updateUser (user_metadata; no table or auth-setting changes).
import { useMemo, useState } from "react";
import { ScrollView, View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { EmptyState, Button, TextField, Text, Icon, Sheet, InlineError, useTabInset, RowGroup, Row } from "../../../components/ui";
import { useColors, S, R } from "../../../lib/theme";
import { useAuth } from "../../../lib/auth";
import { useT } from "../../../lib/i18n";
import { supabase } from "../../../lib/supabase";
import { SCHENGEN_VISA_REQUIRED } from "../../../lib/wizard";
import { WORLD } from "../../../lib/world";
import { citizenshipIso, citizenshipName } from "../../../lib/citizenship";
import { parseSaved, displayPhone, formatNational, toE164, phoneError } from "../../../lib/phone";
import { PhoneField } from "../../../components/CountryPicker";
import { Flag } from "../../../components/ui";
import { success, error as hError, select } from "../../../lib/haptics";

type Edit = null | "name" | "email" | "phone" | "citizenship" | "password";
const MIN_PW = 8;
/** UAE mobile: +971 5X XXX XXXX. Accepts 05..., 5..., 971..., +971... */
export function normUaePhone(v: string): string | null {
  let d = v.replace(/\D/g, "");
  if (d.startsWith("00971")) d = d.slice(5); else if (d.startsWith("971")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  if (!/^5\d{8}$/.test(d)) return null;
  return `+971 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

export default function AccountDetails() {
  const c = useColors(); const pb = useTabInset(); const { session } = useAuth(); const { t, lang } = useT();
  const [edit, setEdit] = useState<Edit>(null); const [v1, setV1] = useState(""); const [v2, setV2] = useState(""); const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [note, setNote] = useState<string | null>(null);
  const header = <Stack.Screen options={{ title: t("Account details"), headerLargeTitle: false }} />;
  const u = session?.user;
  const [pIso, setPIso] = useState("AE"); const [pE164, setPE164] = useState("");
  // Name, Arabic name or ISO code (e.g. "in", "IN").
  const list = useMemo(() => rankCountries(SCHENGEN_VISA_REQUIRED.map((n) => WORLD.find((w) => w.name === n) ?? { name: n, iso2: "", dial: 0 }), q, t).map((w) => w.name), [q, t]);
  if (!u) return <View style={{ flex: 1, backgroundColor: c.background, justifyContent: "center" }}>{header}<EmptyState icon="person.crop.circle" title={t("Sign in")} action={<Button title={t("Sign in")} onPress={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} />} /></View>;
  const meta = (u.user_metadata ?? {}) as Record<string, any>;
  const ids = ((u.identities ?? []) as { provider: string }[]).map((i) => i.provider);
  const providers = [...new Set(ids.length ? ids : [(u.app_metadata?.provider as string | undefined) ?? "email"])];
  const hasEmailPw = providers.includes("email");
  const full = (meta.full_name as string | undefined) ?? "";
  const open = (e: Edit) => { select(); setErr(null); setNote(null); setQ(""); setV2(""); if (e === "phone") { const p = parseSaved(meta.phone); setPIso(p.iso); setV1(formatNational(p.iso, p.digits)); setPE164(toE164(p.iso, p.digits) ?? ""); setEdit(e); return; }
    setV1(e === "name" ? full : e === "email" ? u.email ?? "" : e === "citizenship" ? citizenshipIso(meta.citizenship) : ""); setEdit(e); };
  const close = () => { if (!busy) setEdit(null); };
  const save = async (val?: string) => {
    if (!supabase) return; setErr(null);
    let payload: any; let done: string | null = null;
    if (edit === "name") { const n = v1.trim().replace(/\s+/g, " "); if (n.length < 2) return setErr(t("Enter your full name.")); payload = { data: { full_name: n } }; }
    else if (edit === "phone") { if (!pE164) return setErr(t(phoneError(pIso))); payload = { data: { phone: pE164 } }; } // E.164
    else if (edit === "citizenship") { const n = val ?? v1; if (!SCHENGEN_VISA_REQUIRED.includes(citizenshipName(n))) return; payload = { data: { citizenship: citizenshipIso(n) } }; }
    else if (edit === "email") { const m = v1.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)) return setErr(t("Enter a valid email address.")); if (m === u.email) return setEdit(null); payload = { email: m }; done = t("Check {e} and tap the link to confirm the change.", { e: m }); }
    else if (edit === "password") { if (v1.length < MIN_PW) return setErr(t("Use at least {n} characters.", { n: MIN_PW })); if (v1 !== v2) return setErr(t("The passwords don't match.")); payload = { password: v1 }; }
    else return;
    setBusy(true);
    try { const { error } = await supabase.auth.updateUser(payload); if (error) throw error; success(); if (done) setNote(done); else setEdit(null); }
    catch (e: any) { hError(); setErr(t(e?.message ?? String(e))); } finally { setBusy(false); }
  };
  const titles: Record<string, string> = { name: t("Name"), email: t("Email"), phone: t("Phone number"), citizenship: t("Citizenship"), password: hasEmailPw ? t("Change password") : t("Set password") };
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingTop: S.md, paddingBottom: pb }} testID="account-details">
      {header}
      {/* Canvas AccountDetails: Personal, Sign-in methods, Membership, each with its note. */}
      <View style={{ paddingHorizontal: S.gutter, gap: S.xl }}>
        <RowGroup header={t("Personal")} footer={t("Citizenship prefills the nationality question. Only passports that need a Schengen visa are listed.")}>
          <Row label={t("Name")} value={full || t("Add")} tint={!full} onPress={() => open("name")} testID="details-name" />
          <Row label={t("Phone number")} value={displayPhone(meta.phone) ? "\u2068" + displayPhone(meta.phone) + "\u2069" : t("Add")} tint={!displayPhone(meta.phone)} onPress={() => open("phone")} />
          <Row label={t("Citizenship")} value={meta.citizenship ? t(citizenshipName(meta.citizenship)) : t("Add")} tint={!meta.citizenship} onPress={() => open("citizenship")} />
        </RowGroup>
        <RowGroup header={t("Sign-in methods")} footer={t("Changing the email sends a confirmation link to the new address first.")}>
          <Row label={t("Email")} value={u.email ?? ""} onPress={() => open("email")} />
          <Row label={t("Password")} value={hasEmailPw ? t("Set · change") : t("Set")} onPress={() => open("password")} />
          <Row label="Google" value={providers.includes("google") ? t("Linked") : t("Not linked")} />
          {providers.includes("apple") && <Row label="Apple" value={t("Linked")} />}
        </RowGroup>
        <RowGroup header={t("Membership")} footer={t("Passport numbers are kept in Saved travellers.")}>
          {!!u.created_at && <Row label={t("Member since")} value={new Date(u.created_at).toLocaleDateString(lang === "ar" ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: "long", year: "numeric" })} />}
          <Row label={t("Saved travellers")} onPress={() => router.push("/account/travellers")} />
        </RowGroup>
      </View>

      <Sheet visible={!!edit} onClose={close} title={edit ? titles[edit] : undefined} closeLabel={t("Close")} testID="details-sheet">
        {note ? <View style={{ gap: S.md, paddingVertical: S.sm }}><Text variant="body">{note}</Text><Button title={t("Done")} onPress={() => setEdit(null)} /></View>
        : edit === "citizenship" ? (
          <View style={{ gap: S.sm }}>
            <TextField label={t("Search nationality...")} placeholder={t("Search nationality...")} value={q} onChangeText={setQ} autoCorrect={false} />
            <Text variant="footnote" tone="secondary">{t("Countries whose citizens need a Schengen visa.")}</Text>
            <View style={{ borderRadius: R.card, overflow: "hidden", backgroundColor: c.surface }}>
              {list.map((n) => { const on = citizenshipName(meta.citizenship) === n; return (
                <Pressable key={n} onPress={() => save(n)} accessibilityRole="radio" accessibilityState={{ selected: on, checked: on }} aria-selected={on} aria-checked={on} accessibilityLabel={on ? `${t(n)}, ${t("selected")}` : t(n)} style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: S.md, gap: S.sm, flexDirection: "row", alignItems: "center", backgroundColor: pressed ? c.fill : "transparent" })}>
                  <Flag country={n} size={28} />
                  <Text variant="body" style={{ flex: 1 }}>{t(n)}</Text>{on && <Icon name="checkmark" size={16} color={c.accent} weight="bold" />}
                </Pressable>
              ); })}
            </View>
          </View>
        ) : (
          <View style={{ gap: S.md }}>
            {edit === "password" ? <>
              <TextField label={t("New password")} value={v1} onChangeText={setV1} secureTextEntry autoCapitalize="none" textContentType="newPassword" autoFocus />
              <TextField label={t("Confirm password")} value={v2} onChangeText={setV2} secureTextEntry autoCapitalize="none" textContentType="newPassword" onSubmitEditing={() => save()} />
              <Text variant="footnote" tone="secondary">{t("At least {n} characters.", { n: MIN_PW })}</Text>
            </> : edit === "phone" ? (
              <PhoneField country={pIso} local={v1} autoFocus error={!!err} onChange={(iso, local, e164) => { setPIso(iso); setV1(local); setPE164(e164); setErr(null); }} />
            ) : (
              <TextField label={edit ? titles[edit] : ""} value={v1} onChangeText={setV1} autoFocus onSubmitEditing={() => save()} returnKeyType="done"
                keyboardType={edit === "email" ? "email-address" : "default"}
                autoCapitalize={edit === "name" ? "words" : "none"} autoCorrect={false} textContentType={edit === "email" ? "emailAddress" : "name"} />
            )}
            {edit === "email" && <Text variant="footnote" tone="secondary">{t("We'll send a confirmation link to the new address.")}</Text>}
            <InlineError text={err} />
            {edit === "phone" && !!v1 && !pE164 && <Text variant="footnote" tone="secondary">{t(phoneError(pIso))}</Text>}
            <Button title={t("Save")} loading={busy} disabled={edit === "phone" && !pE164} onPress={() => save()} />
          </View>
        )}
      </Sheet>
    </ScrollView>
  );
}
