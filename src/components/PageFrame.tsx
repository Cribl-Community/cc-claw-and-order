import { Text } from '@capra/core'
import type { ReactNode } from 'react'
import logo from '../assets/claw_and_order_logo.png'
import { DemoModeBadge } from './DemoModeBadge'

export function PageFrame({
  title,
  actions,
  children,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="page-frame">
      <div className="page-frame__chrome">
        <img className="page-frame__logo" src={logo} alt="Claw & Order" width={240} />
        <DemoModeBadge />
      </div>
      <div className="page-frame__header">
        <Text as="h1" variant="heading">
          {title}
        </Text>
        {actions != null ? <div className="page-frame__actions">{actions}</div> : null}
      </div>
      <div className="page-content-grid">{children}</div>
    </div>
  )
}
