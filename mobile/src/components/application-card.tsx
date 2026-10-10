import type { Stage } from "@shared/visa-wizard"
import { Pressable, Text, View } from "react-native"

import type { Application } from "@/lib/api"
import { radius, space, useColors } from "@/lib/theme"

import { Caption, formatDate, Icon, Pill } from "./ui"

export const STAGE_TONE: Record<Stage, "primary" | "success" | "warning" | "danger" | "neutral"> = {
  draft: "neutral",
  awaiting_payment: "warning",
  in_review: "primary",
  ready: "success",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
}

export function ApplicationCard({ app, onPress }: { app: Application; onPress: () => void }) {
  const c = useColors()
  const title = app.destination ? `${app.destination} visa` : "New Schengen visa"
  const dates =
    app.travelStartDate && app.travelEndDate
      ? `${formatDate(app.travelStartDate)} – ${formatDate(app.travelEndDate)}`
      : app.stage === "draft"
        ? `Step ${app.currentStep} of 5 · saved ${new Date(app.updatedAt).toLocaleDateString()}`
        : null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${app.stageLabel}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: c.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.border,
        padding: space.lg,
        gap: space.sm,
        opacity: pressed ? 0.85 : 1,
        boxShadow: "0 1px 3px rgba(11,16,32,0.06)",
      })}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md }}>
        <Text style={{ fontSize: 17, fontWeight: "600", color: c.text, flex: 1 }} numberOfLines={1}>
          {title}
        </Text>
        <Icon name="chevron.right" size={14} color={c.textMuted} />
      </View>
      <Pill label={app.stageLabel} tone={STAGE_TONE[app.stage]} />
      {dates ? <Caption>{dates}</Caption> : null}
      {app.reference ? <Caption>Ref {app.reference}</Caption> : null}
    </Pressable>
  )
}
