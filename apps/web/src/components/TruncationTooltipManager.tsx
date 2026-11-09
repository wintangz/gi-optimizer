'use client'

import { useEffect, useState } from 'react'

/**
 * Selector matching elements across the app that can truncate text with an
 * ellipsis (single-line `text-overflow: ellipsis` or multi-line `-webkit-line-clamp`).
 */
export const TRUNCATABLE_TEXT_SELECTOR = [
  '.tile-picker-caption',
  '.tile-picker-subcaption',
  '.tile-picker-kind-badge',
  '.gi-buffs-member-tab strong',
  '.preset-weapon-name',
  '.artifact-piece-set-name',
  '.artifact-substat-line',
  '.opt-filter-panel-hint',
  '.preset-fastmode-summary',
  '.comp-stat-buff-source',
  '.preset-card-summary-line',
  '.preset-card-name',
  '.preset-member-stat-base',
  '.preset-member-stat-final',
  '.comp-stat-label-cell strong',
].join(', ')

export interface TruncationMeasurableElement {
  scrollWidth: number
  clientWidth: number
  scrollHeight: number
  clientHeight: number
  textContent: string | null
  getAttribute(name: string): string | null
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  closest?(selector: string): TruncationMeasurableElement | null
}

/**
 * Returns true when an element's rendered text overflows its visible box
 * horizontally (single-line ellipsis) or vertically (multi-line `-webkit-line-clamp`).
 */
export function isElementTextTruncated(
  el: Pick<
    TruncationMeasurableElement,
    'scrollWidth' | 'clientWidth' | 'scrollHeight' | 'clientHeight'
  >
): boolean {
  return (
    el.scrollWidth > el.clientWidth + 1 ||
    el.scrollHeight > el.clientHeight + 1
  )
}

/**
 * Synchronises the `title` tooltip on a truncatable text element (and its
 * enclosing `.tile-picker-item` or `.gi-buffs-member-tab` interactive control,
 * if any):
 * - When truncated: sets `title` to the full trimmed text content.
 * - When not truncated: removes any auto-assigned or redundant identical `title`
 *   so text that fits in full shows no tooltip.
 */
export function syncElementTruncationTooltip(
  el: TruncationMeasurableElement
): boolean {
  const fullText = (el.textContent ?? '').trim()
  if (!fullText) return false

  const truncated = isElementTextTruncated(el)
  const currentTitle = el.getAttribute('title')
  const isAutoTitle = el.getAttribute('data-truncation-tooltip') === 'auto'
  const tileHost = el.closest?.('.tile-picker-item') ?? null

  if (truncated) {
    if (!currentTitle || isAutoTitle || currentTitle === fullText) {
      el.setAttribute('title', fullText)
      el.setAttribute('data-truncation-tooltip', 'auto')
    }
    if (tileHost) {
      const hostTitle = tileHost.getAttribute('title')
      const hostAuto =
        tileHost.getAttribute('data-truncation-tooltip') === 'auto'
      if (!hostTitle || hostAuto || hostTitle === fullText) {
        tileHost.setAttribute('title', fullText)
        tileHost.setAttribute('data-truncation-tooltip', 'auto')
      }
    }
    return true
  }

  // Element fits in full: clear auto tooltip or redundant identical title
  if (isAutoTitle || currentTitle === fullText) {
    el.removeAttribute('title')
    el.removeAttribute('data-truncation-tooltip')
  }
  if (tileHost) {
    const hostTitle = tileHost.getAttribute('title')
    const hostAuto =
      tileHost.getAttribute('data-truncation-tooltip') === 'auto'
    if (hostAuto || hostTitle === fullText) {
      tileHost.removeAttribute('title')
      tileHost.removeAttribute('data-truncation-tooltip')
    }
  }
  return false
}

/**
 * Inspects a root DOM node (or document) and updates truncation tooltips for
 * all matching truncatable elements.
 */
export function syncTruncationTooltipsInSubtree(
  root: ParentNode | Element | Document
): void {
  if (typeof root.querySelectorAll !== 'function') return
  if (
    'matches' in root &&
    typeof root.matches === 'function' &&
    root.matches(TRUNCATABLE_TEXT_SELECTOR)
  ) {
    syncElementTruncationTooltip(root as unknown as TruncationMeasurableElement)
  }
  const nodes = root.querySelectorAll(TRUNCATABLE_TEXT_SELECTOR)
  nodes.forEach((node) => {
    syncElementTruncationTooltip(node as unknown as TruncationMeasurableElement)
  })
}

/**
 * Global client listener that ensures every truncating text element across the
 * app exposes its full text via a native `title` tooltip when truncated, while
 * elements whose text fits in full show no redundant tooltip.
 */
export function TruncationTooltipManager() {
  const [activeTooltip, setActiveTooltip] = useState<{
    text: string
    x: number
    y: number
    placement: 'top' | 'bottom'
    align: 'left' | 'center' | 'right'
  } | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    let rafId = 0
    const scheduleFullSync = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        syncTruncationTooltipsInSubtree(document)
      })
    }

    const handlePointerOrFocus = (e: Event) => {
      const target = e.target
      if (!target || typeof (target as Element).closest !== 'function') return
      const el = target as Element
      const container =
        el.closest(
          '.tile-picker-item, .gi-buffs-member-tab, .artifact-piece-card, .preset-card, button, a'
        ) ?? el
      syncTruncationTooltipsInSubtree(container)
      // Also check if `el` itself has CSS ellipsis truncation
      if (el instanceof HTMLElement && el.children.length === 0) {
        const style = window.getComputedStyle(el)
        if (
          style.textOverflow === 'ellipsis' ||
          style.overflowX === 'hidden'
        ) {
          syncElementTruncationTooltip(el)
        }
      }

      const tooltipHost = el.closest('[data-truncation-tooltip="auto"]')
      const text = tooltipHost?.getAttribute('title')?.trim()
      if (tooltipHost && text) {
        const rect = tooltipHost.getBoundingClientRect()
        const placeAbove = rect.top > 48
        let align: 'left' | 'center' | 'right' = 'center'
        let x = rect.left + rect.width / 2
        if (rect.left < 240) {
          align = 'left'
          x = Math.max(12, rect.left)
        } else if (window.innerWidth - rect.right < 240) {
          align = 'right'
          x = Math.min(window.innerWidth - 12, rect.right)
        }
        setActiveTooltip({
          text,
          x,
          y: placeAbove ? rect.top - 6 : rect.bottom + 6,
          placement: placeAbove ? 'top' : 'bottom',
          align,
        })
      } else {
        setActiveTooltip(null)
      }
    }

    const handleClear = () => {
      setActiveTooltip(null)
    }

    syncTruncationTooltipsInSubtree(document)

    document.addEventListener('mouseover', handlePointerOrFocus, true)
    document.addEventListener('focusin', handlePointerOrFocus, true)
    document.addEventListener('focusout', handleClear, true)
    window.addEventListener('scroll', handleClear, {
      passive: true,
      capture: true,
    })
    window.addEventListener('resize', scheduleFullSync, { passive: true })

    const observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            scheduleFullSync()
          })
        : null

    observer?.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId)
      document.removeEventListener('mouseover', handlePointerOrFocus, true)
      document.removeEventListener('focusin', handlePointerOrFocus, true)
      document.removeEventListener('focusout', handleClear, true)
      window.removeEventListener('scroll', handleClear, true)
      window.removeEventListener('resize', scheduleFullSync)
      observer?.disconnect()
    }
  }, [])

  if (!activeTooltip) return null

  return (
    <div
      className={`gi-truncation-tooltip is-${activeTooltip.placement} is-align-${activeTooltip.align}`}
      data-testid="truncation-tooltip"
      role="tooltip"
      style={{
        left: `${Math.round(activeTooltip.x)}px`,
        top: `${Math.round(activeTooltip.y)}px`,
      }}
    >
      {activeTooltip.text}
    </div>
  )
}
