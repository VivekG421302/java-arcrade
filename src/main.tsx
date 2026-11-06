import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { ProgressProvider } from './hooks/useProgress'
import { IdeProvider } from './hooks/useIde'
import { CourseProvider } from './hooks/useCourse'
import './index.css'

if (localStorage.getItem('theme') === 'light') document.documentElement.classList.remove('dark')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined))
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CourseProvider>
        <AuthProvider>
          <ProgressProvider>
            <IdeProvider>
              <App />
            </IdeProvider>
          </ProgressProvider>
        </AuthProvider>
      </CourseProvider>
    </BrowserRouter>
  </React.StrictMode>
)
