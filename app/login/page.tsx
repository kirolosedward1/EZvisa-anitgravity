import { LoginScreen } from "./login-screen"

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

// Search params are read on the server and passed in. LoginForm used to call
// useSearchParams() inside Suspense, which streamed a pending boundary
// (the spinner) and hydrated as a different tree — React #418 on
// /login?error=link-expired and /ar/login?error=link-expired.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  return (
    <LoginScreen
      next={first(params.next)}
      error={first(params.error)}
      type={first(params.type)}
      errorCode={first(params.error_code)}
      email={first(params.email)}
    />
  )
}
