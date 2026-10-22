import { TabStack } from "../../../lib/stack";
// Deep links into a detail screen keep the list underneath (so Back works and the tab bar hides).
export const unstable_settings = { initialRouteName: "index" };
export default function Layout() { return <TabStack />; }
