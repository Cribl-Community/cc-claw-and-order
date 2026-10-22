import { VerticalNavigation } from '@capra/core'
import {
  Book,
  Car,
  Cog,
  CodeMerge,
  Flask,
  HomeOutlined,
  MappingOutlined,
  Routes as RoutesIcon,
} from '@capra/icons'
import type { ReactNode, MouseEvent } from 'react'
import { Outlet, useHref, useLocation, useNavigate } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'
import { InvestigationDrawer } from './InvestigationDrawer'

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: <HomeOutlined /> },
  { to: '/enclosures', label: 'Enclosures', icon: <MappingOutlined /> },
  { to: '/compatibility', label: 'Compatibility', icon: <CodeMerge /> },
  { to: '/services', label: 'Services', icon: <RoutesIcon /> },
  { to: '/fleet', label: 'Fleet', icon: <Car /> },
  { to: '/lab', label: 'Lab', icon: <Flask /> },
] as const

function pathIsActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Capra VerticalNavigation.Item renders a raw <a href>. Without preventDefault,
 * Cloud does a full document load; with Vite base './', deep routes 404 assets
 * and the page goes blank. Route through React Router instead.
 */
function RouterNavItem({
  to,
  label,
  icon,
  isActive,
}: {
  to: string
  label: string
  icon: ReactNode
  isActive: boolean
}) {
  const href = useHref(to)
  const navigate = useNavigate()

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented) return
    if (event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(to)
  }

  return (
    <VerticalNavigation.Item
      href={href}
      label={label}
      icon={icon}
      isActive={isActive}
      onClick={onClick}
    />
  )
}

export function AppShell() {
  const { pathname } = useLocation()

  return (
    <div className="app-shell">
      <VerticalNavigation aria-label="Claw and Order navigation">
        <VerticalNavigation.ItemList>
          {NAV_ITEMS.map((item) => (
            <RouterNavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              isActive={pathIsActive(pathname, item.to)}
            />
          ))}
        </VerticalNavigation.ItemList>
        <VerticalNavigation.Footer>
          <RouterNavItem
            to="/settings"
            label="Settings"
            icon={<Cog />}
            isActive={pathIsActive(pathname, '/settings')}
          />
          <VerticalNavigation.Item
            href="https://docs.cribl.io/apps"
            target="_blank"
            rel="noopener noreferrer"
            label="Documentation"
            icon={<Book />}
          />
        </VerticalNavigation.Footer>
      </VerticalNavigation>
      <main className="app-shell__main">
        {/* Remount on route change so a crashed page doesn't block the next one. */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <InvestigationDrawer />
    </div>
  )
}
