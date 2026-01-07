import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import './index.css'
import { AuthProvider } from '@/supabase/AuthProvider'
import { ThemeProvider } from '@/components/theme-provider'
import { AvatarCacheProvider } from '@/components/AvatarCacheContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="scelo-theme">
        <AvatarCacheProvider>
          <RouterProvider router={router} />
        </AvatarCacheProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
)
