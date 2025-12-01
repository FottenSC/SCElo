import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Not Found')
  return (
    <div className="container py-20 flex justify-center">
      <div className="max-w-md w-full bg-card/80 backdrop-blur-xl border border-destructive/60 shadow-[0_0_50px_rgba(239,68,68,0.2)] rounded-lg p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-destructive to-transparent" />
        <h2 className="text-4xl font-heading font-bold text-destructive mb-4">404</h2>
        <p className="text-xl font-heading font-bold text-foreground mb-2">Page Not Found</p>
        <p className="text-muted-foreground font-body">The stage you are looking for does not exist.</p>
        <div className="mt-8">
          <a href="/" className="inline-block px-6 py-2 bg-primary/10 border border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 font-heading font-bold uppercase tracking-wider rounded-sm">
            Return to Arena
          </a>
        </div>
      </div>
    </div>
  )
}
