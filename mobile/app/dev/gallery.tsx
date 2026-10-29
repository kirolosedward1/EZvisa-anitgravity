// Development-only gallery of the canvas components and the 21 Globi poses (Phase 1 review screenshots).
// Release builds redirect to Home. Open /dev/gallery; ?sheet=1 opens the sheet, ?action=1 the action sheet, ?toast=1 the pill.
import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Text, QuestionHeader, StepHeader, ChoiceTile, ListChoice, Card, Row, RowGroup, InfoNote, Chip, PrimaryButton, SecondaryButton,
  Skeleton, SheetScaffold, ActionSheet, GlobiLine, showSaved, HeaderIconButton,
} from "../../components/ui";
import { GlobiPose, GLOBI_POSES } from "../../components/globi/GlobiPose";
import { useColors, S } from "../../lib/theme";

export default function Gallery() {
  if (!__DEV__) return <Redirect href="/" />;
  return <GalleryBody />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: S.sm }}>
      <Text variant="note" weight="600" tone="secondary" accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

function GalleryBody() {
  const c = useColors(); const i = useSafeAreaInsets(); const q = useLocalSearchParams<{ sheet?: string; action?: string; toast?: string; only?: string }>();
  const [yes, setYes] = useState("yes"); const [grid, setGrid] = useState("pk"); const [purpose, setPurpose] = useState("tourism");
  const [faceId, setFaceId] = useState(true); const [sheet, setSheet] = useState(q.sheet === "1"); const [action, setAction] = useState(q.action === "1");
  useEffect(() => { if (q.toast === "1") { const t = setTimeout(() => showSaved(), 600); return () => clearTimeout(t); } }, [q.toast]);
  const only = q.only; // "poses" | "wizard" | "controls" (screenshot slices)
  const show = (k: string) => !only || only === k;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: i.top + S.md, paddingBottom: i.bottom + S.x4, gap: S.xl }}>
        {show("wizard") && <>
          <StepHeader steps={["Destination", "Traveller", "Review & pay"]} index={1} fraction={0.3} onBack={() => {}} a11yLabel="Traveller, question 2 of 8"
            right={<HeaderIconButton icon="questionmark.circle" label="Help on WhatsApp" onPress={() => {}} />} />
          <View style={{ paddingHorizontal: S.gutter, gap: S.lg }}>
            <QuestionHeader question="What passport do they hold?" pose="passport" chip={<Chip label="Someone else" />} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><ChoiceTile variant="yesno" label="Yes" sub="Two applications in one file. 498 AED." selected={yes === "yes"} onPress={() => setYes("yes")} /></View>
              <View style={{ flex: 1 }}><ChoiceTile variant="yesno" label="No" sub="Just you. 249 AED." selected={yes === "no"} onPress={() => setYes("no")} /></View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[["in", "Indian"], ["pk", "Pakistani"], ["eg", "Egyptian"], ["jo", "Jordanian"]].map(([v, l]) => (
                <View key={v} style={{ width: "48%" }}><ChoiceTile variant="grid" label={l} selected={grid === v} onPress={() => setGrid(v)} /></View>
              ))}
            </View>
            <InfoNote text="GCC and EU passports don't need a Schengen visa, so they aren't on this list." />
            <ListChoice label="Purpose of trip" value={purpose} onPick={setPurpose} options={[
              { value: "tourism", label: "Tourism", icon: "airplane" }, { value: "business", label: "Business", icon: "briefcase.fill" },
              { value: "family", label: "Visiting family or friends", icon: "person.2.fill" }, { value: "other", label: "Other", icon: "plus" },
            ]} />
            <InfoNote tone="info" text="10 days, December or January. We confirm exact dates before booking." />
            <InfoNote tone="later" text="To get later: passport" />
            <PrimaryButton title="Continue" onPress={() => showSaved()} />
          </View>
        </>}

        {show("controls") && <View style={{ paddingHorizontal: S.gutter, gap: S.xl }}>
          <Section title="Type scale">
            <Text variant="pageTitle">Hi, Ahmed</Text>
            <Text variant="resultTitle">Payment received</Text>
            <Text variant="question">Where are you travelling?</Text>
            <Text variant="tile">Yes</Text>
            <Text variant="option">Option tile 16/500</Text>
            <Text variant="row">List row 16/400</Text>
            <Text variant="button">Button 16/600</Text>
            <Text variant="note" tone="secondary">Note 13/400</Text>
            <Text variant="footnote" tone="secondary">Caption 12/400</Text>
          </Section>
          <RowGroup header="App lock">
            <Row label="Face ID" icon="lock.fill" switchValue={faceId} onSwitch={setFaceId} />
            <Row label="Auto-lock" value="After 1 minute" onPress={() => {}} />
            <Row label="Notifications" value="Push, email" icon="bell.fill" onPress={() => {}} />
          </RowGroup>
          <GlobiLine pose="companion" text="Pick one when you start an application. I skip what I already know." />
          <Section title="Buttons and chips">
            <PrimaryButton title="Start my application" onPress={() => {}} />
            <SecondaryButton title="Ask on WhatsApp" whatsapp onPress={() => {}} />
            <SecondaryButton title="Open the sheet" onPress={() => setSheet(true)} />
            <SecondaryButton title="Open the action sheet" compact onPress={() => setAction(true)} />
            <View style={{ flexDirection: "row", gap: S.xs }}><Chip label="From your profile" /><Chip label="Optional" tone="neutral" /></View>
          </Section>
          <Section title="Loading (skeleton)">
            <Card padded>
              <View style={{ flexDirection: "row", gap: S.sm }}>
                <Skeleton w={66} h={66} r={33} />
                <View style={{ flex: 1, gap: S.xs }}><Skeleton w="40%" h={12} /><Skeleton h={20} /><Skeleton w="70%" h={14} /></View>
              </View>
              <Skeleton h={4} style={{ marginTop: S.md }} /><Skeleton h={48} r={14} style={{ marginTop: S.md }} />
            </Card>
          </Section>
        </View>}

        {show("poses") && <View style={{ paddingHorizontal: S.gutter }}>
          <Section title="Globi · 21 poses">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }}>
              {GLOBI_POSES.map((p) => (
                <View key={p} style={{ width: "31%", alignItems: "center", paddingVertical: S.xs, backgroundColor: c.surfaceRaised, borderRadius: 16, borderWidth: 1, borderColor: c.border }}>
                  <GlobiPose pose={p} size={84} />
                  <Text variant="footnote" weight="600">{p}</Text>
                </View>
              ))}
            </View>
          </Section>
        </View>}
      </ScrollView>

      <SheetScaffold visible={sheet} onClose={() => setSheet(false)} pose="documents" globiSize={96} bubble title="Why I ask about your job"
        actions={<View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><SecondaryButton title="Ask the team" whatsapp onPress={() => {}} /></View>
          <View style={{ flex: 1 }}><PrimaryButton title="Got it" onPress={() => setSheet(false)} /></View>
        </View>}>
        <Card padded><Text variant="body">The consulate wants to see you have a reason to come back. An employer letter and a salary that matches your bank statement do that.</Text></Card>
        <RowGroup><Row label="Used for" value="Cover letter, NOC request" /><Row label="Shared with" value="The consulate only" /></RowGroup>
      </SheetScaffold>
      <ActionSheet visible={action} onClose={() => setAction(false)} title="Discard the Spain draft?" message="Three answers are saved. Nothing was paid, so nothing is refunded. This can't be undone."
        destructiveLabel="Discard draft" onDestructive={() => setAction(false)} cancelLabel="Keep it" />
    </View>
  );
}
