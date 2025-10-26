import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Not Found')
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
    </section>
  )
}
