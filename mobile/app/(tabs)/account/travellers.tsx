// Account → Saved travellers: the people this account applied for (public.travellers, lib/travellers.ts), with add,
// edit and remove. Rows are created automatically after payment; this is where a typo gets fixed or a person removed.
// The same list is the "Who is travelling?" question in the wizard (and on the website).
import { useCallback, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Globi } from "../../../components/mascot/Globi";
import { ListGroup, ListRow, EmptyState, Button, Flag, Sheet, InlineError, SegmentedControl, SkeletonRows, useTabInset } from "../../../components/ui";
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
  const subtitle = (x: Traveller) => [x.nationality ? t(x.nationality) : "", maskPassport(x.passportNumber), x.dateOfBirth ? t("Born {d}", { d: fmt(x.dateOfBirth) }) : ""].filter(Boolean).join(" · ") || t("Name only");
  const relation = (x: Traveller) => (x.relationship === "self" ? t("You") : x.relationship === "spouse" ? t("Spouse") : undefined);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingTop: S.xl, paddingBottom: pb }} testID="saved-travellers">
      {header}
      {list === null ? <View style={{ paddingHorizontal: S.lg }}><SkeletonRows n={2} /></View>
        : list.length ? (
          <ListGroup header={t("Saved travellers")} footer={t("Shown in the \"Who is travelling?\" question when you apply.")} inset={16}>
            {list.map((x) => <ListRow key={x.id} leading={<Flag country={x.nationality} size={28} />} title={travellerName(x)} subtitle={subtitle(x)} value={relation(x)} minHeight={56} onPress={() => open(x)} />)}
          </ListGroup>
        ) : (
          <View style={{ paddingVertical: S.xl }}><EmptyState icon="person.2.fill" mascot={<Globi pose="duo" size={120} />} title={t("No saved travellers yet.")} message={loadErr ?? t("Everyone you apply for is added here after payment, so the next application starts filled in.")} /></View>
        )}
      <ListGroup><ListRow title={t("Add traveller")} tint chevron={false} onPress={() => open()} /></ListGroup>

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
