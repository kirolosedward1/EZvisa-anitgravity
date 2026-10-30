// Account → Saved travellers: the people this account applied for (public.travellers, lib/travellers.ts), with add,
// edit and remove. Rows are created automatically after payment; this is where a typo gets fixed or a person removed.
// The same list is the "Who is travelling?" question in the wizard (and on the website).
import { useCallback, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { GlobiPose } from "../../../components/globi/GlobiPose";
import { EmptyState, Button, Sheet, InlineError, SegmentedControl, SkeletonRows, useTabInset, Card, Avatar, Text, PressScale, GlobiLine, SecondaryButton } from "../../../components/ui";
import { FormField, CountryField, DateField, SelectField, Input } from "../../../components/wizard/fields";
import { useFmtDate } from "../../../components/wizard/answers";
import { useColors, S } from "../../../lib/theme";
import { useAuth } from "../../../lib/auth";
import { useT } from "../../../lib/i18n";
import { success, error as hError, select } from "../../../lib/haptics";
import { SCHENGEN_VISA_REQUIRED, EMIRATE_OPTIONS, TRAVELLER_RELATIONSHIPS, iso, maskPassport, travellerName, type Traveller, type TravellerRelationship } from "../../../lib/wizard";
import { fetchTravellers, createTraveller, updateTraveller, deleteTraveller, TravellerSaveError } from "../../../lib/travellers";

type Draft = { firstName: string; lastName: string; relationship: TravellerRelationship; nationality: string; dateOfBirth: string; passportNumber: string; passportExpiry: string; cityOfResidence: string };
const EMPTY: Draft = { firstName: "", lastName: "", relationship: "other", nationality: "", dateOfBirth: "", passportNumber: "", passportExpiry: "", cityOfResidence: "" };
const toDraft = (x: Traveller): Draft => ({ firstName: x.firstName ?? "", lastName: x.lastName ?? "", relationship: x.relationship, nationality: x.nationality ?? "", dateOfBirth: x.dateOfBirth ?? "", passportNumber: x.passportNumber ?? "", passportExpiry: x.passportExpiry ?? "", cityOfResidence: x.cityOfResidence ?? "" });
const RELATION: { value: TravellerRelationship; label: string }[] = [{ value: "self", label: "You" }, { value: "spouse", label: "Spouse" }, { value: "other", label: "Other" }];

/** Days from today to an ISO date (negative when past). Read at call time, outside render state. */
const daysFromToday = (d: string) => (Date.parse(d) - Date.now()) / 864e5;

export default function SavedTravellers() {
  const c = useColors(); const pb = useTabInset(); const { session } = useAuth(); const { t } = useT(); const fmt = useFmtDate();
  const [list, setList] = useState<Traveller[] | null>(null); const [loadErr, setLoadErr] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ id: string | null; d: Draft } | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const header = <Stack.Screen options={{ title: t("Saved travellers"), headerLargeTitle: false }} />;

  // Loaded when the screen is focused (mount included), and again after every save / remove.
  const load = useCallback(() => {
    if (!session) return;
    fetchTravellers().then((l) => { setList(l); setLoadErr(null); }).catch((e) => { setList([]); setLoadErr(t(e?.message ?? String(e))); });
  }, [session, t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!session) return <View style={{ flex: 1, backgroundColor: c.background, justifyContent: "center" }}>{header}<EmptyState icon="person.crop.circle" title={t("Sign in")} action={<Button title={t("Sign in")} onPress={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} />} /></View>;

  const open = (x?: Traveller) => { select(); setErr(null); setEdit({ id: x?.id ?? null, d: x ? toDraft(x) : { ...EMPTY } }); };
  const set = <K extends keyof Draft>(k: K) => (v: Draft[K]) => setEdit((e) => (e ? { ...e, d: { ...e.d, [k]: v } } : e));
  const save = async () => {
    if (!edit || busy) return; setErr(null);
    const d = edit.d;
    if (!d.firstName.trim() || !d.lastName.trim()) return setErr(t("Enter the traveller's first and last name."));
    setBusy(true);
    try {
      const details = { firstName: d.firstName, lastName: d.lastName, nationality: d.nationality, dateOfBirth: d.dateOfBirth, passportNumber: d.passportNumber, passportExpiry: d.passportExpiry, cityOfResidence: d.cityOfResidence, hasValidPassport: (d.passportNumber ? "yes" : "") as "yes" | "" };
      if (edit.id) await updateTraveller(edit.id, details, d.relationship); else await createTraveller(details, d.relationship);
      success(); setEdit(null); load();
    } catch (e: any) { hError(); setErr(t(e instanceof TravellerSaveError ? e.message : "Couldn't save. Check your connection and try again.")); }
    finally { setBusy(false); }
  };
  const remove = (x: Traveller) => {
    Alert.alert(t("Remove {n}?", { n: travellerName(x) }), t("They disappear from the \"Who is travelling?\" list. Applications already made are not changed."), [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Remove"), style: "destructive", onPress: async () => { try { await deleteTraveller(x.id); success(); setEdit(null); load(); } catch (e: any) { hError(); Alert.alert(t(e?.message ?? "Couldn't remove. Check your connection and try again.")); } } },
    ]);
  };
  const relation = (x: Traveller) => (x.relationship === "self" ? t("You") : x.relationship === "spouse" ? t("Spouse") : undefined);
  /** "12 Jun 2031", with a nudge when it runs out within a year (many consulates want 3+ months after the trip). */
  const expiryLine = (d: string) => { const left = daysFromToday(d); return left < 0 ? `${fmt(d)} · ${t("expired")}` : left < 365 ? `${fmt(d)} · ${t("check before your next trip")}` : fmt(d); };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingTop: S.md, paddingBottom: pb }} testID="saved-travellers">
      {header}
      {/* Canvas Travellers: Globi's line, one card per person with the passport, expiry, emirate and last use. */}
      <View style={{ paddingHorizontal: S.gutter, gap: S.lg }}>
        <GlobiLine pose="companion" text={t("Pick one when you start an application. I skip what I already know.")} />
        {list === null ? <SkeletonRows n={2} />
          : list.length ? list.map((x) => (
            <Card key={x.id} testID={`traveller-${x.id}`}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm, padding: S.md }}>
                <Avatar name={travellerName(x)} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="headline" numberOfLines={1}>{travellerName(x)}</Text>
                  <Text variant="note" tone="secondary" numberOfLines={2}>{[relation(x), x.nationality ? t(x.nationality) : "", x.dateOfBirth ? t("born {d}", { d: fmt(x.dateOfBirth) }) : ""].filter(Boolean).join(" · ") || t("Name only")}</Text>
                </View>
                <PressScale onPress={() => open(x)} accessibilityRole="button" accessibilityLabel={t("Edit {n}", { n: travellerName(x) })} hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }} testID="traveller-edit">
                  <Text variant="callout" weight="600" tone="accent">{t("Edit")}</Text>
                </PressScale>
              </View>
              {[
                [t("Passport"), x.passportNumber ? maskPassport(x.passportNumber) : t("Not added")],
                [t("Expires"), x.passportExpiry ? expiryLine(x.passportExpiry) : t("Not added")],
                [t("Emirate"), x.cityOfResidence ? t(x.cityOfResidence) : t("Not added")],
                ...(x.lastUsedAt ? [[t("Last used"), fmt(x.lastUsedAt.slice(0, 10))]] : []),
              ].map(([k, v]) => (
                <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: S.md, paddingHorizontal: S.md, paddingVertical: 12, borderTopWidth: 1, borderColor: c.separator }}>
                  <Text variant="note" tone="secondary">{k}</Text>
                  <Text variant="note" weight="600" style={{ flexShrink: 1, textAlign: "right" }}>{v}</Text>
                </View>
              ))}
            </Card>
          )) : (
            <View style={{ paddingVertical: S.md }}><EmptyState icon="person.2.fill" mascot={<GlobiPose pose="companion" size={120} />} title={t("No saved travellers yet.")} message={loadErr ?? t("Everyone you apply for is added here after payment, so the next application starts filled in.")} /></View>
          )}
        <SecondaryButton title={t("Add traveller")} onPress={() => open()} testID="traveller-add" />
      </View>

      <Sheet visible={!!edit} onClose={() => { if (!busy) setEdit(null); }} title={edit?.id ? t("Edit traveller") : t("Add traveller")} closeLabel={t("Close")} testID="traveller-sheet">
        {!!edit && (
          <View style={{ gap: S.md, width: "100%", alignSelf: "stretch" }}>
            <FormField label={t("First Name")}>
              <Input value={edit.d.firstName} onChangeText={set("firstName")} autoCapitalize="words" autoCorrect={false} textContentType="givenName" accessibilityLabel={t("First Name")} placeholder={t("Enter first name")} />
            </FormField>
            <FormField label={t("Last Name")}>
              <Input value={edit.d.lastName} onChangeText={set("lastName")} autoCapitalize="words" autoCorrect={false} textContentType="familyName" accessibilityLabel={t("Last Name")} placeholder={t("Enter last name")} />
            </FormField>
            <FormField label={t("Who is this?")}>
              <SegmentedControl label={t("Who is this?")} value={edit.d.relationship} onChange={(v) => set("relationship")(v as TravellerRelationship)} options={RELATION.filter((r) => TRAVELLER_RELATIONSHIPS.includes(r.value)).map((r) => ({ value: r.value, label: t(r.label) }))} />
            </FormField>
            <FormField label={t("Nationality")}>
              <CountryField label={t("Nationality")} value={edit.d.nationality} names={SCHENGEN_VISA_REQUIRED} placeholder={t("Select nationality")} searchPlaceholder={t("Search nationality...")} onChange={set("nationality")} />
            </FormField>
            <FormField label={t("Date of Birth")}>
              <DateField label={t("Date of Birth")} value={edit.d.dateOfBirth} onChange={set("dateOfBirth")} max={iso(new Date())} placeholder={t("Select date of birth")} />
            </FormField>
            <FormField label={t("Passport Number")}>
              <Input value={edit.d.passportNumber} onChangeText={(v) => set("passportNumber")(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} spellCheck={false} placeholder={t("e.g. A1234567")} accessibilityLabel={t("Passport Number")} />
            </FormField>
            <FormField label={t("Passport Expiry Date")}>
              <DateField label={t("Passport Expiry Date")} value={edit.d.passportExpiry} onChange={set("passportExpiry")} placeholder={t("Select expiry date")} />
            </FormField>
            <FormField label={t("Emirate")}>
              <SelectField label={t("Emirate")} value={edit.d.cityOfResidence} options={EMIRATE_OPTIONS} placeholder={t("Select emirate")} onChange={set("cityOfResidence")} />
            </FormField>
            <InlineError text={err} />
            <Button title={t("Save")} loading={busy} disabled={busy} onPress={save} />
            {!!edit.id && <Button title={t("Remove")} variant="destructive" disabled={busy} onPress={() => { const x = list?.find((y) => y.id === edit.id); if (x) remove(x); }} />}
          </View>
        )}
      </Sheet>
    </ScrollView>
  );
}
