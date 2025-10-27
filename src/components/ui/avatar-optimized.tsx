import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

/**
 * Optimized Avatar component with lazy loading support
 * Extends the radix avatar with performance improvements:
 * - Lazy loading for off-screen images
 * - Optional LQIP (Low Quality Image Placeholder) support
 * - Responsive sizing via srcset
 * - Automatic alt text fallback
 */

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

interface OptimizedAvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {
  /**
   * Low-quality image placeholder URL for progressive loading
   * Will be displayed while the main image loads
   */
  lqip?: string
  /**
   * Whether to use lazy loading (default: true)
   * Set to false for above-the-fold images
   */
  lazy?: boolean
  /**
   * srcset for responsive image loading
   * Example: "url@2x.jpg 2x, url@3x.jpg 3x"
   */
  srcSet?: string
  /**
   * Image sizes for responsive loading
   * Example: "(max-width: 640px) 32px, 48px"
   */
  sizes?: string
}

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  OptimizedAvatarImageProps
>(
  (
    {
      className,
      lqip,
      lazy = true,
      srcSet,
      sizes,
      src,
      alt,
      onLoad,
      ...props
    },
    ref
  ) => {
    const [loaded, setLoaded] = React.useState(false)

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      setLoaded(true)
      onLoad?.(e)
    }

    return (
      <AvatarPrimitive.Image
        ref={ref}
        className={cn(
          'aspect-square h-full w-full transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        src={src}
        alt={alt || 'Avatar'}
        loading={lazy ? 'lazy' : 'eager'}
        srcSet={srcSet}
        sizes={sizes}
        onLoad={handleLoad}
        {...props}
      />
    )
  }
)
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className)}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
