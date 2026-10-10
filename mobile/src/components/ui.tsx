import DateTimePicker from "@react-native-community/datetimepicker"
import { SymbolView, type SymbolViewProps } from "expo-symbols"
import { useState, type ReactNode } from "react"
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import type { Option } from "@shared/visa-wizard"

import { radius, space, type, useColors } from "@/lib/theme"

export function Icon({ name, size = 20, color }: { name: SymbolViewProps["name"]; size?: number; color: string }) {
  return <SymbolView name={name} size={size} tintColor={color} style={{ width: size, height: size }} />
}

export function Heading({ children, style }: { children: ReactNode; style?: object }) {
  const c = useColors()
  return <Text style={[type.heading, { color: c.text }, style]}>{children}</Text>
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  const c = useColors()
  return <Text style={[type.body, { color: muted ? c.textMuted : c.text }, style]}>{children}</Text>
}

export function Caption({ children, style }: { children: ReactNode; style?: object }) {
  const c = useColors()
  return <Text style={[type.caption, { color: c.textMuted }, style]}>{children}</Text>
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors()
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          padding: space.lg,
          gap: space.md,
          boxShadow: "0 1px 3px rgba(11,16,32,0.06)",
        },
        style,
      ]}>
      {children}
    </View>
  )
}

/** Compact pill chip, same idea as the web section labels. */
export function Pill({ label, tone = "primary" }: { label: string; tone?: "primary" | "success" | "warning" | "danger" | "neutral" }) {
  const c = useColors()
  const map = {
    primary: [c.primarySoft, c.primary],
    success: [c.successSoft, c.success],
    warning: [c.warningSoft, c.warning],
    danger: [c.dangerSoft, c.danger],
    neutral: [c.surface, c.textMuted],
  } as const
  const [bg, fg] = map[tone]
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  )
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  accessibilityHint,
}: {
  title: string
  onPress: () => void
  variant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  icon?: SymbolViewProps["name"]
  accessibilityHint?: string
}) {
  const c = useColors()
  const styles: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: c.primary, fg: c.primaryText, border: c.primary },
    secondary: { bg: c.card, fg: c.text, border: c.border },
    ghost: { bg: "transparent", fg: c.primary, border: "transparent" },
    danger: { bg: c.dangerSoft, fg: c.danger, border: c.dangerSoft },
  }
  const s = styles[variant]
  const inactive = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: radius.md,
        backgroundColor: s.bg,
        borderWidth: 1,
        borderColor: s.border,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: space.sm,
        paddingHorizontal: space.lg,
        opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
      })}>
      {loading ? (
        <ActivityIndicator color={s.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={s.fg} /> : null}
          <Text style={{ color: s.fg, fontSize: 16, fontWeight: "600" }}>{title}</Text>
        </>
      )}
    </Pressable>
  )
}

function FieldShell({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  const c = useColors()
  return (
    <View style={{ gap: 6 }}>
      <Text style={[type.label, { color: c.text }]}>{label}</Text>
      {children}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[type.caption, { color: c.danger }]}>
          {error}
        </Text>
      ) : hint ? (
        <Caption>{hint}</Caption>
      ) : null}
    </View>
  )
}

function useInputStyle(error?: string) {
  const c = useColors()
  return {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: error ? c.danger : c.border,
    backgroundColor: c.surface,
    paddingHorizontal: space.lg,
    color: c.text,
    fontSize: 16,
  }
}

export function TextField({
  label,
  error,
  hint,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const c = useColors()
  const style = useInputStyle(error)
  return (
    <FieldShell label={label} error={error} hint={hint}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textMuted}
        {...props}
        style={[style, props.multiline ? { minHeight: 110, paddingTop: 14, textAlignVertical: "top" } : null]}
      />
    </FieldShell>
  )
}

/** A picker that opens a native-feeling sheet with a searchable list. */
export function SelectField({
  label,
  value,
  options,
  onChange,
  error,
  placeholder = "Select",
  searchable,
}: {
  label: string
  value: string
  options: Option[] | readonly string[]
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  searchable?: boolean
}) {
  const c = useColors()
  const style = useInputStyle(error)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const opts: Option[] = (options as (Option | string)[]).map((o) => (typeof o === "string" ? { value: o, label: o } : o))
  const selected = opts.find((o) => o.value === value)
  const filtered = query ? opts.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : opts

  return (
    <FieldShell label={label} error={error}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? "not selected"}`}
        onPress={() => setOpen(true)}
        style={[style, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <Text style={{ fontSize: 16, color: selected ? c.text : c.textMuted, flex: 1 }} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon name="chevron.up.chevron.down" size={14} color={c.textMuted} />
      </Pressable>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: space.lg }}>
            <Heading>{label}</Heading>
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} hitSlop={12}>
              <Text style={{ color: c.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
            </Pressable>
          </View>
          {searchable ? (
            <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
              <TextInput
                accessibilityLabel={`Search ${label}`}
                placeholder="Search"
                placeholderTextColor={c.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                style={[style, { minHeight: 44 }]}
              />
            </View>
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(o) => o.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item.value === value
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onChange(item.value)
                    setOpen(false)
                    setQuery("")
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: space.lg,
                    paddingVertical: 16,
                    backgroundColor: pressed ? c.surface : "transparent",
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: c.border,
                  })}>
                  <Text style={{ fontSize: 16, color: c.text }}>{item.label}</Text>
                  {active ? <Icon name="checkmark" size={16} color={c.primary} /> : null}
                </Pressable>
              )
            }}
          />
        </SafeAreaView>
      </Modal>
    </FieldShell>
  )
}

/** Segmented choice for short option lists (Yes/No, etc). */
export function ChoiceField({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (v: string) => void
  error?: string
}) {
  const c = useColors()
  return (
    <FieldShell label={label} error={error}>
      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
        {options.map((o) => {
          const active = o.value === value
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => onChange(o.value)}
              style={{
                flexGrow: 1,
                minWidth: 96,
                minHeight: 48,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: active ? c.primary : error ? c.danger : c.border,
                backgroundColor: active ? c.primarySoft : c.surface,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: space.md,
              }}>
              <Text style={{ color: active ? c.primary : c.text, fontWeight: active ? "600" : "400", fontSize: 15 }}>
                {o.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </FieldShell>
  )
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number)
  return y && m && d ? new Date(y, m - 1, d) : null
}
export const formatDate = (s: string | null | undefined) => {
  const d = s ? fromISO(s.slice(0, 10)) : null
  return d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"
}

/** Date picker that stores YYYY-MM-DD strings (same format as the web wizard). */
export function DateField({
  label,
  value,
  onChange,
  error,
  minimumDate,
  maximumDate,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  minimumDate?: Date
  maximumDate?: Date
}) {
  const c = useColors()
  const style = useInputStyle(error)
  const [open, setOpen] = useState(false)
  const current = fromISO(value)
  const [draft, setDraft] = useState<Date>(current ?? minimumDate ?? new Date())

  return (
    <FieldShell label={label} error={error}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDate(value) : "not set"}`}
        onPress={() => {
          setDraft(current ?? minimumDate ?? maximumDate ?? new Date())
          setOpen(true)
        }}
        style={[style, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <Text style={{ fontSize: 16, color: value ? c.text : c.textMuted }}>{value ? formatDate(value) : "Select date"}</Text>
        <Icon name="calendar" size={16} color={c.textMuted} />
      </Pressable>
      {open && Platform.OS === "android" ? (
        <DateTimePicker
          value={draft}
          mode="date"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, d) => {
            setOpen(false)
            if (event.type === "set" && d) onChange(toISO(d))
          }}
        />
      ) : null}
      {Platform.OS !== "android" ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable
            accessibilityLabel="Close date picker"
            onPress={() => setOpen(false)}
            style={{ flex: 1, backgroundColor: "rgba(11,16,32,0.35)", justifyContent: "flex-end" }}>
            <Pressable
              onPress={() => {}}
              style={{ backgroundColor: c.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, paddingBottom: space.xxl, gap: space.md }}>
              <Heading>{label}</Heading>
              <DateTimePicker
                value={draft}
                mode="date"
                display="inline"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_e, d) => d && setDraft(d)}
              />
              <Button
                title="Confirm"
                onPress={() => {
                  onChange(toISO(draft))
                  setOpen(false)
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </FieldShell>
  )
}

export function Banner({ tone = "danger", message, action }: { tone?: "danger" | "warning" | "primary"; message: string; action?: { label: string; onPress: () => void } }) {
  const c = useColors()
  const bg = tone === "danger" ? c.dangerSoft : tone === "warning" ? c.warningSoft : c.primarySoft
  const fg = tone === "danger" ? c.danger : tone === "warning" ? c.warning : c.primary
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: bg, borderRadius: radius.md, padding: space.md, flexDirection: "row", alignItems: "center", gap: space.sm }}>
      <Icon name={tone === "primary" ? "info.circle" : "exclamationmark.triangle"} size={18} color={fg} />
      <Text style={{ color: fg, flex: 1, fontSize: 14, lineHeight: 19 }}>{message}</Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={10}>
          <Text style={{ color: fg, fontWeight: "700", fontSize: 14 }}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function Centered({ children }: { children: ReactNode }) {
  const c = useColors()
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.md, backgroundColor: c.background }}>
      {children}
    </View>
  )
}

export function Loading() {
  const c = useColors()
  return (
    <Centered>
      <ActivityIndicator color={c.primary} />
    </Centered>
  )
}

/** Scrollable form/content screen with consistent padding and keyboard handling. */
export function ScreenScroll({ children, refreshControl }: { children: ReactNode; refreshControl?: React.ReactElement<any> }) {
  const c = useColors()
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      refreshControl={refreshControl}>
      {children}
    </ScrollView>
  )
}
