import { PressScale } from "../components/ui";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthForm } from "../components/AuthForm";
import { Logo } from "../components/Logo";
import { Icon, Text } from "../components/ui";
import { useAuth } from "../lib/auth";
import { useColors, S, R } from "../lib/theme";
import { tap } from "../lib/haptics";
import { useT } from "../lib/i18n";

export default function Auth() {
  const c = useColors(); const { t } = useT(); const insets = useSafeAreaInsets(); const { session } = useAuth();
  const p = useLocalSearchParams<{ mode?: string; email?: string }>();
  const [mode, setMode] = useState<"signin" | "signup">(p.mode === "signup" ? "signup" : "signin");
  useEffect(() => { if (session) { if (router.canGoBack()) router.back(); else router.replace("/"); } }, [session]);
  const close = () => { tap(); if (router.canGoBack()) router.back(); else router.replace("/"); };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.lg, paddingTop: Platform.OS === "ios" ? S.md : insets.top + S.xs, minHeight: 56 }}>
        <Logo height={22} />
        <PressScale onPress={close} accessibilityRole="button" accessibilityLabel={t("Close")} hitSlop={4} style={{ width: 44, height: 44, borderRadius: R.round, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
          <Icon name="xmark" size={14} color={c.label} weight="bold" />
        </PressScale>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: S.lg, paddingTop: S.xxl, paddingBottom: S.x3 }}>
        <Text variant="largeTitle" accessibilityRole="header" style={{ marginBottom: S.xxl }}>{mode === "signin" ? t("Welcome back") : t("Create your\naccount")}</Text>
        <AuthForm mode={mode} onMode={setMode} initialEmail={p.email} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
