/**
 * Auto-generated compact character, weapon, and artifact-set metadata and key
 * constants extracted from @genshin-optimizer/gi/stats and @genshin-optimizer/gi/consts.
 */
export interface CompactCharStat {
  ele: string
  rarity: 4 | 5
  weaponType: string
}

export interface CompactWeaponStat {
  weaponType: string
  rarity: 1 | 2 | 3 | 4 | 5
}

export interface CompactArtSetStat {
  rarities: readonly number[]
}

const ELE = ['anemo', 'geo', 'electro', 'hydro', 'pyro', 'cryo', 'dendro'] as const
const WT = ['sword', 'claymore', 'polearm', 'bow', 'catalyst'] as const

const RAW_CHARS = "Aino:341,Albedo:150,Alhaitham:650,Aloy:553,Alyosha:242,Amber:443,AratakiItto:151,Arlecchino:452,Baizhu:654,Barbara:344,Beidou:241,Bennett:440,Candace:342,Charlotte:544,Chasca:053,Chevreuse:442,Chiori:150,Chongyun:541,Citlali:554,Clorinde:250,Collei:643,Columbina:354,Cyno:252,Dahlia:340,Dehya:451,Diluc:451,Diona:543,Dori:241,Durin:450,Emilie:652,Escoffier:552,Eula:551,Faruzan:043,Fischl:243,Flins:252,Freminet:541,Furina:350,Gaming:441,Ganyu:553,Gorou:143,HuTao:452,Iansan:242,Illuga:142,Ifa:044,Ineffa:252,Jahoda:043,Jean:050,Kachina:142,KaedeharaKazuha:050,Kaeya:540,KamisatoAyaka:550,KamisatoAyato:350,Kaveh:641,Keqing:250,Kinich:651,Kirara:640,Klee:454,KujouSara:243,KukiShinobu:240,LanYan:044,Lauma:654,Layla:540,Linnea:153,Lisa:244,Lohen:552,Lynette:040,Lyney:453,Mavuika:451,Mika:542,Mona:354,Mualani:354,Nahida:654,Navia:151,Nefer:654,Neuvillette:354,Nicole:454,Nilou:350,Ningguang:144,Noelle:141,Odette:550,Ororon:243,Prune:044,Qiqi:550,RaidenShogun:252,Razor:241,Rosaria:542,Sandrone:551,SangonomiyaKokomi:354,Sayu:041,Sethos:243,Shenhe:552,ShikanoinHeizou:044,Sigewinne:353,Skirk:550,Somnia:254,Sucrose:044,Tartaglia:353,Thoma:442,Tighnari:653,Varesa:254,Varka:051,Venti:053,Vesna:050,Vodyanitsa:354,Wanderer:054,Wriothesley:554,Xiangling:442,Xianyun:054,Xiao:052,Xilonen:150,Xingqiu:340,Xinyan:441,YaeMiko:254,Yanfei:444,Yaoyao:642,Yelan:353,Yoimiya:453,YumemizukiMizuki:054,YunJin:142,Zhongli:152,Zibai:150,Traveler:050"
const RAW_WEAPONS = "Absolution:05,AmenomaKageuchi:04,AquilaFavonia:05,AthameArtis:05,Azurelight:05,BeyondTheChrysalis:05,BlackcliffLongsword:04,CalamityOfEshu:04,CinnabarSpindle:04,CoolSteel:03,DarkIronSword:03,DullBlade:01,Emberwell:04,ExaiphanesBlade:05,FavoniusSword:04,FesteringDesire:04,FilletBlade:03,FinaleOfTheDeep:04,FleuveCendreFerryman:04,FluteOfEzpitzal:04,FreedomSworn:05,HaranGeppakuFutsu:05,HarbingerOfDawn:03,HereticsMoltenBlade:04,IronSting:04,KagotsurubeIsshin:04,KeyOfKhajNisut:05,LightbearingMoonshard:05,LightOfFoliarIncision:05,LionsRoar:04,MistsplitterReforged:05,MoonweaversDawn:04,NewBough:04,PeakPatrolSong:05,PrimordialJadeCutter:05,PrototypeRancour:04,RoyalLongsword:04,SacrificialSword:04,SapwoodBlade:04,SerenitysCall:04,SilverLight:04,SilverSword:02,SkyriderSword:03,SkywardBlade:05,SplendorOfTranquilWaters:05,SturdyBone:04,SummitShaper:05,SwordOfDescension:04,SwordOfNarzissenkreuz:04,TheAlleyFlash:04,TheBlackSword:04,TheDockhandsAssistant:04,TheFlute:04,ToukabouShigure:04,TravelersHandySword:03,UrakuMisugiri:05,WhitelakeFrostfeather:05,WolfFang:04,XiphosMoonlight:04,Akuoumaru:14,ATeaspoonOfTranscendence:15,AThousandBlazingSuns:15,BeaconOfTheReedSea:15,BlackcliffSlasher:14,BladeOfAtonement:14,BloodtaintedGreatsword:13,DebateClub:13,EarthShaker:14,FangOfTheMountainKing:15,FavoniusGreatsword:14,FerrousShadow:13,FlameForgedInsight:14,ForestRegalia:14,ForgedByTheGoldenMelody:14,FruitfulHook:14,GestOfTheMightyWolf:15,KatsuragikiriNagamasa:14,LithicBlade:14,LuxuriousSeaLord:14,MailedFlower:14,MakhairaAquamarine:14,MasterKey:14,OldMercsPal:12,PortablePowerSaw:14,PrototypeArchaic:14,Rainslasher:14,RedhornStonethresher:15,RoyalGreatsword:14,SacrificialGreatsword:14,SerpentSpine:14,SkyriderGreatsword:13,SkywardPride:15,SnowTombedStarsilver:14,SongOfBrokenPines:15,TalkingStick:14,TheBell:14,TheUnforged:15,TidalShadow:14,UltimateOverlordsMegaMagicSword:14,Verdict:15,WasterGreatsword:11,Whiteblind:14,WhiteIronGreatsword:13,WolfsGravestone:15,BalladOfTheFjords:24,BeginnersProtector:21,BlackcliffPole:24,BlackTassel:23,BloodsoakedRuins:25,CalamityQueller:25,CrescentPike:24,CrimsonMoonsSemblance:25,Deathmatch:24,DialoguesOfTheDesertSages:24,DisasterAndRemorse:25,DragonsBane:24,DragonspineSpear:24,EngulfingLightning:25,FavoniusLance:24,FootprintOfTheRainbow:24,FracturedHalo:25,Frostbreath:24,Halberd:23,IronPoint:22,KitainCrossSpear:24,LithicSpear:24,LumidouceElegy:25,MissiveWindspear:24,Moonpiercer:24,MountainBracingBolt:24,PrimordialJadeWingedSpear:25,ProspectorsDrill:24,ProspectorsShovel:24,PrototypeStarglitter:24,RightfulReward:24,RoyalSpear:24,SacrificersStaff:24,SkywardSpine:25,SongOfTheVigil:24,StaffOfHoma:25,StaffOfTheScarletSands:25,SymphonistOfScents:25,TamayurateiNoOhanashi:24,TheCatch:24,VortexVanquisher:25,WavebreakersFin:24,WhiteTassel:23,AlleyHunter:34,AmosBow:35,AquaSimulacra:35,AstralVulturesCrimsonPlumage:35,BlackcliffWarbow:34,BreezeborneRefrain:34,ChainBreaker:34,Cloudforged:34,CompoundBow:34,CovenantOfFrostAndSnow:34,ElegyForTheEnd:35,EndOfTheLine:34,FadingTwilight:34,FavoniusWarbow:34,FlowerWreathedFeathers:34,GoldenFrostboundOath:35,Hamayumi:34,HuntersBow:31,HuntersPath:35,IbisPiercer:34,JadeVista:34,KingsSquire:34,Messenger:33,MitternachtsWaltz:34,MouunsMoon:34,PolarStar:35,Predator:34,PrototypeCrescent:34,RainbowSerpentsRainBow:34,RangeGauge:34,RavenBow:33,RecurveBow:33,RoyalBow:34,Rust:34,SacrificialBow:34,ScionOfTheBlazingSun:34,SeasonedHuntersBow:32,SequenceOfSolitude:34,SharpshootersOath:33,SilvershowerHeartstrings:35,SkywardHarp:35,Slingshot:33,SnareHook:34,SongOfStillness:34,TheDaybreakChronicles:35,TheFirstGreatMagic:35,TheStringless:34,TheViridescentHunt:34,ThunderingPulse:35,WindblumeOde:34,AngelosHeptades:45,ApprenticesNotes:41,AshGravenDrinkingHorn:44,AThousandFloatingDreams:45,BalladOfTheBoundlessBlue:44,BlackcliffAgate:44,BlackmarrowLantern:44,CashflowSupervision:45,ClashOfKings:44,CranesEchoingCall:45,DawningFrost:44,DodocoTales:44,EchoesOfTheHeart:44,EmeraldOrb:43,EtherlightSpindlelute:44,EverlastingMoonglow:45,EyeOfPerception:44,FavoniusCodex:44,FlowingPurity:44,Frostbearer:44,FruitOfFulfillment:44,HakushinRing:44,HymnOfTheMaelstrom:45,JadefallsSplendor:45,KagurasVerity:45,LostPrayerToTheSacredWinds:45,MagicGuide:43,MappaMare:44,MemoryOfDust:45,NightweaversLookingGlass:45,NocturnesCurtainCall:45,OathswornEye:44,OtherworldlyStory:43,PocketGrimoire:42,PrototypeAmber:44,QuantumCatalyst:45,ReliquaryOfTruth:45,RingOfYaxche:44,RoyalGrimoire:44,SacrificialFragments:44,SacrificialJade:44,SkywardAtlas:45,SolarPearl:44,StarcallersWatch:45,SunnyMorningSleepIn:45,SurfsUp:45,TheWidsith:44,ThrillingTalesOfDragonSlayers:43,TomeOfTheEternalFlow:45,TulaytullahsRemembrance:45,TwinNephrite:43,VividNotions:45,WanderingEvenstar:44,WaveridingWhirl:44,WineAndSong:44,WintersHeavyHeart:44"
const RAW_ARTS = "ADayCarvedFromRisingWinds:45,Adventurer:123,ArchaicPetra:45,AubadeOfMorningstarAndMoon:45,Berserker:34,BlizzardStrayer:45,BloodstainedChivalry:45,BraveHeart:34,CelestialGift:45,CrimsonWitchOfFlames:45,DeepwoodMemories:45,DefendersWill:34,DesertPavilionChronicle:45,DisenchantmentInDeepShadow:45,EchoesOfAnOffering:45,EmblemOfSeveredFate:45,FinaleOfTheDeepGalleries:45,FlowerOfParadiseLost:45,FragmentOfHarmonicWhimsy:45,Gambler:34,GildedDreams:45,GladiatorsFinale:45,GoldenTroupe:45,HeartOfDepth:45,HeartOfTheFurnace:45,HuskOfOpulentDreams:45,Instructor:34,Lavawalker:45,LongNightsOath:45,LuckyDog:123,MaidenBeloved:45,MarechausseeHunter:45,MartialArtist:34,NightOfTheSkysUnveiling:45,NighttimeWhispersInTheEchoingWoods:45,NoblesseOblige:45,NymphsDream:45,ObsidianCodex:45,OceanHuedClam:45,PaleFlame:45,PrayersForDestiny:34,PrayersForIllumination:34,PrayersForWisdom:34,PrayersToSpringtime:34,ResolutionOfSojourner:34,RetracingBolide:45,ScarletProof:45,Scholar:34,ScrollOfTheHeroOfCinderCity:45,ShimenawasReminiscence:45,SilkenMoonsSerenade:45,SongOfDaysPast:45,TenacityOfTheMillelith:45,TheExile:34,ThunderingFury:45,Thundersoother:45,TinyMiracle:34,TravelingDoctor:123,UnfinishedReverie:45,VermillionHereafter:45,ViridescentVenerer:45,VourukashasGlow:45,WanderersTroupe:45"

export const CHAR_STAT_META: Readonly<Record<string, CompactCharStat>> = Object.fromEntries(
  RAW_CHARS.split(',').map((pair) => {
    const [k, c] = pair.split(':') as [string, string]
    return [
      k,
      {
        ele: ELE[Number(c[0])] ?? 'anemo',
        rarity: c[1] === '4' ? 4 : 5,
        weaponType: WT[Number(c[2])] ?? 'sword',
      },
    ]
  })
)

export const WEAPON_STAT_META: Readonly<Record<string, CompactWeaponStat>> = Object.fromEntries(
  RAW_WEAPONS.split(',').map((pair) => {
    const [k, w] = pair.split(':') as [string, string]
    return [
      k,
      {
        weaponType: WT[Number(w[0])] ?? 'sword',
        rarity: Number(w[1]) as 1 | 2 | 3 | 4 | 5,
      },
    ]
  })
)

export const ART_SET_STAT_META: Readonly<Record<string, CompactArtSetStat>> = Object.fromEntries(
  RAW_ARTS.split(',').map((pair) => {
    const [k, r] = pair.split(':') as [string, string]
    return [
      k,
      {
        rarities: Array.from(r, Number),
      },
    ]
  })
)

export const ALL_TRAVELER_KEYS = [
  'TravelerAnemo',
  'TravelerGeo',
  'TravelerElectro',
  'TravelerDendro',
  'TravelerHydro',
  'TravelerPyro',
  'TravelerCryo',
] as const

const NON_TRAVELER_KEYS = Object.keys(CHAR_STAT_META).filter((k) => k !== 'Traveler')

export const ALL_CHARACTER_KEYS: readonly string[] = [
  ...NON_TRAVELER_KEYS,
  ...ALL_TRAVELER_KEYS,
]

export const ALL_LOCATION_CHARACTER_KEYS: readonly string[] = [
  ...NON_TRAVELER_KEYS,
  'Traveler',
]

export const ALL_WEAPON_KEYS: readonly string[] = Object.keys(WEAPON_STAT_META)

export const ALL_ARTIFACT_SET_KEYS: readonly string[] = Object.keys(ART_SET_STAT_META)

export const ALL_ARTIFACT_SLOT_KEYS = [
  'flower',
  'plume',
  'sands',
  'goblet',
  'circlet',
] as const

export const ALL_MAIN_STAT_KEYS = [
  'hp',
  'hp_',
  'atk',
  'atk_',
  'def_',
  'eleMas',
  'enerRech_',
  'critRate_',
  'critDMG_',
  'physical_dmg_',
  'anemo_dmg_',
  'geo_dmg_',
  'electro_dmg_',
  'hydro_dmg_',
  'pyro_dmg_',
  'cryo_dmg_',
  'dendro_dmg_',
  'heal_',
] as const

export const ALL_SUBSTAT_KEYS = [
  'hp',
  'hp_',
  'atk',
  'atk_',
  'def',
  'def_',
  'eleMas',
  'enerRech_',
  'critRate_',
  'critDMG_',
] as const

export const ART_MAX_LEVEL: Readonly<Record<1 | 2 | 3 | 4 | 5, number>> = {
  1: 4,
  2: 4,
  3: 12,
  4: 16,
  5: 20,
}

export const ART_SLOT_MAIN_KEYS = {
  flower: ['hp'] as readonly string[],
  plume: ['atk'] as readonly string[],
  sands: ['hp_', 'def_', 'atk_', 'eleMas', 'enerRech_'] as readonly string[],
  goblet: [
    'hp_',
    'def_',
    'atk_',
    'eleMas',
    'physical_dmg_',
    'anemo_dmg_',
    'geo_dmg_',
    'electro_dmg_',
    'hydro_dmg_',
    'pyro_dmg_',
    'cryo_dmg_',
    'dendro_dmg_',
  ] as readonly string[],
  circlet: [
    'hp_',
    'def_',
    'atk_',
    'eleMas',
    'critRate_',
    'critDMG_',
    'heal_',
  ] as readonly string[],
} as const

export function charKeyToLocCharKey(charKey: string): string {
  if ((ALL_TRAVELER_KEYS as readonly string[]).includes(charKey)) {
    return 'Traveler'
  }
  return charKey
}

const TRAVELER_ELE_PREFIX: ReadonlyArray< readonly [string, string] > = [
  ['TravelerAnemo', 'anemo'],
  ['TravelerGeo', 'geo'],
  ['TravelerElectro', 'electro'],
  ['TravelerDendro', 'dendro'],
  ['TravelerHydro', 'hydro'],
  ['TravelerPyro', 'pyro'],
  ['TravelerCryo', 'cryo'],
]

export function getCharStatMeta(charKey: string): CompactCharStat | undefined {
  if (!charKey) return undefined
  if (charKey === 'Traveler') {
    return {
      ...(CHAR_STAT_META['Traveler'] ?? { ele: 'anemo', rarity: 5, weaponType: 'sword' }),
      ele: 'anemo',
    }
  }
  for (const [prefix, ele] of TRAVELER_ELE_PREFIX) {
    if (charKey.startsWith(prefix)) {
      return {
        ...(CHAR_STAT_META['Traveler'] ?? { ele, rarity: 5, weaponType: 'sword' }),
        ele,
      }
    }
  }
  return CHAR_STAT_META[charKey]
}

export function getWeaponStatMeta(
  weaponKey: string
): CompactWeaponStat | undefined {
  return WEAPON_STAT_META[weaponKey]
}

export function getArtSetStatMeta(
  setKey: string
): CompactArtSetStat | undefined {
  return ART_SET_STAT_META[setKey]
}
