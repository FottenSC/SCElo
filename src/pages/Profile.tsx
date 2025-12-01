import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function Profile() {
  useDocumentTitle('Profile')
  return (
    <div className="container py-20 flex justify-center">
      <div className="max-w-md w-full bg-card/80 backdrop-blur-xl border border-border/60 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <h2 className="text-3xl font-heading font-bold text-primary mb-4">Profile</h2>
        <p className="text-muted-foreground font-body text-lg">Coming soon.</p>
        <div className="mt-8 h-1 w-16 bg-primary/30 mx-auto rounded-full" />
      </div>
    </div>
  )
}
