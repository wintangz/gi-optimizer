export interface StubReactElement {
  type: string | ((props: Record<string, unknown>) => unknown)
  props: Record<string, unknown>
}

export const jsx = (
  type: StubReactElement['type'],
  props?: Record<string, unknown>
): StubReactElement => ({
  type,
  props: props ?? {},
})
export const jsxs = jsx
export const jsxDEV = jsx
export const Fragment = 'Fragment'

export const createElement = (
  type: StubReactElement['type'],
  props?: Record<string, unknown> | null,
  ...children: unknown[]
): StubReactElement => ({
  type,
  props: {
    ...(props ?? {}),
    children: children.length <= 1 ? children[0] : children,
  },
})

export const useEffect = (): void => {}
export const useState = <T>(init: T | (() => T)): [T, () => void] => [
  typeof init === 'function' ? (init as () => T)() : init,
  () => {},
]
export const useMemo = <T>(fn: () => T): T => fn()
export const useCallback = <T>(fn: T): T => fn
export const useRef = <T>(val: T): { current: T } => ({ current: val })
export const useContext = (): Record<string, unknown> => ({})
export const createContext = <T>(defaultValue: T) => ({
  Provider: 'Provider',
  Consumer: 'Consumer',
  _currentValue: defaultValue,
})

export const ColorText = 'ColorText'
export const SqBadge = 'SqBadge'
export const Translate = 'Translate'
export const i18nInstance = { t: (key: string) => key }
export const ImgIcon = (): null => null
export const Box = 'Box'
export const StatIcon = (): null => null
export const ElementIcon = (): null => null
export const AnemoIcon = (): null => null
export const CryoIcon = (): null => null
export const DendroIcon = (): null => null
export const ElectroIcon = (): null => null
export const GeoIcon = (): null => null
export const HydroIcon = (): null => null
export const PyroIcon = (): null => null
export const PhysicalIcon = (): null => null
export const iconInlineProps: Record<string, unknown> = {}

export default {
  jsx,
  jsxs,
  jsxDEV,
  Fragment,
  createElement,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  useContext,
  createContext,
}
