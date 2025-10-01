import { useAuth } from '@/supabase/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function Login() {
  const { signInWithGithub, signInWithTwitter, signOut, session } = useAuth()

  const avatarUrl = (session?.user?.user_metadata as any)?.avatar_url as string | undefined
  const fullName = (session?.user?.user_metadata as any)?.full_name as string | undefined
  const email = session?.user?.email ?? undefined

  return (
    <section className="mx-auto max-w-md p-4">
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {session ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>
                    {fullName?.slice(0, 2).toUpperCase() || email?.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium leading-tight">{fullName || 'Signed in'}</p>
                  {email && <p className="text-sm text-muted-foreground">{email}</p>}
                </div>
              </div>
              <Button variant="secondary" onClick={signOut} className="w-full">Sign out</Button>
            </div>
          ) : (
            <div className="grid gap-3">
              <Button onClick={signInWithGithub} className="w-full" variant="default">
                {/* GitHub icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mr-2 h-4 w-4"><path d="M12 .5C5.73.5.9 5.33.9 11.6c0 4.87 3.16 9 7.54 10.45.55.1.76-.24.76-.53 0-.26-.01-1.1-.02-1.99-3.07.67-3.72-1.3-3.72-1.3-.5-1.28-1.22-1.62-1.22-1.62-.99-.67.08-.66.08-.66 1.1.08 1.67 1.13 1.67 1.13.98 1.67 2.58 1.19 3.21.91.1-.71.38-1.19.69-1.46-2.45-.28-5.02-1.23-5.02-5.47 0-1.21.43-2.2 1.13-2.98-.11-.28-.49-1.41.11-2.94 0 0 .92-.3 3.01 1.14A10.5 10.5 0 0 1 12 6.84c.93 0 1.86.13 2.73.38 2.09-1.44 3.01-1.14 3.01-1.14.6 1.53.22 2.66.11 2.94.7.78 1.13 1.77 1.13 2.98 0 4.25-2.58 5.19-5.04 5.46.39.34.73 1.01.73 2.03 0 1.46-.01 2.64-.01 3 0 .29.2.63.77.52A10.72 10.72 0 0 0 23.1 11.6C23.1 5.33 18.27.5 12 .5Z"/></svg>
                Sign in with GitHub
              </Button>
              <Button onClick={signInWithTwitter} className="w-full" variant="outline">
                {/* X (Twitter) icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mr-2 h-4 w-4"><path d="M18.244 2H21l-6.356 7.27L22 22h-6.9l-4.8-6.263L4.7 22H2l6.78-7.757L2 2h7l4.3 5.7L18.244 2Zm-2.412 18h2.23L8.258 4H5.9l9.932 16Z"/></svg>
                Sign in with X (Twitter)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
