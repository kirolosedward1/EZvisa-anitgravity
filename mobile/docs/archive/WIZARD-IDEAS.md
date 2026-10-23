> **Archived 2026-10-23 (outdated plan).** Ideas from the 19 Oct wizard audit; the wizard has since been rebuilt (questions, payment split, Continue application). Current status: `mobile/HANDOFF.md` §0.

# Wizard UX ideas (audit 2026-10-19)

## Audit
**iOS app (app/apply/index.tsx, lib/questions.ts):** one question per screen, 5 step groups (Personal, Spouse if married + accompanying, Employment, Trip Details, Review & Payment).
Personal has 13 questions: destination, nationality (visa-required list), residence (UAE only), emirate, Emirates ID, first and last name, email, phone, DOB, passport no., valid passport, marital (+ spouse accompanying).
Branches: spouse (4 questions), employment (employed: job/company/start/salary/NOC; business/freelancer: income), refusal details, other countries.
Already present: auto-advance on taps, autosave (phone + account draft), resume prompt, grouped review with edit, inline errors with shake, haptics, VoiceOver focus, AR/RTL, keyboard-safe button.
Friction: the user has no route summary before 30+ questions; the checklist is only visible after submit; a returning user retypes everything; the review only says "Some answers are missing"; a submit with no connection fails late; no nudge after leaving a draft; spouse surname retyped; no sense of finishing a section.

**Web (/apply, app/apply/page.tsx + components/apply/*):** 5 long forms (one per step), % progress bar, localStorage restore dialog. Residence is a world list, city is free text, Emirates ID question only for UAE.
Friction: long scroll per step, free-text city (inconsistent data), residence list that the business doesn't serve.

## Ideas (impact / effort, 1-5)
| # | Idea | Impact | Effort | Score |
|---|------|--------|--------|-------|
| 1 | Prefill from last application (signed-in, user confirms) | 5 | 2 | 2.5 |
| 2 | Review: missing-count banner + "Fix next" jump | 4 | 1 | 4.0 |
| 3 | Route preview after first 3 answers (passport → destination, UAE resident, questions left, fee) | 4 | 2 | 2.0 |
| 4 | Live document checklist drawer (website upload checklist) | 4 | 2 | 2.0 |
| 5 | Section-complete milestone (haptic + chip + VoiceOver announcement) | 3 | 1 | 3.0 |
| 6 | Offline state on review: explain, disable submit, keep answers | 3 | 1 | 3.0 |
| 7 | Family copy: spouse surname one-tap "use yours" | 3 | 1 | 3.0 |
| 8 | Resume reminder 24h after leaving a draft (only if reminders already on) | 3 | 2 | 1.5 |
| 9 | Web: residence UAE only + emirate select (data consistency with app) | 4 | 1 | 4.0 |
| 10 | "Why we ask" tips with examples | 2 | 2 | 1.0 (conflicts with minimal text) |
| 11 | Progress ring with milestones instead of segments | 2 | 2 | 1.0 |
| 12 | Continue on web from phone (QR/link to same draft) | 3 | 4 | 0.75 |
| 13 | Group applications (copy details to other travellers) | 3 | 5 | 0.6 (needs backend) |
| 14 | Trust layer (secure badges, reviews) | 2 | 1 | 2.0 (sales copy, rejected by prefs) |
| 15 | Skeletons for review/prefill loading | 2 | 1 | 2.0 |
| 16 | Arabic RTL pass on new strings | 3 | 1 | 3.0 (done with each feature) |
| 17 | Web: one question per screen | 4 | 5 | 0.8 (big rewrite, later) |

## Top 8 picked (built in iOS app v9.2)
1. Prefill from last application (#1)
2. Review "Fix next" (#2)
3. Route preview (#3)
4. Document checklist drawer (#4)
5. Section milestones (#5)
6. Offline review state (#6)
7. Spouse surname copy (#7)
8. Resume reminder (#8)
Web branch `wizard-ux`: #9.

All rules, documents and prices come from existing code (lib/data.ts REQS = website upload checklist, PRICE_AED, validateStep). Nothing new is invented.
