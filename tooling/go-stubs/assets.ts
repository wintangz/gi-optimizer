// Recursive callable proxy returning '' for any property chain or function call
const emptyProxy: any = new Proxy(() => '', {
  get: (_, prop) => (prop === Symbol.toPrimitive ? () => '' : emptyProxy),
  apply: () => '',
})

export const artifactDefIcon = (_slotKey?: string): string => ''
export const characterAsset = (
  _charKey?: string,
  _asset?: string,
  _gender?: string
): string => ''
export const weaponAsset = (_weaponKey?: string, _ascended?: boolean): string =>
  ''
export const imgAssets: Record<string, any> = emptyProxy
export const AssetData: Record<string, any> = emptyProxy
export default emptyProxy
