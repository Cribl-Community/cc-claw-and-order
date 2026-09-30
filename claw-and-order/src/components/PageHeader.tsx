import type { ReactNode } from 'react'
import icon from '../assets/claw_and_order_icon.png'
import logo from '../assets/claw_and_order_logo.png'
import { DemoModeBadge } from './DemoModeBadge'

export type PageHeaderVariant = 'full' | 'compact'

/**
 * Page brand header. Capra keeps logos out of VerticalNavigation — they live here.
 * - `full`: wordmark logo beside page title (Overview / brand landing)
 * - `compact`: icon mark beside the page title (all other pages)
 */
export function PageHeader({
  title,
  actions,
  variant = 'compact',
  description,
}: {
  title: string
  actions?: ReactNode
  variant?: PageHeaderVariant
  /** Optional supporting line under the title (full header only). */
  description?: string
}) {
  if (variant === 'full') {
    return (
      <header className="page-header page-header--full">
        <div className="page-header__brand">
          <img
            className="page-header__logo"
            src={logo}
            alt="Claw & Order"
            width={128}
            height={48}
          />
          <div className="page-header__titles">
            <h1 className="page-header__title">{title}</h1>
            {description ? <p className="page-header__description">{description}</p> : null}
          </div>
        </div>
        <div className="page-header__trailing">
          <DemoModeBadge />
          {actions != null ? <div className="page-header__actions">{actions}</div> : null}
        </div>
      </header>
    )
  }

  return (
    <header className="page-header page-header--compact">
      <div className="page-header__row">
        <div className="page-header__identity">
          <img
            className="page-header__icon"
            src={icon}
            alt=""
            width={40}
            height={40}
            aria-hidden="true"
          />
          <div className="page-header__identity-text">
            <h1 className="page-header__title">{title}</h1>
            <span className="page-header__product">Claw &amp; Order</span>
          </div>
        </div>
        <div className="page-header__trailing">
          <DemoModeBadge />
          {actions != null ? <div className="page-header__actions">{actions}</div> : null}
        </div>
      </div>
    </header>
  )
}
