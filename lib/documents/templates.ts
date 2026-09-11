import type { VisaApplication } from "../types/visa-application"
import { format, differenceInDays } from "date-fns"

export function generateCoverLetter(app: VisaApplication): string {
  // SOURCE OF TRUTH: Map each generated field back to the application/database.
  const fullName = app.full_name || "Applicant"
  const passportNumber = app.passport_number || "[MISSING_PASSPORT]"
  const nationality = app.nationality || "[MISSING_NATIONALITY]"
  const destination = app.destination_country || "[MISSING_DESTINATION]"
  const rawEntry = app.entry_date || app.travel_start_date
  const rawExit = app.exit_date || app.travel_end_date
  const entryDate = rawEntry ? format(new Date(rawEntry), 'MMMM do, yyyy') : "[MISSING_ENTRY_DATE]"
  const exitDate = rawExit ? format(new Date(rawExit), 'MMMM do, yyyy') : "[MISSING_EXIT_DATE]"
  const dob = app.date_of_birth ? format(new Date(app.date_of_birth), 'MMMM do, yyyy') : "[MISSING_DOB]"
  
  let additionalNotes = {}
  try {
    if (app.additional_notes) {
      additionalNotes = typeof app.additional_notes === "string" ? JSON.parse(app.additional_notes) : app.additional_notes
    }
  } catch (e) {
    // Ignore parse error
  }

  // @ts-ignore
  const companyName = additionalNotes.companyName || "[COMPANY_NAME]"
  // @ts-ignore
  const jobTitle = additionalNotes.jobTitle || "[JOB_TITLE]"
  // @ts-ignore
  const monthlySalary = additionalNotes.monthlySalary || "[SALARY]"

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: "Times New Roman", serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: right; margin-bottom: 40px; }
    .address { margin-bottom: 40px; }
    .subject { font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
    .signature { margin-top: 60px; }
  </style>
</head>
<body>
  <div class="header">
    <p>Date: ${format(new Date(), 'MMMM do, yyyy')}</p>
  </div>
  
  <div class="address">
    <p>To,</p>
    <p>The Consulate General of ${destination}</p>
    <p>Dubai, United Arab Emirates</p>
  </div>

  <div class="subject">
    <p>Subject: Schengen Tourist Visa Application for ${fullName}</p>
  </div>

  <p>Respected Sir/Madam,</p>
  
  <p>I would like to submit my application for a Schengen tourist visa to visit ${destination}. I intend to travel from ${entryDate} to ${exitDate}.</p>
  
  <p>I am a citizen of ${nationality} holding passport number <b>${passportNumber}</b>, born on ${dob}. I am currently employed as a ${jobTitle} at ${companyName} in the UAE, drawing a monthly salary of ${monthlySalary} AED. My employer has granted me the necessary leave for this vacation.</p>
  
  <p>During my trip, I will be responsible for all my expenses including flights, accommodation, and daily expenditures. I have enclosed my bank statements, travel insurance, and flight/hotel itineraries as proof of my financial standing and travel plans.</p>
  
  <p>I guarantee that I will return to the United Arab Emirates within the permitted timeframe to resume my professional duties.</p>
  
  <p>Thank you for considering my application. I remain at your disposal should you require any further information or an interview.</p>

  <div class="signature">
    <p>Yours faithfully,</p>
    <br><br>
    <p>___________________</p>
    <p>${fullName}</p>
    <p>Passport: ${passportNumber}</p>
    <p>Phone: ${app.phone || ''}</p>
    <p>Email: ${app.email || ''}</p>
  </div>
</body>
</html>
  `.trim();
}

export function generateItinerary(app: VisaApplication): string {
  const fullName = app.full_name || "Applicant"
  const destination = app.destination_country || "[MISSING_DESTINATION]"
  let daysCount = 0;
  let itineraryBody = "";
  const rawStart = app.entry_date || app.travel_start_date
  const rawEnd = app.exit_date || app.travel_end_date

  if (rawStart && rawEnd) {
    const start = new Date(rawStart);
    const end = new Date(rawEnd);
    daysCount = differenceInDays(end, start) + 1;
    
    for (let i = 0; i < daysCount; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = format(currentDate, 'MMMM do, yyyy');
      
      let activity = `Exploring the local attractions and culture of ${destination}.`;
      if (i === 0) activity = `Arrival in ${destination}, hotel check-in, and rest.`;
      if (i === daysCount - 1) activity = `Hotel check-out and departure from ${destination} back to UAE.`;

      itineraryBody += `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">Day ${i + 1}<br><small>${dateStr}</small></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${destination}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${activity}</td>
      </tr>`;
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f4f4f5; padding: 10px; border: 1px solid #ddd; text-align: left; }
    .header-box { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 30px; }
  </style>
</head>
<body>
  <div class="header-box">
    <h2 style="margin-top: 0;">Travel Itinerary</h2>
    <p><strong>Applicant:</strong> ${fullName}</p>
    <p><strong>Destination:</strong> ${destination}</p>
    <p><strong>Total Duration:</strong> ${daysCount} Days</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Location</th>
        <th>Planned Activities</th>
      </tr>
    </thead>
    <tbody>
      ${itineraryBody || '<tr><td colspan="3" style="text-align:center; padding:20px;">Invalid Dates</td></tr>'}
    </tbody>
  </table>
</body>
</html>
  `.trim();
}

export function generateConsularChecklist(app: VisaApplication): string {
  const fullName = app.full_name || "Applicant"
  const passportNumber = app.passport_number || "[MISSING_PASSPORT]"
  const nationality = app.nationality || "[MISSING_NATIONALITY]"
  const destination = app.destination_country || "[MISSING_DESTINATION]"
  const rawEntry = app.entry_date || app.travel_start_date
  const rawExit = app.exit_date || app.travel_end_date
  const entryDate = rawEntry ? format(new Date(rawEntry), 'MMMM do, yyyy') : "[MISSING_ENTRY_DATE]"
  const exitDate = rawExit ? format(new Date(rawExit), 'MMMM do, yyyy') : "[MISSING_EXIT_DATE]"

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Consular Submission Checklist - ${fullName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; line-height: 1.5; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 36px; }
    .header-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 20px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; }
    .badge { background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; }
    .meta-grid strong { color: #0f172a; }
    .section-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 24px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .checklist { list-style: none; padding: 0; margin: 0; }
    .item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .item:last-child { border-bottom: none; }
    .box { width: 18px; height: 18px; border: 2px solid #94a3b8; border-radius: 4px; flex-shrink: 0; margin-top: 2px; }
    .item-title { font-weight: 600; color: #0f172a; }
    .item-desc { color: #64748b; font-size: 12px; margin-top: 2px; }
    .callout { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin-top: 24px; font-size: 12px; color: #92400e; }
    .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="brand">EZvisa Dossier Preparation</div>
    <div class="badge">Official Consular Stacking Order</div>
  </div>

  <div class="meta-grid">
    <div><strong>Applicant:</strong> ${fullName}</div>
    <div><strong>Passport No:</strong> ${passportNumber}</div>
    <div><strong>Nationality:</strong> ${nationality}</div>
    <div><strong>Destination:</strong> ${destination} (Schengen)</div>
    <div><strong>Travel Window:</strong> ${entryDate} &ndash; ${exitDate}</div>
    <div><strong>Jurisdiction:</strong> UAE Consular Representation</div>
  </div>

  <p style="font-size: 13px; color: #475569; margin-bottom: 16px;">
    <strong>Instructions for Applicant:</strong> Stack your physical documents in the exact sequence shown below before arriving at your VFS Global / TLScontact / BLS appointment counter. This standardized order expedites intake and prevents file disorganization.
  </p>

  <div class="section-title">Physical Document Stacking Sequence (Top to Bottom)</div>
  <div class="checklist">
    <div class="item">
      <div class="box"></div>
      <div>
        <div class="item-title">1. Original Passport &amp; Previous Passports</div>
        <div class="item-desc">Must be valid for at least 3 months beyond return date, issued within the last 10 years, with at least 2 consecutive blank visa pages.</div>
      </div>
    </div>
    <div class="item">
      <div class="box"></div>
      <div>
        <div class="item-title">2. UAE Residence Visa &amp; Emirates ID Copies</div>
        <div class="item-desc">Color copies (front &amp; back). UAE residence permit must be valid for at least 3 months past intended departure from Schengen.</div>
      </div>
    </div>
    <div class="item">
      <div class="box"></div>
      <div>
        <div class="item-title">3. Official Schengen Visa Application Form</div>
        <div class="item-desc">Printed, duly completed in English, signed and dated by the applicant (Box 37 and final declaration).</div>
      </div>
    </div>
    <div class="item">
      <div class="box"></div>
      <div>
        <div class="item-title">4. Two (2) Passport Photos</div>
        <div class="item-desc">35mm x 45mm, plain white background, neutral expression, taken within the last 6 months (ICAO standard).</div>
      </div>
    </div>
    <div class="item">
      <div class="box"></div>
      <div>
        <div class="item-title">5. Tailored Personal Cover Letter</div>
        <div class="item-desc">Addressed to the Consulate General of ${destination} outlining travel purpose, employment ties in UAE, and return guarantee.</div>
      </div>
    </div>
    <div class="item">
      <div class="box"></div>
      <div>
        <div class="item-title">6. Detailed Day-by-Day Travel Itinerary</div>
        <div class="item-desc">Structured chronology of accommodation, intercity travel, and planned daily activities across ${destination}.</div>
      </div>
    </div>
    <div class="item">
      <div class="box"></div>
      <div>
        <div class="item-title">7. Round-Trip Flight Reservation</div>
        <div class="item-desc">Verifiable flight reservation confirming entry into and departure from the Schengen area with passenger name and PNR.</div>
      </div>
    </div>
    <div class="item">
      <div class="box"></div>
      <div>
        <div class="item-title">8. Confirmed Hotel Accommodation Vouchers</div>
        <div class="item-desc">Covers every night of stay in Schengen with applicant name, hotel address, and contact telephone number.</div>
      </div>
    </div>
    <div class="item">
      <div class="box"></div>
      <div>
        <div class="item-title">9. Schengen Travel Medical Insurance Policy</div>
        <div class="item-desc">Minimum &euro;30,000 / $50,000 emergency medical coverage, zero deductible, repatriation of remains, valid across all Schengen states.</div>
      </div>
    </div>
    <div class="item">
      <div class="box"></div>
      <div>
        <div class="item-title">10. Employment &amp; Solvency Documentation</div>
        <div class="item-desc">Original signed &amp; stamped NOC / Salary Certificate on company letterhead (or valid Trade License + MOA for business owners).</div>
      </div>
    </div>
    <div class="item">
      <div class="box"></div>
      <div>
        <div class="item-title">11. Stamped Bank Statements (Last 3 to 6 Months)</div>
        <div class="item-desc">Original bank-stamped statements showing steady salary credits and sufficient ending balance matching daily consular thresholds.</div>
      </div>
    </div>
  </div>

  <div class="callout">
    <strong>Important Notice:</strong> EZvisa is a private document preparation service. We do not issue visas and cannot guarantee approval. Final adjudications rest exclusively with the consular authorities of ${destination}.
  </div>

  <div class="footer">
    Generated by EZvisa Dossier Preparation Desk &bull; Reference #${app.tracking_token ? app.tracking_token.substring(0, 8).toUpperCase() : 'EZVISA'} &bull; support@ezvisa.net
  </div>
</body>
</html>
  `.trim();
}

export function generateAppointmentSurvivalGuide(app: VisaApplication): string {
  const fullName = app.full_name || "Applicant"
  const destination = app.destination_country || "[DESTINATION]"
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Appointment Day Protocol - ${fullName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 36px; }
    .header-bar { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .card-title { font-size: 15px; font-weight: 700; color: #0284c7; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .tip-list { padding-left: 20px; margin: 0; font-size: 13px; }
    .tip-list li { margin-bottom: 8px; }
    .tip-list strong { color: #0f172a; }
    .alert-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px 16px; font-size: 13px; color: #065f46; margin-top: 20px; }
    .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header-bar">
    <h1 class="title">Consular Appointment Day Survival Guide</h1>
    <div class="subtitle">Preparation Protocol for ${fullName} &bull; ${destination} Schengen Visa</div>
  </div>

  <div class="card">
    <h3 class="card-title">1. Arrival &amp; Security Regulations</h3>
    <ul class="tip-list">
      <li><strong>Arrival Time:</strong> Arrive strictly 15-20 minutes before your scheduled appointment slot. Early arrivals may be turned away, while late arrivals risk slot cancellation.</li>
      <li><strong>Security Screening:</strong> Large bags, laptops, tablet computers, cameras, and sealed packages are strictly prohibited inside the visa application hall. Small lockers may be available for a fee, but traveling light is recommended.</li>
      <li><strong>Mobile Devices:</strong> Must be switched to silent mode before crossing the security gate. Phone calls are strictly prohibited in the submission hall.</li>
    </ul>
  </div>

  <div class="card">
    <h3 class="card-title">2. Counter Document Verification</h3>
    <ul class="tip-list">
      <li><strong>Token System:</strong> Present your appointment confirmation printout at the reception desk to obtain your queue token.</li>
      <li><strong>Intake Officer Check:</strong> Present your stacked dossier in the exact sequence outlined in the EZvisa Stacking Guide. The officer will verify signatures, passport validity, and financial proofs.</li>
      <li><strong>Counter Questions:</strong> Answer questions calmly and factually: state your travel purpose (${destination} tourism), duration, employer in UAE, and intention to return. Keep answers consistent with your cover letter.</li>
    </ul>
  </div>

  <div class="card">
    <h3 class="card-title">3. Biometrics Enrollment (VIS)</h3>
    <ul class="tip-list">
      <li><strong>Fingerprints &amp; Digital Photo:</strong> Unless you have submitted Schengen biometrics within the past 59 months, you will be directed to the biometric booth for 10-digit digital fingerprint capture and a digital facial photograph.</li>
      <li><strong>Biometric Exemption:</strong> If your previous Schengen visa displays the notation "VIS" and was issued within 59 months, bring a copy of that visa to request biometric exemption.</li>
    </ul>
  </div>

  <div class="card">
    <h3 class="card-title">4. Fees &amp; Passport Return Tracking</h3>
    <ul class="tip-list">
      <li><strong>Counter Payment:</strong> Be prepared to pay the official consular fee (~&euro;90 / approx. 360 AED) plus the application center service fee (approx. 110&ndash;160 AED). Visa/Mastercard and AED cash are generally accepted.</li>
      <li><strong>Courier Return (Recommended):</strong> Opt for secure courier delivery of your passport to your home or office address to avoid returning to the center for collection.</li>
      <li><strong>Tracking Receipt:</strong> Keep the stamped ICR (Invoice-Cum-Receipt) voucher in a safe place. The ICR reference number is required to track consular processing.</li>
    </ul>
  </div>

  <div class="alert-box">
    <strong>Need Last-Minute Clarifications?</strong> Our Dubai concierge desk is available via WhatsApp (+971 54 710 9533) or email (support@ezvisa.net) to assist you with appointment morning questions.
  </div>

  <div class="footer">
    EZvisa Document Preparation Services &bull; Dubai, United Arab Emirates &bull; www.ezvisa.net
  </div>
</body>
</html>
  `.trim();
}

export function generateCompleteDossierPack(app: VisaApplication): string {
  const coverLetter = generateCoverLetter(app)
  const itinerary = generateItinerary(app)
  const checklist = generateConsularChecklist(app)
  const survivalGuide = generateAppointmentSurvivalGuide(app)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Complete Consulate Dossier Pack - ${app.full_name || 'Applicant'}</title>
  <style>
    @media print {
      .page-break { page-break-after: always; break-after: page; }
      body { padding: 0 !important; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #fff; margin: 0; padding: 20px; }
    .dossier-section { margin-bottom: 40px; }
  </style>
</head>
<body>
  <div class="dossier-section page-break">
    ${checklist.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*?<\/html>/i, '')}
  </div>

  <div class="dossier-section page-break">
    ${coverLetter.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*?<\/html>/i, '')}
  </div>

  <div class="dossier-section page-break">
    ${itinerary.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*?<\/html>/i, '')}
  </div>

  <div class="dossier-section">
    ${survivalGuide.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*?<\/html>/i, '')}
  </div>
</body>
</html>
  `.trim();
}
