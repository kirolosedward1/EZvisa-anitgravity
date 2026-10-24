// Country screen (Countries tab → country, and Home → destination; both routes render this component).
// Everything here helps the person decide and start, or see where their application for this country stands.
// Data: lib/countryInfo.ts (no facts hard-coded in the screen); sections live in components/country/.
import { useRef, useState } from "react";
import { Platform, Share, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { Stack, router, useLocalSearchParams, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { countryApp, countryInfo } from "../lib/countryInfo";
import { useApps } from "../lib/useApps";
import { useForm } from "../lib/form";
import { useT } from "../lib/i18n";
import { useColors, S, R, HERO, curve } from "../lib/theme";
import { Button, EmptyState } from "./ui";
import { PhotoHeader, TitleBlock, TopBar, topBarHeight } from "./country/Hero";
import { GlanceList } from "./country/GlanceList";
import { YourApplicationCard } from "./country/YourApplicationCard";
import { Requirements } from "./country/Requirements";
import { FundsSection } from "./country/FundsSection";
import { VisaCentre } from "./country/VisaCentre";
import { Questions } from "./country/Questions";
import { CountryFooter } from "./country/CountryFooter";

export default function CountryDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const c = useColors(); const insets = useSafeAreaInsets(); const { height } = useWindowDimensions(); const { t, lang } = useT();
  const segs = useSegments() as string[];
  const info = countryInfo(slug ?? "");
  const { session, apps, err } = useApps();
  const { hydrated, drafts, openDraft, openServerDraft } = useForm();
  const scrollY = useSharedValue(0); const under = useSharedValue(1);
  const scroller = useRef<Animated.ScrollView>(null);
  const [footerH, setFooterH] = useState(0); const [centreY, setCentreY] = useState<number | null>(null);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
    under.value = e.contentOffset.y + e.layoutMeasurement.height < e.contentSize.height - S.xl ? 1 : 0;
  });
  const back = () => { if (router.canGoBack()) router.back(); else router.replace(segs.includes("(home)") ? "/" : "/countries"); };
  if (!info) return (
    <View style={{ flex: 1, backgroundColor: c.background, justifyContent: "center" }}>
      <Stack.Screen options={{ headerShown: false }} />
      <EmptyState icon="exclamationmark.triangle.fill" title={t("Not found")} action={<Button title={t("Back")} variant="secondary" onPress={back} />} />
    </View>
  );

  const heroH = Math.round(height * HERO.ratio);
  const barH = topBarHeight(insets.top);
  const sheetTop = heroH - HERO.overlap;
  const title = lang === "ar" && info.nameAr ? info.nameAr : info.name;
  const capital = lang === "ar" && info.capitalAr ? info.capitalAr : info.capital;
  // Until the user's applications and this phone's drafts are known, the footer waits: Apply must never show
  // first and then turn into "View your application".
  const known = hydrated && (!session || apps !== null || !!err);
  const state = countryApp(info.name, apps, session ? drafts : drafts.filter((d) => !d.owner));

  const apply = () => router.push({ pathname: "/apply", params: { step: "personal", to: info.name } });
  const continueDraft = () => {
    if (state.kind !== "draft") return;
    if (state.draftKey) { openDraft(state.draftKey); router.push({ pathname: "/apply", params: { resume: "1" } }); return; }
    const id = state.app?.id; if (!id) return;
    openServerDraft(id).then((ok) => router.push(ok ? { pathname: "/apply", params: { resume: "1" } } : `/applications/${id}`)).catch(() => router.push(`/applications/${id}`));
  };
  const view = () => { if (state.kind === "active") router.push(`/applications/${state.app.id}`, { withAnchor: true }); };
  const share = () => {
    const url = info.docsUrl; const msg = t("Schengen visa for {c}", { c: title });
    Share.share(Platform.OS === "ios" ? { url, title: msg } : { message: `${msg}\n${url}`, title: msg }).catch(() => {});
  };
  const toCentre = () => { if (centreY != null) scroller.current?.scrollTo({ y: Math.max(0, sheetTop + centreY - barH - S.md), animated: true }); };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }} testID="country-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <Animated.ScrollView ref={scroller} onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: footerH + S.xl }} testID="country-scroll">
        <PhotoHeader photo={info.photo} height={heroH} scrollY={scrollY} />
        <View style={[{ marginTop: -HERO.overlap, borderTopStartRadius: R.sheet, borderTopEndRadius: R.sheet, backgroundColor: c.background, paddingTop: S.xl, gap: S.xxl }, curve]}>
          <TitleBlock name={info.name} title={title} capital={capital} />
          {known && <YourApplicationCard state={state} onContinueDraft={continueDraft} />}
          <GlanceList info={info} onCentre={toCentre} />
          <Requirements />
          <FundsSection info={info} />
          {info.provider && <View onLayout={(e: LayoutChangeEvent) => setCentreY(e.nativeEvent.layout.y)}><VisaCentre centre={info.provider} /></View>}
          <Questions info={info} />
        </View>
      </Animated.ScrollView>
      <TopBar name={info.name} title={title} scrollY={scrollY} showAt={sheetTop + S.xl + S.xl - barH} onBack={back} onShare={share} />
      <CountryFooter name={info.name} state={state} loading={!known} onApply={apply} onContinue={continueDraft} onView={view} under={under}
        onLayout={(e) => setFooterH(e.nativeEvent.layout.height)} />
    </View>
  );
}
