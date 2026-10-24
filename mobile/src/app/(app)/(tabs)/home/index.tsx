import { router } from "expo-router"
import { useState } from "react"
import { RefreshControl, View } from "react-native"

import { ApplicationCard } from "@/components/application-card"
import { Banner, Body, Button, Card, Heading, Icon, Loading, ScreenScroll } from "@/components/ui"
import { api, ApiError } from "@/lib/api"
import { useOnline, useResource } from "@/lib/hooks"
import { space, useColors } from "@/lib/theme"

export default function Applications() {
  const c = useColors()
  const online = useOnline()
  const { data, error, loading, refreshing, refresh } = useResource(() => api.listApplications())
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const apps = data?.applications ?? []
  const draft = apps.find((a) => a.stage === "draft")

  async function startNew() {
    setCreating(true)
    setCreateError(null)
    try {
      const { application } = await api.createApplication()
      router.push(`/wizard/${application.id}`)
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Couldn't start an application.")
    } finally {
      setCreating(false)
    }
  }

  if (loading && !data) return <Loading />

  return (
    <ScreenScroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}>
      {online === false ? <Banner tone="warning" message="You're offline. Showing what was loaded last." /> : null}
      {error && !data ? <Banner message={error.message} action={{ label: "Retry", onPress: refresh }} /> : null}
      {createError ? <Banner message={createError} /> : null}

      {apps.length === 0 && !error ? (
        <Card style={{ alignItems: "flex-start", gap: space.md, paddingVertical: space.xl }}>
          <View style={{ backgroundColor: c.primarySoft, borderRadius: 999, padding: 12 }}>
            <Icon name="airplane" size={22} color={c.primary} />
          </View>
          <Heading>Start your Schengen visa</Heading>
          <Body muted>
            Answer a few questions in about 10 minutes. Our experts prepare a tailored application file for 249 AED.
          </Body>
          <Button title="Start application" icon="plus" onPress={startNew} loading={creating} />
        </Card>
      ) : (
        <>
          {draft ? (
            <Button title="Continue your draft" icon="arrow.right.circle" onPress={() => router.push(`/wizard/${draft.id}`)} />
          ) : (
            <Button title="New application" icon="plus" onPress={startNew} loading={creating} />
          )}
          <View style={{ gap: space.md }}>
            {apps.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                onPress={() => router.push(app.stage === "draft" ? `/wizard/${app.id}` : `/application/${app.id}`)}
              />
            ))}
          </View>
        </>
      )}
    </ScreenScroll>
  )
}
