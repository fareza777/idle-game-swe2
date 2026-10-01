#!/usr/bin/env python3
"""Duskspire — art generation via Replicate (flux-schnell).

Emits webp art into web/assets/art/ and web/assets/icon.png.
Run:  python3 tools/generate_art.py [--only name1,name2]
"""
import json, os, sys, time, urllib.request, concurrent.futures as cf
from PIL import Image
from io import BytesIO

TOKEN = os.environ["REPLICATE_API_TOKEN"].strip()
OUT = os.path.join(os.path.dirname(__file__), "..", "web", "assets", "art")
os.makedirs(OUT, exist_ok=True)

STYLE = "dark fantasy painterly digital illustration, rich saturated colors, dramatic rim lighting, ornate detail, premium mobile RPG game art, cinematic atmosphere, no text, no words, no letters, no watermark"

def gen(prompt, aspect="1:1"):
    body = {"input": {"prompt": prompt + ", " + STYLE,
                      "aspect_ratio": aspect, "num_outputs": 1,
                      "output_format": "webp", "output_quality": 90}}
    req = urllib.request.Request(
        "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method="POST")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                pred = json.loads(r.read())
            break
        except Exception as e:
            if attempt == 3: raise
            time.sleep(2 * (attempt + 1))
    url = pred["urls"]["get"]
    for _ in range(60):
        time.sleep(2)
        req2 = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
        with urllib.request.urlopen(req2, timeout=30) as r:
            pred = json.loads(r.read())
        if pred["status"] == "succeeded":
            return pred["output"][0]
        if pred["status"] in ("failed", "canceled"):
            raise RuntimeError(f"prediction {pred['status']}: {pred.get('error')}")
    raise TimeoutError("prediction timed out")

def fetch(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()

def save_webp(data, path, max_side=None):
    im = Image.open(BytesIO(data)).convert("RGB")
    if max_side:
        im.thumbnail((max_side, max_side * 4), Image.LANCZOS)
    im.save(path, "WEBP", quality=82)

ZONES = [
    ("greenhollow", "sunlit green meadows with wildflower hills, scattered stone ruins, golden hour"),
    ("pinewild", "ancient pine forest with mossy hollows and god-rays through mist"),
    ("embershard", "underground quarry lit by smouldering orange crystals, mine supports"),
    ("mistral", "windswept coastline, tide pools, shipwreck masts in fog, teal sea"),
    ("barrowmere", "haunted swamp with drowned burial mounds, will-o-wisps, murky green fog"),
    ("sunscar", "scorching desert dunes with glassed sand and half-buried ruins, heat shimmer"),
    ("frostfang", "arctic tundra, blue ice caves, blowing snow, aurora in dark sky"),
    ("gloamwood", "twilight forest of black twisted trees, bioluminescent mushrooms, purple gloom"),
    ("cinderfall", "volcanic ash wasteland under burning sky, embers drifting, lava cracks"),
    ("thundertop", "storm-lashed mountain peaks, lightning forks, floating rock shards"),
    ("crystaldeep", "cavern of giant glowing crystals, refracted rainbow light, deep dark"),
    ("venomspire", "steaming jungle, huge fangs of stone, bioluminescent spores, deadly green"),
    ("shrouded", "grey moorland under endless fog, gallows trees, ghostly lights"),
    ("stormveil", "wind-blasted highlands with floating sky ruins, lightning inside clouds"),
    ("dreadmire", "black mire swamp, skeletal trees, rising dead, oppressive dark"),
    ("pyreheart", "inside a volcano, rivers of lava, obsidian pillars, inferno glow"),
    ("starfall", "impact crater of a fallen star, purple cosmic dust, floating shards"),
    ("riftwhispers", "torn dimensional rift in reality, floating debris, void whispers made visible"),
    ("celestial", "floating marble courts above the clouds, golden light, divine architecture"),
    ("abyssal", "deep ocean trench, black water, bioluminescent horror, drowning pressure"),
    ("godspire", "the summit of a god-made spire above reality, swirling cosmos, golden light"),
]
BOSSES = [
    ("greenhollow", "huge savage boar-rabbit hybrid beast with briar antlers, snarling, portrait"),
    ("pinewild", "majestic elk matriarch with crown of living antlers and glowing eyes, portrait"),
    ("embershard", "hulking goblin mine foreman made of slag and crystal, glowing core, portrait"),
    ("mistral", "ghost pirate captain with barnacle cutlass and chained soul lantern, portrait"),
    ("barrowmere", "undead bog king in rusted crown rising from the mire, portrait"),
    ("sunscar", "regal desert queen of living glass and sand, djinn smoke lower body, portrait"),
    ("frostfang", "colossal white storm-bird with ice feather wings and lightning eyes, portrait"),
    ("gloamwood", "elegant thorned duchess of black roses and shadow, portrait"),
    ("cinderfall", "armored ash lord with burning sword, embers for a crown, portrait"),
    ("thundertop", "storm giant wearing a crown of lightning arcs, crackling, portrait"),
    ("crystaldeep", "sentient prismatic crystal entity resonating with light, portrait"),
    ("venomspire", "giant feathered serpent with obsidian fangs, jungle god, portrait"),
    ("shrouded", "grey pilgrim king wraith with lantern of souls, ragged regalia, portrait"),
    ("stormveil", "fallen valkyrie of broken sky-steel and storm wings, portrait"),
    ("dreadmire", "weeping hag mother of sorrow, drowned crown, portrait"),
    ("pyreheart", "primordial fire elemental lord of molten rock, first flame, portrait"),
    ("starfall", "dying star entity of iron and cosmic fire fallen to earth, portrait"),
    ("riftwhispers", "entity made of silence and whispering void mouths, portrait"),
    ("celestial", "last sky-king in divine gilded armour, halo throne, portrait"),
    ("abyssal", "drowned god of the trench, tentacled crown, abyssal glow, portrait"),
    ("godspire", "sleeping god omnis, colossal being of golden light and starstuff, portrait"),
]
CLASSES = [
    ("warrior", "heroic female human knight in ornate steel plate, greatsword, heroic portrait"),
    ("ranger", "elf ranger with longbow and hooded green cloak, sharp eyes, portrait"),
    ("mage", "robed battle mage with glowing rune staff, violet energy, portrait"),
    ("warden", "massive guardian in tower shield and blessed armor, steadfast, portrait"),
    ("shade", "masked rogue in dark leathers, twin daggers, shadow wisps, portrait"),
]
SKILL_ICONS = [
    ("attack","crossed steel swords emblem"),("strength","flexed gauntlet fist emblem"),
    ("defence","kite shield emblem"),("vitality","glowing heart emblem"),
    ("ranged","longbow and arrow emblem"),("magic","arcane orb and runes emblem"),
    ("devotion","praying hands with halo emblem"),("mining","pickaxe and crystal emblem"),
    ("woodcutting","felling axe and log emblem"),("fishing","rod and leaping fish emblem"),
    ("farming","wheat sheaf and sprout emblem"),("hunting","bear trap and paw emblem"),
    ("divination","floating wisp orbs emblem"),("thieving","hooded figure and dagger emblem"),
    ("smithing","anvil and hammer emblem"),("cooking","steaming pot emblem"),
    ("alchemy","bubbling potion flask emblem"),("crafting","needle thread and gem emblem"),
    ("fletching","feather and arrowhead emblem"),("runecrafting","carved rune stone emblem"),
    ("engineering","gears and contraption emblem"),
]
ASSETS = [
    ("icon", "1024x1024", "1:1", "ornate game app icon: obsidian spire tower crest wrapped in golden ember ring on deep night blue field, symmetrical badge, glossy premium icon design"),
    ("logo", "1024x1024", "1:1", "epic fantasy emblem: twisted dark spire piercing swirling dusk clouds, golden rim, ornamental game logo centerpiece, clean dark background"),
    ("splash", "1024x1536", "2:3", "breathtaking key art: lone hero climbing colossal dark spire above clouds toward a sleeping god of light, epic scale, dramatic"),
]
JOBS = []
for f, size, asp, prompt in ASSETS:
    JOBS.append((f, prompt, asp, size))
for zid, desc in ZONES:
    JOBS.append((f"zone_{zid}", f"landscape vista of {desc}", "2:3", "768x1152"))
for zid, desc in BOSSES:
    JOBS.append((f"boss_{zid}", desc, "1:1", "512x512"))
for cid, desc in CLASSES:
    JOBS.append((f"class_{cid}", desc, "2:3", "512x768"))
for sid, desc in SKILL_ICONS:
    JOBS.append((f"skill_{sid}", f"game skill icon: {desc}, circular emblem on dark badge", "1:1", "256x256"))

def run(job):
    fname, prompt, aspect, size = job
    out = os.path.join(OUT, fname + ".webp")
    if os.path.exists(out): return (fname, "cached")
    url = gen(prompt, aspect)
    data = fetch(url)
    maxside = int(size.split("x")[0])
    save_webp(data, out, maxside)
    return (fname, "ok")

if __name__ == "__main__":
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only")+1].split(","))
        JOBS = [j for j in JOBS if j[0] in only]
    print(f"{len(JOBS)} assets to generate")
    done, failed = 0, []
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        futs = {ex.submit(run, j): j for j in JOBS}
        for fut in cf.as_completed(futs):
            j = futs[fut]
            try:
                name, st = fut.result()
                done += 1
                print(f"[{done}/{len(JOBS)}] {name}: {st}", flush=True)
            except Exception as e:
                failed.append((j[0], str(e)))
                print(f"[{done}/{len(JOBS)}] {j[0]}: FAIL {e}", flush=True)
    if failed:
        print("FAILED:", failed); sys.exit(1)
    print("all art generated")
