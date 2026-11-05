import { allArtifactSetKeys, allCharacterKeys, allWeaponKeys } from '@genshin-optimizer/gi/consts'

const DISPLAY_OVERRIDES: Record<string, string> = {
  HuTao: 'Hu Tao',
  RaidenShogun: 'Raiden Shogun',
  KaedeharaKazuha: 'Kaedehara Kazuha',
  KujouSara: 'Kujou Sara',
  KamisatoAyaka: 'Kamisato Ayaka',
  KamisatoAyato: 'Kamisato Ayato',
  SangonomiyaKokomi: 'Sangonomiya Kokomi',
  ShikanoinHeizou: 'Shikanoin Heizou',
  KukiShinobu: 'Kuki Shinobu',
  AratakiItto: 'Arataki Itto',
  YaeMiko: 'Yae Miko',
  YunJin: 'Yun Jin',
  TravelerAnemo: 'Traveler (Anemo)',
  TravelerGeo: 'Traveler (Geo)',
  TravelerElectro: 'Traveler (Electro)',
  TravelerDendro: 'Traveler (Dendro)',
  TravelerHydro: 'Traveler (Hydro)',
  TravelerPyro: 'Traveler (Pyro)',
  SplendorOfTranquilWaters: 'Splendor of Tranquil Waters',
  PrimordialJadeCutter: 'Primordial Jade Cutter',
  FesteringDesire: 'Festering Desire',
  FleuveCendreFerryman: 'Fleuve Cendre Ferryman',
  FavoniusSword: 'Favonius Sword',
  FavoniusWarbow: 'Favonius Warbow',
  FavoniusLance: 'Favonius Lance',
  FavoniusCodex: 'Favonius Codex',
  SacrificialSword: 'Sacrificial Sword',
  SacrificialJade: 'Sacrificial Jade',
  TomeOfTheEternalFlow: 'Tome of the Eternal Flow',
  PrototypeAmber: 'Prototype Amber',
  StaffOfHoma: 'Staff of Homa',
  StaffOfTheScarletSands: 'Staff of the Scarlet Sands',
  EngulfingLightning: 'Engulfing Lightning',
  TheCatch: '"The Catch"',
  CrimsonMoonsSemblance: "Crimson Moon's Semblance",
  AThousandBlazingSuns: 'A Thousand Blazing Suns',
  FreedomSworn: 'Freedom-Sworn',
  ElegyForTheEnd: 'Elegy for the End',
  AquaSimulacra: 'Aqua Simulacra',
  AquilaFavonia: 'Aquila Favonia',
  SkywardBlade: 'Skyward Blade',
  MistsplitterReforged: 'Mistsplitter Reforged',
  ThrillingTalesOfDragonSlayers: 'Thrilling Tales of Dragon Slayers',
  StarcallersWatch: "Starcaller's Watch",
  PeakPatrolSong: 'Peak Patrol Song',
  BlackTassel: 'Black Tassel',
  DragonsBane: "Dragon's Bane",
  WhiteTassel: 'White Tassel',
  GoldenTroupe: 'Golden Troupe',
  MarechausseeHunter: 'Marechaussee Hunter',
  ViridescentVenerer: 'Viridescent Venerer',
  ArchaicPetra: 'Archaic Petra',
  TenacityOfTheMillelith: 'Tenacity of the Millelith',
  NoblesseOblige: 'Noblesse Oblige',
  EmblemOfSeveredFate: 'Emblem of Severed Fate',
  CrimsonWitchOfFlames: 'Crimson Witch of Flames',
  ShimenawasReminiscence: "Shimenawa's Reminiscence",
  FragmentOfHarmonicWhimsy: 'Fragment of Harmonic Whimsy',
  ObsidianCodex: 'Obsidian Codex',
  ScrollOfTheHeroOfCinderCity: 'Scroll of the Hero of Cinder City',
  Instructor: 'Instructor',
  DeepwoodMemories: 'Deepwood Memories',
  GildedDreams: 'Gilded Dreams',
}

export function displayName(key: string): string {
  if (!key) return ''
  if (DISPLAY_OVERRIDES[key]) return DISPLAY_OVERRIDES[key]!
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\bOf\b/g, 'of')
    .replace(/\bThe\b/g, 'the')
    .replace(/\bFor\b/g, 'for')
    .replace(/\bIn\b/g, 'in')
    .replace(/\bTo\b/g, 'to')
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .trim()
}

export const ALL_CHARACTER_KEYS: readonly string[] = allCharacterKeys as readonly string[]
export const ALL_WEAPON_KEYS: readonly string[] = allWeaponKeys as readonly string[]
export const ALL_ARTIFACT_SET_KEYS: readonly string[] = allArtifactSetKeys as readonly string[]

