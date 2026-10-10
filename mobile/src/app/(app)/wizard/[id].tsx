import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  getSteps,
  hasSpouseStep,
  validateStep,
  type FieldErrors,
  type StepId,
  type WizardData,
} from "@shared/visa-wizard"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Banner, Button, Caption, Centered, Loading } from "@/components/ui"
import { EmploymentStep, PersonalStep, ReviewStep, SpouseStep, TripStep } from "@/components/wizard-steps"
import { api, ApiError, type Application } from "@/lib/api"
import { useOnline } from "@/lib/hooks"
import { payForApplication } from "@/lib/payment"
import { radius, space, useColors } from "@/lib/theme"

type SaveState = "saved" | "saving" | "pending" | "offline" | "error"

const AUTOSAVE_MS = 800
const backupKey = (id: string) => `ezvisa.draft-backup.${id}`

interface Backup {
  data: WizardData
  step: number
  baseVersion: number
  savedAt: string
}

export default function Wizard() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = useColors()
  const insets = useSafeAreaInsets()
  const online = useOnline()
  const scrollRef = useRef<ScrollView>(null)

  const [app, setApp] = useState<Application | null>(null)
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  const [data, setData] = useState<WizardData | null>(null)
  const [stepId, setStepId] = useState<StepId>("personal")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saveState, setSaveState] = useState<SaveState>("saved")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Latest values for the debounced saver.
  const versionRef = useRef(0)
  const dataRef = useRef<WizardData | null>(null)
  const stepRef = useRef(1)
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef<Promise<void> | null>(null)

  // ---- load ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { application } = await api.getApplication(id)
        if (cancelled) return
        if (application.status !== "draft") {
          router.replace(`/application/${id}`)
          return
        }
        let initial = application.wizardData
        let step = application.currentStep
        // A backup newer than the server copy means edits made offline that never reached the server.
        const raw = await AsyncStorage.getItem(backupKey(id)).catch(() => null)
        const backup: Backup | null = raw ? JSON.parse(raw) : null
        if (backup && backup.baseVersion === application.version && backup.savedAt > application.updatedAt) {
          initial = { ...backup.data, email: application.wizardData.email }
          step = backup.step
          dirtyRef.current = true
        } else if (backup) {
          await AsyncStorage.removeItem(backupKey(id)).catch(() => {})
        }
        versionRef.current = application.version
        setApp(application)
        setData(initial)
        dataRef.current = initial
        const steps = getSteps(initial)
        setStepId((steps.find((s) => s.number === step) ?? steps[0]).id)
        stepRef.current = step
        if (dirtyRef.current) scheduleSave(0)
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof ApiError ? err : new ApiError(0, "unknown", String(err)))
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ---- autosave -----------------------------------------------------------
  const flush = useCallback(async (): Promise<void> => {
    if (savingRef.current) await savingRef.current
    if (!dirtyRef.current || !dataRef.current) return
    const snapshot = dataRef.current
    const step = stepRef.current
    dirtyRef.current = false
    setSaveState("saving")
    const run = (async () => {
      try {
        const { application } = await api.saveDraft(id, snapshot, step, versionRef.current)
        versionRef.current = application.version
        setApp(application)
        if (!dirtyRef.current) {
          setSaveState("saved")
          await AsyncStorage.removeItem(backupKey(id)).catch(() => {})
        }
      } catch (err) {
        dirtyRef.current = true
        const backup: Backup = { data: snapshot, step, baseVersion: versionRef.current, savedAt: new Date().toISOString() }
        await AsyncStorage.setItem(backupKey(id), JSON.stringify(backup)).catch(() => {})
        if (err instanceof ApiError && err.code === "version_conflict") {
          dirtyRef.current = false
          handleConflict(err)
        } else if (err instanceof ApiError && err.code === "not_editable") {
          dirtyRef.current = false
          router.replace(`/application/${id}`)
        } else {
          setSaveState(err instanceof ApiError && err.isNetwork ? "offline" : "error")
        }
      }
    })()
    savingRef.current = run
    await run
    savingRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function scheduleSave(delay = AUTOSAVE_MS) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaveState("pending")
    timerRef.current = setTimeout(() => void flush(), delay)
  }

  function handleConflict(err: ApiError) {
    const latest: Application | undefined = err.body?.application
    if (!latest) return
    Alert.alert(
      "Updated on another device",
      "This draft was changed on the website or another phone. Load the latest version?",
      [
        {
          text: "Keep mine",
          onPress: () => {
            versionRef.current = latest.version
            dirtyRef.current = true
            void flush()
          },
        },
        {
          text: "Load latest",
          style: "default",
          onPress: () => {
            versionRef.current = latest.version
            setApp(latest)
            setData(latest.wizardData)
            dataRef.current = latest.wizardData
            setSaveState("saved")
            void AsyncStorage.removeItem(backupKey(id))
          },
        },
      ],
    )
  }

  // Retry when the connection comes back.
  useEffect(() => {
    if (online && dirtyRef.current) void flush()
  }, [online, flush])

  // Save on leave.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      void flush()
    },
    [flush],
  )

  const set = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => {
      if (!prev) return prev
      const next = { ...prev, [key]: value }
      if (key === "maritalStatus" && value !== "married") next.spouseAccompanying = ""
      dataRef.current = next
      return next
    })
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    dirtyRef.current = true
    scheduleSave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- navigation ---------------------------------------------------------
  if (loadError) {
    return (
      <Centered>
        <Banner message={loadError.message} />
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </Centered>
    )
  }
  if (!data || !app) return <Loading />

  const steps = getSteps(data)
  const index = Math.max(0, steps.findIndex((s) => s.id === stepId))
  const step = steps[index]

  function goTo(target: StepId) {
    const s = getSteps(dataRef.current!).find((x) => x.id === target)
    if (!s) return
    setStepId(target)
    setErrors({})
    stepRef.current = s.number
    dirtyRef.current = true
    scheduleSave(0)
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }

  function next() {
    const stepErrors = validateStep(step.id, data!)
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors)
      scrollRef.current?.scrollTo({ y: 0, animated: true })
      return
    }
    const following = steps[index + 1]
    if (following) goTo(following.id)
  }

  function back() {
    if (index === 0) router.back()
    else goTo(steps[index - 1].id)
  }

  async function submitAndPay() {
    const stepErrors = validateStep("review", data!)
    if (Object.keys(stepErrors).length) return setErrors(stepErrors)
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (timerRef.current) clearTimeout(timerRef.current)
      await flush()
      await api.submit(id, dataRef.current!, versionRef.current)
      await AsyncStorage.removeItem(backupKey(id)).catch(() => {})
      try {
        await payForApplication(id)
      } finally {
        router.replace(`/application/${id}`)
      }
    } catch (err) {
      if (err instanceof ApiError && err.validation) {
        setErrors(err.validation.errors)
        goTo(err.validation.step)
        setSubmitError("Some answers need attention.")
      } else {
        setSubmitError(err instanceof ApiError ? err.message : "Couldn't submit. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const saveLabel: Record<SaveState, string> = {
    saved: "All changes saved",
    saving: "Saving…",
    pending: "Saving…",
    offline: "Offline — saved on this phone",
    error: "Not saved — will retry",
  }
  const errorCount = Object.values(errors).filter(Boolean).length
  const props = { data, errors, set }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ title: step.title }} />
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm }}>
        <View style={{ flexDirection: "row", gap: 6 }} accessibilityLabel={`Step ${index + 1} of ${steps.length}`}>
          {steps.map((s, i) => (
            <View key={s.id} style={{ flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: i <= index ? c.primary : c.border }} />
          ))}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Caption>
            Step {index + 1} of {steps.length} · {step.subtitle}
          </Caption>
          <Caption style={{ color: saveState === "error" ? c.danger : c.textMuted }}>{saveLabel[saveState]}</Caption>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
          {errorCount > 0 ? <Banner message={`Please fix ${errorCount} field${errorCount === 1 ? "" : "s"} below.`} /> : null}
          {submitError ? <Banner message={submitError} /> : null}
          {step.id === "personal" ? <PersonalStep {...props} /> : null}
          {step.id === "spouse" && hasSpouseStep(data) ? <SpouseStep {...props} /> : null}
          {step.id === "employment" ? <EmploymentStep {...props} /> : null}
          {step.id === "trip" ? <TripStep {...props} /> : null}
          {step.id === "review" ? <ReviewStep {...props} onEdit={goTo} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={{
          flexDirection: "row",
          gap: space.md,
          padding: space.lg,
          paddingBottom: Math.max(insets.bottom, space.lg),
          borderTopWidth: 1,
          borderTopColor: c.border,
          backgroundColor: c.background,
        }}>
        <View style={{ flex: 1 }}>
          <Button title={index === 0 ? "Close" : "Back"} variant="secondary" onPress={back} />
        </View>
        <View style={{ flex: 2 }}>
          {step.id === "review" ? (
            <Button
              title={online === false ? "Offline" : "Submit & pay"}
              icon="lock.fill"
              onPress={submitAndPay}
              loading={submitting}
              disabled={online === false}
            />
          ) : (
            <Button title="Continue" onPress={next} />
          )}
        </View>
      </View>
    </View>
  )
}

