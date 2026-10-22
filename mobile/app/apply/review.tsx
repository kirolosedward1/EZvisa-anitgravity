// Old route: Review & Payment is now the wizard's last step, as on the website.
import { Redirect } from "expo-router";
export default function Review() { return <Redirect href={{ pathname: "/apply", params: { step: "payment", resume: "1" } }} />; }
