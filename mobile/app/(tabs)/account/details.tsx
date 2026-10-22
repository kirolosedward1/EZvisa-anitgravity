// Account details (from Account): name, email, sign-in method and member since. Read-only, from the signed-in session.
import { ScrollView, View } from "react-native";
import { Stack, router } from "expo-router";
import { ListGroup, ListRow, EmptyState, Button, useTabInset } from "../../../components/ui";
import { useColors, S } from "../../../lib/theme";
import { useAuth } from "../../../lib/auth";
import { useT } from "../../../lib/i18n";

export default function AccountDetails() {
  const c = useColors(); const pb = useTabInset(); const { session } = useAuth(); const { t, lang } = useT();
  const header = <Stack.Screen options={{ title: t("Account details"), headerLargeTitle: false }} />;
  const u = session?.user;
  if (!u) return <View style={{ flex: 1, backgroundColor: c.background, justifyContent: "center" }}>{header}<EmptyState icon="person.crop.circle" title={t("Sign in")} action={<Button title={t("Sign in")} onPress={() => router.navigate("/account")} />} /></View>;
  const provider = (u.app_metadata?.provider as string | undefined) ?? "email";
  const full = (u.user_metadata?.full_name as string | undefined) ?? (u.email ?? "").split("@")[0];
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingTop: S.xl, paddingBottom: pb }} testID="account-details">
      {header}
      <ListGroup inset={16}>
        <ListRow title={t("Name")} value={full} />
        <ListRow title={t("Email")} value={u.email ?? ""} />
        <ListRow title={t("Sign-in method")} value={t(provider === "google" ? "Google" : provider === "apple" ? "Apple" : "Email")} />
        {!!u.created_at && <ListRow title={t("Member since")} value={new Date(u.created_at).toLocaleDateString(lang === "ar" ? "ar" : undefined, { month: "long", year: "numeric" })} />}
      </ListGroup>
    </ScrollView>
  );
}
