// Universal links and custom-scheme links pass through here before routing (lib/linkRoute.ts maps website paths).
import { linkRoute } from "../lib/linkRoute";

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try { return linkRoute(path); } catch { return path; }
}
