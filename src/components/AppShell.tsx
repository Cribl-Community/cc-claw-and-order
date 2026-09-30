import { VerticalNavigation } from '@capra/core'
import {
  Book,
  Cog,
  CodeMerge,
  HomeOutlined,
  MappingOutlined,
  Routes as RoutesIcon,
} from '@capra/icons'
import { Outlet, useLocation } from 'react-router-dom'
import { InvestigationDrawer } from './InvestigationDrawer'

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: <HomeOutlined /> },
  { href: '/enclosures', label: 'Enclosures', icon: <MappingOutlined /> },
  { href: '/compatibility', label: 'Compatibility', icon: <CodeMerge /> },
  { href: '/services', label: 'Services', icon: <RoutesIcon /> },
] as const

function pathIsActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShell() {
  const { pathname } = useLocation()

  return (
    <div className="app-shell">
      <VerticalNavigation aria-label="Claw and Order navigation">
        <VerticalNavigation.ItemList>
          {NAV_ITEMS.map((item) => (
            <VerticalNavigation.Item
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathIsActive(pathname, item.href)}
            />
          ))}
        </VerticalNavigation.ItemList>
        <VerticalNavigation.Footer>
          <VerticalNavigation.Item
            href="/settings"
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
        <Outlet />
      </main>
      <InvestigationDrawer />
    </div>
  )
}
