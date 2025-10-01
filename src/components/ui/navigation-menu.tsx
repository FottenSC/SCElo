import * as React from 'react'
import { cn } from '@/lib/utils'

export function NavigationMenu({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <nav className={cn('flex items-center gap-4', className)}>{children}</nav>
}

export function NavigationMenuItem({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>
}

export function NavigationMenuLink({ children, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cn('text-sm hover:text-primary', className)} {...props}>
      {children}
    </a>
  )
}
