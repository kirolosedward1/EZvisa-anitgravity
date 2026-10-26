// Embassy / VFS appointment card. Real data only (lib/appointment.ts); renders nothing when there is no appointment.
import { Linking, Platform, View } from "react-native";
import { ListGroup, ListRow } from "./ui";
import { useColors } from "../lib/theme";
import { useT } from "../lib/i18n";
import { tap, success } from "../lib/haptics";
import { appointmentOf, addToCalendar, directionsUrl } from "../lib/appointment";
import { formatAppointment } from "../lib/dates";
import type { Application } from "../lib/data";

export { appointmentOf, type Appt } from "../lib/appointment";

export function AppointmentCard({ a }: { a: Application }) {
  const c = useColors(); const { t, lang } = useT();
  const ap = appointmentOf(a); if (!ap) return null;
  const when = formatAppointment(ap.at, lang);
  const maps = directionsUrl(ap);
  return (
    <View testID="appointment-card">
      <ListGroup header={t("Appointment")} inset={58}>
        <ListRow icon="calendar" iconColor={c.tint} title={when} subtitle={[ap.centre, ap.reference && `${t("Ref")} ${ap.reference}`].filter(Boolean).join(" · ") || undefined} chevron={false} />
        <ListRow icon="calendar.badge.plus" iconColor={c.tint} title={t("Add to calendar")} onPress={() => { tap(); addToCalendar(a, ap, t).then((saved) => { if (saved) success(); }).catch(() => {}); }} />
        {!!maps && <ListRow icon="map.fill" iconColor={c.green} title={t(Platform.OS === "ios" ? "Directions in Apple Maps" : "Directions")} subtitle={ap.address} onPress={() => { tap(); Linking.openURL(maps).catch(() => {}); }} />}
      </ListGroup>
    </View>
  );
}
