// In-app payment receipt (EZvisa is not VAT-registered: no VAT/TRN rows). Data comes only from receiptInfo() (lib/receipt),
// the same source as the PDF. Download PDF and the share icon both produce EZvisa-Receipt-<ref>.pdf.
import { useEffect, useState } from "react";
import { ScrollView, View, I18nManager } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Button, Text, Flag, StatusPill, Skeleton, EmptyState, InlineError } from "../../components/ui";
import { CircleButton } from "../../components/flow";
import { useColors, useIsDark, S, R, card } from "../../lib/theme";
import { useT, ltr } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { getApplication, isPaid, withTimeout, type Application } from "../../lib/data";
import { receiptInfo, shareReceipt } from "../../lib/receipt";

const LOGO = require("../../assets/logo.png");
const LOGO_H = 28; const LOGO_W = Math.round((873 / 216) * LOGO_H);

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors(); const dark = useIsDark(); const insets = useSafeAreaInsets(); const { t, lang, rtl } = useT(); const { session } = useAuth();
  const [a, setA] = useState<Application | null>(null); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { let live = true; withTimeout(getApplication(id!), 12000).then((x) => { if (live) setA(x); }).catch((e) => { if (live) setErr(e?.message ?? String(e)); }); return () => { live = false; }; }, [id]);
  const name = (session?.user.user_metadata?.full_name as string | undefined) ?? a?.full_name ?? ""; const mail = session?.user.email ?? a?.email ?? "";
  const pdf = async () => { if (!a) return; setBusy(true); try { await shareReceipt(a, name, mail); } finally { setBusy(false); } };
  const back = () => (router.canGoBack() ? router.back() : router.replace("/account"));
  const flip = rtl || I18nManager.isRTL;
  const info = a ? receiptInfo(a, lang) : null;
  const row = (k: string, v: React.ReactNode, last = false) => (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: S.md, minHeight: 48, paddingHorizontal: S.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.separator }}>
      <Text variant="body" tone="secondary">{t(k)}</Text>
      {typeof v === "string" ? <Text variant="body" style={{ flexShrink: 1 }} numberOfLines={2}>{v}</Text> : v}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + S.xs, paddingHorizontal: S.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52 }}>
        <View style={{ transform: [{ scaleX: flip ? -1 : 1 }] }}><CircleButton icon="chevron.left" label={t("Back")} onPress={back} /></View>
        <Text variant="headline" accessibilityRole="header">{t("Receipt")}</Text>
        <CircleButton icon="square.and.arrow.up" label={t("Share")} onPress={pdf} />
      </View>
      {err ? <View style={{ padding: S.lg }}><InlineError text={t(err)} /></View>
      : !a ? <View style={{ padding: S.lg, gap: S.md }}><Skeleton h={28} w={120} /><Skeleton h={44} w={180} /><Skeleton h={220} /></View>
      : !isPaid(a) ? <EmptyState icon="doc.text" title={t("No receipt yet")} message={t("The receipt appears after payment.")} />
      : (
        <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xl, gap: S.lg }} testID="receipt">
          <View style={{ alignItems: "flex-start" }}><Image source={LOGO} style={{ width: LOGO_W, height: LOGO_H }} contentFit="contain" accessibilityLabel="EZvisa" /></View>
          <View style={{ gap: S.xs, marginTop: S.lg - S.lg }}>
            <StatusPill v={a.status} a={a} />
            <Text style={{ fontSize: 34, lineHeight: 41, fontWeight: "700", color: c.label }} testID="receipt-amount">{ltr(info!.amount)}</Text>
            <Text variant="subhead" tone="secondary">{info!.date}</Text>
          </View>
          <View style={[card(c, dark, 1), { borderRadius: R.card, overflow: "hidden" }]}>
            {row("Receipt no.", ltr(a.reference))}
            {row("Destination", <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs, flexShrink: 1 }}><Flag country={info!.destination} size={20} /><Text variant="body" numberOfLines={1}>{t(info!.destination)}</Text></View>)}
            {row("Service", t("Schengen visa application service"))}
            {row("Payment", t("Paid via Ziina"))}
            {row("Paid on", info!.date, true)}
          </View>
          <View style={[card(c, dark, 1), { borderRadius: R.card, overflow: "hidden" }]}>
            {row("Total", <Text variant="headline">{ltr(info!.amount)}</Text>, true)}
          </View>
          <Text variant="footnote" tone="secondary">{t("Embassy and VFS fees are not included and are paid at the appointment.")}</Text>
          <Button title={t("Download PDF")} icon="arrow.down.circle" loading={busy} onPress={pdf} />
        </ScrollView>
      )}
    </View>
  );
}
