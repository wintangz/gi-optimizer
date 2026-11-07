'use client'

import {
  FunnelIcon,
  GearIcon,
  PlayIcon,
  UploadIcon,
} from '@/components/SvgIcons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** App shell navigation. Features add links here; do not add server logic. */
export const NAV_LINKS = [
  { href: '/import', label: 'Import', icon: UploadIcon },
  { href: '/optimize', label: 'Optimize', icon: PlayIcon },
  { href: '/presets', label: 'Presets', icon: FunnelIcon },
  { href: '/teams', label: 'Custom teams', icon: GearIcon },
] as const

export function Nav() {
  const pathname = usePathname()

  return (
    <header className="nav">
      <Link href="/" className="brand">
        gi-optimizer
      </Link>
      <nav aria-label="Main navigation">
        {NAV_LINKS.map((l) => {
          const Icon = l.icon
          const isActive =
            pathname === l.href || pathname?.startsWith(`${l.href}/`)
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive ? 'page' : undefined}
              className={`nav-link${isActive ? ' nav-link-active' : ''}`}
            >
              <Icon size={15} />
              <span>{l.label}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
