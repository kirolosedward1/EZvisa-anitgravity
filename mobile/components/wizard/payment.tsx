// Step 5: Review & Payment (web repo components/apply/payment-step.tsx + dossier-readiness-card.tsx).
import { View } from "react-native";
import { Text, Icon, Button } from "../ui";
import { useColors, S, R, ICON } from "../../lib/theme";
import { STEP_TITLES, label, EMPLOYMENT, PURPOSES, COMPANIONS, FUNDING, BALANCE, HOTELS, tripDays, showSpouse, type WizardForm, type WizardStep } from "../../lib/wizard";
import { fmtShort, Note } from "./fields";
import { phoneDisplay } from "../../lib/questions";

const yn = (v: string) => (v === "yes" ? "Yes" : v === "no" ? "No" : "N/A");
const lab = (opts: { value: string; label: string }[], v: string) => (v ? label(opts, v) : "N/A");

/** Same rules and wording as the web's DossierReadinessCard (computed from the answers only). */
export function readiness(f: WizardForm) {
  let score = 70; const checks: { label: string; passed: boolean }[] = [];
  if (f.travelStartDate && f.travelEndDate) {
    const start = new Date(f.travelStartDate + "T12:00:00");
    const days = tripDays(f);
    if (days >= 1 && days <= 90) { score += 8; checks.push({ label: `Stay duration (${days} days) within Schengen 90-day legal limit`, passed: true }); }
    else checks.push({ label: "Stay duration exceeds 90 days", passed: false });
    const until = Math.round((start.getTime() - Date.now()) / 864e5);
    if (until >= 15) { score += 7; checks.push({ label: `Lead time (${until} days) provides safe consular processing buffer`, passed: true }); }
    else checks.push({ label: `Departure is in ${until} days (embassy turnaround is typically 10-15 days)`, passed: false });
  }
  if (f.passportNumber) { score += 4; checks.push({ label: "Passport bio page / number recorded", passed: true }); }
  else checks.push({ label: "Passport copy can be uploaded securely after checkout", passed: true });
  checks.push({ label: "Bank statements can be uploaded securely after checkout", passed: true });
  if (f.employmentStatus === "business") { score += 4; checks.push({ label: "Employment / business proof categorized", passed: true }); }
  if (showSpouse(f)) { score += 3; checks.push({ label: "Accompanying spouse details integrated into dossier calculation", passed: true }); }
  return { score: Math.min(score, 98), checks };
}

function Card({ children, tone }: { children: React.ReactNode; tone?: "blue" }) {
  const c = useColors();
  return <View style={{ borderRadius: R.card, borderWidth: 1, borderColor: tone === "blue" ? c.tint + "40" : c.separator, backgroundColor: tone === "blue" ? c.tint + "0F" : c.fill2, padding: S.md, gap: S.md }}>{children}</View>;
}
function KV({ k, children }: { k: string; children: React.ReactNode }) {
  return <View style={{ gap: S.xxs }}><Text variant="caption" tone="secondary" weight="600" style={{ textTransform: "uppercase", letterSpacing: 0.8 }}>{k}</Text>{children}</View>;
}
const V = ({ children }: { children: React.ReactNode }) => <Text variant="subhead" weight="500">{children}</Text>;
const Sub = ({ children, red }: { children: React.ReactNode; red?: boolean }) => <Text variant="footnote" tone={red ? "red" : "secondary"}>{children}</Text>;

export function PaymentStep({ f, amount, incomplete, onFix, signedIn, onSignIn, error }: { f: WizardForm; amount: number; incomplete: WizardStep[]; onFix: (s: WizardStep) => void; signedIn: boolean; onSignIn: () => void; error?: string | null }) {
  const c = useColors();
  const r = readiness(f); const days = tripDays(f); const spouse = showSpouse(f);
  return (
    <View style={{ gap: S.lg }}>
      <View>
        <Text variant="headline">Review your Application Details</Text>
        <Text variant="footnote" tone="secondary" style={{ marginTop: S.xxs }}>Verify your information before completing payment.</Text>
      </View>
      {incomplete.length > 0 && (
        <Note tone="red" icon="exclamationmark.circle.fill">
          <View style={{ gap: S.xs }}>
            {incomplete.map((s) => (
              <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>
                <Text variant="subhead" style={{ flex: 1 }}>{STEP_TITLES[s].title} · <Text variant="subhead" tone="red">Incomplete</Text></Text>
                <Button title="Complete" size="M" variant="secondary" onPress={() => onFix(s)} />
              </View>
            ))}
          </View>
        </Note>
      )}
      <Card tone="blue">
        <View style={{ flexDirection: "row", gap: S.sm, alignItems: "center" }}>
          <View style={{ width: S.x3, height: S.x3, borderRadius: R.lg, backgroundColor: c.tintFill, alignItems: "center", justifyContent: "center" }}><Icon name="sparkles" size={ICON.lg - 2} color={c.onAccent} /></View>
          <View style={{ flex: 1 }}>
            <Text variant="footnote" weight="700" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>Pre-Flight File Readiness Score</Text>
            <Text variant="caption" tone="secondary">Automated procedural audit based on official Schengen consular criteria</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs, alignSelf: "flex-start", borderRadius: R.round, borderWidth: 1, borderColor: c.separator, backgroundColor: c.bg, paddingHorizontal: S.sm, paddingVertical: S.xs }}>
          <Icon name="shield.checkered" size={14} color={c.green} />
          <Text variant="caption" weight="700">{r.score}/100 Readiness</Text>
        </View>
        <View style={{ height: 8, borderRadius: R.xs, backgroundColor: c.fill, overflow: "hidden" }} accessible accessibilityLabel={`Readiness ${r.score} of 100`}>
          <View style={{ height: 8, width: `${r.score}%`, borderRadius: R.xs, backgroundColor: c.green }} />
        </View>
        <View style={{ gap: S.xs }}>
          {r.checks.map((x, i) => (
            <View key={i} style={{ flexDirection: "row", gap: S.xs, alignItems: "flex-start" }}>
              <Icon name={x.passed ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"} size={15} color={x.passed ? c.green : c.orange} style={{ marginTop: S.none }} />
              <Text variant="footnote" style={{ flex: 1 }} color={x.passed ? c.label : c.orange} weight={x.passed ? "400" : "500"}>{x.label}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs, borderBottomWidth: 1, borderBottomColor: c.separator, paddingBottom: S.sm }}>
          <Icon name="list.bullet.clipboard.fill" size={18} color={c.tint} />
          <Text variant="footnote" weight="700" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>Visa Dossier Summary</Text>
        </View>
        <KV k="Full Name"><V>{f.firstName} {f.lastName}</V></KV>
        <KV k="Contact Information"><V>{f.email}</V><Sub>{phoneDisplay(f.phone)}</Sub></KV>
        <KV k="Nationality"><V>{f.nationality}</V></KV>
        <KV k="Destination & Residence"><V>{f.destination} (Applying from {f.cityOfResidence}, {f.countryOfResidence})</V></KV>
        <KV k="Intended Travel Dates"><V>{fmtShort(f.travelStartDate)} to {fmtShort(f.travelEndDate)} ({days} days)</V><Sub>Dates Flexible: {yn(f.datesFlexible)}</Sub></KV>
        <KV k="Trip Purpose & Companions"><V>{lab(PURPOSES, f.purposeOfTrip)}</V><Sub>Traveling: {lab(COMPANIONS, f.travelingWith)}</Sub></KV>
        <KV k="Employment Status"><V>{lab(EMPLOYMENT, f.employmentStatus)}</V>
          {f.employmentStatus === "employed" && <Sub>{f.jobTitle} at {f.companyName}</Sub>}
          {(f.employmentStatus === "business" || f.employmentStatus === "freelancer") && <Sub>Owner of {f.companyName}</Sub>}
        </KV>
        <KV k="Financials & Accommodation"><V>Funding: {lab(FUNDING, f.fundingSource)}</V><Sub>Balance: {lab(BALANCE, f.balanceRange)} | Stay: {lab(HOTELS, f.hotelCategory)}</Sub></KV>
        <KV k="First Schengen Visa?"><V>{yn(f.isFirstSchengenVisa)}</V></KV>
        <KV k="Previous Refusals?"><V>{yn(f.previousRefusals)}</V>{f.previousRefusals === "yes" && <Sub red>Refusal Info: {f.refusalDetails}</Sub>}</KV>
        {spouse && (
          <View style={{ borderTopWidth: 1, borderTopColor: c.separator, paddingTop: S.sm }}>
            <KV k="Accompanying Spouse Details"><V>{f.spouseFirstName} {f.spouseLastName} ({f.spouseOccupation || "No Occupation"})</V></KV>
          </View>
        )}
      </Card>
      <Card tone="blue">
        <View style={{ flexDirection: "row", gap: S.sm, alignItems: "center" }}>
          <View style={{ width: 36, height: 36, borderRadius: R.xl, backgroundColor: c.tint + "22", alignItems: "center", justifyContent: "center" }}><Icon name="doc.text.fill" size={18} color={c.tint} /></View>
          <View style={{ flex: 1 }}>
            <Text variant="footnote" weight="700">Post-Payment Document Upload</Text>
            <Text variant="caption" tone="secondary">Upload your files after checkout in the app or via WhatsApp</Text>
          </View>
        </View>
        <Text variant="footnote" tone="secondary">To expedite your checkout today, file uploads are scheduled immediately after payment. You will need clear photos or scans of:</Text>
        <View style={{ gap: S.xs }}>
          {["Passport Copy (Bio page)", "UAE Residence Visa & Emirates ID", "Recent Passport Photo", "Stamped Bank Statements (3-6 mo)", "Employment NOC / Salary Certificate / Trade License"].map((d) => (
            <View key={d} style={{ flexDirection: "row", alignItems: "center", gap: S.xs, padding: S.sm, borderRadius: R.input, borderWidth: 1, borderColor: c.separator, backgroundColor: c.bg }}>
              <Icon name="checkmark" size={13} color={c.green} weight="bold" />
              <Text variant="footnote" style={{ flex: 1 }}>{d}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>
          <Icon name="shield.checkered" size={18} color={c.tint} />
          <Text variant="headline">Order Summary</Text>
        </View>
        {[["Applicant", `${f.firstName} ${f.lastName}`.trim()], ["Nationality", f.nationality], ["Destination", f.destination]].map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: S.sm, borderBottomWidth: 1, borderBottomColor: c.separator, paddingBottom: S.sm }}>
            <Text variant="caption" tone="secondary" weight="500" style={{ textTransform: "uppercase", letterSpacing: 0.8 }}>{k}</Text>
            <Text variant="subhead" weight="600" style={{ flexShrink: 1 }}>{v}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: c.separator, paddingBottom: S.sm }}>
          <Text variant="caption" tone="secondary" weight="500" style={{ textTransform: "uppercase", letterSpacing: 0.8 }}>Documents</Text>
          <View style={{ borderRadius: R.round, borderWidth: 1, borderColor: c.orange + "55", backgroundColor: c.orange + "18", paddingHorizontal: S.sm, paddingVertical: S.xxs }}><Text variant="caption" weight="600" color={c.orange}>Upload Later</Text></View>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="caption" tone="secondary" weight="600" style={{ textTransform: "uppercase", letterSpacing: 0.8 }}>Embassy Fees</Text>
          <Text variant="caption" tone="secondary" style={{ fontStyle: "italic" }}>Paid at Appointment</Text>
        </View>
        {spouse && (
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text variant="subhead" tone="tint" weight="500">Including Accompanying Spouse</Text>
            <Text variant="subhead" tone="tint" weight="500">x2</Text>
          </View>
        )}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text variant="headline">Total Fee</Text>
          <Text variant="title1" tone="tint" weight="700" tabular>{amount} AED</Text>
        </View>
        {!!error && <Note tone="red" icon="exclamationmark.circle.fill"><Text variant="subhead" tone="red">{error}</Text></Note>}
      </Card>
      {!signedIn && (
        <View testID="review-signin">
          <Note tone="blue" icon="person.crop.circle">
            <Text variant="subhead" weight="600">Sign in to submit</Text>
            <Text variant="footnote" tone="secondary" style={{ marginTop: S.xxs }}>Your answers stay saved on this phone while you sign in.</Text>
            <View style={{ marginTop: S.sm }}><Button title="Sign in" size="M" onPress={onSignIn} /></View>
          </Note>
        </View>
      )}
    </View>
  );
}
