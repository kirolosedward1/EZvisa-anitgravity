import { EmptyState } from "@/components/staff/states"

// Placeholder until the New case board is built (step 5); stops /staff/cases/new from opening as a case id.
export default function NewCasePlaceholder() {
  return <EmptyState title="New case on behalf of a customer" body="This board is next in the console build and is not available yet." />
}
