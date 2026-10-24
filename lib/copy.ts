import { ltr } from "@/lib/bidi"

/** Owner-confirmed wording. Preparation time is EZvisa's work, not the embassy decision. */
export const SCHENGEN_COUNTRY_COUNT = 29

/** Short line under a country name and on timing pills. Not a visa-decision claim. */
export const APPLICATION_READY = "Ready in 1–2 days"
export const APPLICATION_READY_AR = `جاهز خلال ${ltr("1–2")} يوم`

/** FAQ and longer explanations. */
export const PREPARATION_TIME = "We prepare your application in 1–2 days. The embassy's decision takes longer."
export const PREPARATION_TIME_AR = `نجهّز طلبك خلال ${ltr("1–2")} يوم. قرار السفارة يستغرق وقتًا أطول.`
