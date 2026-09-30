import type { ReactNode } from 'react'
import { RouterProvider, Toast } from '@capra/core'
import { Route, Routes, useHref, useNavigate, type NavigateOptions } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { CompatibilityPage } from './pages/CompatibilityPage'
import { EnclosuresPage } from './pages/EnclosuresPage'
import { OverviewPage } from './pages/OverviewPage'
import { ServicesPage } from './pages/ServicesPage'
import { SettingsPage } from './pages/SettingsPage'
import { ParkProvider } from './state/ParkProvider'

declare module '@capra/core' {
  interface RouterConfig {
    routerOptions: NavigateOptions
  }
}

function CapraRouterBridge({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <RouterProvider navigate={navigate} useHref={useHref}>
      {children}
    </RouterProvider>
  )
}

function App() {
  return (
    <ParkProvider>
      <Toast.Provider />
      <CapraRouterBridge>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="enclosures" element={<EnclosuresPage />} />
            <Route path="compatibility" element={<CompatibilityPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </CapraRouterBridge>
    </ParkProvider>
  )
}

export default App
