import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function Profile() {
  useDocumentTitle('Profile')
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Profile</h2>
      <p className="text-muted-foreground">Coming soon.</p>
    </section>
  )
}
