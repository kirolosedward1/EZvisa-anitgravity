// Range picker behaviour without React Native (components/wizard/DateRangePicker.tsx), so it can be unit-tested.
import { addDays, addMonths, type IsoDate } from "./dates";

export type RangeEnd = "start" | "end";
/** Quick trip lengths: days, or calendar months (1 month from 31 Jan = 28/29 Feb). */
export const PRESETS: { label: string; days?: number; months?: number }[] = [{ label: "1 week", days: 7 }, { label: "2 weeks", days: 14 }, { label: "3 weeks", days: 21 }, { label: "1 month", months: 1 }];
export const presetEnd = (start: IsoDate, p: (typeof PRESETS)[number]) => (p.months ? addMonths(start, p.months) : addDays(start, p.days ?? 0));

/** What a tap on `day` does while `editing` one end: a later day completes the range; otherwise it becomes the new
 *  departure (the return is kept only while it is still after it) and the return is asked next. */
export function tapDay(day: IsoDate, start: string, end: string, editing: RangeEnd): { start: string; end: string; editing: RangeEnd } {
  if (editing === "end" && start && day > start) return { start, end: day, editing: "start" };
  return { start: day, end: end && end > day ? end : "", editing: "end" };
}
