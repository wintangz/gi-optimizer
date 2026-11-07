// Lightweight stub for @genshin-optimizer/gi/i18n.
// Resolves GO English localization keys (<Translate ns key18 values />) for
// conditional and state labels in the engine catalog.

type LocaleDict = Record<string, unknown>

let injectedNamespaces: Record<string, LocaleDict> | null = null
const nodeLoadedNamespaces = new Map<string, LocaleDict | null>()

export function __setGOI18nNamespaces(data: Record<string, LocaleDict>) {
  injectedNamespaces = data
}

function getNamespaceDict(ns: string): LocaleDict | undefined {
  if (injectedNamespaces && injectedNamespaces[ns]) {
    return injectedNamespaces[ns]
  }
  if (nodeLoadedNamespaces.has(ns)) {
    return nodeLoadedNamespaces.get(ns) ?? undefined
  }
  const proc = (
    globalThis as {
      process?: { getBuiltinModule?: (id: string) => unknown }
    }
  ).process
  const fs = proc?.getBuiltinModule?.('node:fs') as
    | {
        existsSync: (p: string) => boolean
        readFileSync: (p: string, enc: string) => string
      }
    | undefined
  const path = proc?.getBuiltinModule?.('node:path') as
    | { resolve: (...p: string[]) => string; dirname: (p: string) => string }
    | undefined
  const url = proc?.getBuiltinModule?.('node:url') as
    | { fileURLToPath: (u: string) => string }
    | undefined
  if (!fs || !path || !url) {
    nodeLoadedNamespaces.set(ns, null)
    return undefined
  }
  try {
    const here = path.dirname(url.fileURLToPath(import.meta.url))
    const goRoot = path.resolve(here, '../../vendor/genshin-optimizer')
    const candidates = [
      path.resolve(
        goRoot,
        'libs/gi/localization/assets/locales/en',
        `${ns}.json`
      ),
      path.resolve(
        goRoot,
        'libs/gi/dm-localization/assets/locales/en',
        `${ns}.json`
      ),
    ]
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(
          fs.readFileSync(filePath, 'utf8')
        ) as LocaleDict
        nodeLoadedNamespaces.set(ns, parsed)
        return parsed
      }
    }
  } catch {
    // ignore
  }
  nodeLoadedNamespaces.set(ns, null)
  return undefined
}

export function translateGOKey(
  ns: string,
  key18: string,
  values?: Record<string, unknown>
): string | undefined {
  const nsObj = getNamespaceDict(ns)
  if (!nsObj) return undefined
  const parts = key18.split('.')
  let cur: unknown = nsObj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur || typeof cur !== 'object') {
      cur = undefined
      break
    }
    cur = (cur as Record<string, unknown>)[parts[i]!]
  }
  const last = parts[parts.length - 1]!
  let val =
    cur && typeof cur === 'object'
      ? (cur as Record<string, unknown>)[last]
      : undefined
  if (
    val === undefined &&
    cur &&
    typeof cur === 'object' &&
    values &&
    typeof values.count === 'number'
  ) {
    const pluralSuffix = values.count === 1 ? 'one' : 'other'
    const pluralVal = (cur as Record<string, unknown>)[
      `${last}_${pluralSuffix}`
    ]
    if (pluralVal !== undefined) {
      val = pluralVal
    }
  }
  if (typeof val !== 'string') return undefined
  return val
}

export const i18nInstance = {
  t: (k: string) => k,
  language: 'en',
}

export function Translate(props: {
  ns?: string
  key18?: string
  values?: Record<string, unknown>
  children?: unknown
}) {
  return props?.key18 ?? props?.children ?? ''
}
