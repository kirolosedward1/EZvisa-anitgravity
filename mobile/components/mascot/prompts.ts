// What Globi says and does on each wizard question. Keyed by the question id in lib/questions.ts; a question without an
// entry gets the idle pose and the formal label. The bubble is the conversational layer: the formal label stays on
// screen as the caption (and as the accessible header), so nothing the contract defines changes.
import type { GlobiPose, GlobiMood } from "./Globi";
import type { WizardForm } from "../../lib/wizard";

export type Prompt = { pose: GlobiPose; mood?: GlobiMood; tie?: boolean; /** The bubble line; `{name}` and `{country}` are filled in. */ say: string };

const EMP: Pick<Prompt, "tie"> = { tie: true };

export const PROMPTS: Record<string, Prompt> = {
  // before payment
  destination: { pose: "wave", say: "Hi! Where are you headed?" },
  traveller: { pose: "book", say: "Who is travelling?" },
  nationality: { pose: "flag", say: "Which passport do you hold{, name}?" },
  cityOfResidence: { pose: "pin", say: "Which emirate do you live in?" },
  name: { pose: "write", say: "What is your name, as on your passport?" },
  contact: { pose: "phone", say: "How do I reach you{, name}?" },
  maritalStatus: { pose: "think", say: "What is your marital status?" },
  spouseAccompanying: { pose: "duo", say: "Will your spouse accompany you?" },
  // trip details
  purposeOfTrip: { pose: "map", say: "Why {country}? The embassy wants to know." },
  dates: { pose: "calendar", say: "When are you travelling?" },
  travelStartDate: { pose: "calendar", say: "When do you fly out?" },
  travelEndDate: { pose: "calendar-check", say: "And when are you back?" },
  datesFlexible: { pose: "calendar", mood: "think", say: "Are your dates flexible?" },
  travelingWith: { pose: "duo", say: "Who is coming along?" },
  hotelCategory: { pose: "sleep", say: "Where will you sleep? I will reserve a matching hotel." },
  fundingSource: { pose: "coin", say: "Who is paying for the trip?" },
  balanceRange: { pose: "lock", say: "Roughly, what is in the account? A range is enough." },
  isFirstSchengenVisa: { pose: "stamps", say: "Is this your first Schengen visa?" },
  previousRefusals: { pose: "heart", say: "Have you ever had a visa refusal?" },
  refusalDetails: { pose: "write", mood: "calm", say: "Tell me what happened. I will write the explanation for you." },
  willVisitOtherCountries: { pose: "plane", say: "Hopping to other Schengen countries too?" },
  additionalCountries: { pose: "map", say: "Where else, and on which days?" },
  // passport and residence
  residenceVisaValid: { pose: "idcard", say: "Is your UAE residence visa valid at least 3 months after you return?" },
  dateOfBirth: { pose: "party", say: "When were you born?" },
  hasValidPassport: { pose: "shield", say: "Do you have a valid passport?" },
  passportNumber: { pose: "magnify", say: "Read me the passport number, top right of the photo page." },
  passportExpiry: { pose: "calendar-check", say: "And when does it expire?" },
  // spouse
  spouseName: { pose: "duo", say: "Now your spouse. What is their name?" },
  spouseHasValidPassport: { pose: "duo", say: "Does your spouse have a valid passport?" },
  // employment
  employmentStatus: { pose: "briefcase", ...EMP, say: "Last part. What do you do for work?" },
  jobCompany: { pose: "write", ...EMP, say: "What is your role, and where?" },
  companyName: { pose: "letter", ...EMP, say: "Your own business. What is it called?" },
  employmentStartDate: { pose: "calendar", ...EMP, say: "When did you start there?" },
  monthlySalary: { pose: "coin", ...EMP, say: "Which band is your monthly salary in?" },
  hasNOC: { pose: "letter", ...EMP, say: "Got a No Objection Certificate from work yet?" },
  averageMonthlyIncome: { pose: "coin", ...EMP, say: "What does the business pay you in an average month?" },
};

/** Fill `{, name}` (dropped when the name is unknown) and `{country}` (falls back to a neutral phrase). */
export function fillPrompt(say: string, f: Pick<WizardForm, "firstName" | "destination">): string {
  const name = f.firstName.trim().split(/\s+/)[0] ?? "";
  return say
    .replace("{, name}", name ? `, ${name}` : "")
    .replace("{country}", f.destination || "this trip");
}

export const promptFor = (id: string): Prompt => PROMPTS[id] ?? { pose: "idle", say: "" };
