import Link from "next/link";

/** App shell navigation. Features add links here; do not add server logic. */
export const NAV_LINKS = [
  { href: "/import", label: "Import" },
  { href: "/optimize", label: "Optimize" },
  { href: "/presets", label: "Presets" },
  { href: "/teams", label: "Custom teams" },
] as const;

export function Nav() {
  return (
    <header className="nav">
      <Link href="/" className="brand">
        gi-optimizer
      </Link>
      <nav>
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

