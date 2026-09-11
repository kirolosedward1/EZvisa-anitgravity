const { format, differenceInDays } = require("date-fns");

// Mocking the template logic for quick test
function generateCoverLetter(app) {
  const fullName = app.full_name || "Applicant"
  const passportNumber = app.passport_number || "[MISSING_PASSPORT]"
  const nationality = app.nationality || "[MISSING_NATIONALITY]"
  const destination = app.destination_country || "[MISSING_DESTINATION]"
  const entryDate = app.entry_date ? format(new Date(app.entry_date), 'MMMM do, yyyy') : "[MISSING_ENTRY_DATE]"
  const exitDate = app.exit_date ? format(new Date(app.exit_date), 'MMMM do, yyyy') : "[MISSING_EXIT_DATE]"
  return { fullName, passportNumber, nationality, destination, entryDate, exitDate };
}

const mockApp = {
  full_name: "محمد عبد الله الخالدي", // Arabic name
  passport_number: "A12345678",
  nationality: "Jordan",
  destination_country: "France",
  entry_date: "2026-12-01T00:00:00.000Z",
  exit_date: "2026-12-15T00:00:00.000Z",
  additional_notes: '{"companyName":"Tech Corp","jobTitle":"Engineer","monthlySalary":15000}'
};

const result = generateCoverLetter(mockApp);
console.log(result);
