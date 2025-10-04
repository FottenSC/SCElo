import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './pages/App'
import './index.css'
import { AuthProvider } from '@/supabase/AuthContext'
import { ThemeProvider } from '@/components/theme-provider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider defaultTheme="system" storageKey="scelo-theme">
        <HashRouter>
          <App />
        </HashRouter>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
)
