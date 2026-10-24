import { isPaid, STAGE_LABELS, stageOf, type DocumentRequirement } from "@shared/visa-wizard"
import * as DocumentPicker from "expo-document-picker"
import { Directory, File, Paths } from "expo-file-system"
import * as ImagePicker from "expo-image-picker"
import * as Linking from "expo-linking"
import * as Print from "expo-print"
import { useLocalSearchParams } from "expo-router"
import * as Sharing from "expo-sharing"
import * as WebBrowser from "expo-web-browser"
import { useState } from "react"
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, RefreshControl, Text, View } from "react-native"

import { STAGE_TONE } from "@/components/application-card"
import { Banner, Body, Button, Caption, Card, Centered, formatDate, Heading, Icon, Loading, Pill, ScreenScroll } from "@/components/ui"
import { api, ApiError, type UploadedDocument } from "@/lib/api"
import { config } from "@/lib/config"
import { useOnline, useResource } from "@/lib/hooks"
import { payForApplication } from "@/lib/payment"
import { radius, space, useColors } from "@/lib/theme"

const MAX_BYTES = 5 * 1024 * 1024

type Picked = { uri: string; name: string; mimeType: string; size?: number }

async function pickFrom(source: "camera" | "library" | "files"): Promise<Picked | null> {
  if (source === "files") {
    const res = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true })
    if (res.canceled) return null
    const a = res.assets[0]
    return { uri: a.uri, name: a.name, mimeType: a.mimeType ?? "application/pdf", size: a.size }
  }
  const perm =
    source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) {
    Alert.alert(
      source === "camera" ? "Camera access needed" : "Photo access needed",
      "You can allow access in Settings, or upload a PDF from Files instead.",
      [{ text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() }],
    )
    return null
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.7, exif: false }
  const res = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts)
  if (res.canceled) return null
  const a = res.assets[0]
  // The picker re-encodes to JPEG at quality 0.7; HEIC never reaches the server.
  return { uri: a.uri, name: a.fileName?.replace(/\.\w+$/, ".jpg") ?? "photo.jpg", mimeType: "image/jpeg", size: a.fileSize }
}

function chooseSource(): Promise<"camera" | "library" | "files" | null> {
  const choices = ["Take photo", "Choose from Photos", "Choose file (PDF)", "Cancel"] as const
  const map = ["camera", "library", "files", null] as const
  return new Promise((resolve) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options: [...choices], cancelButtonIndex: 3 }, (i) => resolve(map[i] ?? null))
    } else {
      Alert.alert("Add document", undefined, [
        { text: choices[0], onPress: () => resolve("camera") },
        { text: choices[1], onPress: () => resolve("library") },
        { text: choices[2], onPress: () => resolve("files") },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ])
    }
  })
}

function DocumentRow({
  req,
  uploaded,
  busy,
  locked,
  onAdd,
  onView,
  onDelete,
}: {
  req: DocumentRequirement
  uploaded: UploadedDocument[]
  busy: boolean
  locked: boolean
  onAdd: () => void
  onView: (d: UploadedDocument) => void
  onDelete: (d: UploadedDocument) => void
}) {
  const c = useColors()
  const done = uploaded.length > 0
  return (
    <View style={{ gap: space.sm, paddingVertical: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Icon name={done ? "checkmark.circle.fill" : "circle"} size={20} color={done ? c.success : c.border} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "500", color: c.text }}>
            {req.label}
            {req.required ? "" : " (optional)"}
          </Text>
          <Caption>{req.hint}</Caption>
        </View>
        {busy ? (
          <ActivityIndicator color={c.primary} />
        ) : !locked ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Upload ${req.label}`}
            onPress={onAdd}
            hitSlop={8}
            style={{ backgroundColor: c.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: c.primary, fontWeight: "600", fontSize: 13 }}>{done ? "Add" : "Upload"}</Text>
          </Pressable>
        ) : null}
      </View>
      {uploaded.map((d) => (
        <View key={d.id} style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginLeft: 32 }}>
          <Icon name={d.mimeType === "application/pdf" ? "doc.fill" : "photo"} size={14} color={c.textMuted} />
          <Text
            accessibilityRole="link"
            onPress={() => onView(d)}
            numberOfLines={1}
            style={{ flex: 1, color: c.primary, fontSize: 14 }}>
            {d.name || "Document"} · {Math.max(1, Math.round(d.sizeBytes / 1024))} KB
          </Text>
          {!locked ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Remove document" onPress={() => onDelete(d)} hitSlop={10}>
              <Icon name="trash" size={14} color={c.danger} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  )
}

export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = useColors()
  const online = useOnline()
  const { data, error, loading, refreshing, refresh, reload } = useResource(() => api.getApplication(id))
  const [uploading, setUploading] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [notice, setNotice] = useState<{ tone: "primary" | "danger" | "warning"; text: string } | null>(null)

  if (loading && !data) return <Loading />
  if (!data) {
    return (
      <Centered>
        <Banner message={error?.message ?? "Couldn't load this application."} action={{ label: "Retry", onPress: refresh }} />
      </Centered>
    )
  }

  const { application: app, documents, history } = data
  const paid = isPaid(app.paymentStatus)
  const locked = !["draft", "submitted"].includes(app.status)
  const required = app.documentRequirements.filter((r) => r.required)
  const uploadedRequired = required.filter((r) => documents.some((d) => d.type === r.type)).length

  async function upload(req: DocumentRequirement) {
    const source = await chooseSource()
    if (!source) return
    const file = await pickFrom(source)
    if (!file) return
    if (file.size && file.size > MAX_BYTES) {
      setNotice({ tone: "danger", text: "That file is larger than 5 MB. Try a photo instead of a scan, or compress the PDF." })
      return
    }
    setUploading(req.type)
    setNotice(null)
    try {
      await api.uploadDocument(id, req.type, file)
      await reload()
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof ApiError ? err.message : "Upload failed. Please try again." })
    } finally {
      setUploading(null)
    }
  }

  async function view(doc: UploadedDocument) {
    try {
      const { url } = await api.documentUrl(id, doc.id)
      await WebBrowser.openBrowserAsync(url)
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof ApiError ? err.message : "Couldn't open the document." })
    }
  }

  function remove(doc: UploadedDocument) {
    Alert.alert("Remove this document?", doc.name ?? undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteDocument(id, doc.id)
            await reload()
          } catch (err) {
            setNotice({ tone: "danger", text: err instanceof ApiError ? err.message : "Couldn't remove it." })
          }
        },
      },
    ])
  }

  async function pay() {
    setPaying(true)
    setNotice(null)
    try {
      const { application } = await payForApplication(id)
      if (isPaid(application.paymentStatus)) setNotice({ tone: "primary", text: "Payment received — thank you! Our experts are starting on your file." })
      else setNotice({ tone: "warning", text: "Payment not completed. You can try again whenever you're ready." })
      await reload()
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof ApiError ? err.message : "Couldn't start payment." })
    } finally {
      setPaying(false)
    }
  }

  async function downloadDossier() {
    setDownloading(true)
    try {
      const res = await api.dossier(id)
      let uri: string
      if (res.kind === "pdf") {
        const dir = new Directory(Paths.cache, "dossier")
        if (!dir.exists) dir.create()
        const target = new File(dir, `EZvisa_${app.reference ?? id.slice(0, 8)}.pdf`)
        if (target.exists) target.delete()
        uri = (await File.downloadFileAsync(res.url, target)).uri
      } else {
        uri = (await Print.printToFileAsync({ html: res.html })).uri
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Your visa dossier" })
      } else {
        await WebBrowser.openBrowserAsync(uri)
      }
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof ApiError ? err.message : "Couldn't download the dossier." })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <ScreenScroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}>
      {online === false ? <Banner tone="warning" message="You're offline. Pull to refresh when you're back online." /> : null}
      {notice ? <Banner tone={notice.tone} message={notice.text} /> : null}

      <Card>
        <Pill label={app.stageLabel} tone={STAGE_TONE[app.stage]} />
        <Heading>{app.destination ? `${app.destination} visa` : "Schengen visa"}</Heading>
        {app.applicantName ? <Body>{app.applicantName}</Body> : null}
        <Caption>
          {formatDate(app.travelStartDate)} – {formatDate(app.travelEndDate)}
          {app.reference ? ` · Ref ${app.reference}` : ""}
        </Caption>
        {app.source === "web" ? <Caption>Started on ezvisa.net</Caption> : null}
      </Card>

      {!paid && app.stage === "awaiting_payment" ? (
        <Card style={{ backgroundColor: c.primarySoft, borderColor: c.primarySoft }}>
          <Heading>Complete payment to start</Heading>
          <Body muted>Our experts begin preparing your tailored file as soon as payment is confirmed.</Body>
          <Button title={`Pay ${app.amountAED} AED`} icon="lock.fill" onPress={pay} loading={paying} disabled={online === false} />
          <Caption>Secure checkout by Ziina.</Caption>
        </Card>
      ) : null}

      {app.stage === "ready" || app.stage === "approved" ? (
        <Card style={{ backgroundColor: c.successSoft, borderColor: c.successSoft }}>
          <Heading>Your dossier is ready</Heading>
          <Body muted>Download your complete application pack, print it and bring it to your embassy appointment.</Body>
          <Button title="Download dossier (PDF)" icon="arrow.down.doc" onPress={downloadDossier} loading={downloading} />
        </Card>
      ) : null}

      <Card style={{ gap: 0 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm }}>
          <Heading>Documents</Heading>
          <Caption>
            {uploadedRequired}/{required.length} required
          </Caption>
        </View>
        {!paid ? <Caption>You can upload now or after payment.</Caption> : null}
        {locked ? <Caption>Documents are locked while your file is being prepared. Contact us to change them.</Caption> : null}
        {app.documentRequirements.map((req) => (
          <DocumentRow
            key={req.type}
            req={req}
            uploaded={documents.filter((d) => d.type === req.type)}
            busy={uploading === req.type}
            locked={locked}
            onAdd={() => upload(req)}
            onView={view}
            onDelete={remove}
          />
        ))}
        <Caption>PDF, JPG or PNG, up to 5 MB each. Files are stored privately and only visible to you and your EZvisa expert.</Caption>
      </Card>

      {history.length ? (
        <Card>
          <Heading>Timeline</Heading>
          {history
            .slice()
            .reverse()
            .map((h, i) => (
              <View key={`${h.at}-${i}`} style={{ flexDirection: "row", gap: space.md }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: i === 0 ? c.primary : c.border }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: 15 }}>{STAGE_LABELS[stageOf(h.status, h.paymentStatus)]}</Text>
                  <Caption>{new Date(h.at).toLocaleString()}</Caption>
                </View>
              </View>
            ))}
        </Card>
      ) : null}

      <Button
        title="Questions? Chat on WhatsApp"
        variant="secondary"
        icon="message"
        onPress={() =>
          Linking.openURL(
            `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(`Hi EZvisa! Question about my application ${app.reference ?? ""}`.trim())}`,
          )
        }
      />
    </ScreenScroll>
  )
}
