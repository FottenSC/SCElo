import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'
import { markTwitterAsFailed } from '@/lib/avatar'

const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Root ref={ref} className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)} {...props} />
  ),
)
Avatar.displayName = AvatarPrimitive.Root.displayName

interface OptimizedAvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {
  lazy?: boolean
  /** Twitter handle to mark as failed if image doesn't load */
  twitterHandle?: string
}

const AvatarImage = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Image>, OptimizedAvatarImageProps>(
  ({ className, lazy = true, twitterHandle, onError, ...props }, ref) => {
    const [loaded, setLoaded] = React.useState(false)

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      // Mark Twitter handle as failed to skip future slow lookups
      if (twitterHandle) {
        markTwitterAsFailed(twitterHandle)
      }
      onError?.(e)
    }

    return (
      <AvatarPrimitive.Image
        ref={ref}
        className={cn(
          'aspect-square h-full w-full transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        loading={lazy ? 'lazy' : 'eager'}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        {...props}
      />
    )
  },
)
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Fallback>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Fallback ref={ref} className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className)} {...props} />
  ),
)
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
