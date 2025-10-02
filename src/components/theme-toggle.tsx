import { Moon, SunMedium } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  // If system theme, read the actual system preference to determine toggle behavior
  const effectiveTheme = theme === 'system' 
    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme

  const next = effectiveTheme === 'light' ? 'dark' : 'light'
  const label = effectiveTheme === 'light' ? 'Switch to dark' : 'Switch to light'

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        onClick={() => setTheme(next)}
        className="relative h-10 w-10"
      >
        <SunMedium className="absolute h-6 w-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-6 w-6 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
    </div>
  )
}

export default ThemeToggle
