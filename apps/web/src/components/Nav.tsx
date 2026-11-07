import {
  FunnelIcon,
  GearIcon,
  PlayIcon,
  UploadIcon,
} from '@/components/SvgIcons'
import Link from 'next/link'

/** App shell navigation. Features add links here; do not add server logic. */
export const NAV_LINKS = [
  { href: '/import', label: 'Import', icon: UploadIcon },
  { href: '/optimize', label: 'Optimize', icon: PlayIcon },
  { href: '/presets', label: 'Presets', icon: FunnelIcon },
  { href: '/teams', label: 'Custom teams', icon: GearIcon },
] as const

export function Nav() {
  return (
    <header className="nav">
      <Link href="/" className="brand">
        gi-optimizer
      </Link>
      <nav>
        {NAV_LINKS.map((l) => {
          const Icon = l.icon
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
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
