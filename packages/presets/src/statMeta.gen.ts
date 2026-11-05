/**
 * Auto-generated compact character, weapon, and artifact-set metadata extracted
 * from @genshin-optimizer/gi/stats (allStat_gen.json) so @gi/presets and @gi/good
 * never bundle the 2.4 MB skillParam tables into page chunks.
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

export const CHAR_STAT_META: Readonly<Record<string, CompactCharStat>> = {
  "KamisatoAyaka": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Jean": {
    "ele": "anemo",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Traveler": {
    "ele": "anemo",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Lisa": {
    "ele": "electro",
    "rarity": 4,
    "weaponType": "catalyst"
  },
  "Barbara": {
    "ele": "hydro",
    "rarity": 4,
    "weaponType": "catalyst"
  },
  "Kaeya": {
    "ele": "cryo",
    "rarity": 4,
    "weaponType": "sword"
  },
  "Diluc": {
    "ele": "pyro",
    "rarity": 5,
    "weaponType": "claymore"
  },
  "Razor": {
    "ele": "electro",
    "rarity": 4,
    "weaponType": "claymore"
  },
  "Amber": {
    "ele": "pyro",
    "rarity": 4,
    "weaponType": "bow"
  },
  "Venti": {
    "ele": "anemo",
    "rarity": 5,
    "weaponType": "bow"
  },
  "Xiangling": {
    "ele": "pyro",
    "rarity": 4,
    "weaponType": "polearm"
  },
  "Beidou": {
    "ele": "electro",
    "rarity": 4,
    "weaponType": "claymore"
  },
  "Xingqiu": {
    "ele": "hydro",
    "rarity": 4,
    "weaponType": "sword"
  },
  "Xiao": {
    "ele": "anemo",
    "rarity": 5,
    "weaponType": "polearm"
  },
  "Ningguang": {
    "ele": "geo",
    "rarity": 4,
    "weaponType": "catalyst"
  },
  "Klee": {
    "ele": "pyro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Zhongli": {
    "ele": "geo",
    "rarity": 5,
    "weaponType": "polearm"
  },
  "Fischl": {
    "ele": "electro",
    "rarity": 4,
    "weaponType": "bow"
  },
  "Bennett": {
    "ele": "pyro",
    "rarity": 4,
    "weaponType": "sword"
  },
  "Tartaglia": {
    "ele": "hydro",
    "rarity": 5,
    "weaponType": "bow"
  },
  "Noelle": {
    "ele": "geo",
    "rarity": 4,
    "weaponType": "claymore"
  },
  "Qiqi": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Chongyun": {
    "ele": "cryo",
    "rarity": 4,
    "weaponType": "claymore"
  },
  "Ganyu": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "bow"
  },
  "Albedo": {
    "ele": "geo",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Diona": {
    "ele": "cryo",
    "rarity": 4,
    "weaponType": "bow"
  },
  "Mona": {
    "ele": "hydro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Keqing": {
    "ele": "electro",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Sucrose": {
    "ele": "anemo",
    "rarity": 4,
    "weaponType": "catalyst"
  },
  "Xinyan": {
    "ele": "pyro",
    "rarity": 4,
    "weaponType": "claymore"
  },
  "Rosaria": {
    "ele": "cryo",
    "rarity": 4,
    "weaponType": "polearm"
  },
  "HuTao": {
    "ele": "pyro",
    "rarity": 5,
    "weaponType": "polearm"
  },
  "KaedeharaKazuha": {
    "ele": "anemo",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Yanfei": {
    "ele": "pyro",
    "rarity": 4,
    "weaponType": "catalyst"
  },
  "Yoimiya": {
    "ele": "pyro",
    "rarity": 5,
    "weaponType": "bow"
  },
  "Thoma": {
    "ele": "pyro",
    "rarity": 4,
    "weaponType": "polearm"
  },
  "Eula": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "claymore"
  },
  "RaidenShogun": {
    "ele": "electro",
    "rarity": 5,
    "weaponType": "polearm"
  },
  "Sayu": {
    "ele": "anemo",
    "rarity": 4,
    "weaponType": "claymore"
  },
  "SangonomiyaKokomi": {
    "ele": "hydro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Gorou": {
    "ele": "geo",
    "rarity": 4,
    "weaponType": "bow"
  },
  "KujouSara": {
    "ele": "electro",
    "rarity": 4,
    "weaponType": "bow"
  },
  "AratakiItto": {
    "ele": "geo",
    "rarity": 5,
    "weaponType": "claymore"
  },
  "YaeMiko": {
    "ele": "electro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "ShikanoinHeizou": {
    "ele": "anemo",
    "rarity": 4,
    "weaponType": "catalyst"
  },
  "Yelan": {
    "ele": "hydro",
    "rarity": 5,
    "weaponType": "bow"
  },
  "Kirara": {
    "ele": "dendro",
    "rarity": 4,
    "weaponType": "sword"
  },
  "Aloy": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "bow"
  },
  "Shenhe": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "polearm"
  },
  "YunJin": {
    "ele": "geo",
    "rarity": 4,
    "weaponType": "polearm"
  },
  "KukiShinobu": {
    "ele": "electro",
    "rarity": 4,
    "weaponType": "sword"
  },
  "KamisatoAyato": {
    "ele": "hydro",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Collei": {
    "ele": "dendro",
    "rarity": 4,
    "weaponType": "bow"
  },
  "Dori": {
    "ele": "electro",
    "rarity": 4,
    "weaponType": "claymore"
  },
  "Tighnari": {
    "ele": "dendro",
    "rarity": 5,
    "weaponType": "bow"
  },
  "Nilou": {
    "ele": "hydro",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Cyno": {
    "ele": "electro",
    "rarity": 5,
    "weaponType": "polearm"
  },
  "Candace": {
    "ele": "hydro",
    "rarity": 4,
    "weaponType": "polearm"
  },
  "Nahida": {
    "ele": "dendro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Layla": {
    "ele": "cryo",
    "rarity": 4,
    "weaponType": "sword"
  },
  "Wanderer": {
    "ele": "anemo",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Faruzan": {
    "ele": "anemo",
    "rarity": 4,
    "weaponType": "bow"
  },
  "Yaoyao": {
    "ele": "dendro",
    "rarity": 4,
    "weaponType": "polearm"
  },
  "Alhaitham": {
    "ele": "dendro",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Dehya": {
    "ele": "pyro",
    "rarity": 5,
    "weaponType": "claymore"
  },
  "Mika": {
    "ele": "cryo",
    "rarity": 4,
    "weaponType": "polearm"
  },
  "Kaveh": {
    "ele": "dendro",
    "rarity": 4,
    "weaponType": "claymore"
  },
  "Baizhu": {
    "ele": "dendro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Lynette": {
    "ele": "anemo",
    "rarity": 4,
    "weaponType": "sword"
  },
  "Lyney": {
    "ele": "pyro",
    "rarity": 5,
    "weaponType": "bow"
  },
  "Freminet": {
    "ele": "cryo",
    "rarity": 4,
    "weaponType": "claymore"
  },
  "Wriothesley": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Neuvillette": {
    "ele": "hydro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Charlotte": {
    "ele": "cryo",
    "rarity": 4,
    "weaponType": "catalyst"
  },
  "Furina": {
    "ele": "hydro",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Chevreuse": {
    "ele": "pyro",
    "rarity": 4,
    "weaponType": "polearm"
  },
  "Navia": {
    "ele": "geo",
    "rarity": 5,
    "weaponType": "claymore"
  },
  "Gaming": {
    "ele": "pyro",
    "rarity": 4,
    "weaponType": "claymore"
  },
  "Xianyun": {
    "ele": "anemo",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Chiori": {
    "ele": "geo",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Sigewinne": {
    "ele": "hydro",
    "rarity": 5,
    "weaponType": "bow"
  },
  "Arlecchino": {
    "ele": "pyro",
    "rarity": 5,
    "weaponType": "polearm"
  },
  "Sethos": {
    "ele": "electro",
    "rarity": 4,
    "weaponType": "bow"
  },
  "Clorinde": {
    "ele": "electro",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Emilie": {
    "ele": "dendro",
    "rarity": 5,
    "weaponType": "polearm"
  },
  "Kachina": {
    "ele": "geo",
    "rarity": 4,
    "weaponType": "polearm"
  },
  "Kinich": {
    "ele": "dendro",
    "rarity": 5,
    "weaponType": "claymore"
  },
  "Mualani": {
    "ele": "hydro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Xilonen": {
    "ele": "geo",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Chasca": {
    "ele": "anemo",
    "rarity": 5,
    "weaponType": "bow"
  },
  "Ororon": {
    "ele": "electro",
    "rarity": 4,
    "weaponType": "bow"
  },
  "Mavuika": {
    "ele": "pyro",
    "rarity": 5,
    "weaponType": "claymore"
  },
  "Citlali": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "LanYan": {
    "ele": "anemo",
    "rarity": 4,
    "weaponType": "catalyst"
  },
  "YumemizukiMizuki": {
    "ele": "anemo",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Iansan": {
    "ele": "electro",
    "rarity": 4,
    "weaponType": "polearm"
  },
  "Varesa": {
    "ele": "electro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Escoffier": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "polearm"
  },
  "Ifa": {
    "ele": "anemo",
    "rarity": 4,
    "weaponType": "catalyst"
  },
  "Skirk": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Dahlia": {
    "ele": "hydro",
    "rarity": 4,
    "weaponType": "sword"
  },
  "Ineffa": {
    "ele": "electro",
    "rarity": 5,
    "weaponType": "polearm"
  },
  "Lauma": {
    "ele": "dendro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Flins": {
    "ele": "electro",
    "rarity": 5,
    "weaponType": "polearm"
  },
  "Aino": {
    "ele": "hydro",
    "rarity": 4,
    "weaponType": "claymore"
  },
  "Nefer": {
    "ele": "dendro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Durin": {
    "ele": "pyro",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Jahoda": {
    "ele": "anemo",
    "rarity": 4,
    "weaponType": "bow"
  },
  "Columbina": {
    "ele": "hydro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Zibai": {
    "ele": "geo",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Illuga": {
    "ele": "geo",
    "rarity": 4,
    "weaponType": "polearm"
  },
  "Varka": {
    "ele": "anemo",
    "rarity": 5,
    "weaponType": "claymore"
  },
  "Lohen": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "polearm"
  },
  "Linnea": {
    "ele": "geo",
    "rarity": 5,
    "weaponType": "bow"
  },
  "Nicole": {
    "ele": "pyro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Prune": {
    "ele": "anemo",
    "rarity": 4,
    "weaponType": "catalyst"
  },
  "Sandrone": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "claymore"
  },
  "Vodyanitsa": {
    "ele": "hydro",
    "rarity": 5,
    "weaponType": "catalyst"
  },
  "Vesna": {
    "ele": "anemo",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Alyosha": {
    "ele": "electro",
    "rarity": 4,
    "weaponType": "polearm"
  },
  "Odette": {
    "ele": "cryo",
    "rarity": 5,
    "weaponType": "sword"
  },
  "Somnia": {
    "ele": "electro",
    "rarity": 5,
    "weaponType": "catalyst"
  }
}

export const WEAPON_STAT_META: Readonly<Record<string, CompactWeaponStat>> = {
  "DullBlade": {
    "weaponType": "sword",
    "rarity": 1
  },
  "SilverSword": {
    "weaponType": "sword",
    "rarity": 2
  },
  "CoolSteel": {
    "weaponType": "sword",
    "rarity": 3
  },
  "HarbingerOfDawn": {
    "weaponType": "sword",
    "rarity": 3
  },
  "TravelersHandySword": {
    "weaponType": "sword",
    "rarity": 3
  },
  "DarkIronSword": {
    "weaponType": "sword",
    "rarity": 3
  },
  "FilletBlade": {
    "weaponType": "sword",
    "rarity": 3
  },
  "SkyriderSword": {
    "weaponType": "sword",
    "rarity": 3
  },
  "FavoniusSword": {
    "weaponType": "sword",
    "rarity": 4
  },
  "TheFlute": {
    "weaponType": "sword",
    "rarity": 4
  },
  "SacrificialSword": {
    "weaponType": "sword",
    "rarity": 4
  },
  "RoyalLongsword": {
    "weaponType": "sword",
    "rarity": 4
  },
  "LionsRoar": {
    "weaponType": "sword",
    "rarity": 4
  },
  "PrototypeRancour": {
    "weaponType": "sword",
    "rarity": 4
  },
  "IronSting": {
    "weaponType": "sword",
    "rarity": 4
  },
  "BlackcliffLongsword": {
    "weaponType": "sword",
    "rarity": 4
  },
  "TheBlackSword": {
    "weaponType": "sword",
    "rarity": 4
  },
  "TheAlleyFlash": {
    "weaponType": "sword",
    "rarity": 4
  },
  "SwordOfDescension": {
    "weaponType": "sword",
    "rarity": 4
  },
  "FesteringDesire": {
    "weaponType": "sword",
    "rarity": 4
  },
  "AmenomaKageuchi": {
    "weaponType": "sword",
    "rarity": 4
  },
  "CinnabarSpindle": {
    "weaponType": "sword",
    "rarity": 4
  },
  "KagotsurubeIsshin": {
    "weaponType": "sword",
    "rarity": 4
  },
  "SapwoodBlade": {
    "weaponType": "sword",
    "rarity": 4
  },
  "XiphosMoonlight": {
    "weaponType": "sword",
    "rarity": 4
  },
  "ToukabouShigure": {
    "weaponType": "sword",
    "rarity": 4
  },
  "WolfFang": {
    "weaponType": "sword",
    "rarity": 4
  },
  "FinaleOfTheDeep": {
    "weaponType": "sword",
    "rarity": 4
  },
  "FleuveCendreFerryman": {
    "weaponType": "sword",
    "rarity": 4
  },
  "TheDockhandsAssistant": {
    "weaponType": "sword",
    "rarity": 4
  },
  "SwordOfNarzissenkreuz": {
    "weaponType": "sword",
    "rarity": 4
  },
  "SturdyBone": {
    "weaponType": "sword",
    "rarity": 4
  },
  "FluteOfEzpitzal": {
    "weaponType": "sword",
    "rarity": 4
  },
  "CalamityOfEshu": {
    "weaponType": "sword",
    "rarity": 4
  },
  "SerenitysCall": {
    "weaponType": "sword",
    "rarity": 4
  },
  "MoonweaversDawn": {
    "weaponType": "sword",
    "rarity": 4
  },
  "HereticsMoltenBlade": {
    "weaponType": "sword",
    "rarity": 4
  },
  "Emberwell": {
    "weaponType": "sword",
    "rarity": 4
  },
  "NewBough": {
    "weaponType": "sword",
    "rarity": 4
  },
  "SilverLight": {
    "weaponType": "sword",
    "rarity": 4
  },
  "AquilaFavonia": {
    "weaponType": "sword",
    "rarity": 5
  },
  "SkywardBlade": {
    "weaponType": "sword",
    "rarity": 5
  },
  "FreedomSworn": {
    "weaponType": "sword",
    "rarity": 5
  },
  "SummitShaper": {
    "weaponType": "sword",
    "rarity": 5
  },
  "PrimordialJadeCutter": {
    "weaponType": "sword",
    "rarity": 5
  },
  "MistsplitterReforged": {
    "weaponType": "sword",
    "rarity": 5
  },
  "HaranGeppakuFutsu": {
    "weaponType": "sword",
    "rarity": 5
  },
  "KeyOfKhajNisut": {
    "weaponType": "sword",
    "rarity": 5
  },
  "LightOfFoliarIncision": {
    "weaponType": "sword",
    "rarity": 5
  },
  "SplendorOfTranquilWaters": {
    "weaponType": "sword",
    "rarity": 5
  },
  "UrakuMisugiri": {
    "weaponType": "sword",
    "rarity": 5
  },
  "Absolution": {
    "weaponType": "sword",
    "rarity": 5
  },
  "PeakPatrolSong": {
    "weaponType": "sword",
    "rarity": 5
  },
  "Azurelight": {
    "weaponType": "sword",
    "rarity": 5
  },
  "AthameArtis": {
    "weaponType": "sword",
    "rarity": 5
  },
  "LightbearingMoonshard": {
    "weaponType": "sword",
    "rarity": 5
  },
  "WhitelakeFrostfeather": {
    "weaponType": "sword",
    "rarity": 5
  },
  "ExaiphanesBlade": {
    "weaponType": "sword",
    "rarity": 5
  },
  "BeyondTheChrysalis": {
    "weaponType": "sword",
    "rarity": 5
  },
  "WasterGreatsword": {
    "weaponType": "claymore",
    "rarity": 1
  },
  "OldMercsPal": {
    "weaponType": "claymore",
    "rarity": 2
  },
  "FerrousShadow": {
    "weaponType": "claymore",
    "rarity": 3
  },
  "BloodtaintedGreatsword": {
    "weaponType": "claymore",
    "rarity": 3
  },
  "WhiteIronGreatsword": {
    "weaponType": "claymore",
    "rarity": 3
  },
  "DebateClub": {
    "weaponType": "claymore",
    "rarity": 3
  },
  "SkyriderGreatsword": {
    "weaponType": "claymore",
    "rarity": 3
  },
  "FavoniusGreatsword": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "TheBell": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "SacrificialGreatsword": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "RoyalGreatsword": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "Rainslasher": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "PrototypeArchaic": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "Whiteblind": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "BlackcliffSlasher": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "SerpentSpine": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "LithicBlade": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "SnowTombedStarsilver": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "LuxuriousSeaLord": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "KatsuragikiriNagamasa": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "MakhairaAquamarine": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "Akuoumaru": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "ForestRegalia": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "MailedFlower": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "TalkingStick": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "TidalShadow": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "UltimateOverlordsMegaMagicSword": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "PortablePowerSaw": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "FruitfulHook": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "EarthShaker": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "FlameForgedInsight": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "MasterKey": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "ForgedByTheGoldenMelody": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "BladeOfAtonement": {
    "weaponType": "claymore",
    "rarity": 4
  },
  "SkywardPride": {
    "weaponType": "claymore",
    "rarity": 5
  },
  "WolfsGravestone": {
    "weaponType": "claymore",
    "rarity": 5
  },
  "SongOfBrokenPines": {
    "weaponType": "claymore",
    "rarity": 5
  },
  "TheUnforged": {
    "weaponType": "claymore",
    "rarity": 5
  },
  "RedhornStonethresher": {
    "weaponType": "claymore",
    "rarity": 5
  },
  "BeaconOfTheReedSea": {
    "weaponType": "claymore",
    "rarity": 5
  },
  "Verdict": {
    "weaponType": "claymore",
    "rarity": 5
  },
  "FangOfTheMountainKing": {
    "weaponType": "claymore",
    "rarity": 5
  },
  "AThousandBlazingSuns": {
    "weaponType": "claymore",
    "rarity": 5
  },
  "GestOfTheMightyWolf": {
    "weaponType": "claymore",
    "rarity": 5
  },
  "ATeaspoonOfTranscendence": {
    "weaponType": "claymore",
    "rarity": 5
  },
  "BeginnersProtector": {
    "weaponType": "polearm",
    "rarity": 1
  },
  "IronPoint": {
    "weaponType": "polearm",
    "rarity": 2
  },
  "WhiteTassel": {
    "weaponType": "polearm",
    "rarity": 3
  },
  "Halberd": {
    "weaponType": "polearm",
    "rarity": 3
  },
  "BlackTassel": {
    "weaponType": "polearm",
    "rarity": 3
  },
  "DragonsBane": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "PrototypeStarglitter": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "CrescentPike": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "BlackcliffPole": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "Deathmatch": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "LithicSpear": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "FavoniusLance": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "RoyalSpear": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "DragonspineSpear": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "KitainCrossSpear": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "TheCatch": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "WavebreakersFin": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "Moonpiercer": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "MissiveWindspear": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "BalladOfTheFjords": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "RightfulReward": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "DialoguesOfTheDesertSages": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "ProspectorsDrill": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "MountainBracingBolt": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "FootprintOfTheRainbow": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "TamayurateiNoOhanashi": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "ProspectorsShovel": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "SacrificersStaff": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "Frostbreath": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "SongOfTheVigil": {
    "weaponType": "polearm",
    "rarity": 4
  },
  "StaffOfHoma": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "SkywardSpine": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "VortexVanquisher": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "PrimordialJadeWingedSpear": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "CalamityQueller": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "EngulfingLightning": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "StaffOfTheScarletSands": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "CrimsonMoonsSemblance": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "LumidouceElegy": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "SymphonistOfScents": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "FracturedHalo": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "BloodsoakedRuins": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "DisasterAndRemorse": {
    "weaponType": "polearm",
    "rarity": 5
  },
  "ApprenticesNotes": {
    "weaponType": "catalyst",
    "rarity": 1
  },
  "PocketGrimoire": {
    "weaponType": "catalyst",
    "rarity": 2
  },
  "MagicGuide": {
    "weaponType": "catalyst",
    "rarity": 3
  },
  "ThrillingTalesOfDragonSlayers": {
    "weaponType": "catalyst",
    "rarity": 3
  },
  "OtherworldlyStory": {
    "weaponType": "catalyst",
    "rarity": 3
  },
  "EmeraldOrb": {
    "weaponType": "catalyst",
    "rarity": 3
  },
  "TwinNephrite": {
    "weaponType": "catalyst",
    "rarity": 3
  },
  "FavoniusCodex": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "TheWidsith": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "SacrificialFragments": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "RoyalGrimoire": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "SolarPearl": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "PrototypeAmber": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "MappaMare": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "BlackcliffAgate": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "EyeOfPerception": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "WineAndSong": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "Frostbearer": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "DodocoTales": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "HakushinRing": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "OathswornEye": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "WanderingEvenstar": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "FruitOfFulfillment": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "SacrificialJade": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "FlowingPurity": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "BalladOfTheBoundlessBlue": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "AshGravenDrinkingHorn": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "WaveridingWhirl": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "RingOfYaxche": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "EtherlightSpindlelute": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "BlackmarrowLantern": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "DawningFrost": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "ClashOfKings": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "EchoesOfTheHeart": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "WintersHeavyHeart": {
    "weaponType": "catalyst",
    "rarity": 4
  },
  "SkywardAtlas": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "LostPrayerToTheSacredWinds": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "MemoryOfDust": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "JadefallsSplendor": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "EverlastingMoonglow": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "KagurasVerity": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "AThousandFloatingDreams": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "TulaytullahsRemembrance": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "CashflowSupervision": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "TomeOfTheEternalFlow": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "CranesEchoingCall": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "SurfsUp": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "StarcallersWatch": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "SunnyMorningSleepIn": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "VividNotions": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "NightweaversLookingGlass": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "ReliquaryOfTruth": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "NocturnesCurtainCall": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "AngelosHeptades": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "HymnOfTheMaelstrom": {
    "weaponType": "catalyst",
    "rarity": 5
  },
  "HuntersBow": {
    "weaponType": "bow",
    "rarity": 1
  },
  "SeasonedHuntersBow": {
    "weaponType": "bow",
    "rarity": 2
  },
  "RavenBow": {
    "weaponType": "bow",
    "rarity": 3
  },
  "SharpshootersOath": {
    "weaponType": "bow",
    "rarity": 3
  },
  "RecurveBow": {
    "weaponType": "bow",
    "rarity": 3
  },
  "Slingshot": {
    "weaponType": "bow",
    "rarity": 3
  },
  "Messenger": {
    "weaponType": "bow",
    "rarity": 3
  },
  "FavoniusWarbow": {
    "weaponType": "bow",
    "rarity": 4
  },
  "TheStringless": {
    "weaponType": "bow",
    "rarity": 4
  },
  "SacrificialBow": {
    "weaponType": "bow",
    "rarity": 4
  },
  "RoyalBow": {
    "weaponType": "bow",
    "rarity": 4
  },
  "Rust": {
    "weaponType": "bow",
    "rarity": 4
  },
  "PrototypeCrescent": {
    "weaponType": "bow",
    "rarity": 4
  },
  "CompoundBow": {
    "weaponType": "bow",
    "rarity": 4
  },
  "BlackcliffWarbow": {
    "weaponType": "bow",
    "rarity": 4
  },
  "TheViridescentHunt": {
    "weaponType": "bow",
    "rarity": 4
  },
  "AlleyHunter": {
    "weaponType": "bow",
    "rarity": 4
  },
  "FadingTwilight": {
    "weaponType": "bow",
    "rarity": 4
  },
  "MitternachtsWaltz": {
    "weaponType": "bow",
    "rarity": 4
  },
  "WindblumeOde": {
    "weaponType": "bow",
    "rarity": 4
  },
  "Hamayumi": {
    "weaponType": "bow",
    "rarity": 4
  },
  "Predator": {
    "weaponType": "bow",
    "rarity": 4
  },
  "MouunsMoon": {
    "weaponType": "bow",
    "rarity": 4
  },
  "KingsSquire": {
    "weaponType": "bow",
    "rarity": 4
  },
  "EndOfTheLine": {
    "weaponType": "bow",
    "rarity": 4
  },
  "IbisPiercer": {
    "weaponType": "bow",
    "rarity": 4
  },
  "ScionOfTheBlazingSun": {
    "weaponType": "bow",
    "rarity": 4
  },
  "SongOfStillness": {
    "weaponType": "bow",
    "rarity": 4
  },
  "Cloudforged": {
    "weaponType": "bow",
    "rarity": 4
  },
  "RangeGauge": {
    "weaponType": "bow",
    "rarity": 4
  },
  "FlowerWreathedFeathers": {
    "weaponType": "bow",
    "rarity": 4
  },
  "ChainBreaker": {
    "weaponType": "bow",
    "rarity": 4
  },
  "SequenceOfSolitude": {
    "weaponType": "bow",
    "rarity": 4
  },
  "SnareHook": {
    "weaponType": "bow",
    "rarity": 4
  },
  "RainbowSerpentsRainBow": {
    "weaponType": "bow",
    "rarity": 4
  },
  "JadeVista": {
    "weaponType": "bow",
    "rarity": 4
  },
  "CovenantOfFrostAndSnow": {
    "weaponType": "bow",
    "rarity": 4
  },
  "BreezeborneRefrain": {
    "weaponType": "bow",
    "rarity": 4
  },
  "SkywardHarp": {
    "weaponType": "bow",
    "rarity": 5
  },
  "AmosBow": {
    "weaponType": "bow",
    "rarity": 5
  },
  "ElegyForTheEnd": {
    "weaponType": "bow",
    "rarity": 5
  },
  "PolarStar": {
    "weaponType": "bow",
    "rarity": 5
  },
  "AquaSimulacra": {
    "weaponType": "bow",
    "rarity": 5
  },
  "ThunderingPulse": {
    "weaponType": "bow",
    "rarity": 5
  },
  "HuntersPath": {
    "weaponType": "bow",
    "rarity": 5
  },
  "TheFirstGreatMagic": {
    "weaponType": "bow",
    "rarity": 5
  },
  "SilvershowerHeartstrings": {
    "weaponType": "bow",
    "rarity": 5
  },
  "AstralVulturesCrimsonPlumage": {
    "weaponType": "bow",
    "rarity": 5
  },
  "TheDaybreakChronicles": {
    "weaponType": "bow",
    "rarity": 5
  },
  "GoldenFrostboundOath": {
    "weaponType": "bow",
    "rarity": 5
  },
  "QuantumCatalyst": {
    "weaponType": "catalyst",
    "rarity": 5
  }
}

export const ART_SET_STAT_META: Readonly<Record<string, CompactArtSetStat>> = {
  "ResolutionOfSojourner": {
    "rarities": [
      3,
      4
    ]
  },
  "BraveHeart": {
    "rarities": [
      3,
      4
    ]
  },
  "DefendersWill": {
    "rarities": [
      3,
      4
    ]
  },
  "TinyMiracle": {
    "rarities": [
      3,
      4
    ]
  },
  "Berserker": {
    "rarities": [
      3,
      4
    ]
  },
  "MartialArtist": {
    "rarities": [
      3,
      4
    ]
  },
  "Instructor": {
    "rarities": [
      3,
      4
    ]
  },
  "Gambler": {
    "rarities": [
      3,
      4
    ]
  },
  "TheExile": {
    "rarities": [
      3,
      4
    ]
  },
  "Adventurer": {
    "rarities": [
      1,
      2,
      3
    ]
  },
  "LuckyDog": {
    "rarities": [
      1,
      2,
      3
    ]
  },
  "Scholar": {
    "rarities": [
      3,
      4
    ]
  },
  "TravelingDoctor": {
    "rarities": [
      1,
      2,
      3
    ]
  },
  "BlizzardStrayer": {
    "rarities": [
      4,
      5
    ]
  },
  "Thundersoother": {
    "rarities": [
      4,
      5
    ]
  },
  "Lavawalker": {
    "rarities": [
      4,
      5
    ]
  },
  "MaidenBeloved": {
    "rarities": [
      4,
      5
    ]
  },
  "GladiatorsFinale": {
    "rarities": [
      4,
      5
    ]
  },
  "ViridescentVenerer": {
    "rarities": [
      4,
      5
    ]
  },
  "WanderersTroupe": {
    "rarities": [
      4,
      5
    ]
  },
  "ThunderingFury": {
    "rarities": [
      4,
      5
    ]
  },
  "CrimsonWitchOfFlames": {
    "rarities": [
      4,
      5
    ]
  },
  "NoblesseOblige": {
    "rarities": [
      4,
      5
    ]
  },
  "BloodstainedChivalry": {
    "rarities": [
      4,
      5
    ]
  },
  "PrayersForIllumination": {
    "rarities": [
      3,
      4
    ]
  },
  "PrayersForDestiny": {
    "rarities": [
      3,
      4
    ]
  },
  "PrayersForWisdom": {
    "rarities": [
      3,
      4
    ]
  },
  "PrayersToSpringtime": {
    "rarities": [
      3,
      4
    ]
  },
  "ArchaicPetra": {
    "rarities": [
      4,
      5
    ]
  },
  "RetracingBolide": {
    "rarities": [
      4,
      5
    ]
  },
  "HeartOfDepth": {
    "rarities": [
      4,
      5
    ]
  },
  "TenacityOfTheMillelith": {
    "rarities": [
      4,
      5
    ]
  },
  "PaleFlame": {
    "rarities": [
      4,
      5
    ]
  },
  "ShimenawasReminiscence": {
    "rarities": [
      4,
      5
    ]
  },
  "EmblemOfSeveredFate": {
    "rarities": [
      4,
      5
    ]
  },
  "HuskOfOpulentDreams": {
    "rarities": [
      4,
      5
    ]
  },
  "OceanHuedClam": {
    "rarities": [
      4,
      5
    ]
  },
  "VermillionHereafter": {
    "rarities": [
      4,
      5
    ]
  },
  "EchoesOfAnOffering": {
    "rarities": [
      4,
      5
    ]
  },
  "DeepwoodMemories": {
    "rarities": [
      4,
      5
    ]
  },
  "GildedDreams": {
    "rarities": [
      4,
      5
    ]
  },
  "DesertPavilionChronicle": {
    "rarities": [
      4,
      5
    ]
  },
  "FlowerOfParadiseLost": {
    "rarities": [
      4,
      5
    ]
  },
  "NymphsDream": {
    "rarities": [
      4,
      5
    ]
  },
  "VourukashasGlow": {
    "rarities": [
      4,
      5
    ]
  },
  "MarechausseeHunter": {
    "rarities": [
      4,
      5
    ]
  },
  "GoldenTroupe": {
    "rarities": [
      4,
      5
    ]
  },
  "SongOfDaysPast": {
    "rarities": [
      4,
      5
    ]
  },
  "NighttimeWhispersInTheEchoingWoods": {
    "rarities": [
      4,
      5
    ]
  },
  "FragmentOfHarmonicWhimsy": {
    "rarities": [
      4,
      5
    ]
  },
  "UnfinishedReverie": {
    "rarities": [
      4,
      5
    ]
  },
  "ScrollOfTheHeroOfCinderCity": {
    "rarities": [
      4,
      5
    ]
  },
  "ObsidianCodex": {
    "rarities": [
      4,
      5
    ]
  },
  "LongNightsOath": {
    "rarities": [
      4,
      5
    ]
  },
  "FinaleOfTheDeepGalleries": {
    "rarities": [
      4,
      5
    ]
  },
  "NightOfTheSkysUnveiling": {
    "rarities": [
      4,
      5
    ]
  },
  "SilkenMoonsSerenade": {
    "rarities": [
      4,
      5
    ]
  },
  "AubadeOfMorningstarAndMoon": {
    "rarities": [
      4,
      5
    ]
  },
  "ADayCarvedFromRisingWinds": {
    "rarities": [
      4,
      5
    ]
  },
  "CelestialGift": {
    "rarities": [
      4,
      5
    ]
  },
  "DisenchantmentInDeepShadow": {
    "rarities": [
      4,
      5
    ]
  },
  "ScarletProof": {
    "rarities": [
      4,
      5
    ]
  },
  "HeartOfTheFurnace": {
    "rarities": [
      4,
      5
    ]
  }
}

export function getCharStatMeta(charKey: string): CompactCharStat | undefined {
  if (!charKey) return undefined
  if (charKey === 'Traveler' || charKey.startsWith('TravelerAnemo')) {
    return {
      ...(CHAR_STAT_META['TravelerAnemo'] ?? {
        ele: 'anemo',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'anemo',
    }
  }
  if (charKey.startsWith('TravelerGeo')) {
    return {
      ...(CHAR_STAT_META['TravelerGeo'] ?? {
        ele: 'geo',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'geo',
    }
  }
  if (charKey.startsWith('TravelerElectro')) {
    return {
      ...(CHAR_STAT_META['TravelerElectro'] ?? {
        ele: 'electro',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'electro',
    }
  }
  if (charKey.startsWith('TravelerDendro')) {
    return {
      ...(CHAR_STAT_META['TravelerDendro'] ?? {
        ele: 'dendro',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'dendro',
    }
  }
  if (charKey.startsWith('TravelerHydro')) {
    return {
      ...(CHAR_STAT_META['TravelerHydro'] ?? {
        ele: 'hydro',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'hydro',
    }
  }
  if (charKey.startsWith('TravelerPyro')) {
    return {
      ...(CHAR_STAT_META['TravelerPyro'] ?? {
        ele: 'pyro',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'pyro',
    }
  }
  if (charKey.startsWith('TravelerCryo')) {
    return {
      ...(CHAR_STAT_META['TravelerCryo'] ?? {
        ele: 'cryo',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'cryo',
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
