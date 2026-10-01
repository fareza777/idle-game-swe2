#!/usr/bin/env python3
"""Duskspire Idle — data generator.

Emits all game content as JSON into web/data/. The engine is fully
data-driven: adding a monster/item/zone/quest is a data change only.

Run:  python3 tools/generate_data.py
"""
import json, math, os, random, re

random.seed(42)
OUT = os.path.join(os.path.dirname(__file__), "..", "web", "data")
os.makedirs(OUT, exist_ok=True)


def dump(name, obj):
    p = os.path.join(OUT, name)
    with open(p, "w") as f:
        json.dump(obj, f, separators=(",", ":"))
    n = len(obj) if isinstance(obj, (list, dict)) else 1
    print(f"  {name:22s} {n:>4} entries")


# ---------------------------------------------------------------- skills
SKILLS = [
    # id, name, category, color, blurb, links
    ("attack",     "Attack",     "combat",    "#e05555", "Melee accuracy and weapon finesse.", ["defence","strength"]),
    ("strength",   "Strength",   "combat",    "#e08a45", "Raw melee power — raises max hit.", ["attack"]),
    ("defence",    "Defence",    "combat",    "#7a8ae0", "Damage mitigation and resilience.", ["vitality"]),
    ("vitality",   "Vitality",   "combat",    "#e05a7a", "Health and life force.", ["defence"]),
    ("ranged",     "Ranged",     "combat",    "#8ac055", "Bows, crossbows and thrown weapons.", ["fletching"]),
    ("magic",      "Magic",      "combat",    "#5ab8e0", "Elemental spellcraft fuelled by runes.", ["runecrafting"]),
    ("devotion",   "Devotion",   "combat",    "#e0c45a", "Prayer power from bones and relics.", []),
    ("mining",     "Mining",     "gathering", "#b08d6a", "Dig ore and gems from the deep.", ["smithing"]),
    ("woodcutting","Woodcutting","gathering", "#6aa05a", "Fell timber for bows and builds.", ["fletching","engineering"]),
    ("fishing",    "Fishing",    "gathering", "#5a9fd0", "Catch fish for the cookpot.", ["cooking"]),
    ("farming",    "Farming",    "gathering", "#a2c04e", "Grow herbs and crops.", ["alchemy","cooking"]),
    ("hunting",    "Hunting",    "gathering", "#c07a4e", "Trap beasts for hides and meat.", ["crafting","cooking"]),
    ("divination", "Divination", "gathering", "#a06ad0", "Harvest wisps and raw essence.", ["runecrafting"]),
    ("thieving",   "Thieving",   "gathering", "#d0b060", "Pick pockets, locks and caches.", []),
    ("smithing",   "Smithing",   "artisan",   "#c9c9c9", "Smelt bars; forge weapons and armour.", ["mining"]),
    ("cooking",    "Cooking",    "artisan",   "#e08a5a", "Prepare meals that restore health.", ["fishing","farming","hunting"]),
    ("alchemy",    "Alchemy",    "artisan",   "#8ae0b0", "Brew potions, transmute matter.", ["farming","divination"]),
    ("crafting",   "Crafting",   "artisan",   "#d0a0c0", "Leatherwork, gems and jewellery.", ["hunting","thieving","mining"]),
    ("fletching",  "Fletching",  "artisan",   "#b0c060", "Shape bows, bolts and staves.", ["woodcutting","ranged"]),
    ("runecrafting","Runecrafting","artisan", "#6a7ae0", "Bind essence into spell runes.", ["divination","magic"]),
    ("engineering","Engineering","artisan",   "#90a0b0", "Traps, gadgets and tool frames.", ["woodcutting","smithing"]),
]

# ---------------------------------------------------------------- rarities (25)
RARITY_DEFS = [
    ("common",      "Common",      "#9aa5b1"),
    ("uncommon",    "Uncommon",    "#7cb368"),
    ("superior",    "Superior",    "#4fbf67"),
    ("rare",        "Rare",        "#3fa9d0"),
    ("fine",        "Fine",        "#3d8fd9"),
    ("epic",        "Epic",        "#7a5fd0"),
    ("heroic",      "Heroic",      "#9a5fe0"),
    ("fabled",      "Fabled",      "#b45fd8"),
    ("arcane",      "Arcane",      "#d45fc9"),
    ("legendary",   "Legendary",   "#e08a3d"),
    ("mythic",      "Mythic",      "#e05a4d"),
    ("relic",       "Relic",       "#e04d6a"),
    ("exalted",     "Exalted",     "#e04d92"),
    ("divine",      "Divine",      "#d44dd0"),
    ("celestial",   "Celestial",   "#a04de0"),
    ("primal",      "Primal",      "#7ad0a0"),
    ("eternal",     "Eternal",     "#5ad0c0"),
    ("transcendent","Transcendent","#5ac0e0"),
    ("immortal",    "Immortal",    "#5aa0f0"),
    ("cosmic",      "Cosmic",      "#8a7af0"),
    ("abyssal",     "Abyssal",     "#6a5ad0"),
    ("radiant",     "Radiant",     "#f0d060"),
    ("sovereign",   "Sovereign",   "#f0b040"),
    ("godforged",   "Godforged",   "#f08030"),
    ("omnipotent",  "Omnipotent",  "#ffffff"),
]

# ---------------------------------------------------------------- zones (21)
# name, subtitle/biome, lvl band, art seed prompt key, monster name pools
ZONES = [
    ("greenhollow",   "Greenhollow Meadows",  "sunlit fields and wildflower hills",   (1, 5),
     ["Field Rat","Wild Hare","Meadow Viper","Hedge Gnome","Thistle Boar","Dandelion Sprite","Briar Hare","Fence Lizard","Petal Imp","Grass Wolf","Clover Beetle","Mossling","Sickle Crow","Meadow Wisp"],
     [("Bramblejaw, Warren Tyrant","melee")]),
    ("pinewild",      "Pinewild Forest",      "deep pines and mossy hollows",         (5, 10),
     ["Pine Marten","Bark Beetle","Grey Wolf","Grove Sprite","Antler Stag","Sap Golem","Needle Viper","Fungal Hulk","Owl of Eyes","Timber Wolf","Root Fiend","Acorn Sprite","Fallen Branch","Wolf Spider"],
     [("Mother Elk, Crown of Antlers","melee")]),
    ("embershard",    "Embershard Quarry",    "a mine lit by smouldering crystal",    (10, 15),
     ["Pebble Imp","Quarry Bat","Ember Cobra","Crystal Slug","Dust Devil","Mine Hound","Slag Elemental","Pick Goblin","Shale Beast","Glow Worm","Iron Tick","Basalt Crab","Cinder Moth","Ore Sniffer"],
     [("Foreman Skarn, the Unpaid","melee"),("Shardmother Kryss","magic")]),
    ("mistral",       "Mistral Coast",        "salt wind, tide pools and wrecks",     (15, 20),
     ["Tide Crab","Gull Pirate","Saltscale Eel","Wreck Ghost","Brine Imp","Coral Golem","Sand Snapper","Foam Sprite","Harpooner","Mist Serpent","Driftwood Ghast","Pearl Diver","Storm Petrel","Kelp Lurker"],
     [("Captain Brinechain","ranged")]),
    ("barrowmere",    "Barrowmere Swamp",     "drowned barrows and will-o-wisps",     (20, 25),
     ["Mire Toad","Bog Witch","Sump Leech","Barrow Wight","Fen Viper","Swamp Hound","Murk Sprite","Rot Willow","Grave Picker","Sludge Golem","Marsh Drake","Wisp Shepherd","Gator Knight","Peat Hag"],
     [("The Barrow King","melee")]),
    ("sunscar",       "Sunscar Desert",       "dunes, ruins and glassed sands",       (25, 30),
     ["Dune Jackal","Sand Wasp","Glass Scorpion","Sirocco Djinn","Sunbleached Bones","Dust Mummy","Mirage Fox","Cactus Fiend","Ruin Bandit","Scarab Swarm","Viper Priest","Desert Drake","Oasis Mimic","Sand Burrower"],
     [("Sethra, Queen of Glass","magic"),("Ishka the Mirage","ranged")]),
    ("frostfang",     "Frostfang Tundra",     "whiteout snows and blue ice caves",    (30, 35),
     ["Snow Hare","Ice Viper","Tundra Wolf","Frost Acolyte","Glacier Tick","Rime Giant","Snow Owl","Frozen Revenant","Ice Mite","Blizzard Imp","Shard Golem","Frost Drake","Aurora Sprite","Winter Wolf"],
     [("Hraesvelg, the White Wind","ranged")]),
    ("gloamwood",     "Gloamwood Thicket",    "a forest where the sun never lands",   (35, 40),
     ["Shadow Lynx","Gloam Bat","Briar Witch","Nightshade Sprite","Umber Hulk","Moonstag","Webspinner","Dark Treant","Hollow Man","Lantern Fly","Gloom Viper","Elder Owl","Thornwraith","Dusk Panther"],
     [("The Thorned Duchess","melee")]),
    ("cinderfall",    "Cinderfall Waste",     "ashen flats beneath a burning sky",    (40, 45),
     ["Ash Crawler","Cinder Imp","Soot Raven","Pyroclast","Char Hound","Flame Dervish","Burnt Revenant","Scoria Golem","Smoke Wraith","Fire Beetle","Ember Drake","Lava Leech","Brand Knight","Cinder Wolf"],
     [("Ashlord Vulkar","melee")]),
    ("thundertop",    "Thundertop Peaks",     "cliffs where storms are born",         (45, 50),
     ["Storm Hawk","Crag Goat","Lightning Imp","Thunder Acolyte","Rock Raptor","Static Sprite","Sky Viper","Granite Golem","Tempest Harpy","Cloud Eel","Peak Revenant","Gale Drake","Bolt Fiend","Storm Giant"],
     [("Voltan, Storm Crown","ranged"),("Tempest Colossus","melee")]),
    ("crystaldeep",   "Crystaldeep Caverns",  "resonant caves of living crystal",     (50, 55),
     ["Crystal Bat","Gem Spider","Resonant Slug","Shard Hound","Deep Miner","Prism Sprite","Facet Golem","Echo Fiend","Quartz Serpent","Cave Drake","Glow Stalker","Bismuth Crab","Hollow Chime","Deep Worm"],
     [("The Resonance","magic")]),
    ("venomspire",    "Venomspire Jungle",    "a steaming green wall of fangs",       (55, 60),
     ["Dart Frog","Vine Lash","Jaguar Shade","Serpent Priest","Spore Hulk","Flytrap Fiend","Plume Serpent","Mamba Spirit","Toxic Sprite","Canopy Spider","Blood Parrot","Feral Druid","Boa Tyrant","Mosquito Swarm"],
     [("Xiuhcoatl, Feathered Fang","melee")]),
    ("shrouded",      "Shrouded Moors",       "grey moorland under endless fog",      (60, 65),
     ["Moor Hound","Fog Wraith","Heath Witch","Gallows Crow","Bog Giant","Pale Stalker","Mist Serpent","Hollow Knight","Lantern Wisp","Fen Drake","Grey Pilgrim","Spectral Stag","Marsh Fiend","Howler"],
     [("The Grey Pilgrim King","magic")]),
    ("stormveil",     "Stormveil Highlands",  "wind-blasted ridges and sky ruins",    (65, 70),
     ["Highland Ram","Wind Imp","Skyfall Knight","Gale Witch","Cloud Giant","Ruin Sentinel","Storm Sprite","Razor Eagle","Veil Drake","Thunder Ettin","Skysteel Golem","Squall Serpent","Fallen Valkyrie","Zephyr Fiend"],
     [("Aurora the Fallen","ranged"),("Skybreaker Rhosyn","melee")]),
    ("dreadmire",     "Dreadmire Hollow",     "a black mire that remembers the dead", (70, 75),
     ["Dread Leech","Bone Collector","Mire Wight","Sorrow Sprite","Corpse Bloom","Hollow Wailer","Tar Golem","Black Drake","Grave Serpent","Murk Knight","Plague Toad","Drowned One","Fen Reaper","Night Hag"],
     [("Mother Sorrow","magic")]),
    ("pyreheart",     "Pyreheart Volcano",    "the mountain's burning heart",         (75, 80),
     ["Magma Imp","Obsidian Hound","Pyre Acolyte","Lava Serpent","Cinder Giant","Flame Revenant","Basalt Knight","Fire Sprite","Molten Drake","Ash Witch","Slag Titan","Eruption Fiend","Char Valkyrie","Pyre Worm"],
     [("Ignarion, the First Flame","melee")]),
    ("starfall",      "Starfall Crater",      "where a dead star struck the world",   (80, 85),
     ["Star Imp","Meteorite Golem","Nova Sprite","Void Hound","Cosmic Serpent","Falling Shard","Astral Witch","Crater Fiend","Comet Drake","Starlight Wraith","Gravitas Ettin","Nebula Moth","Iron Meteor","Pulse Stalker"],
     [("The Star That Fell","magic")]),
    ("riftwhispers",  "Rift of Whispers",     "a wound in the world that whispers",   (85, 90),
     ["Whisper Fiend","Rift Stalker","Void Walker","Echo Wraith","Whispering Knight","Null Sprite","Rift Drake","Mad Oracle","Shade Revenant","Twisted Seraph","Null Golem","Gaze of the Deep","Whisper Witch","Static Horror"],
     [("The Mouth of Silence","magic"),("Chorale of Teeth","magic")]),
    ("celestial",     "Celestial Terrace",    "floating courts of the old sky-kings", (90, 93),
     ["Sky Sentinel","Halo Serpent","Light Imp","Dawn Knight","Cloud Seraph","Solar Sprite","Heavenly Drake","Marble Golem","Choir Witch","Zenith Stalker","Gilded Revenant","Star Paladin","Radiant Fiend","Throne Hound"],
     [("Aurum, Last Sky-King","melee")]),
    ("abyssal",       "Abyssal Maw",          "the black throat beneath the sea",     (93, 96),
     ["Deep One","Angler Fiend","Pressure Golem","Void Eel","Drowned Knight","Trench Witch","Lantern Maw","Abyssal Drake","Kraken Spawn","Ink Wraith","Choral Fiend","Bone Whale","Null Serpent","Sunken Paladin"],
     [("Vethiss, the Drowned God","magic")]),
    ("godspire",      "Godspire Summit",      "the peak where gods were made",        (96, 99),
     ["Godspark","Spire Sentinel","Chosen Knight","Herald Fiend","Ascendant Drake","Oracle Witch","Titan Shard","Flame Seraph","Void Paladin","Storm Herald","Aeon Sprite","Crown Golem","Whisper Seraph","Final Revenant"],
     [("The First Devin","melee"), ("Omnis, the Sleeping God","magic")]),
]

# ---------------------------------------------------------------- materials tiers
METALS = [  # name, mining lvl, zone idx required
    ("Copper", 1, 0), ("Iron", 5, 1), ("Steel", 15, 3), ("Mithril", 25, 5),
    ("Adamant", 35, 7), ("Draconic", 50, 10), ("Starsteel", 65, 13), ("Voidmetal", 80, 17),
]
WOODS = [
    ("Pine", 1, 0), ("Oak", 10, 2), ("Willow", 20, 4), ("Ash", 30, 6),
    ("Yew", 45, 9), ("Elder", 60, 12), ("Emberwood", 75, 15), ("Voidwood", 90, 19),
]
FISH = [
    ("Shrimp",1,3),("Sardine",5,4),("Trout",10,6),("Salmon",15,8),("Catfish",20,11),
    ("Tuna",28,14),("Lobster",35,18),("Swordfish",42,22),("Eel",50,26),("Shark",58,32),
    ("Manta Ray",66,38),("Anglerfish",73,44),("Leviathan Koi",80,52),("Void Ray",87,60),("Starwhale",94,72),
]
HERBS = [
    ("Emberleaf",1),("Frostmint",5),("Silvervine",10),("Nightshade",15),("Sunpetal",20),
    ("Moonbell",28),("Bloodroot",36),("Starmoss",44),("Dragonthorn",52),("Voidbud",60),
    ("Aetherbloom",75),("Chronoflower",88),
]
HIDES = [
    ("Rabbit",1),("Deer",10),("Wolf",20),("Bear",30),("Serpent",42),("Drake",55),
    ("Dragon",70),("Voidbeast",85),
]
GEMS = [
    ("Quartz",1),("Amethyst",8),("Topaz",15),("Sapphire",24),("Emerald",33),("Ruby",43),
    ("Diamond",54),("Onyx",66),("Star Opal",78),("Void Crystal",90),
]
RUNES = [
    ("Air",1),("Water",1),("Earth",1),("Fire",5),("Mind",10),("Body",15),("Nature",22),
    ("Chaos",30),("Death",40),("Blood",50),("Astral",60),("Soul",70),("Wrath",78),
    ("Time",85),("Void",92),("Aether",96),
]
POTION_TYPES = [  # suffix, effect kind, stat key, base magnitude
    ("Vigor Draught",   "heal",      "heal",        30),
    ("Attack Tonic",    "buff",      "attack",      4),
    ("Strength Serum",  "buff",      "strength",    4),
    ("Ironhide Potion", "buff",      "defence",     4),
    ("Swiftbow Flask",  "buff",      "ranged",      4),
    ("Mana Cordial",    "buff",      "magic",       4),
    ("Faith Elixir",    "buff",      "devotion",    4),
    ("Antivenom",       "cure",      "poison",      0),
    ("Haste Brew",      "buffstatus","haste",       12),
    ("Fortune Philter", "buffstatus","luck",        10),
]
CROPS = [
    ("Turnip",1,4),("Cabbage",4,6),("Potato",8,8),("Onion",12,10),("Carrot",16,12),
    ("Pumpkin",22,16),("Wheat",28,18),("Corn",34,22),("Pepper",40,26),("Melon",48,32),
    ("Gourd",58,40),("Stargrain",70,50),
]
MEATS = [(n.lower()+" meat", lvl) for (n,lvl,*_) in [(h[0],h[1]) for h in HIDES]]

ICONS = {  # emoji icon per item type / skill
    "attack":"⚔️","strength":"💪","defence":"🛡️","vitality":"❤️","ranged":"🏹","magic":"🔮",
    "devotion":"🙏","mining":"⛏️","woodcutting":"🪓","fishing":"🎣","farming":"🌾","hunting":"🪤",
    "divination":"✨","thieving":"🗡️","smithing":"⚒️","cooking":"🍳","alchemy":"⚗️","crafting":"🧵",
    "fletching":"🪶","runecrafting":"🔷","engineering":"⚙️",
    "ore":"🪨","bar":"🔩","log":"🪵","plank":"🟫","fish":"🐟","food":"🍖","herb":"🌿","potion":"🧪",
    "hide":"🟤","leather":"🧶","gem":"💎","rune":"🔹","tool":"🛠️","weapon":"🗡️","armor":"🥋",
    "jewelry":"💍","quest":"📜","currency":"🪙","consumable":"📦","misc":"🧩","seed":"🌱",
    "essence":"🌀","bone":"🦴","meat":"🥩","crop":"🥕","gadget":"🔧","chest":"🧰",
}

items, recipes, activities, monsters = [], [], [], []
item_ids = set()

def add_item(iid, name, typ, icon=None, **kw):
    if iid in item_ids:
        raise ValueError(f"dup item {iid}")
    item_ids.add(iid)
    d = {"id": iid, "name": name, "type": typ,
         "icon": icon or ICONS.get(typ, "🧩"), "stackable": True}
    d.update(kw); items.append(d); return iid

# currency & universal drops
add_item("coins","Coins","currency","🪙",sellPrice=0)
add_item("bones","Bones","bone","🦴",sellPrice=2)
add_item("giant_bones","Giant Bones","bone","🦴",sellPrice=25)
add_item("raw_essence","Raw Essence","essence","🌀",sellPrice=3)
add_item("pure_essence","Pure Essence","essence","🔮",sellPrice=15)

# ores, bars, smithing gear -----------------------------------------------
WEAPON_SPECS = [  # suffix, weapon class, style, speed, atk bias
    ("Sword",   "sword",   "melee", 2.4, 1.00),
    ("Dagger",  "dagger",  "melee", 1.8, 0.82),
    ("Axe",     "axe",     "melee", 2.8, 1.12),
    ("Mace",    "mace",    "melee", 2.6, 1.05),
    ("Spear",   "spear",   "melee", 2.7, 1.08),
    ("Battleaxe","battleaxe","melee", 3.0, 1.20),
    ("Greatsword","greatsword","melee", 3.2, 1.28),
    ("Warhammer","warhammer","melee", 3.1, 1.22),
]
ARMOR_PIECES = [("Helm","helm"),("Platebody","body"),("Platelegs","legs"),
                ("Boots","boots"),("Gauntlets","gloves"),("Kiteshield","shield")]
TOOLS = [("Pickaxe","pickaxe","mining"),("Hatchet","hatchet","woodcutting"),
         ("Warhammer","hammer","engineering")]

for ti,(metal,mlvl,zidx) in enumerate(METALS):
    t = ti+1
    ore = f"ore_{metal.lower()}"; bar = f"bar_{metal.lower()}"
    add_item(ore, f"{metal} Ore","ore",sellPrice=2+t*2)
    add_item(bar, f"{metal} Bar","bar",sellPrice=6+t*6, stackable=True)
    # gem drops on mining handled in activity
    recipes.append({"id":f"smelt_{metal.lower()}","skill":"smithing","level":mlvl,
        "name":f"Smelt {metal} Bar","inputs":[{"item":ore,"qty":2}],
        "output":{"item":bar,"qty":1},"xp":8+t*8,"ticks":3})
    # weapons
    for suf, wcls, style, spd, bias in WEAPON_SPECS:
        wid = f"wpn_{wcls}_{metal.lower()}"
        recipes.append({"id":f"smith_{wid}","skill":"smithing","level":mlvl,
            "name":f"Forge {metal} {suf}","inputs":[{"item":bar,"qty":2 if suf!="Dagger" else 1}],
            "output":{"item":wid,"qty":1},"xp":14+t*14,"ticks":4})
        add_item(wid, f"{metal} {suf}","weapon","🗡️", stackable=False,
                 equip={"slot":"weapon","weaponClass":wcls,"style":style,
                        "speed":spd,"atk":round((4+t*6)*bias),
                        "str":round((5+t*7)*bias),"tier":t},
                 sellPrice=15+t*22)
    # armor
    for suf,slot in ARMOR_PIECES:
        aid = f"arm_{slot}_{metal.lower()}"
        recipes.append({"id":f"smith_{aid}","skill":"smithing","level":mlvl,
            "name":f"Forge {metal} {suf}","inputs":[{"item":bar,"qty":3 if slot in("body","legs") else 2}],
            "output":{"item":aid,"qty":1},"xp":12+t*12,"ticks":4})
        add_item(aid, f"{metal} {suf}","armor","🥋", stackable=False,
                 equip={"slot":slot,"def":3+t*5,"hp":2+t*4,"tier":t},
                 sellPrice=12+t*18)
    # tools
    for suf,tcls,sk in TOOLS:
        tid = f"tool_{tcls}_{metal.lower()}"
        recipes.append({"id":f"smith_{tid}","skill":"smithing","level":mlvl,
            "name":f"Forge {metal} {suf}","inputs":[{"item":bar,"qty":2}],
            "output":{"item":tid,"qty":1},"xp":12+t*10,"ticks":4})
        add_item(tid, f"{metal} {suf}","tool","🛠️", stackable=False,
                 equip={"slot":"tool","toolClass":tcls,"boost":1+0.10*t,"tier":t},
                 sellPrice=10+t*15)

# mining activities: ore at each tier
for ti,(metal,mlvl,zidx) in enumerate(METALS):
    activities.append({"id":f"mine_{metal.lower()}","skill":"mining","name":f"Mine {metal} Ore",
        "level":mlvl,"zone":zidx,"tool":"pickaxe",
        "output":{"item":f"ore_{metal.lower()}","qty":1},"xp":6+ti*7,"ticks":4,
        "bonus":[{"item":f"gem_{GEMS[min(ti+2,9)][0].lower()}","qty":1,"chance":0.04}]})
# gem prospecting activity
for gi,(g,glvl) in enumerate(GEMS):
    add_item(f"gem_{g.lower()}","Rough "+g,"gem","💎",sellPrice=8+gi*9)
    add_item(f"gemcut_{g.lower()}",g,"gem","💠",sellPrice=30+gi*32)
    recipes.append({"id":f"cut_{g.lower()}","skill":"crafting","level":glvl,
        "name":f"Cut {g}","inputs":[{"item":f"gem_{g.lower()}","qty":1}],
        "output":{"item":f"gemcut_{g.lower()}","qty":1},"xp":10+gi*11,"ticks":2})
    activities.append({"id":f"prospect_{g.lower()}","skill":"mining","name":f"Prospect {g} Vein",
        "level":glvl,"zone":min(gi*2+1,20),"tool":"pickaxe",
        "output":{"item":f"gem_{g.lower()}","qty":1},"xp":8+gi*8,"ticks":5})

# woodcutting / fletching ---------------------------------------------------
for wi,(wood,wlvl,zidx) in enumerate(WOODS):
    t=wi+1
    add_item(f"log_{wood.lower()}",f"{wood} Log","log","🪵",sellPrice=3+t*3)
    activities.append({"id":f"chop_{wood.lower()}","skill":"woodcutting","name":f"Chop {wood}",
        "level":wlvl,"zone":zidx,"tool":"hatchet",
        "output":{"item":f"log_{wood.lower()}","qty":1},"xp":5+wi*7,"ticks":4})
    # bows & staves via fletching
    for suf,style in [("Shortbow","ranged"),("Longbow","ranged"),("Staff","magic"),("Wand","magic")]:
        iid=f"wpn_{suf.lower()}_{wood.lower()}"
        recipes.append({"id":f"fletch_{iid}","skill":"fletching","level":wlvl,
            "name":f"Craft {wood} {suf}","inputs":[{"item":f"log_{wood.lower()}","qty":2}],
            "output":{"item":iid,"qty":1},"xp":10+wi*12,"ticks":4})
        add_item(iid,f"{wood} {suf}","weapon","🏹" if style=="ranged" else "🪄",
                 stackable=False,
                 equip={"slot":"weapon","weaponClass":suf.lower(),"style":style,
                        "speed":2.2 if suf!="Longbow" else 2.8,
                        "atk":3+t*6,"str":3+t*6,"tier":t},sellPrice=12+t*20)
    # arrows & bolts
    add_item(f"arrow_{wood.lower()}",f"{wood} Arrows","misc","➶",sellPrice=1+t)
    recipes.append({"id":f"fletch_arrow_{wood.lower()}","skill":"fletching","level":wlvl,
        "name":f"Fletch {wood} Arrows","inputs":[{"item":f"log_{wood.lower()}","qty":1}],
        "output":{"item":f"arrow_{wood.lower()}","qty":15},"xp":4+wi*4,"ticks":2})
    # planks for engineering
    add_item(f"plank_{wood.lower()}",f"{wood} Plank","plank","🟫",sellPrice=5+t*4)
    recipes.append({"id":f"mill_{wood.lower()}","skill":"engineering","level":wlvl,
        "name":f"Mill {wood} Plank","inputs":[{"item":f"log_{wood.lower()}","qty":1}],
        "output":{"item":f"plank_{wood.lower()}","qty":1},"xp":5+wi*6,"ticks":3})

# fishing / cooking ----------------------------------------------------------
for fi,(fish,lvl,heal) in enumerate(FISH):
    raw=f"fish_{fish.lower().replace(' ','_')}"
    ck=f"cooked_{fish.lower().replace(' ','_')}"
    add_item(raw,f"Raw {fish}","fish","🐟",sellPrice=2+fi*3)
    add_item(ck,f"Cooked {fish}","food","🍗",stackable=True,
             food={"heal":heal}, sellPrice=4+fi*4)
    activities.append({"id":f"fish_{fish.lower().replace(' ','_')}","skill":"fishing",
        "name":f"Fish {fish}","level":lvl,"zone":min(3+fi,20),"tool":"rod",
        "output":{"item":raw,"qty":1},"xp":5+fi*6,"ticks":4})
    recipes.append({"id":f"cook_{fish.lower().replace(' ','_')}","skill":"cooking","level":lvl,
        "name":f"Cook {fish}","inputs":[{"item":raw,"qty":1}],
        "output":{"item":ck,"qty":1},"xp":5+fi*6,"ticks":2})

# farming: herbs + crops ------------------------------------------------------
for hi,(herb,lvl) in enumerate(HERBS):
    add_item(f"herb_{herb.lower()}",herb,"herb","🌿",sellPrice=4+hi*5)
    add_item(f"seed_{herb.lower()}",f"{herb} Seed","seed","🌱",sellPrice=2+hi*2)
    activities.append({"id":f"grow_{herb.lower()}","skill":"farming","name":f"Grow {herb}",
        "level":lvl,"zone":min(hi,20),"tool":None,"consume":{"item":f"seed_{herb.lower()}","qty":1},
        "output":{"item":f"herb_{herb.lower()}","qty":3},"xp":8+hi*9,"ticks":6})
for ci,(crop,lvl,heal) in enumerate(CROPS):
    add_item(f"crop_{crop.lower()}",crop,"crop","🥕",food={"heal":heal},sellPrice=3+ci*3)
    add_item(f"seed_{crop.lower()}",f"{crop} Seed","seed","🌱",sellPrice=1+ci*2)
    activities.append({"id":f"grow_{crop.lower()}","skill":"farming","name":f"Grow {crop}",
        "level":lvl,"zone":min(ci,20),"tool":None,"consume":{"item":f"seed_{crop.lower()}","qty":1},
        "output":{"item":f"crop_{crop.lower()}","qty":4},"xp":4+ci*5,"ticks":5})

# hunting → hides & meat -------------------------------------------------------
for hi,(hide,lvl) in enumerate(HIDES):
    t=hi+1
    add_item(f"hide_{hide.lower()}",f"{hide} Hide","hide","🟤",sellPrice=5+t*6)
    add_item(f"meat_{hide.lower()}",f"{hide} Meat","meat","🥩",sellPrice=3+t*3)
    activities.append({"id":f"hunt_{hide.lower()}","skill":"hunting","name":f"Trap {hide}",
        "level":lvl,"zone":min(hi*3,20),"tool":"trap",
        "output":{"item":f"hide_{hide.lower()}","qty":1},"xp":7+hi*8,"ticks":5,
        "bonus":[{"item":f"meat_{hide.lower()}","qty":1,"chance":0.8}]})
    add_item(f"leather_{hide.lower()}",f"{hide} Leather","leather","🧶",sellPrice=10+t*8)
    recipes.append({"id":f"tan_{hide.lower()}","skill":"crafting","level":lvl,
        "name":f"Tan {hide} Leather","inputs":[{"item":f"hide_{hide.lower()}","qty":2}],
        "output":{"item":f"leather_{hide.lower()}","qty":1},"xp":8+hi*9,"ticks":3})
    # leather armor set (4 pieces)
    for suf,slot in [("Cowl","helm"),("Vest","body"),("Chaps","legs"),("Boots","boots")]:
        aid=f"rarm_{slot}_{hide.lower()}"
        recipes.append({"id":f"craft_{aid}","skill":"crafting","level":lvl,
            "name":f"Sew {hide} {suf}","inputs":[{"item":f"leather_{hide.lower()}","qty":2}],
            "output":{"item":aid,"qty":1},"xp":9+hi*10,"ticks":4})
        add_item(aid,f"{hide} {suf}","armor","🥋",stackable=False,
                 equip={"slot":slot,"def":2+t*4,"hp":t*3,"rdef":t*2,"tier":t},
                 sellPrice=8+t*14)

# robes (mage armour) from leather + essence ------------------------------------
for hi,(hide,lvl) in enumerate(HIDES):
    t=hi+1
    for suf,slot in [("Hood","helm"),("Robe","body"),("Skirt","legs"),("Slippers","boots")]:
        rid=f"robe_{slot}_{hide.lower()}"
        recipes.append({"id":f"craft_{rid}","skill":"crafting","level":lvl,
            "name":f"Stitch {hide} {suf}","inputs":[{"item":f"leather_{hide.lower()}","qty":2},
            {"item":"raw_essence","qty":2}],
            "output":{"item":rid,"qty":1},"xp":10+hi*11,"ticks":4})
        add_item(rid,f"{hide} {suf}","armor","🧥",stackable=False,
                 equip={"slot":slot,"def":1+t*3,"mdef":t*3,"hp":t*2,"tier":t},
                 sellPrice=9+t*15)

# monster crafting parts ----------------------------------------------------------
PART_TYPES = [("Fang","🦷"),("Claw","🦅"),("Scale","🐲"),("Ichor","🩸"),("Chitin","🪲")]
PART_TIER_PREFIX = ["Brittle","Sturdy","Hardened","Tempered","Drake","Titan","Astral","Void"]
for pi,(pn,picon) in enumerate(PART_TYPES):
    for t,prefix in enumerate(PART_TIER_PREFIX):
        add_item(f"part_{pn.lower()}_{t}",f"{prefix} {pn}","misc",picon,
                 sellPrice=4+pi*2+t*5)

# relic weapons — unique boss drops (one per zone) --------------------------------
RELICS = [
    ("Bramblebrand","sword","bleed",0.20),("Antler Edge","spear","bleed",0.22),
    ("Skarn's Demands","warhammer","stun",0.15),("Brine Hook","dagger","soak",0.25),
    ("Gravedigger's Toll","battleaxe","poison",0.22),("Sandglass Scimitar","sword","burn",0.20),
    ("Frostbite Fang","dagger","freeze",0.20),("Duchess' Thorn","spear","weaken",0.25),
    ("Ashen Verdict","greatsword","burn",0.24),("Stormcall","battleaxe","shock",0.24),
    ("The Tuning Fork","mace","stun",0.22),("Fang of Xiuhcoatl","dagger","poison",0.28),
    ("Grey Benediction","staff","weaken",0.26),("Valkyrie's Debt","spear","shock",0.26),
    ("Sorrow's Loom","staff","drown",0.24),("Pyreheart Brand","greatsword","burn",0.30),
    ("Starfall Verdict","battleaxe","stun",0.26),("Silent Choir","staff","weaken",0.30),
    ("Dawnbreaker","sword","holy",0.30),("Drowned Word","mace","drown",0.30),
    ("Godspike","spear","doom",0.32),
]
for ri,(rn,wcls,st,ch) in enumerate(RELICS):
    zi=ri
    spd={"dagger":1.8,"sword":2.4,"spear":2.7,"mace":2.6,"axe":2.8,
         "battleaxe":3.0,"greatsword":3.2,"warhammer":3.1,"staff":2.5}[wcls]
    style="magic" if wcls=="staff" else "melee"
    add_item(f"relic_{rn.lower().replace(chr(39),chr(95)).replace(' ','_')}",rn,
             "weapon","🗡️",stackable=False,
             equip={"slot":"weapon","weaponClass":wcls,"style":style,"speed":spd,
                    "atk":12+zi*5,"str":14+zi*6,"tier":zi+1,
                    "status":{"id":st,"chance":ch},"unique":True},
             sellPrice=500+zi*400,minRarity=max(9,zi))

# consumables: bait, incense, caches ---------------------------------------------
CONSUMABLES = [
    ("bait_grub","Grub Bait","🪱","fishing",5),("bait_lure","Silver Lure","🎣","fishing",25),
    ("bait_star","Starshine Lure","✨","fishing",60),
    ("incense_pine","Pine Incense","🕯️","devotion",10),
    ("incense_myr","Myrrh Incense","🕯️","devotion",30),
    ("incense_star","Star Incense","🕯️","devotion",70),
    ("trap_bait","Scented Bait","🧀","hunting",8),
    ("trap_bait2","Bloodbait","🥓","hunting",45),
    ("lucky_charm","Lucky Charm","🍀","thieving",20),
    ("miners_snack","Miner's Pasty","🥟","mining",15),
]
for cid,cn,ic,sk,lvl in CONSUMABLES:
    add_item(cid,cn,"consumable",ic,sellPrice=10+lvl*2)

# divination / runecrafting ----------------------------------------------------
for ri,(rune,lvl) in enumerate(RUNES):
    add_item(f"rune_{rune.lower()}",f"{rune} Rune","rune","🔹",sellPrice=4+ri*4)
    recipes.append({"id":f"bind_{rune.lower()}","skill":"runecrafting","level":lvl,
        "name":f"Bind {rune} Rune","inputs":[{"item":"raw_essence","qty":2}],
        "output":{"item":f"rune_{rune.lower()}","qty":3},"xp":6+ri*6,"ticks":3})
DIV_NODES = [("Flickering Wisp",1,0),("Gleaming Wisp",10,2),("Bright Wisp",20,4),
    ("Radiant Wisp",32,6),("Luminous Wisp",45,9),("Brilliant Wisp",58,12),
    ("Astral Wisp",72,15),("Eternal Wisp",85,18)]
for di,(node,lvl,zidx) in enumerate(DIV_NODES):
    activities.append({"id":f"div_{di}","skill":"divination","name":f"Harvest {node}",
        "level":lvl,"zone":zidx,"tool":None,
        "output":{"item":"raw_essence","qty":1+di},"xp":7+di*9,"ticks":4,
        "bonus":[{"item":"pure_essence","qty":1,"chance":0.06+di*0.02}]})

# thieving ---------------------------------------------------------------------
THIEF_MARKS = [("Pickpocket Villager",1,0,4),("Pickpocket Guard",8,1,7),
    ("Steal Bakery Stall",15,2,10),("Pickpocket Merchant",22,3,14),
    ("Steal Market Chest",30,4,20),("Pickpocket Noble",40,6,30),
    ("Steal Treasury Vault",52,9,45),("Rob Shadow Fence",65,12,65),
    ("Heist Sky-Vault",80,16,95)]
for mi,(mname,lvl,zidx,gold) in enumerate(THIEF_MARKS):
    activities.append({"id":f"thieve_{mi}","skill":"thieving","name":mname,"level":lvl,
        "zone":zidx,"tool":None,"output":{"item":"coins","qty":gold},"xp":6+mi*9,
        "ticks":4,"bonus":[
            {"item":f"seed_{HERBS[min(mi+3,11)][0].lower()}","qty":1,"chance":0.10},
            {"item":f"gem_{GEMS[min(mi+1,9)][0].lower()}","qty":1,"chance":0.05}]})

# alchemy: potions --------------------------------------------------------------
for pi,(suf,kind,stat,mag) in enumerate(POTION_TYPES):
    for gi in range(0, len(HERBS), 4):
        herb,lvl = HERBS[gi]
        hid = f"herb_{herb.lower()}"
        pid = f"pot_{suf.split()[0].lower()}_{gi//4}"
        tiername = ["Lesser","Standard","Greater"][gi//4]
        if not any(i["id"]==pid for i in items):
            add_item(pid,f"{tiername} {suf}","potion","🧪",
                     potion={"kind":kind,"stat":stat,"mag":mag*(gi//4+1)},
                     sellPrice=15+pi*4+gi*4)
        recipes.append({"id":f"brew_{suf.split()[0].lower()}_{gi//4}",
            "skill":"alchemy","level":min(99,lvl+pi*3),
            "name":f"Brew {tiername} {suf}",
            "inputs":[{"item":hid,"qty":2},
                      {"item":"pure_essence" if gi>=8 else "raw_essence","qty":1}],
            "output":{"item":pid,"qty":2},"xp":10+pi*4+gi*3,"ticks":3})

# cooking: dishes ---------------------------------------------------------------
DISHES = [
    ("Forest Skewer",[("meat_rabbit",1),("crop_carrot",1)],"cooking",8,26),
    ("Hunter's Pie",[("meat_deer",1),("crop_wheat",1)],"cooking",20,44),
    ("Barrow Stew",[("meat_bear",1),("crop_potato",1)],"cooking",30,60),
    ("Serpent Curry",[("meat_serpent",1),("crop_pepper",1)],"cooking",42,80),
    ("Drake Roast",[("meat_drake",1),("crop_pumpkin",1)],"cooking",55,110),
    ("Dragon Feast",[("meat_dragon",1),("crop_melon",1)],"cooking",70,150),
    ("Void Banquet",[("meat_voidbeast",1),("crop_stargrain",1)],"cooking",85,200),
]
for dn,ins,sk,lvl,heal in DISHES:
    iid="dish_"+dn.lower().replace("'","")
    iid="dish_"+dn.lower().replace("'","").replace(" ","_")
    add_item(iid,dn,"food","🍲",food={"heal":heal},sellPrice=20+heal//2)
    recipes.append({"id":f"cook_{iid}","skill":sk,"level":lvl,"name":dn,
        "inputs":[{"item":a,"qty":b} for a,b in ins],
        "output":{"item":iid,"qty":1},"xp":heal,"ticks":4})

# crafting: jewellery ------------------------------------------------------------
for gi,(g,glvl) in enumerate(GEMS):
    for jn,slot in [("Ring","ring"),("Amulet","amulet"),("Bracelet","bracelet")]:
        jid=f"jew_{g.lower()}_{slot}"
        recipes.append({"id":f"craft_{jid}","skill":"crafting","level":glvl,
            "name":f"{g} {jn}","inputs":[{"item":f"gemcut_{g.lower()}","qty":1},
            {"item":f"bar_{METALS[min(gi//2+2,7)][0].lower()}","qty":1}],
            "output":{"item":jid,"qty":1},"xp":12+gi*10,"ticks":3})
        add_item(jid,f"{g} {jn}","jewelry","💍",stackable=False,
                 equip={"slot":slot,"atk":gi+2,"str":gi+2,"def":gi+2,
                        "hp":(gi+1)*5,"luck":gi+1,"tier":gi+1},sellPrice=40+gi*40)

# engineering: gadgets ----------------------------------------------------------
GADGETS = [
    ("Snare Trap","trap",1),("Iron Trap","trap",15),("Steel Trap","trap",30),
    ("Mithril Trap","trap",45),("Adamant Trap","trap",60),("Dragon Trap","trap",75),
    ("Fishing Rod","rod",1),("Reinforced Rod","rod",20),("Master Rod","rod",40),
    ("Leviathan Rod","rod",65),("Astral Rod","rod",85),
    ("Smoke Bomb","gadget",12),("Spark Coil","gadget",25),("Auto-Crossbow","gadget",38),
    ("Flame Jet","gadget",52),("Thunder Rod","gadget",66),("Void Beacon","gadget",82),
]
for gn,gtype,glvl in GADGETS:
    gid="eng_"+gn.lower().replace(" ","_")
    if gtype in ("trap","rod"):
        add_item(gid,gn,"tool","🛠️",stackable=False,
                 equip={"slot":"tool","toolClass":gtype,"boost":1+glvl/120,"tier":glvl//10+1},
                 sellPrice=15+glvl*2)
        recipes.append({"id":f"eng_{gid}","skill":"engineering","level":glvl,
            "name":f"Build {gn}","inputs":[{"item":f"plank_{WOODS[min(glvl//12,7)][0].lower()}","qty":2},
            {"item":f"bar_{METALS[min(glvl//12,7)][0].lower()}","qty":1}],
            "output":{"item":gid,"qty":1},"xp":10+glvl,"ticks":4})
    else:
        add_item(gid,gn,"gadget","🔧",stackable=False,
                 equip={"slot":"trinket","gadget":True,"atk":glvl//3,"str":glvl//4,
                        "status":{"id":"spark","chance":0.08},"tier":glvl//10+1},
                 sellPrice=30+glvl*4)
        recipes.append({"id":f"eng_{gid}","skill":"engineering","level":glvl,
            "name":f"Build {gn}","inputs":[{"item":f"plank_{WOODS[min(glvl//12,7)][0].lower()}","qty":1},
            {"item":f"bar_{METALS[min(glvl//12,7)][0].lower()}","qty":2},
            {"item":"pure_essence","qty":1}],
            "output":{"item":gid,"qty":1},"xp":14+glvl,"ticks":5})

# flavour / collectibles --------------------------------------------------------
COLLECTIBLES = [
    ("pet_ember_pup","Ember Pup","🐶",500),("pet_moss_turtle","Moss Turtle","🐢",550),
    ("pet_storm_kitten","Storm Kitten","🐱",600),("pet_void_lantern","Void Lantern","🏮",800),
    ("pet_mini_golem","Mini Golem","🗿",750),("trophy_bronze","Bronze Trophy","🏆",200),
    ("trophy_silver","Silver Trophy","🏆",400),("trophy_gold","Gold Trophy","🏆",800),
    ("cache_old","Weathered Cache","📦",100),("cache_rich","Rich Cache","🧰",350),
    ("relic_dawn","Dawn Relic","🌅",600),("relic_dusk","Dusk Relic","🌆",650),
    ("relic_storm","Storm Relic","⛈️",700),("map_fragment","Spire Map Fragment","🗺️",120),
    ("scroll_lore","Ancient Scroll","📜",90),("totem_wild","Wild Totem","🗿",220),
    ("sigil_fire","Fire Sigil","🔥",260),("sigil_ice","Ice Sigil","❄️",260),
    ("sigil_void","Void Sigil","🕳️",300),("dice_fate","Fate Dice","🎲",180),
]
for cid,cn,ic,price in COLLECTIBLES:
    add_item(cid,cn,"misc",ic,stackable=False,sellPrice=price)

# monsters ----------------------------------------------------------------------
# keyword -> emoji icon for monster cards (longest name word wins)
MON_ICONS = {
 "rat":"🐀","hare":"🐇","rabbit":"🐇","viper":"🐍","serpent":"🐍","cobra":"🐍",
 "mamba":"🐍","boa":"🐍","xiuhcoatl":"🐍","boar":"🐗","wolf":"🐺","howler":"🐺",
 "jackal":"🐺","hound":"🐕","fox":"🦊","lynx":"🐈","jaguar":"🐆","panther":"🐆",
 "stalker":"🐆","marten":"🦦","stag":"🦌","elk":"🦌","moonstag":"🦌","antler":"🦌",
 "antlers":"🦌","goat":"🐐","ram":"🐏","shepherd":"🐑","bat":"🦇","crow":"🐦‍⬛",
 "raven":"🐦‍⬛","eagle":"🦅","hawk":"🦅","harpy":"🦅","hraesvelg":"🦅","owl":"🦉",
 "gull":"🐦","petrel":"🐦","parrot":"🦜","feathered":"🪶","plume":"🪶",
 "lizard":"🦎","saltscale":"🦎","gator":"🐊","frog":"🐸","toad":"🐸","eel":"🐟",
 "angler":"🎣","snapper":"🐟","whale":"🐋","kraken":"🦑","ink":"🦑","diver":"🤿",
 "crab":"🦀","beetle":"🪲","scarab":"🪲","spider":"🕷️","webspinner":"🕷️",
 "scorpion":"🦂","wasp":"🐝","mosquito":"🦟","moth":"🦋","mite":"🐜","tick":"🐜",
 "swarm":"🐝","worm":"🪱","burrower":"🐛","crawler":"🐛","leech":"🪱","slug":"🐌",
 "drake":"🐉","dragon":"🐉","djinn":"🧞","golem":"🗿","titan":"🗿","colossus":"🗿",
 "ettin":"🧌","giant":"🧌","hulk":"🧌","gnome":"👺","goblin":"👺","imp":"😈",
 "fiend":"👿","devil":"👿","sprite":"🧚","wisp":"✨","mossling":"🌿","treant":"🌳",
 "willow":"🌳","timber":"🪵","bark":"🪵","branch":"🌿","root":"🌱","vine":"🌿",
 "briar":"🌿","thorned":"🌵","thornwraith":"🌵","cactus":"🌵","flytrap":"🪴",
 "petal":"🌸","dandelion":"🌼","bloom":"🌺","clover":"🍀","thistle":"🌾",
 "heath":"🌾","acorn":"🌰","pine":"🌲","grove":"🌲","canopy":"🌳","fungal":"🍄",
 "spore":"🍄","mummy":"🧟","drowned":"🧟","corpse":"🧟","ghast":"👻","ghost":"👻",
 "spectral":"👻","wraith":"👤","shade":"👤","shadow":"🌑","gloam":"🌑","wight":"💀",
 "revenant":"💀","bone":"💀","bones":"💀","grave":"🪦","barrow":"🪦","gallows":"🪦",
 "horror":"😱","dread":"💀","wailer":"😱","sorrow":"🥀","silence":"🤫",
 "sleeping":"😴","hag":"🧙","witch":"🧙","druid":"🧙","acolyte":"🔮","priest":"🙏",
 "oracle":"🔮","pilgrim":"🕯️","knight":"⚔️","paladin":"🌟","sentinel":"🛡️",
 "bandit":"🗡️","pirate":"🏴‍☠️","captain":"🏴‍☠️","harpooner":"🔱","miner":"⛏️",
 "foreman":"👷","picker":"👷","collector":"🧺","mimic":"🧰","elemental":"🌀",
 "dervish":"🌀","mirage":"🌫️","mist":"🌫️","fog":"🌫️","veil":"🌫️","murk":"🌫️",
 "whisper":"🫥","whispering":"🫥","echo":"🗯️","storm":"⛈️","thunder":"⚡",
 "lightning":"⚡","bolt":"⚡","static":"⚡","voltan":"⚡","gale":"💨","squall":"🌪️",
 "tempest":"🌪️","zephyr":"💨","wind":"💨","frost":"❄️","ice":"🧊","snow":"❄️",
 "glacier":"🧊","blizzard":"🌨️","rime":"❄️","winter":"❄️","frozen":"🧊",
 "magma":"🌋","lava":"🌋","eruption":"🌋","ember":"🔥","cinder":"🔥","ash":"🔥",
 "flame":"🔥","fire":"🔥","pyre":"🔥","ignarion":"🔥","soot":"💨","smoke":"💨",
 "scoria":"🪨","basalt":"🪨","slag":"🪨","crystal":"💎","gem":"💎","quartz":"💎",
 "facet":"💎","shard":"💠","shardmother":"💠","prism":"💠","marble":"🪨",
 "granite":"🪨","rock":"🪨","pebble":"🪨","crag":"⛰️","peak":"⛰️","shale":"🪨",
 "skarn":"🪨","ore":"⛏️","bismuth":"💠","skysteel":"⚙️","star":"⭐","nova":"💫",
 "comet":"☄️","meteor":"☄️","meteorite":"☄️","nebula":"🌌","cosmic":"🌌",
 "astral":"🌠","starlight":"🌠","aurora":"🌈","skyfall":"☄️","skybreaker":"⛈️",
 "void":"🕳️","rift":"🕳️","null":"⭕","god":"👑","godspark":"👑","seraph":"😇",
 "valkyrie":"👼","herald":"📯","choir":"🎵","choral":"🎵","chorale":"🎵",
 "chime":"🔔","halo":"😇","heavenly":"😇","ascendant":"🌟","radiant":"🌟",
 "solar":"☀️","dawn":"🌅","aurum":"🪙","gilded":"🪙","crown":"👑","throne":"👑",
 "king":"👑","queen":"👑","duchess":"👑","tyrant":"👹","bramblejaw":"🐺",
 "mother":"🧿","chosen":"🌟","eyes":"👁️","gaze":"👁️","lurker":"👁️","maw":"🦷",
 "teeth":"🦷","fang":"🦷","pulse":"💓","gravitas":"🪐","aeon":"⏳","first":"🌅",
 "last":"🌑","final":"⚫","one":"🌗","devin":"🔮","omnis":"👁️","ishka":"🐍",
 "kryss":"⚔️","rhosyn":"🌹","vulkar":"🌋","sethra":"🐍","moon":"🌙","night":"🌙",
 "dusk":"🌆","deep":"🌊","trench":"🌊","pressure":"🌊","abyssal":"🌊","brine":"🌊",
 "foam":"🌊","tide":"🌊","brinechain":"⚓","wreck":"⚓","sunken":"⚓","sand":"🏜️",
 "dune":"🏜️","dust":"🌪️","desert":"🏜️","sirocco":"🏜️","oasis":"🏝️","bog":"🟤",
 "mire":"🟤","fen":"🟤","marsh":"🟤","sump":"🟤","moor":"🟤","peat":"🟤",
 "sludge":"🦠","rot":"🦠","plague":"🦠","toxic":"☣️","tar":"⚫","umber":"🟤",
 "lantern":"🏮","glow":"✨","fallen":"🗡️","fell":"🗡️","dart":"🎯","needle":"🪡",
 "sap":"💧","kelp":"🌿","hollow":"🕳️","twisted":"🌀","wild":"🌿","feral":"🐗",
 "grass":"🌾","meadow":"🌾","field":"🌾","hedge":"🌿","fence":"🦎","highland":"⛰️",
 "cavern":"🕳️","cave":"🕳️","quarry":"⛏️","mine":"⛏️","unpaid":"🪙","mad":"😵",
 "pick":"⛏️","sunbleached":"☀️","white":"⬜","black":"⬛","grey":"🌫️","pale":"👻",
 "dark":"🌑","beast":"🐗","spawn":"🐣","stoneheart":"🗿","sky":"☁️","cloud":"☁️",
 "resonance":"🔔","resonant":"🔔","man":"👤","falling":"☄️","crater":"🕳️",
 "thorn":"🌵",
}
# per-zone fallback pools so two monsters never share an icon within a zone
ZONE_FALLBACK_ICONS = {
 "greenhollow":["🌿","🍃","🌾","🌱","🦗","🐌","🍀","🌼"],
 "pinewild":["🌲","🦉","🌰","🦡","🍄","🪵","🐿️","🦌"],
 "embershard":["⛏️","🪨","💎","🔥","🦇","🧱","⚒️","🌋"],
 "mistral":["🌊","🐚","🦀","🐟","⚓","🌫️","🪸","🐙"],
 "barrowmere":["🟤","🐊","🦟","🪱","🌫️","🐸","💀","🌿"],
 "sunscar":["🏜️","🦂","🌵","🐪","☀️","🌪️","🦎","🐍"],
 "frostfang":["❄️","🧊","🐻‍❄️","🦭","⛄","🌨️","🐺","🦌"],
 "gloamwood":["🌑","🦇","🕷️","🍄","🌫️","🐺","🦉","🌲"],
 "cinderfall":["🔥","🌋","🪨","😈","🦎","🔥","💨","🗡️"],
 "thundertop":["⚡","⛈️","🦅","🌩️","💨","🐏","☁️","🪨"],
 "crystaldeep":["💎","💠","🔮","🕳️","🦇","❄️","⚪","🧊"],
 "venomspire":["🐍","🦟","🐸","🌴","☣️","🕷️","🦎","🌺"],
 "shrouded":["🌫️","👻","🫥","🪦","😱","🌑","🕯️","🧟"],
 "stormveil":["⛈️","🌪️","⚡","🌩️","💨","🦅","☁️","🌦️"],
 "dreadmire":["😱","💀","🕳️","🌑","🐛","🦠","👁️","🧌"],
 "pyreheart":["🔥","🌋","👹","😈","🔥","☄️","🗡️","⚔️"],
 "starfall":["⭐","☄️","💫","🌌","🌠","👽","🔭","✨"],
 "riftwhispers":["🕳️","👁️","🫥","🌀","🗯️","🌫️","⭕","😶‍🌫️"],
 "celestial":["😇","👼","☀️","🌟","👑","🎵","🔔","✨"],
 "godspire":["👑","😇","🌟","⚡","👁️","🏛️","✨","🔱"],
}
def mon_icon(name, zid, used):
    ws = re.findall(r"[a-z]+", name.lower())
    best = None
    for w in reversed(ws):   # creature noun usually comes last in the name
        if w in MON_ICONS:
            ic = MON_ICONS[w]
            if ic not in used:
                best = ic; break
            if best is None: best = ic
    if best is None or best in used:
        for ic in ZONE_FALLBACK_ICONS.get(zid, []):
            if ic not in used:
                best = ic; break
    used.add(best)
    return best or "👾"

STATUSES_BY_BIOME = {
    0:["bleed"],1:["bleed"],2:["burn"],3:["soak"],4:["poison"],5:["burn"],
    6:["freeze"],7:["stun"],8:["burn"],9:["shock"],10:["stun"],11:["poison"],
    12:["weaken"],13:["shock"],14:["poison"],15:["burn"],16:["shock"],
    17:["weaken"],18:["holy"],19:["drown"],20:["doom"],
}
# per-zone loot helper: material tier that maps to zone
def zone_tier(zi): return min(zi//3, len(METALS)-1)

for zi,(zid,zname,biome,(lo,hi),pools,bosses) in enumerate(ZONES):
    tier = zone_tier(zi)
    metal = METALS[tier][0].lower(); wood = WOODS[tier][0].lower(); hide = HIDES[tier][0].lower()
    statuses = STATUSES_BY_BIOME.get(zi, [])
    used_icons = set()
    for mi,mname in enumerate(pools):
        mlvl = lo + (hi-lo)*mi//max(1,len(pools)-1)
        style = ["melee","ranged","magic"][mi % 3]
        drops = [
            {"item":"bones","qty":1,"chance":1.0},
            {"item":"coins","qty":4+zi*3,"chance":0.6},
            {"item":f"ore_{metal}","qty":1,"chance":0.12},
            {"item":f"log_{wood}","qty":1,"chance":0.12},
            {"item":f"hide_{hide}","qty":1,"chance":0.10},
            {"item":f"gem_{GEMS[min(zi//2,9)][0].lower()}","qty":1,"chance":0.02+zi*0.002},
            {"item":"raw_essence","qty":1,"chance":0.15},
        ]
        if zi>=5: drops.append({"item":"giant_bones","qty":1,"chance":0.2})
        if zi>=8: drops.append({"item":"pure_essence","qty":1,"chance":0.08})
        if zi>=10: drops.append({"item":"scroll_lore","qty":1,"chance":0.01})
        if zi>=14: drops.append({"item":"map_fragment","qty":1,"chance":0.008})
        drops.append({"item":f"part_{PART_TYPES[mi%5][0].lower()}_{tier}","qty":1,"chance":0.09})
        drops.append({"item":"trap_bait","qty":1,"chance":0.03})
        mon = {"id":f"m_{zid}_{mi}","name":mname,"zone":zid,"level":mlvl,
               "icon":mon_icon(mname,zid,used_icons),
               "hp":10+mlvl*6,"atk":2+mlvl*2,"def":mlvl*2,"str":2+mlvl*2,
               "style":style,"speed":2.6+(mi%3)*0.2,"xp":8+mlvl*5,
               "drops":drops,"isBoss":False,
               "statuses":[{"id":statuses[mi%len(statuses)],"chance":0.08}] if statuses else []}
        monsters.append(mon)
    for bi,(bname,bstyle) in enumerate(bosses):
        blvl = hi+3+bi*4
        drops = [
            {"item":"giant_bones","qty":1,"chance":1.0},
            {"item":"coins","qty":80+zi*20,"chance":1.0},
            {"item":f"bar_{metal}","qty":3,"chance":0.5},
            {"item":f"leather_{hide}","qty":2,"chance":0.4},
            {"item":f"gemcut_{GEMS[min(zi//2,9)][0].lower()}","qty":1,"chance":0.15},
            {"item":"pure_essence","qty":5,"chance":0.5},
            {"item":f"wpn_sword_{metal}","qty":1,"chance":0.08},
            {"item":f"jew_{GEMS[min(zi//2,9)][0].lower()}_ring","qty":1,"chance":0.05},
            {"item":"trophy_gold","qty":1,"chance":0.01},
        ]
        if bi == 0 and zi < len(RELICS):
            relic_iid = f"relic_{RELICS[zi][0].lower().replace(chr(39),chr(95)).replace(' ','_')}"
            drops.append({"item":relic_iid,"qty":1,"chance":0.04})
        monsters.append({"id":f"b_{zid}_{bi}","name":bname,"zone":zid,"level":blvl,
            "icon":mon_icon(bname,zid,used_icons),
            "hp":40+blvl*16,"atk":4+blvl*3,"def":blvl*3,"str":4+blvl*3,
            "style":bstyle,"speed":2.8,"xp":60+blvl*18,
            "drops":drops,"isBoss":True,
            "statuses":[{"id":statuses[0],"chance":0.18},{"id":"stun","chance":0.05}]})

# zones.json --------------------------------------------------------------------
zones_out = []
for zi,(zid,zname,biome,(lo,hi),pools,bosses) in enumerate(ZONES):
    zones_out.append({"id":zid,"order":zi,"name":zname,"biome":biome,
        "levelRange":[lo,hi],"art":f"assets/art/zone_{zid}.webp",
        "unlock": ({"type":"boss","zone":ZONES[zi-1][0]} if zi>0 else {"type":"none"}),
        "monsters":[m["id"] for m in monsters if m["zone"]==zid and not m["isBoss"]],
        "bosses":[m["id"] for m in monsters if m["zone"]==zid and m["isBoss"]]})

# quests -------------------------------------------------------------------------
quests = []
for zi,(zid,zname,biome,(lo,hi),pools,bosses) in enumerate(ZONES):
    boss_id = f"b_{zid}_0"
    quests.append({"id":f"main_{zi}","type":"main","order":zi,
        "name":f"Clear {zname}",
        "desc":f"Defeat {bosses[0][0]} in {zname}.",
        "reqs":[{"kind":"kill","target":boss_id,"qty":1}],
        "rewards":{"xp":{"vitality":50+zi*60},"items":[{"item":"coins","qty":100+zi*150}],
                   "unlock_zone": ZONES[zi+1][0] if zi+1 < len(ZONES) else None}})
side = []
side += [("side_miner1","The First Seam","mine", "Mine 30 Copper Ore.","gather","ore_copper",30,{"xp":{"mining":80}})]
side += [("side_miner2","Beneath the Quarry","mine","Mine 50 Mithril Ore.","gather","ore_mithril",50,{"xp":{"mining":2000}})]
side += [("side_chop1","Timber!","woodcut","Chop 30 Pine Logs.","gather","log_pine",30,{"xp":{"woodcutting":80}})]
side += [("side_chop2","Heartwood","woodcut","Chop 40 Elder Logs.","gather","log_elder",40,{"xp":{"woodcutting":3000}})]
side += [("side_fish1","Catch of the Day","fish","Catch 25 Trout.","gather","fish_trout",25,{"xp":{"fishing":100}})]
side += [("side_fish2","The Deep Calls","fish","Catch 30 Shark.","gather","fish_shark",30,{"xp":{"fishing":4000}})]
side += [("side_farm1","Green Fingers","farm","Grow 20 Silvervine.","gather","herb_silvervine",20,{"xp":{"farming":150}})]
side += [("side_hunt1","Trapper's Trade","hunt","Collect 20 Wolf Hides.","gather","hide_wolf",20,{"xp":{"hunting":300}})]
side += [("side_thief1","Five-Finger Discount","thief","Pickpocket 40 times' worth of coins.","gather","coins",400,{"xp":{"thieving":250}})]
side += [("side_div1","Wispwhisperer","div","Harvest 100 Raw Essence.","gather","raw_essence",100,{"xp":{"divination":350}})]
side += [("side_smith1","Apprentice Smith","smith","Forge 15 Iron bars-worth of gear (craft 15 items).","craft_any","smithing",15,{"xp":{"smithing":300}})]
side += [("side_cook1","Home Cooking","cook","Cook 30 meals.","craft_any","cooking",30,{"xp":{"cooking":350}})]
side += [("side_alch1","Bubble Bubble","alch","Brew 20 potions.","craft_any","alchemy",20,{"xp":{"alchemy":400}})]
side += [("side_craft1","Hand of the Maker","craft","Craft 15 items.","craft_any","crafting",15,{"xp":{"crafting":300}})]
side += [("side_fletch1","Bowyer","fletch","Fletch 15 items.","craft_any","fletching",15,{"xp":{"fletching":300}})]
side += [("side_rune1","Runewright","rune","Bind 100 runes.","craft_qty","rune_",100,{"xp":{"runecrafting":500}})]
side += [("side_eng1","Tinker","eng","Build 5 gadgets.","craft_any","engineering",5,{"xp":{"engineering":600}})]
side += [("side_lvl1","Seasoned","lvl","Reach level 20 in any combat skill.","skill_level","any_combat",20,{"items":[{"item":"cache_old","qty":2}]})]
side += [("side_lvl2","Veteran","lvl","Reach level 50 in any skill.","skill_level","any",50,{"items":[{"item":"cache_rich","qty":2}]})]
side += [("side_lvl3","Master of the Spire","lvl","Reach level 80 in any skill.","skill_level","any",80,{"items":[{"item":"trophy_gold","qty":1}]})]
side += [("side_kill1","Pest Control","kill","Slay 50 monsters.","kill_any","any",50,{"items":[{"item":"scroll_lore","qty":1}]})]
side += [("side_kill2","Exterminator","kill","Slay 300 monsters.","kill_any","any",300,{"items":[{"item":"sigil_fire","qty":1}]})]
side += [("side_boss1","Giant Slayer","kill","Slay 5 bosses.","kill_boss","any",5,{"items":[{"item":"relic_dawn","qty":1}]})]
side += [("side_boss2","Tyrant's Bane","kill","Slay 15 bosses.","kill_boss","any",15,{"items":[{"item":"relic_dusk","qty":1}]})]
for i,(qid,qn,tag,desc,kind,target,qty,rw) in enumerate(side):
    quests.append({"id":qid,"type":"side","order":i,"name":qn,"desc":desc,
        "reqs":[{"kind":kind,"target":target,"qty":qty}],"rewards":rw})

# statuses -----------------------------------------------------------------------
statuses = [
    {"id":"poison","name":"Poison","kind":"debuff","color":"#6ac06a","icon":"☠️",
     "tick":{"dmgPct":0.03},"dur":4,"desc":"Loses HP each turn."},
    {"id":"burn","name":"Burn","kind":"debuff","color":"#e07040","icon":"🔥",
     "tick":{"dmgPct":0.04},"dur":3,"desc":"Searing damage each turn."},
    {"id":"bleed","name":"Bleed","kind":"debuff","color":"#c04040","icon":"🩸",
     "tick":{"dmgPct":0.03},"dur":4,"desc":"Open wound drains health."},
    {"id":"freeze","name":"Freeze","kind":"debuff","color":"#70c0e0","icon":"❄️",
     "skipChance":0.5,"dur":2,"desc":"Chance to lose a turn."},
    {"id":"stun","name":"Stun","kind":"debuff","color":"#e0d060","icon":"💫",
     "skipChance":0.75,"dur":2,"desc":"Likely to lose a turn."},
    {"id":"shock","name":"Shock","kind":"debuff","color":"#f0e040","icon":"⚡",
     "tick":{"dmgPct":0.025},"skipChance":0.2,"dur":3,"desc":"Electric disruption."},
    {"id":"soak","name":"Soaked","kind":"debuff","color":"#5090d0","icon":"💧",
     "defDown":0.15,"dur":3,"desc":"Lowered defence."},
    {"id":"weaken","name":"Weaken","kind":"debuff","color":"#a080a0","icon":"🕸️",
     "atkDown":0.2,"dur":3,"desc":"Reduced attack strength."},
    {"id":"drown","name":"Drowning","kind":"debuff","color":"#305080","icon":"🌊",
     "tick":{"dmgPct":0.05},"dur":3,"desc":"Crushing water pressure."},
    {"id":"holy","name":"Judgement","kind":"debuff","color":"#f0d060","icon":"✨",
     "tick":{"dmgPct":0.04},"dur":3,"desc":"Radiant punishment."},
    {"id":"doom","name":"Doom","kind":"debuff","color":"#803060","icon":"☄️",
     "tick":{"dmgPct":0.06},"dur":4,"desc":"Inevitable ruin approaches."},
    {"id":"regen","name":"Regeneration","kind":"buff","color":"#60c080","icon":"💚",
     "tick":{"healPct":0.04},"dur":4,"desc":"Restore HP each turn."},
    {"id":"haste","name":"Haste","kind":"buff","color":"#f0a040","icon":"⏩",
     "speedUp":0.25,"dur":5,"desc":"Act faster."},
    {"id":"shield","name":"Aegis","kind":"buff","color":"#8090c0","icon":"🛡️",
     "absorb":0.3,"dur":3,"desc":"Absorbs part of damage."},
    {"id":"fury","name":"Fury","kind":"buff","color":"#e05050","icon":"💢",
     "dmgUp":0.25,"dur":4,"desc":"Increased damage."},
    {"id":"focus","name":"Focus","kind":"buff","color":"#60b0e0","icon":"🎯",
     "accUp":0.2,"dur":4,"desc":"Increased accuracy."},
    {"id":"luck","name":"Fortune","kind":"buff","color":"#f0d040","icon":"🍀",
     "luckUp":0.2,"dur":6,"desc":"Better loot and crits."},
    {"id":"spark","name":"Spark","kind":"buff","color":"#f0e080","icon":"⚡",
     "tick":{"dmgPct":0.02,"onFoe":True},"dur":4,"desc":"Shocks the enemy."},
]

# classes ------------------------------------------------------------------------
classes = [
    {"id":"warrior","name":"Warrior","icon":"⚔️","art":"assets/art/class_warrior.webp",
     "desc":"Master of blade and board. +12% melee damage.",
     "bonus":{"style":"melee","dmgUp":0.12},"startSkills":{"attack":5,"strength":5,"defence":5}},
    {"id":"ranger","name":"Ranger","icon":"🏹","art":"assets/art/class_ranger.webp",
     "desc":"Swift and sure of aim. +12% ranged damage.",
     "bonus":{"style":"ranged","dmgUp":0.12},"startSkills":{"ranged":7,"vitality":4}},
    {"id":"mage","name":"Mage","icon":"🔮","art":"assets/art/class_mage.webp",
     "desc":"Weaver of elemental ruin. +12% magic damage.",
     "bonus":{"style":"magic","dmgUp":0.12},"startSkills":{"magic":7,"vitality":4}},
    {"id":"warden","name":"Warden","icon":"🛡️","art":"assets/art/class_warden.webp",
     "desc":"Unbreakable guardian. +15% max HP, +10% defence.",
     "bonus":{"hpUp":0.15,"defUp":0.10},"startSkills":{"defence":7,"vitality":5}},
    {"id":"shade","name":"Shade","icon":"🗡️","art":"assets/art/class_shade.webp",
     "desc":"A whisper in the dark. +15% loot chance, +8% all damage.",
     "bonus":{"luckUp":0.15,"dmgUp":0.08},"startSkills":{"thieving":7,"attack":4}},
]

# manifest -----------------------------------------------------------------------
dump("skills.json", [{"id":i,"name":n,"cat":c,"color":col,"desc":d,"links":l,"icon":ICONS[i]}
                     for (i,n,c,col,d,l) in SKILLS])
dump("rarities.json", [{"id":i,"name":n,"color":c,"tier":idx+1,
                        "statMult":round(1+idx*0.09,3),
                        "dropMult":round(max(0.0002,1/(2.4**idx)),6)}
                       for idx,(i,n,c) in enumerate(RARITY_DEFS)])
dump("zones.json", zones_out)
dump("monsters.json", monsters)
dump("items.json", items)
dump("recipes.json", recipes)
dump("activities.json", activities)
dump("quests.json", quests)
dump("statuses.json", statuses)
dump("classes.json", classes)
dump("manifest.json", {"version":1,"counts":{
    "skills":len(SKILLS),"rarities":len(RARITY_DEFS),"zones":len(zones_out),
    "monsters":len([m for m in monsters if not m["isBoss"]]),
    "bosses":len([m for m in monsters if m["isBoss"]]),
    "items":len(items),"recipes":len(recipes),"activities":len(activities),
    "quests":len(quests),"statuses":len(statuses)}})
print("done")
