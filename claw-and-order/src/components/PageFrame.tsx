import type { ReactNode } from 'react'
import { PageHeader, type PageHeaderVariant } from './PageHeader'

export function PageFrame({
  title,
  actions,
  tone = 'brand',
  headerVariant = 'compact',
  description,
  children,
}: {
  title: string
  actions?: ReactNode
  tone?: 'default' | 'brand'
  /** Overview uses `full` (wordmark); other pages use `compact` (icon). */
  headerVariant?: PageHeaderVariant
  description?: string
  children: ReactNode
}) {
  return (
    <div className={tone === 'brand' ? 'page-frame page-frame--brand' : 'page-frame'}>
      <PageHeader
        title={title}
        actions={actions}
        variant={headerVariant}
        description={description}
      />
      <div className="page-content-grid">{children}</div>
    </div>
  )
}
