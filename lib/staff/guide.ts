/**
 * The staff console user guide (/staff/guide), kept next to the code it describes. Every board in the sidebar
 * (lib/staff/roles.ts NAV) must have a section here: lib/staff/staff.test.ts fails otherwise. When a console change
 * adds or changes something a person does, update the matching section and add a line to WHATS_NEW (AGENTS.md).
 */
import type { NavKey, Role } from "@/lib/staff/roles"

export type GuideSection = {
  key: NavKey | "start" | "case" | "new-case" | "viewer" | "roles" | "search" | "tasks"
  title: string
  /** Where it lives, for the "Open" link. */
  href?: string
  /** Roles that use it (empty means everyone). */
  roles?: Role[]
  summary: string
  steps: string[]
  tips?: string[]
}

export const GUIDE_UPDATED = "31 October 2026"

export const WHATS_NEW: { date: string; items: string[] }[] = [
  {
    date: "31 October 2026",
    items: [
      "Search from anywhere: press Ctrl+K (Cmd+K on Mac) or / and type a name, email, phone, EZ reference or a board.",
      "Search, the guide, Refresh, New case and Notifications now stay at the top right of every board.",
      "Cases list: move several cases to a stage at once (with a reason), copy the selected customers' phone numbers, or export them.",
      "Case page: Next case button, and Activity now shows payments, refunds, insurance quotes and internal notes too.",
      "Team: permissions by role are switches. Settings: templates, SLA targets, automatic assignment and visa centres are editable.",
      "Internal notes can be edited, pinned or deleted by their author or an admin. Customer contact details can be corrected once for all their cases.",
      "This guide.",
    ],
  },
]

export const SHORTCUTS: { keys: string; does: string; where: string }[] = [
  { keys: "Ctrl K or /", does: "Search cases, customers and boards", where: "Everywhere" },
  { keys: "↑ ↓ then Enter", does: "Move through search results and open one", where: "Search" },
  { keys: "Esc", does: "Close search, a menu or a dialog", where: "Everywhere" },
  { keys: "A", does: "Approve the document", where: "Document review" },
  { keys: "R", does: "Send the document back (asks for a note)", where: "Document review" },
  { keys: "J / K", does: "Next / previous document", where: "Document review" },
]

export const GUIDE: GuideSection[] = [
  {
    key: "start",
    title: "Getting started",
    summary: "The console is where the team runs every visa case: checking documents, preparing the file, booking appointments, payments and customer contact. It is at www.ezvisa.net/staff.",
    steps: [
      "Sign in at www.ezvisa.net/staff with your work email (Google or an email sign-in link). Ask an admin to add you on Team first.",
      "Start each day on Overview: the tiles show what needs the team now, and Needs action lists the most urgent cases.",
      "Click any name, reference, number tile, stage or owner to open it: almost everything links to its page.",
      "Top right on every page: search, this guide (opens at the page you are on), Refresh (loads the newest data without losing your place), New case and the notifications bell.",
      "Every change you make is saved with your name in the Audit log. Customers see only what is meant for them.",
    ],
    tips: ["Can't find something? Press Ctrl+K and type it.", "On a phone, the menu button opens the sidebar and the bar at the bottom has Queue, Inbox, Appointments and Customers."],
  },
  {
    key: "tasks",
    title: "Common tasks",
    summary: "Step by step for the things that come up every day.",
    steps: [
      "A new customer messages on WhatsApp: Cases list, New case (or press Ctrl+K and type New case), fill their details and send the pay link.",
      "Find a customer fast: press Ctrl+K and type their name, phone or EZ reference.",
      "Check uploaded documents: Document review, pick the oldest, Approve (A) or Send back (R) with a note.",
      "Prepare the file: File preparation, pick the case, generate or upload each part, then Assemble and mark Ready.",
      "Book an appointment for a customer: Appointments, Customers who asked us to book, Book and save (or open the case and use the Appointment tile).",
      "The customer cannot sign in: Customers, open them, Create sign-in link, and send it on WhatsApp.",
      "The customer has a new phone number: Customers, open them, Edit contact details (saved on all their cases).",
      "Refund a customer: open the case, Payments tab, request or issue the refund with a reason.",
      "Someone is away: Cases list, filter by their name under owner, select the cases and Assign to someone else.",
      "Move several cases at once: Cases list, tick them, Move to stage, write the reason, Apply.",
      "Who changed something: Audit log, search the case reference or the person's name.",
    ],
  },
  {
    key: "search",
    title: "Search",
    summary: "One search for cases, customers and boards.",
    steps: [
      "Press Ctrl+K (Cmd+K on Mac) or /, or click the search box or the magnifier at the top right.",
      "Type at least two characters: a name, email, phone number (5+ digits), EZ reference, tracking code or country.",
      "Use ↑ and ↓ to pick a result and Enter to open it. With no match, Enter searches the Cases list.",
    ],
  },
  {
    key: "roles",
    title: "Roles and permissions",
    summary: "Four roles: Admin, Specialist, Support and Finance. What each can do is set on Team, Permissions by role.",
    steps: [
      "Admin: everything, including Team, Settings and the Audit log.",
      "Specialist: works cases end to end: documents, stage, edits, file preparation, messages, appointments.",
      "Support: customer contact and appointments; sees cases read only otherwise.",
      "Finance: payments, refunds, insurance quotes, exports and the Audit log.",
      "An admin can switch permissions on or off per role on Team. Team and Settings always stay admin only.",
    ],
    tips: ["Emails listed in the ADMIN_EMAILS setting on the server are always admins."],
  },
  {
    key: "notifications",
    title: "Notifications",
    href: "/staff/notifications",
    summary: "Your feed: uploads on your cases, cases past their SLA, appointment help requests, appointments tomorrow, @mentions in notes and, for Finance and admins, payment items.",
    steps: [
      "Click an item (or its button) to open the case it is about.",
      "Mark all read clears the bell. Choose what you want to hear about under My preferences.",
    ],
    tips: ["Email and push delivery are not connected yet; notifications show here and on the bell."],
  },
  {
    key: "overview",
    title: "Overview",
    href: "/staff/overview",
    summary: "Today at a glance for the whole team or just your cases.",
    steps: [
      "Switch between Whole team and My cases at the top right.",
      "Tiles: Needs us now, Waiting on customers, Files to prepare, Appointments this week, Paid this month. Click a tile to open that list.",
      "Needs action: Past SLA, Documents and Files tabs with the most urgent cases. The link below opens the full list.",
      "Workload: each person's open cases. Click a person to see their cases; Reassign opens the Cases list to move them.",
      "Open cases by stage: click a stage to filter the Cases list.",
    ],
  },
  {
    key: "cases",
    title: "Cases list",
    href: "/staff/cases",
    summary: "Every case with tabs, filters, sorting, saved views and bulk actions.",
    steps: [
      "Tabs: All open, Needs us, Needs customer, Past SLA, Unassigned and Closed.",
      "Filter by stage, owner, country or search text; sort by waiting time, SLA, newest or travel date. The filters are in the address, so you can bookmark or share a view.",
      "Click anywhere on a row to open the case. Click the flag, stage or owner to filter by it; click the ? on an unassigned case to take it.",
      "Tick cases to act on several: assign, move to a stage (write a reason), copy phone numbers, or export them as CSV.",
      "The ... menu on a row: assign to me, WhatsApp, review documents, edit details, customer profile, copy tracking link, cancel.",
    ],
    tips: ["Unpaid drafts get an owner automatically after payment (Settings, SLA and assignment)."],
  },
  {
    key: "new-case",
    title: "New case for a customer",
    href: "/staff/cases/new",
    roles: ["admin", "specialist", "support"],
    summary: "For a customer who contacted you by WhatsApp, phone or in person.",
    steps: [
      "Pick an existing customer or create one from their phone number and email.",
      "Fill the trip and traveller details (the same questions as the website, without the marketing).",
      "Review and send the pay link. The case is saved as Payment due under the customer's email; they pay through the payment gateway and see it on their dashboard.",
    ],
  },
  {
    key: "case",
    title: "Case page",
    summary: "Everything about one case, and every action on it.",
    steps: [
      "Header: the customer's name opens their profile; the country and stage open the matching list; Email, Call, WhatsApp and Open in inbox contact the customer.",
      "Top right: Next case opens the most urgent case waiting on the team. Owner changes who is responsible. Change stage moves the case (Ready needs the prepared file). The ... menu has more.",
      "Overview tab: what we are waiting for (with a button to do it), documents, travel (Edit trip), and the appointment: save it or Change it right there.",
      "Documents tab: approve or send back each document with a note; click a document name to open it in the viewer.",
      "Application details: Edit details changes the customer's answers on their behalf (write why; it is logged and the customer sees the new details).",
      "Payments tab: the service fee and refunds (request, or issue if you are Finance or admin).",
      "Activity tab: the full history: customer events, payments, refunds, insurance, staff actions and notes. Filter to Customer visible or Internal.",
      "Internal notes (right): never shown to the customer. Pin important ones; edit or delete your own (admins can edit any).",
    ],
  },
  {
    key: "documents",
    title: "Document review",
    href: "/staff/documents",
    roles: ["admin", "specialist"],
    summary: "Every uploaded document waiting for a decision, oldest first.",
    steps: [
      "Pick a document on the left; the file opens in the middle with the customer's details beside it to compare.",
      "Tick the checklist, then Approve (A) or Send back (R) with a clear note for the customer. J and K move between documents.",
      "My cases shows only cases you own. Open the case from the header link.",
    ],
    tips: ["The SLA for a first check is set in Settings, SLA and assignment."],
  },
  {
    key: "viewer",
    title: "Document viewer",
    summary: "A large view of one document with the other documents of the same case.",
    steps: ["Open it from a document name on the case page or File preparation.", "Highlight the problem area before sending back, so the customer sees exactly what to fix.", "Back to review returns to the review list for this case."],
  },
  {
    key: "files",
    title: "File preparation",
    href: "/staff/files",
    roles: ["admin", "specialist"],
    summary: "Build the visa file once every document is approved.",
    steps: [
      "Pick a case on the left (most urgent first).",
      "For each part (application form, cover letter, flight reservation, hotel bookings, itinerary, appointment checklist): Generate it from the answers, or Upload the PDF.",
      "Check What the templates use on the right; Edit application details if something is wrong.",
      "Assemble and mark Ready merges everything in embassy order into one PDF and moves the case to Ready. The customer can then download it.",
    ],
    tips: ["Travellers on the same trip are listed under Same trip: bookings can be shared, cover letters are per person."],
  },
  {
    key: "appointments",
    title: "Appointments",
    href: "/staff/appointments",
    roles: ["admin", "specialist", "support"],
    summary: "The week's visa centre appointments and the customers who need one.",
    steps: [
      "Move between weeks with the arrows; filter by visa centre.",
      "Customers who asked us to book: book on the centre's website first, then Book and save the date, time, centre and reference here.",
      "File ready, no appointment saved: nudge them on WhatsApp, call, or save the slot when they tell you they booked.",
      "An appointment can also be saved or changed from the case page.",
    ],
  },
  {
    key: "customers",
    title: "Customers",
    href: "/staff/customers",
    summary: "Every customer by email with their cases, saved travellers and account tools.",
    steps: [
      "Search by name, email, phone or reference; filter Repeat customers, With an open case or Arabic.",
      "Profile: WhatsApp, Email, Latest case and New case buttons. Click the email or phone to contact them.",
      "Edit contact details corrects their name, phone or nationality once on every case (write why).",
      "Account tools: Create sign-in link (for someone who cannot sign in; share it on WhatsApp) and Export everything we hold (JSON).",
    ],
    tips: ["The email a customer signs in with is never changed here."],
  },
  {
    key: "messaging",
    title: "Messaging",
    href: "/staff/messaging",
    roles: ["admin", "specialist", "support"],
    summary: "Customers waiting on a reply, quick replies and broadcasts.",
    steps: [
      "Inbox: pick a customer; quick replies fill the message with their details; Send on WhatsApp opens WhatsApp with the text ready.",
      "Waiting on customers: cases where we are waiting for the customer, with a reminder ready to send.",
      "Broadcast: pick the audience by stage, country and language and a template; copy the list to send.",
      "App push: how many app devices receive notifications. Sending pushes from the console is not built yet; the app's automatic status notifications still go out.",
    ],
    tips: ["WhatsApp Business is not connected yet, so messages open WhatsApp and are not stored here. Edit the templates in Settings."],
  },
  {
    key: "payments",
    title: "Payments",
    href: "/staff/payments",
    roles: ["admin", "finance"],
    summary: "Service fee payments, failed payments and refunds.",
    steps: [
      "All transactions, Failed, Refunds and Refund requests tabs; search by name, email or reference.",
      "Refund: choose the reason; the amount follows the refund policy (full before review, half after review, none once the file is ready; duplicates always in full).",
      "Specialists and Support send refund requests; Finance or an admin approves or declines them.",
      "Send pay link messages a customer whose payment failed.",
    ],
    tips: ["Payments run through the payment gateway in test mode until the owner switches it to live."],
  },
  {
    key: "insurance",
    title: "Travel insurance",
    href: "/staff/insurance",
    roles: ["admin", "finance"],
    summary: "Quote requests from customers and policies issued. Quotes are separate from the visa service fee.",
    steps: [
      "Quote requests: record the price from the insurer's rates and send the quote on WhatsApp.",
      "Sent and answered: mark accepted or declined, remind, and upload the policy PDF to issue it.",
    ],
    tips: ["No insurer is connected; prices are typed from the insurer's rate card."],
  },
  {
    key: "analytics",
    title: "Analytics",
    href: "/staff/analytics",
    summary: "How the business and the team are doing over 7, 30 or 90 days.",
    steps: [
      "Marketing and growth: applications started, paid, revenue, conversion, the funnel, sources and paid per day.",
      "Operations and team: time to ready, SLA, review time, by destination and by person. Click a person or country to see their cases.",
    ],
    tips: ["Website visits and ad costs are not connected yet."],
  },
  {
    key: "reports",
    title: "Reports",
    href: "/staff/reports",
    roles: ["admin", "finance"],
    summary: "Ready-made CSV reports: revenue by destination, refunds, appointments per centre, SLA and owners, document send-backs.",
    steps: ["Pick a report and a period, preview it, then download the CSV. Every export is logged."],
  },
  {
    key: "team",
    title: "Team",
    href: "/staff/team",
    roles: ["admin"],
    summary: "Who works in the console, their role and their workload.",
    steps: [
      "Add member: name, the email they sign in with and a role. Tell them to sign in at www.ezvisa.net/staff (no invitation email is sent yet).",
      "Change a role, deactivate or reactivate, or rename someone from their row. Click their open cases to see them.",
      "Permissions by role: switch permissions per role and Save changes. It applies on everyone's next page load.",
    ],
  },
  {
    key: "settings",
    title: "Settings",
    href: "/staff/settings",
    roles: ["admin"],
    summary: "How the console behaves. Every change is logged and can be reset to the default.",
    steps: [
      "Message templates: the English and Arabic texts for quick replies and broadcasts. Variables like {first_name} fill from the case.",
      "SLA and assignment: hours for a first document check, business days to prepare a file, hours to answer appointment help; automatic assignment on payment and the cap per specialist.",
      "Visa centres: the centres on the appointment form and filters.",
      "Destinations, required documents and the service fee are shown read only: the website and the app share them, so they change together in code.",
    ],
  },
  {
    key: "audit",
    title: "Audit log",
    href: "/staff/audit",
    roles: ["admin", "finance"],
    summary: "Every change anyone made, with before and after values.",
    steps: [
      "Filter by period, type or person, or search. Click an event for the details; click its type or person to filter by it.",
      "Undo is offered for assignments, notes and role changes.",
    ],
  },
  {
    key: "guide",
    title: "This guide",
    href: "/staff/guide",
    summary: "How every board works, kept up to date with each console change.",
    steps: ["Open it from the book icon at the top right; it opens at the board you are on.", "What's new lists the latest changes."],
  },
]

/** The guide section for a console path, for the book icon. */
export function guideAnchorFor(pathname: string): string {
  const p = pathname.replace(/^\/admin(?=\/|$)/, "/staff")
  if (p.startsWith("/staff/cases/new")) return "new-case"
  if (/^\/staff\/cases\/[^/]+/.test(p) && !p.startsWith("/staff/cases/legacy")) return "case"
  if (/^\/staff\/documents\/[^/]+/.test(p)) return "viewer"
  const seg = p.split("/")[2] ?? "overview"
  return GUIDE.some((g) => g.key === seg) ? seg : "start"
}
