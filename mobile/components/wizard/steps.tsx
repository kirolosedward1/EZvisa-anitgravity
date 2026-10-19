// The website's wizard steps (web repo components/apply/*-step.tsx), ported 1:1:
// same sections, field order, labels, placeholders, controls and notes.
import { View, Pressable } from "react-native";
import { Text, Icon, Button } from "../ui";
import { PhoneField } from "../CountryPicker";
import { useColors, S, R } from "../../lib/theme";
import { WORLD } from "../../lib/world";
import { SCHENGEN, UAE_NATIONALITIES, MARITAL, EMPLOYMENT, SALARY, PURPOSES, COMPANIONS, HOTELS, FUNDING, BALANCE, tripDays, iso as isoDate, adultMax, earliestDeparture, type WizardForm, type Errors } from "../../lib/wizard";
import { FormField, Input, TextArea, SelectField, CountryField, DateField, YesNoToggle, Checkbox, Note, Group, Divider, Label, FieldError, fmtShort } from "./fields";
import { useState } from "react";

const WORLD_NAMES = WORLD.map((w) => w.name);
export type StepProps = { f: WizardForm; set: <K extends keyof WizardForm>(k: K) => (v: WizardForm[K]) => void; patch: (p: Partial<WizardForm>) => void; errors: Errors; show: boolean };
const todayIso = () => isoDate(new Date());

export function Intro({ children }: { children: string }) {
  return <Text variant="subhead" tone="secondary" style={{ lineHeight: 21 }}>{children}</Text>;
}

/** Step 1: Personal Information (nationality-step.tsx) */
export function PersonalStep({ f, set, patch, errors: e, show }: StepProps) {
  const has = (k: keyof WizardForm) => show && !!e[k];
  return (
    <View style={{ gap: S.lg }}>
      <Intro>This information helps us tailor your cover letter and strengthen your return-to-home justification.</Intro>
      <FormField label="Destination Country (Schengen) *">
        <CountryField label="Destination Country (Schengen) *" value={f.destination} names={SCHENGEN} placeholder="Select destination country" searchPlaceholder="Search country..." onChange={set("destination")} error={has("destination")} />
      </FormField>
      <FormField label="Nationality *">
        <CountryField label="Nationality *" value={f.nationality} names={UAE_NATIONALITIES} placeholder="Select nationality" searchPlaceholder="Search nationality..." onChange={(v) => patch({ nationality: v, ...(v !== "Other" && { nationalityOther: "" }) })} error={has("nationality")} />
      </FormField>
      {f.nationality === "Other" && (
        <FormField label="Your Nationality *">
          <Input value={f.nationalityOther ?? ""} onChangeText={set("nationalityOther")} placeholder="Enter your nationality" accessibilityLabel="Your Nationality" error={has("nationalityOther")} />
        </FormField>
      )}
      <FormField label="Country of Residence *">
        <CountryField label="Country of Residence *" value={f.countryOfResidence} names={WORLD_NAMES} placeholder="Select country" searchPlaceholder="Search country..."
          onChange={(v) => patch({ countryOfResidence: v, ...(v !== "United Arab Emirates" && { hasEmiratesId: "" }) })} error={has("countryOfResidence")} />
      </FormField>
      <FormField label="City of Residence *">
        <Input value={f.cityOfResidence} onChangeText={set("cityOfResidence")} placeholder="Enter city" accessibilityLabel="City of Residence" textContentType="addressCity" error={has("cityOfResidence")} />
      </FormField>
      {f.countryOfResidence === "United Arab Emirates" && (
        <FormField label="Do you have an Emirates ID? *">
          <YesNoToggle label="Do you have an Emirates ID?" value={f.hasEmiratesId} onChange={set("hasEmiratesId")} error={has("hasEmiratesId")} />
        </FormField>
      )}
      <Divider />
      <FormField label="First Name *">
        <Input value={f.firstName} onChangeText={set("firstName")} placeholder="Enter first name" accessibilityLabel="First Name" textContentType="givenName" autoComplete="given-name" error={has("firstName")} />
      </FormField>
      <FormField label="Last Name *">
        <Input value={f.lastName} onChangeText={set("lastName")} placeholder="Enter last name" accessibilityLabel="Last Name" textContentType="familyName" autoComplete="family-name" error={has("lastName")} />
      </FormField>
      <FormField label="Email Address *" error={show && f.email && e.email ? "Please enter a valid email address" : undefined}>
        <Input value={f.email} onChangeText={set("email")} placeholder="your.email@example.com" accessibilityLabel="Email Address" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" error={has("email")} />
      </FormField>
      <View>
        <Label>Phone Number *</Label>
        <PhoneField country={f.phoneCountry} local={f.phoneLocal} error={has("phone")} onChange={(iso2, local, full) => patch({ phoneCountry: iso2, phoneLocal: local, phone: full })} />
        <FieldError text={show && f.phone && e.phone ? "Please enter a valid phone number (8-15 digits)" : undefined} />
        <Checkbox label="Receive application updates via WhatsApp" value={f.whatsappOptIn} onChange={set("whatsappOptIn")} icon="logo.whatsapp" iconColor="#25D366" />
      </View>
      <FormField label="Date of Birth *" error={show && e.dateOfBirth ? "Please select your date of birth (must be 18+)" : undefined}>
        <DateField label="Date of Birth" value={f.dateOfBirth} onChange={set("dateOfBirth")} max={isoDate(adultMax())} placeholder="Select date of birth" error={has("dateOfBirth")} />
      </FormField>
      <FormField label="Passport Number *" error={show && e.passportNumber ? "Please enter your passport number" : undefined}>
        <Input value={f.passportNumber} onChangeText={(v) => set("passportNumber")(v.toUpperCase())} placeholder="e.g. A1234567" accessibilityLabel="Passport Number" autoCapitalize="characters" autoCorrect={false} spellCheck={false} error={has("passportNumber")} />
      </FormField>
      <View style={{ gap: S.sm }}>
        <View>
          <Label>Do you have a valid passport? *</Label>
          <YesNoToggle label="Do you have a valid passport?" value={f.hasValidPassport} onChange={set("hasValidPassport")} error={has("hasValidPassport")} />
        </View>
        {f.hasValidPassport === "yes" && <Note tone="green">Your passport should have at least 6 months validity from your travel date.</Note>}
        {f.hasValidPassport === "no" && <Note tone="amber">You will need to obtain a valid passport before applying for a visa.</Note>}
      </View>
      <FormField label="Marital Status *">
        <SelectField label="Marital Status" value={f.maritalStatus} options={MARITAL} placeholder="Select status" onChange={(v) => patch({ maritalStatus: v as WizardForm["maritalStatus"], ...(v !== "married" && { spouseAccompanying: "" }) })} error={has("maritalStatus")} />
      </FormField>
      {f.maritalStatus === "married" && (
        <FormField label="Will your spouse accompany you? *">
          <YesNoToggle label="Will your spouse accompany you?" value={f.spouseAccompanying} onChange={set("spouseAccompanying")} error={has("spouseAccompanying")} />
        </FormField>
      )}
    </View>
  );
}

/** Step 2: Spouse Information (spouse-step.tsx) */
export function SpouseStep({ f, set, errors: e, show }: StepProps) {
  const c = useColors();
  const has = (k: keyof WizardForm) => show && !!e[k];
  return (
    <View style={{ gap: S.lg }}>
      <View style={{ padding: S.md, borderRadius: R.tile, borderWidth: 1, borderColor: c.tint + "33", backgroundColor: c.tint + "0D" }}>
        <Intro>Please provide your spouse's information for the visa application.</Intro>
      </View>
      <FormField label="Spouse First Name *">
        <Input value={f.spouseFirstName} onChangeText={set("spouseFirstName")} placeholder="Enter first name" accessibilityLabel="Spouse First Name" error={has("spouseFirstName")} />
      </FormField>
      <FormField label="Spouse Last Name *">
        <Input value={f.spouseLastName} onChangeText={set("spouseLastName")} placeholder="Enter last name" accessibilityLabel="Spouse Last Name" error={has("spouseLastName")} />
      </FormField>
      <View style={{ gap: S.sm }}>
        <View>
          <Label>Does your spouse have a valid passport? *</Label>
          <YesNoToggle label="Does your spouse have a valid passport?" value={f.spouseHasValidPassport} onChange={set("spouseHasValidPassport")} error={has("spouseHasValidPassport")} />
        </View>
        {f.spouseHasValidPassport === "yes" && <Note tone="green">Your spouse's passport should have at least 6 months validity from your travel date.</Note>}
        {f.spouseHasValidPassport === "no" && <Note tone="amber">Your spouse will need to obtain a valid passport before applying for a visa.</Note>}
      </View>
      <FormField label="Spouse Occupation (Optional)">
        <Input value={f.spouseOccupation} onChangeText={set("spouseOccupation")} placeholder="Enter occupation" accessibilityLabel="Spouse Occupation" />
      </FormField>
    </View>
  );
}

/** Step 3: Employment (employment-step.tsx) */
export function EmploymentStep({ f, set, errors: e, show }: StepProps) {
  const has = (k: keyof WizardForm) => show && !!e[k];
  return (
    <View style={{ gap: S.lg }}>
      <Intro>Employment details help us strengthen your visa application and create a compelling cover letter.</Intro>
      <FormField label="Employment Status *">
        <SelectField label="Employment Status" value={f.employmentStatus} options={EMPLOYMENT} placeholder="Select employment status" onChange={(v) => set("employmentStatus")(v as WizardForm["employmentStatus"])} error={has("employmentStatus")} />
      </FormField>
      {f.employmentStatus === "employed" && (
        <Group>
          <FormField label="Job Title *"><Input value={f.jobTitle} onChangeText={set("jobTitle")} placeholder="Enter job title" accessibilityLabel="Job Title" textContentType="jobTitle" error={has("jobTitle")} /></FormField>
          <FormField label="Company Name *"><Input value={f.companyName} onChangeText={set("companyName")} placeholder="Enter company name" accessibilityLabel="Company Name" textContentType="organizationName" error={has("companyName")} /></FormField>
          <FormField label="Employment Start Date *"><DateField label="Employment Start Date" value={f.employmentStartDate} onChange={set("employmentStartDate")} max={todayIso()} placeholder="Select start date" error={has("employmentStartDate")} /></FormField>
          <FormField label="Monthly Salary Range *"><SelectField label="Monthly Salary Range" value={f.monthlySalary} options={SALARY} placeholder="Select range" onChange={set("monthlySalary")} error={has("monthlySalary")} /></FormField>
          <FormField label="Do you have a No Objection Certificate?"><YesNoToggle label="Do you have a No Objection Certificate?" value={f.hasNOC} onChange={set("hasNOC")} /></FormField>
        </Group>
      )}
      {(f.employmentStatus === "business" || f.employmentStatus === "freelancer") && (
        <Group>
          <FormField label="Company Name *"><Input value={f.companyName} onChangeText={set("companyName")} placeholder="Enter company name" accessibilityLabel="Company Name" error={has("companyName")} /></FormField>
          <FormField label="Average Monthly Income *"><Input value={f.averageMonthlyIncome} onChangeText={set("averageMonthlyIncome")} placeholder="e.g., 15,000 AED" accessibilityLabel="Average Monthly Income" error={has("averageMonthlyIncome")} /></FormField>
        </Group>
      )}
    </View>
  );
}

/** Step 4: Trip Details (trip-details-step.tsx) */
export function TripStep({ f, set, patch, errors: e, show }: StepProps) {
  const c = useColors();
  const has = (k: keyof WizardForm) => show && !!e[k];
  const days = tripDays(f);
  const [nc, setNc] = useState(""); const [na, setNa] = useState(""); const [nd, setNd] = useState(""); const [dateErr, setDateErr] = useState("");
  const added = f.additionalCountries;
  const addable = SCHENGEN.filter((n) => !added.some((a) => a.country === n) && n !== f.destination).map((n) => ({ value: n, label: n }));
  const onArrival = (v: string) => { setNa(v); setDateErr(""); if (nd && v && nd <= v) { setNd(""); setDateErr("Departure date must be after arrival date"); } };
  const onDeparture = (v: string) => { if (na && v && v <= na) { setDateErr("Departure date must be after arrival date"); return; } setDateErr(""); setNd(v); };
  const add = () => {
    if (!nc || !na || !nd) return;
    if (nd <= na) { setDateErr("Departure date must be after arrival date"); return; }
    if (added.some((a) => a.country === nc)) { setDateErr(`${nc} is already added to your itinerary`); return; }
    set("additionalCountries")([...added, { country: nc, arrivalDate: na, departureDate: nd }]); setNc(""); setNa(""); setNd(""); setDateErr("");
  };
  const dayAfter = (s: string) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + 1); return isoDate(d); };
  const canAdd = !!nc && !!na && !!nd && !dateErr;
  return (
    <View style={{ gap: S.lg }}>
      <FormField label="Purpose of Trip *">
        <SelectField label="Purpose of Trip" value={f.purposeOfTrip} options={PURPOSES} placeholder="Select purpose of trip" onChange={set("purposeOfTrip")} error={has("purposeOfTrip")} />
      </FormField>
      <Group>
        <FormField label="Intended Departure Date *" error={show && f.travelStartDate && e.travelStartDate ? e.travelStartDate : undefined}>
          <DateField label="Intended Departure Date" value={f.travelStartDate} onChange={set("travelStartDate")} min={isoDate(earliestDeparture())} placeholder="Select departure date" error={has("travelStartDate")} />
        </FormField>
        <FormField label="Intended Return Date *">
          <DateField label="Intended Return Date" value={f.travelEndDate} onChange={set("travelEndDate")} min={f.travelStartDate || todayIso()} placeholder="Select return date" error={has("travelEndDate")} />
        </FormField>
        {days > 0 && (
          <Note tone="blue">
            <Text variant="subhead" tone="secondary">Total Stay Duration: <Text variant="subhead" weight="700">{days} days</Text>.</Text>
            {days > 90 && <Text variant="subhead" tone="red" weight="500" style={{ marginTop: 4 }}>Error: Schengen tourist visas permit a maximum stay of 90 days.</Text>}
          </Note>
        )}
        <FormField label="Are your travel dates flexible? *">
          <YesNoToggle label="Are your travel dates flexible?" value={f.datesFlexible} onChange={set("datesFlexible")} error={has("datesFlexible")} />
        </FormField>
      </Group>
      <FormField label="Who are you traveling with? *">
        <SelectField label="Who are you traveling with?" value={f.travelingWith} options={COMPANIONS} placeholder="Select companion option" onChange={set("travelingWith")} error={has("travelingWith")} />
      </FormField>
      <FormField label="Accommodation Preferences *">
        <SelectField label="Accommodation Preferences" value={f.hotelCategory} options={HOTELS} placeholder="Select hotel category" onChange={set("hotelCategory")} error={has("hotelCategory")} />
      </FormField>
      <Group>
        <FormField label="Funding Source *">
          <SelectField label="Funding Source" value={f.fundingSource} options={FUNDING} placeholder="Select funding source" onChange={set("fundingSource")} error={has("fundingSource")} />
        </FormField>
        <FormField label="Approx. Bank Balance Range *">
          <SelectField label="Approx. Bank Balance Range" value={f.balanceRange} options={BALANCE} placeholder="Select balance range" onChange={set("balanceRange")} error={has("balanceRange")} />
        </FormField>
      </Group>
      <FormField label="Is this your first Schengen Visa? *">
        <YesNoToggle label="Is this your first Schengen Visa?" value={f.isFirstSchengenVisa} onChange={set("isFirstSchengenVisa")} error={has("isFirstSchengenVisa")} />
      </FormField>
      <FormField label="Have you ever had a visa refusal? *">
        <YesNoToggle label="Have you ever had a visa refusal?" value={f.previousRefusals} onChange={(v) => patch(v === "no" ? { previousRefusals: "no", refusalDetails: "" } : { previousRefusals: "yes" })} error={has("previousRefusals")} />
      </FormField>
      {f.previousRefusals === "yes" && (
        <Group tone="red">
          <View style={{ gap: S.xs }}>
            <Label>Refusal Details *</Label>
            <Text variant="footnote" tone="secondary">Please specify the country, date, and reason stated in the refusal letter. We will formulate a mitigation explanation in your cover letter.</Text>
            <TextArea value={f.refusalDetails} onChangeText={set("refusalDetails")} rows={3} placeholder="e.g., Rejected by France in Nov 2025 due to insufficient justification of travel purpose..." accessibilityLabel="Refusal Details" error={has("refusalDetails")} />
          </View>
        </Group>
      )}
      <FormField label="Will you be visiting other Schengen countries?">
        <YesNoToggle label="Will you be visiting other Schengen countries?" value={f.willVisitOtherCountries} onChange={(v) => patch(v === "no" ? { willVisitOtherCountries: "no", additionalCountries: [] } : { willVisitOtherCountries: "yes" })} />
      </FormField>
      {f.willVisitOtherCountries === "yes" && (
        <View style={{ gap: S.md }}>
          <View>
            <Label>Additional Countries to Visit</Label>
            <Text variant="subhead" tone="secondary">Add other Schengen countries you plan to visit during your trip</Text>
          </View>
          <Group>
            <SelectField label="Additional country" value={nc} options={addable} placeholder="Select a country" onChange={(v) => { setNc(v); setDateErr(""); }} />
            <FormField label="Arrival Date">
              <DateField label="Arrival Date" value={na} onChange={onArrival} disabled={!nc} min={f.travelStartDate || todayIso()} max={f.travelEndDate || undefined} placeholder={!nc ? "Select a country first" : "Select arrival date"} />
            </FormField>
            <FormField label="Departure Date">
              <DateField label="Departure Date" value={nd} onChange={onDeparture} disabled={!nc || !na} min={na ? dayAfter(na) : undefined} max={f.travelEndDate || undefined}
                placeholder={!nc ? "Select a country first" : !na ? "Select arrival date first" : "Select departure date"} />
            </FormField>
            {!!dateErr && <Note tone="red" icon="exclamationmark.circle.fill"><Text variant="subhead" tone="red">{dateErr}</Text></Note>}
            <Button title="Add Country" icon="plus" variant="secondary" disabled={!canAdd} onPress={add} />
          </Group>
          {added.map((a) => (
            <View key={a.country} style={{ flexDirection: "row", alignItems: "center", padding: S.md, borderRadius: R.input, borderWidth: 1, borderColor: c.separator, backgroundColor: c.card }}>
              <View style={{ flex: 1 }}>
                <Text variant="headline">{a.country}</Text>
                <Text variant="subhead" tone="secondary" style={{ marginTop: 2 }}>{fmtShort(a.arrivalDate)} → {fmtShort(a.departureDate)}</Text>
              </View>
              <Pressable onPress={() => set("additionalCountries")(added.filter((x) => x.country !== a.country))} accessibilityRole="button" accessibilityLabel={`Remove ${a.country}`}
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                <Icon name="xmark" size={16} color={c.secondaryLabel} weight="semibold" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={{ gap: S.xs }}>
        <Label>Travel Itinerary (Optional)</Label>
        <Text variant="subhead" tone="secondary">Provide details about your planned activities, accommodations, and schedule</Text>
        <TextArea value={f.itinerary} onChangeText={set("itinerary")} rows={5} placeholder="Example: Day 1-3: Paris (Hotel XYZ), Day 4-6: Rome (Hotel ABC)..." accessibilityLabel="Travel Itinerary" />
      </View>
    </View>
  );
}
