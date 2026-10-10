import {
  BALANCE_OPTIONS,
  COMMON_NATIONALITIES,
  COMPANION_OPTIONS,
  EMPLOYMENT_STATUSES,
  FUNDING_OPTIONS,
  HOTEL_OPTIONS,
  MARITAL_STATUSES,
  SALARY_RANGES,
  SCHENGEN_COUNTRIES,
  TRIP_PURPOSES,
  UAE_EMIRATES,
  YES_NO,
  documentRequirements,
  priceAED,
  tripDurationDays,
  type FieldErrors,
  type WizardData,
} from "@shared/visa-wizard"
import * as WebBrowser from "expo-web-browser"
import { Pressable, Text, View } from "react-native"

import { config } from "@/lib/config"
import { space, useColors } from "@/lib/theme"

import { Body, Caption, Card, ChoiceField, DateField, formatDate, Heading, Icon, SelectField, TextField } from "./ui"

export interface StepProps {
  data: WizardData
  errors: FieldErrors
  set: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void
}

const label = (opts: { value: string; label: string }[], v: string) => opts.find((o) => o.value === v)?.label ?? (v || "—")

export function PersonalStep({ data, errors, set }: StepProps) {
  return (
    <>
      <TextField label="First name (as in passport)" value={data.firstName} onChangeText={(v) => set("firstName", v)} error={errors.firstName} autoComplete="given-name" textContentType="givenName" />
      <TextField label="Last name (as in passport)" value={data.lastName} onChangeText={(v) => set("lastName", v)} error={errors.lastName} autoComplete="family-name" textContentType="familyName" />
      <TextField
        label="Email"
        value={data.email}
        editable={false}
        hint="Linked to your account — updates about this application go here"
        error={errors.email}
      />
      <TextField label="Phone / WhatsApp" value={data.phone} onChangeText={(v) => set("phone", v)} error={errors.phone} keyboardType="phone-pad" autoComplete="tel" placeholder="+971 50 123 4567" />
      <SelectField label="Nationality" value={data.nationality} options={COMMON_NATIONALITIES} onChange={(v) => set("nationality", v)} error={errors.nationality} searchable />
      <SelectField label="Emirate of residence" value={data.cityOfResidence} options={UAE_EMIRATES} onChange={(v) => set("cityOfResidence", v)} error={errors.cityOfResidence} />
      <DateField label="Date of birth" value={data.dateOfBirth} onChange={(v) => set("dateOfBirth", v)} error={errors.dateOfBirth} maximumDate={new Date()} />
      <TextField label="Passport number (optional)" value={data.passportNumber} onChangeText={(v) => set("passportNumber", v.toUpperCase())} error={errors.passportNumber} autoCapitalize="characters" autoCorrect={false} />
      <ChoiceField label="Is your passport valid for 6+ months after your trip?" value={data.hasValidPassport} options={YES_NO} onChange={(v) => set("hasValidPassport", v as WizardData["hasValidPassport"])} error={errors.hasValidPassport} />
      <ChoiceField label="Marital status" value={data.maritalStatus} options={MARITAL_STATUSES} onChange={(v) => set("maritalStatus", v as WizardData["maritalStatus"])} error={errors.maritalStatus} />
      {data.maritalStatus === "married" ? (
        <ChoiceField
          label="Is your spouse travelling with you?"
          value={data.spouseAccompanying}
          options={YES_NO}
          onChange={(v) => set("spouseAccompanying", v as WizardData["spouseAccompanying"])}
          error={errors.spouseAccompanying}
        />
      ) : null}
    </>
  )
}

export function SpouseStep({ data, errors, set }: StepProps) {
  return (
    <>
      <Body muted>We'll prepare your spouse's application together with yours.</Body>
      <TextField label="Spouse first name" value={data.spouseFirstName} onChangeText={(v) => set("spouseFirstName", v)} error={errors.spouseFirstName} />
      <TextField label="Spouse last name" value={data.spouseLastName} onChangeText={(v) => set("spouseLastName", v)} error={errors.spouseLastName} />
      <ChoiceField label="Is their passport valid for 6+ months after the trip?" value={data.spouseHasValidPassport} options={YES_NO} onChange={(v) => set("spouseHasValidPassport", v as WizardData["spouseHasValidPassport"])} error={errors.spouseHasValidPassport} />
      <TextField label="Spouse occupation (optional)" value={data.spouseOccupation} onChangeText={(v) => set("spouseOccupation", v)} />
    </>
  )
}

export function EmploymentStep({ data, errors, set }: StepProps) {
  return (
    <>
      <SelectField label="Employment status" value={data.employmentStatus} options={EMPLOYMENT_STATUSES} onChange={(v) => set("employmentStatus", v as WizardData["employmentStatus"])} error={errors.employmentStatus} />
      {data.employmentStatus === "employed" ? (
        <>
          <TextField label="Job title" value={data.jobTitle} onChangeText={(v) => set("jobTitle", v)} error={errors.jobTitle} autoComplete="off" />
          <TextField label="Company name" value={data.companyName} onChangeText={(v) => set("companyName", v)} error={errors.companyName} autoComplete="off" />
          <DateField label="Employment start date (optional)" value={data.employmentStartDate} onChange={(v) => set("employmentStartDate", v)} maximumDate={new Date()} />
          <SelectField label="Monthly salary" value={data.monthlySalary} options={SALARY_RANGES} onChange={(v) => set("monthlySalary", v)} error={errors.monthlySalary} />
          <ChoiceField label="Can you get a No-Objection Certificate (NOC)?" value={data.hasNOC} options={YES_NO} onChange={(v) => set("hasNOC", v as WizardData["hasNOC"])} />
        </>
      ) : null}
      {data.employmentStatus === "business" || data.employmentStatus === "freelancer" ? (
        <>
          <TextField label="Industry" value={data.industry} onChangeText={(v) => set("industry", v)} error={errors.industry} />
          <TextField label="Years of experience (optional)" value={data.yearsOfExperience} onChangeText={(v) => set("yearsOfExperience", v.replace(/\D/g, ""))} keyboardType="number-pad" />
          <SelectField label="Average monthly income" value={data.averageMonthlyIncome} options={SALARY_RANGES} onChange={(v) => set("averageMonthlyIncome", v)} error={errors.averageMonthlyIncome} />
        </>
      ) : null}
    </>
  )
}

export function TripStep({ data, errors, set }: StepProps) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const days = tripDurationDays(data.travelStartDate, data.travelEndDate)
  return (
    <>
      <SelectField label="Main destination" value={data.destination} options={SCHENGEN_COUNTRIES} onChange={(v) => set("destination", v)} error={errors.destination} searchable />
      <SelectField label="Purpose of trip" value={data.purposeOfTrip} options={TRIP_PURPOSES} onChange={(v) => set("purposeOfTrip", v)} error={errors.purposeOfTrip} />
      <DateField label="Departure date" value={data.travelStartDate} onChange={(v) => set("travelStartDate", v)} error={errors.travelStartDate} minimumDate={tomorrow} />
      <DateField
        label="Return date"
        value={data.travelEndDate}
        onChange={(v) => set("travelEndDate", v)}
        error={errors.travelEndDate}
        minimumDate={data.travelStartDate ? new Date(`${data.travelStartDate}T12:00:00`) : tomorrow}
      />
      {days && days > 0 && !errors.travelEndDate ? <Caption>{days} nights · Schengen stays are limited to 90 days</Caption> : null}
      <SelectField label="Who are you travelling with?" value={data.travelingWith} options={COMPANION_OPTIONS} onChange={(v) => set("travelingWith", v)} error={errors.travelingWith} />
      <SelectField label="Accommodation" value={data.hotelCategory} options={HOTEL_OPTIONS} onChange={(v) => set("hotelCategory", v)} error={errors.hotelCategory} />
      <SelectField label="Who is paying for the trip?" value={data.fundingSource} options={FUNDING_OPTIONS} onChange={(v) => set("fundingSource", v)} error={errors.fundingSource} />
      <SelectField label="Current bank balance" value={data.balanceRange} options={BALANCE_OPTIONS} onChange={(v) => set("balanceRange", v)} error={errors.balanceRange} />
      <ChoiceField label="Is this your first Schengen visa?" value={data.isFirstSchengenVisa} options={YES_NO} onChange={(v) => set("isFirstSchengenVisa", v as WizardData["isFirstSchengenVisa"])} error={errors.isFirstSchengenVisa} />
      <ChoiceField label="Have you ever been refused a visa?" value={data.previousRefusals} options={YES_NO} onChange={(v) => set("previousRefusals", v as WizardData["previousRefusals"])} error={errors.previousRefusals} />
      {data.previousRefusals === "yes" ? (
        <TextField label="Tell us about the refusal" value={data.refusalDetails} onChangeText={(v) => set("refusalDetails", v)} error={errors.refusalDetails} multiline placeholder="Country, year and reason given" />
      ) : null}
      <TextField label="Planned itinerary (optional)" value={data.itinerary} onChangeText={(v) => set("itinerary", v)} multiline placeholder="e.g. Paris 4 nights, then Rome 3 nights" />
    </>
  )
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  const c = useColors()
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.md }}>
      <Text style={{ color: c.textMuted, fontSize: 14 }}>{k}</Text>
      <Text style={{ color: c.text, fontSize: 14, fontWeight: "500", flexShrink: 1, textAlign: "right" }}>{v}</Text>
    </View>
  )
}

export function ReviewStep({ data, errors, set, onEdit }: StepProps & { onEdit: (step: "personal" | "employment" | "trip") => void }) {
  const c = useColors()
  const price = priceAED(data)
  const docs = documentRequirements(data).filter((d) => d.required)
  return (
    <>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Heading>You</Heading>
          <Text accessibilityRole="button" onPress={() => onEdit("personal")} style={{ color: c.primary, fontWeight: "600" }}>Edit</Text>
        </View>
        <SummaryRow k="Name" v={`${data.firstName} ${data.lastName}`} />
        <SummaryRow k="Nationality" v={data.nationality} />
        <SummaryRow k="Lives in" v={data.cityOfResidence} />
        <SummaryRow k="Employment" v={label(EMPLOYMENT_STATUSES, data.employmentStatus)} />
        {data.spouseAccompanying === "yes" ? <SummaryRow k="Spouse" v={`${data.spouseFirstName} ${data.spouseLastName}`} /> : null}
      </Card>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Heading>Trip</Heading>
          <Text accessibilityRole="button" onPress={() => onEdit("trip")} style={{ color: c.primary, fontWeight: "600" }}>Edit</Text>
        </View>
        <SummaryRow k="Destination" v={data.destination} />
        <SummaryRow k="Dates" v={`${formatDate(data.travelStartDate)} – ${formatDate(data.travelEndDate)}`} />
        <SummaryRow k="Purpose" v={label(TRIP_PURPOSES, data.purposeOfTrip)} />
        <SummaryRow k="Travelling" v={label(COMPANION_OPTIONS, data.travelingWith)} />
      </Card>
      <Card>
        <Heading>After payment you'll upload</Heading>
        {docs.map((d) => (
          <View key={d.type} style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
            <Icon name="checkmark.circle" size={16} color={c.success} />
            <Body style={{ fontSize: 15 }}>{d.label}</Body>
          </View>
        ))}
      </Card>
      <Card style={{ backgroundColor: c.primarySoft, borderColor: c.primarySoft }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Body>{data.spouseAccompanying === "yes" ? "Service fee (2 applicants)" : "Service fee"}</Body>
          <Text style={{ fontSize: 26, fontWeight: "700", color: c.primary }}>{price} AED</Text>
        </View>
        <Caption>Embassy fees are paid separately at your appointment. Money-back guarantee if your visa is refused.</Caption>
      </Card>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: data.declarationAccepted }}
        onPress={() => set("declarationAccepted", !data.declarationAccepted)}
        style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: errors.declarationAccepted ? c.danger : data.declarationAccepted ? c.primary : c.border,
            backgroundColor: data.declarationAccepted ? c.primary : "transparent",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 1,
          }}>
          {data.declarationAccepted ? <Icon name="checkmark" size={14} color={c.primaryText} /> : null}
        </View>
        <Text style={{ flex: 1, color: c.text, fontSize: 14, lineHeight: 20 }}>
          I confirm the information is accurate and agree to the{" "}
          <Text style={{ color: c.primary }} onPress={() => WebBrowser.openBrowserAsync(`${config.siteUrl}/terms-of-service`)}>Terms</Text> and{" "}
          <Text style={{ color: c.primary }} onPress={() => WebBrowser.openBrowserAsync(`${config.siteUrl}/refund-policy`)}>Refund policy</Text>.
        </Text>
      </Pressable>
      {errors.declarationAccepted ? <Text style={{ color: c.danger, fontSize: 13 }}>{errors.declarationAccepted}</Text> : null}
    </>
  )
}
