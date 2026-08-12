/* ============================================================
   DATA MODEL
   ============================================================ */

const TIERS = [
  { key:'common',     label:'Common',     min:0,            max:1,            cls:'t-common' },
  { key:'usual',       label:'Usual',       min:1,            max:250,          cls:'t-usual' },
  { key:'decent',      label:'Decent',      min:250,          max:1000,         cls:'t-decent' },
  { key:'rare',        label:'Rare',        min:1000,         max:7500,         cls:'t-rare' },
  { key:'unusual',     label:'Unusual',     min:7500,         max:30000,        cls:'t-unusual' },
  { key:'good',        label:'Good',        min:30000,        max:90000,        cls:'t-good' },
  { key:'epic',        label:'Epic',        min:90000,        max:250000,       cls:'t-epic' },
  { key:'pelicular',   label:'Pelicular',   min:250000,       max:1000000,      cls:'t-pelicular' },
  { key:'horizon',     label:'Horizon',     min:1000000,      max:7500000,      cls:'t-horizon' },
  { key:'grandiose',   label:'Grandiose',   min:7500000,      max:30000000,     cls:'t-grandiose' },
  { key:'zenith',      label:'Zenith',      min:30000000,     max:100000000,    cls:'t-zenith' },
  { key:'unworldly',   label:'Unworldly',   min:100000000,    max:1000000000,   cls:'t-unworldly' },
  { key:'colossal',    label:'Colossal',    min:1000000000,   max:25000000000,  cls:'t-colossal' },
  { key:'infinite',    label:'Infinite',    min:25000000000,  max:70000000000,  cls:'t-infinite' },
  { key:'insanity',    label:'Insanity',    min:70000000000,  max:500000000000, cls:'t-insanity' },
  { key:'impossible',  label:'Impossible',  min:500000000000, max:Infinity,     cls:'t-impossible' },
];

// Troll rolls: 1/5,000 chance PER CLICK, no requirement on what you actually rolled. When it
// fires, the display briefly shows a genuinely Unworldly+ rank from your current area — using
// its real name and real listed rarity — for 3 seconds before snapping back to reveal your
// actual result. Looks completely legitimate; there's no way to tell it's fake until it flips.
// Purely cosmetic — never touches inventory, log, or stats. The real result is already committed
// to state before this ever runs.
const TROLL_CHANCE = 1 / 5000;
const TROLL_TIER_KEYS = ['unworldly','colossal','infinite','insanity','impossible'];

// Picks a random Unworldly+ rank (or mutation) from the given area. Excludes the actual roll's
// name if it happens to also be Unworldly+, so the fake is always visibly different from the
// truth when possible. Returns null if the area has no Unworldly+ ranks at all.
function rollTrollFake(area, excludeName){
  const candidates = [];
  for(const r of area.ranks){
    if(TROLL_TIER_KEYS.includes(tierFor(r.rng).key) && r.name !== excludeName){
      candidates.push({ name:r.name, rng:r.rng, isMutation:false });
    }
    if(r.mutations){
      for(const m of r.mutations){
        if(TROLL_TIER_KEYS.includes(tierFor(m.rng).key) && m.name !== excludeName){
          candidates.push({ name:m.name, rng:m.rng, isMutation:true });
        }
      }
    }
  }
  if(candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Increments on every doRoll; lets a pending troll reveal-timeout check if it's still current
let rollGeneration = 0;
const SECRET_TIER = { key:'secret', label:'Secret', min:-1, max:-1, cls:'t-secret' };

function tierFor(rng){
  for(const t of TIERS){
    if(rng > t.min && rng <= t.max) return t;
  }
  if(rng <= 1) return TIERS[0];
  return TIERS[TIERS.length-1];
}

/* ============================================================
   PER-RANK VISUAL IDENTITY
   Every individual rank name gets its own deterministic color (or gradient, for tiers that
   "deserve" one) and font, layered ON TOP of the shared tier-color system. Tier still tells you
   the rarity bucket at a glance; this makes every rank within that bucket feel distinct instead
   of every Zenith-tier item looking identical. Fully deterministic from the rank's own name, so
   it's stable across sessions/devices without needing to store anything.
   ============================================================ */

// Small deterministic string hash (djb2-ish) — same rank name always produces the same hash,
// so its color/font stay consistent everywhere it's displayed (stage, log, inventory, index).
function hashRankName(name){
  let h = 5381;
  for(let i = 0; i < name.length; i++){
    h = ((h << 5) + h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Curated font profiles built from the loaded Google Fonts set. Each rank deterministically
// picks one based on its name hash, so the same rank always renders in the same font.
const RANK_FONT_PROFILES = [
  { family:"'Playfair Display', serif", weight:800, style:'normal', spacing:'0' },
  { family:"'Bebas Neue', sans-serif",   weight:400, style:'normal', spacing:'0.03em' },
  { family:"'Caveat', cursive",          weight:700, style:'normal', spacing:'0.01em' },
  { family:"'UnifrakturMaguntia', cursive", weight:400, style:'normal', spacing:'0' },
  { family:"'Press Start 2P', monospace", weight:400, style:'normal', spacing:'-0.02em' },
  { family:"'Orbitron', sans-serif",     weight:800, style:'normal', spacing:'0.02em' },
  { family:"'Pacifico', cursive",        weight:400, style:'normal', spacing:'0' },
  { family:"'Rubik Mono One', sans-serif", weight:400, style:'normal', spacing:'-0.01em' },
  { family:"'Abril Fatface', serif",     weight:400, style:'normal', spacing:'0' },
  { family:"'VT323', monospace",         weight:400, style:'normal', spacing:'0.03em' },
  { family:"'Righteous', sans-serif",    weight:400, style:'normal', spacing:'0.01em' },
  { family:"'Space Grotesk', sans-serif", weight:700, style:'italic', spacing:'0' },
  { family:"'Cinzel', serif",            weight:900, style:'normal', spacing:'0.02em' },
  { family:"'JetBrains Mono', monospace", weight:700, style:'normal', spacing:'0' },
];

// Tiers "rare enough to deserve" a gradient instead of a flat color, mirroring where the shared
// tier system itself already starts using gradients (Zenith and up).
const GRADIENT_WORTHY_TIERS = new Set(['zenith','unworldly','colossal','infinite','insanity','impossible']);

// Returns { fontFamily, fontWeight, fontStyle, letterSpacing, colorCss, isGradient } for a rank,
// deterministic from its name. colorCss is either a flat CSS color or a `linear-gradient(...)`
// string ready to drop into background + -webkit-background-clip:text.
function rankVisualIdentity(name, tierKey){
  const hash = hashRankName(name);
  const font = RANK_FONT_PROFILES[hash % RANK_FONT_PROFILES.length];

  // Base hue from the hash, spread across the full wheel
  const hue = hash % 360;
  const wantsGradient = GRADIENT_WORTHY_TIERS.has(tierKey);

  let colorCss, isGradient;
  if(wantsGradient){
    // 3-stop gradient using nearby hues for cohesion, offset by a second hash pass for variety
    const hue2 = (hash >> 5) % 360;
    const spread = 55 + (hash % 40); // 55-95 degree spread between stops
    const hA = hue2;
    const hB = (hue2 + spread) % 360;
    const hC = (hue2 + spread * 2) % 360;
    colorCss = `linear-gradient(90deg, hsl(${hA},85%,68%), hsl(${hB},90%,72%), hsl(${hC},85%,68%))`;
    isGradient = true;
  } else {
    // Flat color, tuned for readability against the dark background
    const sat = 55 + (hash % 30);   // 55-85%
    const light = 62 + (hash % 18); // 62-80%
    colorCss = `hsl(${hue}, ${sat}%, ${light}%)`;
    isGradient = false;
  }

  return {
    fontFamily: font.family,
    fontWeight: font.weight,
    fontStyle: font.style,
    letterSpacing: font.spacing,
    colorCss,
    isGradient,
  };
}

// Builds an inline `style` attribute string applying a rank's unique color/font. If the rank is
// gradient-worthy, this includes background-clip text tricks; otherwise a flat color.
function rankVisualStyleAttr(name, tierKey){
  const v = rankVisualIdentity(name, tierKey);
  const base = `font-family:${v.fontFamily}; font-weight:${v.fontWeight}; font-style:${v.fontStyle}; letter-spacing:${v.letterSpacing};`;
  if(v.isGradient){
    return `${base} background:${v.colorCss}; background-size:200% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; animation:hueflow 3s linear infinite;`;
  }
  return `${base} color:${v.colorCss};`;
}

// FONT ONLY — no color/background. Used for the variant .vlayer overlay, which must render text
// at the exact same glyph shape/width as the base layer underneath it (same font-family/weight/
// style/letter-spacing) so the two layers align pixel-for-pixel. The variant's own CSS class
// (.v-weird, .v-rainbow, etc.) then supplies ONLY the color/tint on top of this matching shape —
// without this, the overlay would render in some other ambient font and visibly peek out from
// behind the base text as extra, misaligned characters.
function rankVisualFontOnlyStyleAttr(name){
  // tierKey doesn't affect font selection (only color/gradient does), so any tierKey value works
  // here — font choice is purely a function of the rank's name via hashRankName.
  const v = rankVisualIdentity(name, null);
  return `font-family:${v.fontFamily}; font-weight:${v.fontWeight}; font-style:${v.fontStyle}; letter-spacing:${v.letterSpacing};`;
}

const VARIANT_CHAIN = [
  { key:'weird',     label:'Weird',     rng:15, mult:15, cls:'v-weird' },
  { key:'odd',       label:'Odd',       rng:20, mult:20, cls:'v-odd' },
  { key:'rainbow',   label:'Rainbow',   rng:10, mult:10, cls:'v-rainbow' },
  { key:'grayscale', label:'Grayscale', rng:25, mult:25, cls:'v-grayscale' },
];

function rollVariant(){
  let current = null;
  let totalMult = 1;
  for(const v of VARIANT_CHAIN){
    if(Math.random() < 1/v.rng){
      current = v;
      totalMult *= v.mult;
    } else {
      break;
    }
  }
  return current ? { ...current, totalMult } : null;
}

/* ============================================================
   SECRET RANKS
   - Never appear in the rank index until discovered.
   - Rarity always displays as "???" everywhere, even after being found.
   - True rng, completely unaffected by luck multipliers or buffs.
   - Each has its own bespoke unlock condition, checked once per manual roll.
   ============================================================ */

const SECRET_RANKS = [
  {
    key:'serpent_optics',
    name:'Serpent Optics',
    trueRng: 11111,
    worldKey: 'subworld1', // must be in Subworld 1 (either area)
    condition(world, area){
      // Total rolled must contain "11" somewhere in its digits
      if(!String(state.rolls).includes('11')) return false;
      // The area's own common (first/lowest-rng rank) owned count must contain "11" in its digits
      const common = area.ranks[0];
      const commonCount = getOwnedCount(area.label, common.name, null);
      if(!String(commonCount).includes('11')) return false;
      // Local time must be xx:11
      const now = new Date();
      if(now.getMinutes() !== 11) return false;
      return true;
    },
  },
  {
    key:'hot_potato',
    name:'Hot Potato',
    trueRng: 7777,
    worldKey: 'world1', // must be in World 1, Natural area specifically
    areaKey: 'natural',
    condition(world, area){
      // Total rolled must be odd
      if(state.rolls % 2 === 0) return false;
      // Current second must be a multiple of 7
      const now = new Date();
      if(now.getSeconds() % 7 !== 0) return false;
      // Must currently be holding zero of the area's rarest OWNED item (i.e. haven't found the area's best yet)
      // — keeps it from trivially firing for veteran players parked on the area
      return true;
    },
  },
  {
    key:'tile_0',
    name:'Tile 0',
    worldKey: 'world0', areaKey: '2048', // must be in Fun -> 2048
    // 1/750,000 normally, but 1/200,000 specifically at the top of the hour (:00) — trueRng can be
    // a function evaluated at roll time instead of a flat number, for conditional rarity like this.
    trueRng(world, area){
      const now = new Date();
      return now.getMinutes() === 0 ? 200000 : 750000;
    },
    condition(world, area){
      const now = new Date();
      // Minute must end in 0 (:00, :10, :20, :30, :40, :50)
      if(now.getMinutes() % 10 !== 0) return false;
      // Total rolls must end in exactly one '0' — the last digit is 0, and no OTHER digit is 0
      // (e.g. 65,430 counts; 652,401 does not; 100 does not since there's a second zero before the last)
      const s = String(state.rolls);
      if(!s.endsWith('0')) return false;
      if(s.slice(0, -1).includes('0')) return false;
      return true;
    },
  },
  {
    key:'ampersand',
    name:'&',
    trueRng: 26900000,
    worldKey: 'world0', areaKey: 'abc', // must be in Fun -> ABC
    condition(world, area){
      // "&" stands in for "and" — the connector between letters. It used to just check the last
      // two log entries, but with high-bulk axes almost every click's BEST result in ABC is some
      // plain letter anyway, so "two different plain letters in a row" was trivial to satisfy on
      // repeat clicks. The real condition now requires a genuinely specific alignment instead:
      //   1) Your last FOUR logged catches in this area must alternate consonant/vowel/consonant/vowel
      //      (or vowel/consonant/vowel/consonant) — i.e. a real A-B-A-B letter-TYPE pattern, not just
      //      "any two different letters" — and all four must be plain (no variants).
      //   2) Those four letters, read in order, must spell out something whose combined alphabet
      //      positions sum to a multiple of 26 (a full trip around the alphabet) — ties the trigger
      //      to the actual VALUES of the letters you rolled, not just their type pattern.
      //   3) Your total rolls at the moment of check must be a multiple of 26.
      if(state.log.length < 4) return false;
      if(state.rolls % 26 !== 0) return false;

      const VOWELS = new Set(['A','E','I','O','U']);
      const four = state.log.slice(0, 4);
      const isPlainLetter = (r) => !r.isSecret && !r.variant && r.areaLabel === area.label && /^[A-Z]$/.test(r.name);
      if(!four.every(isPlainLetter)) return false;

      const types = four.map(r => VOWELS.has(r.name) ? 'V' : 'C');
      const alternatesCV = types[0]==='C' && types[1]==='V' && types[2]==='C' && types[3]==='V';
      const alternatesVC = types[0]==='V' && types[1]==='C' && types[2]==='V' && types[3]==='C';
      if(!alternatesCV && !alternatesVC) return false;

      const posSum = four.reduce((sum, r) => sum + (r.name.charCodeAt(0) - 64), 0); // A=1..Z=26
      if(posSum % 26 !== 0) return false;

      return true;
    },
  },
  {
    key:'secret_tier',
    name:'Secret Tier',
    trueRng: 50000000,
    worldKey: 'world0', areaKey: 'tiers', // must be in Fun -> Tiers
    condition(world, area){
      // Requires the FULL collection of every OTHER secret rank — the plain version AND all 4
      // variants (weird/odd/rainbow/grayscale) of each. Excludes itself, or this would be
      // permanently impossible to obtain (you'd need to already have it to be eligible for it).
      for(const other of SECRET_RANKS){
        if(other.key === 'secret_tier') continue;
        if(!isSecretDiscovered(other.key, null)) return false;
        for(const v of VARIANT_CHAIN){
          if(!isSecretDiscovered(other.key, v.key)) return false;
        }
      }
      return true;
    },
  },
];

// Checks all secret rank conditions for the given world/area and returns a winning secret roll, or null.
// Each eligible secret gets its own independent true-rng roll; if multiple hit, the rarest trueRng wins.
// Secrets can roll variants (Weird/Odd/Rainbow/Grayscale) exactly like normal ranks — each variant
// of a secret counts as its own separate discovery (used by Secret Tier's full-collection check).
function rollSecretForArea(world, area){
  let winner = null;
  let winnerTrueRng = null;
  for(const secret of SECRET_RANKS){
    if(secret.worldKey && secret.worldKey !== world.key) continue;
    if(secret.areaKey && secret.areaKey !== area.key) continue;
    if(!secret.condition(world, area)) continue;
    const resolvedTrueRng = typeof secret.trueRng === 'function' ? secret.trueRng(world, area) : secret.trueRng;
    if(Math.random() < 1 / resolvedTrueRng){
      if(!winner || resolvedTrueRng > winnerTrueRng){
        winner = secret;
        winnerTrueRng = resolvedTrueRng;
      }
    }
  }
  if(!winner) return null;
  const variant = rollVariant();
  const finalRng = variant ? winnerTrueRng * variant.totalMult : winnerTrueRng;
  return {
    name: winner.name,
    baseRng: winnerTrueRng,
    finalRng,
    tier: SECRET_TIER,
    variant,
    areaLabel: area.label,
    isSecret: true,
    secretKey: winner.key,
  };
}

function isSecretDiscovered(key, variantKey){
  if(!state.discoveredSecrets) return false;
  const lookupKey = variantKey ? `${key}|${variantKey}` : key;
  return !!state.discoveredSecrets[lookupKey];
}

function markSecretDiscovered(key, variantKey){
  if(!state.discoveredSecrets) state.discoveredSecrets = {};
  const lookupKey = variantKey ? `${key}|${variantKey}` : key;
  if(!state.discoveredSecrets[lookupKey]){
    state.discoveredSecrets[lookupKey] = Date.now();
    dbSaveMeta();
    // Live-refresh the Secrets panel if it's currently the open view, so a fresh discovery
    // shows up immediately without needing to switch tabs away and back.
    if(typeof currentView !== 'undefined' && currentView === 'index') buildSecretsAccordion();
  }
}

const WORLD1 = {
  key:'world1',
  label:'World 1',
  global: [
    { name:'Destiny', rng:1770000000000 },
  ],
  areas:[
    {
      key:'natural', label:'Natural',
      ranks:[
        { name:'Dirt', rng:1, mutations:[{name:'Dirtiverse', rng:50000000000}] },
        { name:'Blade of Grass', rng:4 },
        { name:'Rock', rng:6 },
        { name:'Flower', rng:10 },
        { name:'Plant', rng:25 },
        { name:'Water', rng:50 },
        { name:'Crystal', rng:100, mutations:[{name:'Apocalypse Crystal', rng:6660000000}] },
        { name:'Silver', rng:250 },
        { name:'Wood', rng:500 },
        { name:'Creature', rng:1000 },
        { name:'Disaster', rng:6000 },
        { name:'Fire', rng:15000, mutations:[{name:'Plasmaspark', rng:17500000}] },
        { name:'Life', rng:75000, mutations:[{name:'Corruption', rng:250000}] },
        { name:'Sporebloom', rng:1000000 },
        { name:'Ruins', rng:5000000, mutations:[{name:'La Ville Perdue', rng:100000000000}] },
        { name:'Leviathan', rng:30000000 },
        { name:'Lunar', rng:75000000, mutations:[{name:'Lunar Oblivion', rng:3250000000}] },
        { name:'Moon', rng:400000000 },
        { name:'Universal', rng:725000000000 },
      ]
    },
    {
      key:'wasteland', label:'Wasteland',
      ranks:[
        { name:'Pollution', rng:1 },
        { name:'Broken Device', rng:5, mutations:[{name:'Electronic', rng:2500}] },
        { name:'Ruincrystal', rng:75 },
        { name:'Corruption Fragment', rng:315, mutations:[{name:'Doomcrystal', rng:666000000}] },
        { name:'Junk Producer', rng:750 },
        { name:'Fragments', rng:5000 },
        { name:'Unfunctional Tool', rng:12500 },
        { name:'Slop', rng:50000, mutations:[{name:'Goop Producer', rng:750000}] },
        { name:'Beyond Recognition Object', rng:175000 },
        { name:'Decayal Device', rng:2000000 },
        { name:'Destroyed Thing', rng:8000000 },
        { name:'Entropy', rng:50000000, mutations:[{name:'Destruction', rng:7000000000}] },
        { name:'Garbage Compacter', rng:200000000 },
        { name:'Obliterator', rng:750000000 },
      ]
    },
    {
      key:'dreamland', label:'Dreamland',
      ranks:[
        { name:'Dreamstone', rng:1 },
        { name:'Star', rng:15 },
        { name:'Cloud', rng:80 },
        { name:'Swirl', rng:500 },
        { name:'Illusion Crystal', rng:3000 },
        { name:'Rainbow Fragment', rng:17000 },
        { name:'Dream Powder', rng:56000, mutations:[{name:'Heavenly Mist', rng:1000000}] },
        { name:'Sparkles', rng:128000 },
        { name:'Pearl', rng:700000, mutations:[{name:'Pearlscence', rng:55555555}] },
        { name:'Heavenly', rng:2500000, mutations:[{name:'Ascended', rng:125000000}] },
        { name:'Aurora Borealis', rng:7500000, mutations:[{name:'Galactic Harmony', rng:700000000000}] },
        { name:'Imaginary', rng:680000000, mutations:[{name:'Starglass', rng:20000000000}] },
        { name:'Dreamcore', rng:700000000000 }
      ]
    },
  ]
};

const SUBWORLD1 = {
  key:'subworld1',
  label:'Subworld 1',
  global: [],
  areas:[
    {
      key:'fridge', label:'The Fridge',
      ranks:[
        { name:'Fridge-ium', rng:1 },
        { name:'Water', rng:80000 },
        { name:'Cheese', rng:200000 },
        { name:'Leftover Burger', rng:800000 },
        { name:'Fruits', rng:2850000 },
        { name:'Eggs', rng:59610000 },
        { name:'A Cat', rng:300000000 },
        { name:'PIZZA', rng:9300000000 },
        { name:'Orange', rng:70000000000, mutations:[{name:'Universe Sized Apple Made For Destroying Universes Without Orange', rng:200000000000}] },
        { name:'Fish', rng:6900000000000 },
      ]
    },
    {
      key:'scaryland', label:'Scary Land',
      ranks:[
        { name:'SCARY', rng:1.000666 },
        { name:'GHOST', rng:66 },
        { name:'Mosquito', rng:700 },
        { name:'A', rng:5000 },
        { name:'Loser', rng:10660 },
        { name:'You Not Get This', rng:66666 },
        { name:'Not So Epic', rng:100000, mutations:[{name:'So Epic!!!', rng:10000000000}] },
        { name:'The Probably Rarest Thing Ever', rng:10000000 },
      ]
    },
    {
      // [Gimmick] While err.redirector isn't active, every rank caught here has its displayed
      // rarity (the "1 in N" number) garbled with random symbols — everywhere it's shown
      // (roll stage, log, inventory). The name itself always stays fully readable. Garbling is
      // fixed per-catch (deterministic from the result), not re-randomized on every render.
      key:'404', label:'404',
      truncated:true,
      ranks:[
        { name:'missing', rng:1 },
        { name:'not found', rng:404, mutations:[{name:'GONE.', rng:41000000000}] },
        { name:'undefined', rng:666 },
        { name:'corruption', rng:3333, mutations:[{name:'NIL', rng:4040000000}] },
        { name:'NaN', rng:40400 },
        { name:'Bad Request', rng:80808 },
        { name:'FORBIDDEN.', rng:403000 },
        { name:'TIMEOUT', rng:8000000 },
        { name:'UNAUTHORIZED.', rng:40000000 },
        { name:'NULL', rng:666000000 },
        { name:'DENIAL', rng:18000000000 },
        { name:'NO CONTENT.', rng:24040000000 },
        { name:'MISDIRECTED', rng:40400000000 },
        { name:'dreamcore', rng:4040000000000 },
      ]
    },
    {
      key:'factoritization', label:'Factoritization',
      ranks:[
        { name:'ONE', rng:1 },
        { name:'TWO', rng:2 },
        { name:'THREE', rng:6 },
        { name:'FOUR', rng:24 },
        { name:'FIVE', rng:120 },
        { name:'SIX', rng:720 },
        { name:'SEVEN', rng:5040 },
        { name:'EIGHT', rng:40320 },
        { name:'NINE', rng:362880 },
        { name:'TEN', rng:3628800 },
        { name:'ELEVEN', rng:39916800 },
        { name:'TWELVE', rng:479001600 },
        { name:'THIRTEEN', rng:6227020800 },
        { name:'FOURTEEN', rng:87178291200 },
        { name:'FINALE', rng:1307674368000 },
      ]
    },
  ]
};

const WORLD0 = {
  key:'world0',
  label:'Fun',
  global: [],
  areas:[
    {
      key:'2048', label:'2048',
      ranks:[
        { name:'Tile 1', rng:1 },
        { name:'Tile 2', rng:2 },
        { name:'Tile 4', rng:4 },
        { name:'Tile 8', rng:8 },
        { name:'Tile 16', rng:16 },
        { name:'Tile 32', rng:32 },
        { name:'Tile 64', rng:64 },
        { name:'Tile 128', rng:128 },
        { name:'Tile 256', rng:256 },
        { name:'Tile 512', rng:512 },
        { name:'Tile 1k', rng:1024 },
        { name:'Tile 2k', rng:2048 },
        { name:'Tile 4k', rng:4096 },
        { name:'Tile 8k', rng:8192 },
        { name:'Tile 16k', rng:16384 },
        { name:'Tile 32k', rng:32768 },
        { name:'Tile 65k', rng:65536 },
        { name:'Tile 131k', rng:131072 },
        { name:'Tile 262k', rng:262144 },
        { name:'Tile 524k', rng:524288 },
        { name:'Tile 1m', rng:1048576 },
        { name:'Tile 2m', rng:2097152 },
        { name:'Tile 4m', rng:4194304 },
        { name:'Tile 8m', rng:8388608 },
        { name:'Tile 16m', rng:16777216 },
        { name:'Tile 33m', rng:33554432 },
        { name:'Tile 67m', rng:67108864 },
        { name:'Tile 134m', rng:134217728 },
        { name:'Tile 268m', rng:268435456 },
        { name:'Tile 536m', rng:536870912 },
        { name:'Tile 1b', rng:1073741824 },
        { name:'Tile 2b', rng:2147483648 },
        { name:'Tile 4b', rng:4294967296 },
        { name:'Tile 8b', rng:8589934592 },
        { name:'Tile 17b', rng:17179869184 },
        { name:'Tile 34b', rng:34359738368 },
        { name:'Tile 68b', rng:68719476736 },
        { name:'Tile 137b', rng:137438953472 },
        { name:'Tile 274b', rng:274877906944 },
        { name:'Tile 549b', rng:549755813888 },
        { name:'Tile 1t', rng:1099511627776 },
      ]
    },
    {
      key:'abc', label:'ABC',
      ranks:[
        { name:'A', rng:4 }, { name:'B', rng:20 }, { name:'C', rng:73 }, { name:'D', rng:224 }, { name:'E', rng:626 },
        { name:'F', rng:1646 }, { name:'G', rng:4149 }, { name:'H', rng:10137 }, { name:'I', rng:24192 }, { name:'J', rng:56668 },
        { name:'K', rng:130755 }, { name:'L', rng:297968 }, { name:'M', rng:671959 }, { name:'N', rng:1501931 }, { name:'O', rng:3331385 },
        { name:'P', rng:7340032 }, { name:'Q', rng:16077605 }, { name:'R', rng:35033758 }, { name:'S', rng:75986837 }, { name:'T', rng:164128105 },
        { name:'U', rng:353180649 }, { name:'V', rng:757411639 }, { name:'W', rng:1619271615 }, { name:'X', rng:3452031954 }, { name:'Y', rng:7340032000 },
        { name:'Z', rng:15569618022 },
      ]
    },
    {
      key:'tiers', label:'Tiers',
      ranks:[
        { name:'Common', rng:1 }, { name:'Usual', rng:25 }, { name:'Decent', rng:251 }, { name:'Rare', rng:1001 },
        { name:'Unusual', rng:7501 }, { name:'Good', rng:30001 }, { name:'Epic', rng:90001 }, { name:'Pelicular', rng:250001 },
        { name:'Horizon', rng:1000001 }, { name:'Grandiose', rng:7500001 }, { name:'Zenith', rng:30000001 }, { name:'Unworldly', rng:100000001 },
        { name:'Colossal', rng:1000000001 }, { name:'Infinite', rng:25000000001 }, { name:'Insanity', rng:70000000001 }, { name:'Impossible', rng:500000000001 },
      ]
    },
    {
      key:'gimmicks', label:'Gimmicks',
      ranks:[
        { name: 'Gimmick Crystal', rng: 1 },
        { name: 'Weakling', rng: 25, requirement: 'Have Puny Thingy equipped', condition: () => currentEquip() && currentEquip().key === 'punything' },
        { name: 'Default Axe', rng: 500, requirement: 'Have Default Axe equipped', condition: () => currentAxe().key === 'default' },
        { name: 'Pushpin', rng: 1000, requirement: 'Must have Pushpin active', condition: () => state.activeBuffs && state.activeBuffs.pushpin && state.activeBuffs.pushpin.rollsLeft > 0 },
        { name: 'Thumbtacks', rng: 1750, requirement: 'Have any recipe pinned', condition: () => state.pinnedRecipe && state.pinnedRecipe.key },
        { name: 'Crude Axe', rng: 2000, requirement: 'Have Crude Axe equipped', condition: () => currentAxe().key === 'crude' },
        { name: 'Destructive Destroyed Destroyer', rng: 3500, requirement: 'Have Destructive Destroyed Destroyer equipped', condition: () => currentAxe().key === 'destroyer' },
        { name: 'Disaster Bringer', rng: 5000, requirement: 'Have Disaster Bringer equipped', condition: () => currentAxe().key === 'disaster' },
        { name: 'Welcome Back', rng: 7500, requirement: 'Come back after 1h or longer idle time', condition: (w, a, opts) => opts.isOffline && state.lastOfflineElapsed >= 3600 },
        { name: 'Potato But Cold', rng: 7777, requirement: 'Meet same requirements as Hot Potato but in this area', condition: () => (state.rolls % 2 !== 0) && (new Date().getSeconds() % 7 === 0) },
        { name: 'Trophy', rng: 10000, requirement: 'Get something rarer than 1/100m today', condition: () => state.best && state.best.finalRng >= 100000000 },
        { name: 'Snek Eys', rng: 11111, requirement: "Have '11' anywhere in your rolls", condition: () => String(state.rolls).includes('11') },
        { name: 'Dark Axe', rng: 16666, requirement: 'Have Dark Axe equipped', condition: () => currentAxe().key === 'dark' },
        { name: 'And Sand', rng: 20006, requirement: "Have '26' anywhere in your rolls", condition: () => String(state.rolls).includes('26') },
        { name: 'Food Eater', rng: 25000, requirement: 'Have Food Eater equipped', condition: () => currentAxe().key === 'foodeater' },
        { name: 'Emblem of the Jackpot', rng: 30000, requirement: 'Have Emblem of the Jackpot equipped', condition: () => currentAxe().key === 'emblem' },
        { name: 'Dreamers Prism', rng: 50000, requirement: "Have Dreamer's Prism equipped", condition: () => currentAxe().key === 'dreamersprism' },
        { name: 'Tail Zero', rng: 65000, requirement: 'Time must end in x:x0', condition: () => new Date().getMinutes() % 10 === 0 },
        { name: 'Sentient Watergun', rng: 75000, requirement: 'Have Sentient Watergun active', condition: () => state.activeBuffs && state.activeBuffs.watergun && state.activeBuffs.watergun.rollsLeft > 0 },
        { name: 'Universal Recipe Gloves', rng: 80000, requirement: 'Have Universal Recipe Gloves active', condition: () => state.activeBuffs && state.activeBuffs.gloves && state.activeBuffs.gloves.rollsLeft > 0 },
        { name: 'Glowaxe', rng: 100000, requirement: 'Have Glowaxe equipped', condition: () => currentAxe().key === 'glowaxe' },
        { name: 'Coin Bag', rng: 222000, requirement: 'Must have Coin Bag equipped', condition: () => currentEquip() && currentEquip().key === 'coinbag' },
        { name: 'Bedtime', rng: 500000, requirement: 'Have AFK time be higher than 1d when you return', condition: (w, a, opts) => opts.isOffline && state.lastOfflineElapsed >= 86400 },
        { name: 'Day', rng: 750000, requirement: 'Must be daytime', condition: () => { const h = new Date().getHours(); return h >= 6 && h < 18; } },
        { name: 'Night', rng: 1000000, requirement: 'Must be night', condition: () => { const h = new Date().getHours(); return h < 6 || h >= 18; } },
        { name: 'Explosive Axe Bomb', rng: 5000000, requirement: 'Must be rolled from Explosive Axe Bombs usage', condition: (w, a, opts) => opts.isBomb },
        { name: 'Vitamin Axey', rng: 13333000, requirement: 'Must have Vitamin Axey equipped', condition: () => currentEquip() && currentEquip().key === 'vitaminaxey' },
        { name: 'Silkinator', rng: 17500000, requirement: 'Must use Silkinator', condition: () => currentAxe().key === 'silkinator' },
        { name: 'Geomathaxe', rng: 60000000, requirement: 'Must use Geomathaxe', condition: () => currentAxe().key === 'geomathaxe' },
        { name: 'Bland Axe', rng: 70000000, requirement: 'Must use Bland Axe', condition: () => currentAxe().key === 'blandaxe' },
        { name: 'Magic Wand', rng: 90000000, requirement: 'Must use Magic Wand', condition: () => currentAxe().key === 'magicwand' },
        { name: 'Rage Axe', rng: 250000000, requirement: 'Must use Rage Axe', condition: () => currentAxe().key === 'rageaxe' },
        { name: 'God Axe', rng: 12500000000, requirement: 'Must use God Axe', condition: () => currentAxe().key === 'godaxe' },
        { name: 'nan.axe', rng: 4040000000, requirement: 'Must use nan.axe', condition: () => currentAxe().key === 'nanaxe' },
        { 
          name: 'Specific Minute', rng: 80000000, requirement: 'Can only be rolled at a random minute per hour',
          condition: () => {
            const now = new Date();
            const targetMin = (now.getHours() * 17 + 42) % 60;
            return now.getMinutes() === targetMin;
          }
        },
        { name: 'Axe in a Potted Plant', rng: 99999999, requirement: 'Must have Axe in a Potted Plant equipped', condition: () => currentEquip() && currentEquip().key === 'pottedplant' },
        { 
          name: 'Youre Winner', rng: 125000000, requirement: 'Must have all ranks less rare or equal to 1/1,000,000,000 in any area',
          condition: (w, a, opts) => {
            for(const world of WORLDS) for(const area of world.areas) for(const r of area.ranks) if(r.rng >= 1000000000 && !hasEverFoundRank(area.label, r.name)) return false;
            return true;
          }
        },
        { 
          name: 'Bootleg Tier', rng: 200000000, requirement: 'Have Tail Zero found, Snek Eys, Potato But Cold, and And Sand found here',
          condition: () => hasEverFoundRank('2048', 'Tile 0') && hasEverFoundRank('Gimmicks', 'Snek Eys') && hasEverFoundRank('Gimmicks', 'Potato But Cold') && hasEverFoundRank('Gimmicks', 'And Sand')
        },
        { name: 'Fishy Starsystem', rng: 265000000, requirement: 'Must have Fishy Starsystem equipped', condition: () => currentEquip() && currentEquip().key === 'fishystarsystem' },
        { 
          name: 'Lord of Requirements', rng: 300000000, requirement: 'Have 10 or more requirements active',
          condition: (world, area, opts) => {
            let active = 0;
            for(const r of area.ranks) {
                if (r.name === 'Lord of Requirements') continue;
                if(r.condition && r.condition(world, area, {})) active++;
            }
            return active >= 10;
          }
        },
        { name: '3 AM Demon', rng: 666666666, requirement: 'Time must be between 3 and 4 am', condition: () => new Date().getHours() === 3 },
        { 
          name: 'Sakura Tree', rng: 700000000, requirement: 'Only rollable on Sundays, the hour before it becomes Monday',
          condition: () => { const now = new Date(); return now.getDay() === 0 && now.getHours() === 23; }
        },
        { name: 'Portable Rechargable Axenades', rng: 750000000, requirement: 'Have Portable Rechargable Axenades equipped', condition: () => currentEquip() && currentEquip().key === 'axenades' },
        { name: 'Trollstone', rng: 3, requirement: 'Has a chance to appear next roll if youve been troll rolled', condition: () => state.trollstoneEligible },
        { 
          name: 'U Win', rng: 1500000000, requirement: 'Can only spawn if you have found every OTHER rank rarer than or equal to 1/1,000,000,000 in this area',
          condition: (world, area, opts) => {
            for(const r of area.ranks) if(r.name !== 'U Win' && r.rng < 1000000000 && !hasEverFoundRank(area.label, r.name)) return false;
            return true;
          }
        },
      ]
    },
    {
      key:'lame', label:'LAME world',
      ranks:[
        { name: 'nothing', rng: 1 },
        { name: 'boringest thingy ever', rng: 30000000 },
        { name: 'lame crystal', rng: 80000000 },
        { name: 'boringite', rng: 300000000, mutations: [{ name: 'evil-ish rare boringite', rng: 999999999 }] },
        { name: 'nothing but its GIANT', rng: 8000000000 },
        { name: 'WASTELAND FROM WORLD 1 AREA 2', rng: 10000000000 },
        { name: 'something because nothing was boring', rng: 15000000000 },
        { name: 'great an infinite tier we dont need', rng: 55000000000 },
        { name: 'weird concept of nothing', rng: 70000000000 },
        { name: 'GO AWAY-IUM', rng: 250000000000 },
        { name: 'lightbulb', rng: 800000000000 },
      ]
    },
    {
      key:'all', label:'All', debuffMult:200, isUniversalPool:true,
      ranks:[]
    },
    {
      key:'placeholderland', label:'Placeholder Land',
      ranks:[
        { name:'Weird Fragment', rng:1 },
        { name:'Goofy Gring', rng:25 },
        { name:'H-ium', rng:169 },
        { name:'☢️', rng:400 },
        { name:'Canna Beans', rng:700 },
        { name:'A Trillionth Of A J', rng:1000, mutations:[{name:'The Rest Of The J', rng:1000000000000000}] },
        { name:'🥉', rng:2500, mutations:[{name:'🥈', rng:1000000}, {name:'🥇', rng:25000000000}] },
        { name:'Toilet', rng:15000, mutations:[{name:'GOLDEN TOILET AWARD', rng:200000000}] },
        { name:'Yummy Delicious Chocolate', rng:70000 },
        { name:'1 lb of Hair (eww)', rng:100001 },
        { name:'Air', rng:250000, mutations:[{name:'         ', rng:6900000000}] },
        { name:'Granky', rng:5555555 },
        { name:'Oumbaß', rng:12345678 },
        { name:'Eel', rng:39916800 },
        { name:'GLOVE', rng:52570000 },
        { name:'Comic Book', rng:100000000 },
        { name:'ELECTRIC BLANKET!!!', rng:333222111 },
        { name:'The Burger YOU Ate', rng:694200000 },
        { name:"'Every Area Needs A Rare Ass Thing' Shut Up Bro", rng:250000000000 },
        { name:'Botl Cap', rng:750000000000 },
      ]
    },
  ]
};

const WORLDS = [WORLD1, SUBWORLD1, WORLD0];

/* ---------- Craftable items (axes) ---------- */
const AXES = {
  default: {
    key:'default', name:'Default Axe',
    desc:'Nothing special. It just chops.',
    stats:{ luckMult:1, bulk:1, rps:0 },
    requires:[],
    free:true,
  },
  crude: {
    key:'crude', name:'Crude Axe',
    desc:'Your first axe. Happy?',
    stats:{ luckMult:1.5, bulk:2, rps:1.1 },
    requires:[
      { name:'Dirt', area:'Natural', amount:25 },
      { name:'Rock', area:'Natural', amount:6 },
      { name:'Blade of Grass', area:'Natural', amount:15 },
      { name:'Crystal', area:'Natural', amount:1 },
    ],
  },
  destroyer: {
    key:'destroyer', name:'Destructive Destroyed Destroyer',
    desc:'...an axe thats destructive, yet is destroyed? Ironic..',
    stats:{ luckMult:4, bulk:5, rps:3 },
    requires:[
      { name:'Pollution', area:'Wasteland', amount:5000 },
      { name:'Crystal', area:'Natural', amount:25 },
      { name:'Ruincrystal', area:'Wasteland', amount:100 },
      { name:'Junk Producer', area:'Wasteland', amount:3 },
      { name:'Fragments', area:'Wasteland', amount:1 },
    ],
  },
  disaster: {
    key:'disaster', name:'Disaster Bringer',
    desc:'Self explanatory name, lots of rolls BUT your luck is less!',
    stats:{ luckMult:0.85, bulk:8, rps:10 },
    requires:[
      { name:'Disaster', area:'Natural', amount:10 },
      { name:'Unfunctional Tool', area:'Wasteland', amount:3 },
      { name:'Slop', area:'Wasteland', amount:1 },
    ],
  },
  dark: {
    key:'dark', name:'Dark Axe',
    desc:'Darker then 0,0,0 in HEX?',
    stats:{ luckMult:6.66, bulk:6, rps:15 },
    bonus:'Offline: every second, 1/666 chance to add 6 rolls at ×66 luck.',
    offlineBonus:[{ intervalSeconds:1, chancePerInterval:1/666, minRolls:6, maxRolls:6, bonusLuckMult:66 }],
    requires:[
      { name:'Corruption Fragment', area:'Wasteland', amount:320 },
      { name:'Fire', area:'Natural', amount:20 },
      { name:'Rock', area:'Natural', amount:10, variant:'odd' },
      { name:'Silver', area:'Natural', amount:50 },
    ],
  },
  foodeater: {
    key:'foodeater', name:'Food Eater',
    desc:'*chew*',
    stats:{ luckMult:15, bulk:7, rps:20 },
    bonus:'Offline: every second, 1/20 chance to add 50 rolls at ×50 luck. On roll click: 1/70 chance to do 100 extra rolls at ×10 luck.',
    offlineBonus:[{ intervalSeconds:1, chancePerInterval:1/20, minRolls:50, maxRolls:50, bonusLuckMult:50 }],
    clickBonus:[{ oneIn:70, rolls:100, luckMult:10 }],
    requires:[
      { name:'Leftover Burger', area:'The Fridge', amount:3 },
      { name:'Water', area:'The Fridge', amount:20 },
      { name:'Fruits', area:'The Fridge', amount:1 },
    ],
  },
  dreamersprism: {
    key:'dreamersprism', name:"Dreamer's Prism",
    desc:'A shard of something that was never fully awake.',
    stats:{ luckMult:10, bulk:9, rps:27 },
    bonus:'Offline: every minute, 1 roll at ×5000 luck; every second, 1/900 chance to add 1k–2.5k rolls at ×25 luck. On roll click: 1/120 chance for 1 extra roll at ×1500 luck.',
    offlineBonus:[
      { intervalSeconds:60, chancePerInterval:1, minRolls:1, maxRolls:1, bonusLuckMult:5000 },
      { intervalSeconds:1, chancePerInterval:1/900, minRolls:1000, maxRolls:2500, bonusLuckMult:25 },
    ],
    clickBonus:[{ oneIn:120, rolls:1, luckMult:1500 }],
    requires:[
      { name:'Pearl', area:'Dreamland', amount:8 },
      { name:'Rainbow Fragment', area:'Dreamland', amount:250 },
      { name:'Heavenly Mist', area:'Dreamland', amount:5 },
    ],
  },
  emblem: {
    key:'emblem', name:'Emblem of the Jackpot',
    desc:'Every unfinished dream, one lucky pull closer.',
    stats:{ luckMult:1.77, bulk:17, rps:77 },
    bonus:'[Blessing] ×1.7 luck to every unfinished material in your pinned recipe. [Reach] Pinned materials can drop in any area, at ×5 rarity. [7 Leaf Clover] Offline every 7 min: +7 rolls at ×7,777 luck. [Big Wins] On roll: 1/777,777 for +777 rolls at ×777,777 luck. [Synergy Pushpin] While Pushpin is also active: an extra ×1.7 luck to the most COMMON unfinished material in your pinned recipe — stacks with Pushpin.',
    offlineBonus:[
      { intervalSeconds:420, chancePerInterval:1, minRolls:7, maxRolls:7, bonusLuckMult:7777 },
    ],
    clickBonus:[
      { oneIn:777777, rolls:777, luckMult:777777 },
    ],
    // Innate always-on pinning synergy — handled directly in rollOnceForArea
    blessingLuckMult: 1.7,
    reachRarityMult: 5,
    synergyPushpinLuckMult: 1.7,
    // Rank value: 1×Pearlscence(55,555,555) + 2×Aurora Borealis(15,000,000) + 2×Heavenly(5,000,000)
    //           + 3×Pearl(2,100,000) + 7×Rainbow Fragment(119,000) + 1×Illusion Crystal(3,000)
    //           + 222×Dreamstone(222) = 77,777,777 exactly ✓
    requires:[
      { name:'Pearlscence',      area:'Dreamland', amount:1   },
      { name:'Aurora Borealis',  area:'Dreamland', amount:2   },
      { name:'Heavenly',         area:'Dreamland', amount:2   },
      { name:'Pearl',            area:'Dreamland', amount:3   },
      { name:'Rainbow Fragment', area:'Dreamland', amount:7   },
      { name:'Illusion Crystal', area:'Dreamland', amount:1   },
      { name:'Dreamstone',       area:'Dreamland', amount:222 },
    ],
  },
  glowaxe: {
    key:'glowaxe', name:'GlowAxe',
    desc:'Carved from light that refuses to fade.',
    stats:{ luckMult:20, bulk:4, rps:15 },
    bonus:'[Lightburst] Every hour offline: +5,000 rolls at ×2,500 luck. [Guidance] On click: 1/500 for +25 rolls at ×10,000 luck. [Sunrays] Every 75th click: +50 rolls at ×2,000 luck.',
    offlineBonus:[
      { intervalSeconds:3600, chancePerInterval:1, minRolls:5000, maxRolls:5000, bonusLuckMult:2500 },
    ],
    clickBonus:[
      { oneIn:500, rolls:25, luckMult:10000 },
    ],
    sunrays:{ everyNClicks:75, rolls:50, luckMult:2000 },
    // Rank value: 3×Leviathan(90M) + 3×Entropy(150M) + 10×Pearl(7M) + 5×Fruits(14.25M) + 10×Heavenly(25M) ≈ 286.25M > 280M ✓
    requires:[
      { name:'Leviathan',  area:'Natural',    amount:3  },
      { name:'Entropy',    area:'Wasteland',  amount:3  },
      { name:'Pearl',      area:'Dreamland',  amount:10 },
      { name:'Fruits',     area:'The Fridge', amount:5  },
      { name:'Heavenly',   area:'Dreamland',  amount:10 },
    ],
  },
  silkinator: {
    key:'silkinator', name:'Silkinator',
    desc:'Spun from something that was never quite alive.',
    stats:{ luckMult:5, bulk:40, rps:625 },
    bonus:'[Spider Web] Offline every minute: +2,500 rolls at ×12.5 luck. [Creepy Crawlies] Offline every 22 min: 1/2.2 chance for +22,222 rolls at ×22.2 luck.',
    offlineBonus:[
      { intervalSeconds:60, chancePerInterval:1, minRolls:2500, maxRolls:2500, bonusLuckMult:12.5 },
      { intervalSeconds:1320, chancePerInterval:1/2.2, minRolls:22222, maxRolls:22222, bonusLuckMult:22.2 },
    ],
    // Rank value: 1×Moon(400M) + 1×Garbage Compacter(200M) + 3×Leviathan(90M) + 5×Aurora Borealis(37.5M) + 2×The Probably Rarest Thing Ever(20M) + 5×Leftover Burger(4M) + 10×Heavenly(25M) ≈ 776.5M > 775M ✓
    requires:[
      { name:'Moon',                        area:'Natural',    amount:1  },
      { name:'Garbage Compacter',           area:'Wasteland',  amount:1  },
      { name:'Leviathan',                   area:'Natural',    amount:3  },
      { name:'Aurora Borealis',             area:'Dreamland',  amount:5  },
      { name:'The Probably Rarest Thing Ever', area:'Scary Land', amount:2 },
      { name:'Leftover Burger',             area:'The Fridge', amount:5  },
      { name:'Heavenly',                    area:'Dreamland',  amount:10 },
    ],
  },
  geomathaxe: {
    key:'geomathaxe', name:'GeomathAxe',
    desc:'It does math. That\'s it. That\'s the axe.',
    stats:{ luckMult:0.314, bulk:1618, rps:628 },
    bonus:'[Addition] Offline every minute: +628 rolls at ×314 luck. [Division] Every 5th click: +300 rolls at ÷0.02 luck and ÷0.666667 mutation luck (that\'s ×50 luck and ×1.5 mutation luck once you flip the exponent — not a nerf). [Multiplication] Every minute: 1/5 for +5n rolls at ×16.18 luck, where n = (hours offline so far) × 5, capped at 1,000 rolls per trigger.',
    offlineBonus:[
      { intervalSeconds:60, chancePerInterval:1, minRolls:628, maxRolls:628, bonusLuckMult:314 },
      {
        intervalSeconds:60, chancePerInterval:1/5, bonusLuckMult:16.18,
        // [Multiplication]: rolls = min(5 * (hoursIdleAtThisTick * 5), 1000), rounded to an integer.
        // tickIndex * intervalSeconds / 3600 = hours elapsed at the moment this specific tick fires.
        dynamicRolls(tickIndex, intervalSeconds){
          const hoursIdle = (tickIndex * intervalSeconds) / 3600;
          const n = hoursIdle * 5;
          return Math.round(Math.min(5 * n, 1000));
        },
      },
    ],
    clickBonus:[
      // [Division]: ÷0.02 luck === ×50 luck, ÷0.666667 mutation luck === ×1.5 mutation luck
      // (dividing by x is the same as multiplying by x^-1 — the axe's whole gimmick is doing
      // this the long way around). Only affects this specific bonus, nothing else on the axe.
      { everyNClicks:5, chance:1, rolls:300, luckMult:50, mutationLuckMult:1.5 },
    ],
    // Rank value: 2×Moon(800M) + 1×Garbage Compacter(200M) + 20×Aurora Borealis(150M) + 1×Leviathan(30M) + 8×Heavenly(20M) = 1,200,000,000 exactly ✓
    requires:[
      { name:'Moon',               area:'Natural',    amount:2  },
      { name:'Garbage Compacter',  area:'Wasteland',  amount:1  },
      { name:'Aurora Borealis',    area:'Dreamland',  amount:20 },
      { name:'Leviathan',          area:'Natural',    amount:1  },
      { name:'Heavenly',           area:'Dreamland',  amount:8  },
    ],
  },
  rageaxe: {
    key:'rageaxe', name:'Rage Axe',
    desc:'wow! totally expensive and op, is it even WORTH??? STOP!!!! THIS IS SUCH AN ANGRY AXE!!! *scream.mp3*',
    stats:{ luckMult:17.5, bulk:35, rps:325 },
    bonus:'[Angriness] Offline every 5s: 1/50 for +700 rolls at ×13.33 luck. [Tableflip] On click: 1/25 for +300 rolls at ×20 luck. [Angst] Offline every hour: 1/5 for +100k rolls at ×6.5 luck. [Fist O\' Hurt] Every 3rd click: 1/150 for +5 rolls at ×1,750 luck. [Anger] Every 70th click: +600 rolls at ×3.33 luck (×1.25 mutation luck). [Slam] Every 20th click: +5 rolls at ×10,000 luck. [Frustration] Offline every hour: +7,500 rolls at ×125 luck. [Irritation] Each full day idle: +27.5% efficiency to every OTHER idle bonus on this axe (resets the moment you\'re active again).',
    offlineBonus:[
      { intervalSeconds:5, chancePerInterval:1/50, minRolls:700, maxRolls:700, bonusLuckMult:13.33, irritationScales:true },
      { intervalSeconds:3600, chancePerInterval:1/5, minRolls:100000, maxRolls:100000, bonusLuckMult:6.5, irritationScales:true },
      { intervalSeconds:3600, chancePerInterval:1, minRolls:7500, maxRolls:7500, bonusLuckMult:125, irritationScales:true },
    ],
    clickBonus:[
      { oneIn:25, rolls:300, luckMult:20 },                                              // Tableflip: every click
      { everyNClicks:3, oneIn:150, rolls:5, luckMult:1750 },                             // Fist O' Hurt: every 3rd click, still needs the roll
      { everyNClicks:70, chance:1, rolls:600, luckMult:3.33, mutationLuckMult:1.25 },     // Anger: every 70th click, guaranteed
      { everyNClicks:20, chance:1, rolls:5, luckMult:10000 },                            // Slam: every 20th click, guaranteed
    ],
    irritation:{ perDayPct:27.5, appliesToRps:true }, // rps also scales as an "idle bonus" per Irritation's wording
    // Rank value: 5×Moon(2B) + 3×Obliterator(2.25B) + 5×Imaginary(3.4B) + 1×PIZZA(9.3B) + 100×The Probably Rarest Thing Ever(1B) = 17.95B > 15B ✓
    // Spans all 5 areas of World 1 + Subworld 1: Natural, Wasteland, Dreamland, The Fridge, Scary Land
    requires:[
      { name:'Moon',                            area:'Natural',    amount:5   },
      { name:'Obliterator',                     area:'Wasteland',  amount:3   },
      { name:'Imaginary',                       area:'Dreamland',  amount:5   },
      { name:'PIZZA',                           area:'The Fridge', amount:1   },
      { name:'The Probably Rarest Thing Ever',  area:'Scary Land', amount:100 },
    ],
  },
  nanaxe: {
    key:'nanaxe', name:'nan.axe',
    desc:'404: axe not found. Somehow still swings.',
    stats:{ luckMult:404, bulk:404, rps:404 },
    bonus:'[Deletion] Offline every 404s: 1/4.04 for +4 rolls at ×4,040,404 luck. [Bad Gateway] Every 5th click: +503 rolls at ×503 luck, guaranteed. [Segmentation Fault] Offline every hour: 1/40.3 for +403 rolls at ×403,403 luck. [Unstability] Every 10th click: 1/50 for +1,234 rolls at ×56,789 luck. [Corruption] Every 4th click: 1/4.04 for +4,040 rolls at ×4,040 luck (×4.04 mutation luck). [Nilbomb] Every 404th click: 1/4 for +40,404 rolls at ×40.4 luck (×1.4 mutation luck). [MISSING TEXTURE] Always active, online or offline: 1/6.66 every 66th click AND 1/666 every 6s offline, either way adding +666 rolls at ×6,666 luck.',
    offlineBonus:[
      { intervalSeconds:404,  chancePerInterval:1/4.04,  minRolls:4,     maxRolls:4,     bonusLuckMult:4040404 },  // Deletion
      { intervalSeconds:3600, chancePerInterval:1/40.3,  minRolls:403,   maxRolls:403,   bonusLuckMult:403403 },   // Segmentation Fault
      { intervalSeconds:6,    chancePerInterval:1/666,   minRolls:666,   maxRolls:666,   bonusLuckMult:6666 },     // MISSING TEXTURE (offline half)
    ],
    clickBonus:[
      { everyNClicks:5,   chance:1,     rolls:503,   luckMult:503 },                                  // Bad Gateway
      { everyNClicks:10,  oneIn:50,     rolls:1234,  luckMult:56789 },                                 // Unstability
      { everyNClicks:4,   oneIn:4.04,   rolls:4040,  luckMult:4040,  mutationLuckMult:4.04 },           // Corruption
      { everyNClicks:404, oneIn:4,      rolls:40404, luckMult:40.4,  mutationLuckMult:1.4 },            // Nilbomb
      { everyNClicks:66,  oneIn:6.66,   rolls:666,   luckMult:6666 },                                  // MISSING TEXTURE (click half)
    ],
    requires:[
      { consumable:'errredirector', amount:40 },
      { name:'NIL',            area:'404', amount:4 },
      { name:'UNAUTHORIZED.',  area:'404', amount:404 },
      { name:'undefined',      area:'404', amount:60000000 },
      { name:'not found',      area:'404', amount:40400000 },
      { name:'NaN',            area:'404', amount:680000 },
      { name:'NULL',           area:'404', amount:10 },
      { name:'FOUR',           area:'Factoritization', amount:404000000 },
      { name:'NO CONTENT.',    area:'404', amount:1 },
      { name:'corruption',     area:'404', amount:3330000 },
      { name:'TIMEOUT',        area:'404', amount:204 },
      { name:'Bad Request',    area:'404', amount:606060 },
    ],
  },
  blandaxe: {
    key:'blandaxe', name:'Bland Axe',
    desc:'"hi i noticed there wasnt any active axes so consider this a blessing if you hate hybrids or idles" - juni (also good luck if youre doing the active way ! theres a long way to grind)',
    stats:{ luckMult:1.5, bulk:80, rps:5 },
    bonus:'[lameness] On click: 1/10 to add 30 rolls at ×300 luck (×1.25 mutation luck). [yay active also 4th wall break] Every 10th click, always: +300 rolls at ×30 luck (×3 mutation luck).',
    clickBonus:[
      { chance:1/10, rolls:30, luckMult:300, mutationLuckMult:1.25 },       // lameness
      { everyNClicks:10, chance:1, rolls:300, luckMult:30, mutationLuckMult:3 }, // yay active also 4th wall break
    ],
    requires:[
      { name:'Wood',   area:'Natural', amount:100 },
      { name:'Crystal',area:'Natural', amount:500 },
      { name:'Silver', area:'Natural', amount:100 },
    ],
  },
  magicwand: {
    key:'magicwand', name:'Magic Wand',
    desc:'why a wand and not an axe? oh wait theres literally a person who eats food and literal math as an axe',
    stats:{ luckMult:3.5, bulk:75, rps:10 },
    bonus:'[luck ium blast] Every 10th click: 1/5 to add 2,000 rolls at ×(random number between 5-10) luck (×1.5 mutation luck). [illusions] Always on the 25th click: +50 rolls at ×250 luck (×1.2 mutation luck). [glitter spread] On EVERY roll (not click), 1/1,250 to add +125 more rolls at ×1,250 luck (×1.25 mutation luck) — these bonus rolls can themselves trigger Glitter Spread again, chaining, capped at 75,000 chained rolls per click. Does not trigger from offline rolls.',
    clickBonus:[
      { everyNClicks:10, oneIn:5, rolls:2000, dynamicLuckMultFn:()=> 5 + Math.random()*5, mutationLuckMult:1.5 }, // luck ium blast
      { everyNClicks:25, chance:1, rolls:50, luckMult:250, mutationLuckMult:1.2 },                                // illusions
    ],
    perRollBonus:{ oneIn:1250, rolls:125, luckMult:1250, mutationLuckMult:1.25, chainCapPerClick:75000 },        // glitter spread
    requires:[
      { name:'Pearl',            area:'Dreamland', amount:280 },
      { name:'Heavenly',         area:'Dreamland', amount:100 },
      { name:'Aurora Borealis',  area:'Dreamland', amount:20 },
    ],
  },
  godaxe: {
    key:'godaxe', name:'God Axe',
    desc:'stay awake. you cant get rid of the power youve reached for... will you stay or join the corruption?',
    stats:{ luckMult:20000, bulk:5, rps:0 },
    bonus:'[divinity] Every click: 1/50 to add +2 rolls at ×700,000 luck (×20 mutation luck). [ascension] Every 20th click, always: +30,000 rolls at ×800 luck (×4 mutation luck). [supremity] Every 75th click, always: +9,000 rolls at ×70 luck. [prayers] Every 5th click: 1/25 to add +50,000 rolls at ×800 luck. [omnipotence] Every 10 clicks: 1/10 to add +100,000 rolls at ×10 luck.',
    clickBonus:[
      { chance:1/50, rolls:2, luckMult:700000, mutationLuckMult:20 },        // divinity
      { everyNClicks:20, chance:1, rolls:30000, luckMult:800, mutationLuckMult:4 }, // ascension
      { everyNClicks:75, chance:1, rolls:9000, luckMult:70 },                // supremity
      { everyNClicks:5, oneIn:25, rolls:50000, luckMult:800 },               // prayers
      { everyNClicks:10, oneIn:10, rolls:100000, luckMult:10 },              // omnipotence
    ],
    requires:[
      { name:'DENIAL',        area:'404', amount:5 },
      { name:'MISDIRECTED',   area:'404', amount:2 },
      { name:'Obliterator',   area:'Wasteland', amount:6 },
    ],
  },
};
const AXE_ORDER = ['default','crude','destroyer','blandaxe','disaster','dark','foodeater','dreamersprism','emblem','glowaxe','magicwand','silkinator','geomathaxe','rageaxe','godaxe','nanaxe'];

/* ============================================================
   EQUIPPABLES
   A second, independent equipment slot alongside the axe. Unlike axes, equippables don't
   provide their own rolls or replace the axe's bulk/rps entirely — they layer passive stat
   multipliers and/or their own bonus mechanics (offlineBonus/clickBonus, same engines axes use)
   on top of whatever axe is currently equipped. Exactly one can be worn at a time, swappable
   freely like axes (own it, equip it, unequip back to bare-handed).

   Shape of an equip entry:
   {
     key, name, desc,
     luckMult?: number,   // multiplies the equipped axe's luck (1 = no change)
     bulkAdd?: number,    // flat bulk added per manual roll (0 = no change)
     rpsMult?: number,    // multiplies effective offline rps (1 = no change)
     bonus?: string,      // human-readable summary shown in the UI
     offlineBonus?: [...], // same rule shape as axes' offlineBonus
     clickBonus?: [...],   // same rule shape as axes' clickBonus
     requires: [...],      // same shape as axes' requires
   }
   ============================================================ */
const EQUIPS = {
  punything: {
    key:'punything', name:'Puny Thingy',
    desc:'is this just a weak ahh thing? 😂',
    luckMult:1.05, idleEfficiencyMult:1.10,
    bonus:'On click: 1/25 chance to add (current bulk / 2) rolls at ×2 your current luck and dynamic mutation luck (luck×0.2, clamped between ×0.2 and ×5).',
    clickBonus:[{
      oneIn:25,
      dynamicRollsFn(){ return Math.round(effectiveBulk() / 2); },
      dynamicLuckMultFn(){ return effectiveLuckMult() * 2; },
      dynamicMutationLuckFn(){ return Math.max(0.2, Math.min(5, effectiveLuckMult() * 0.2)); },
    }],
    requires:[
      { name:'Dirt', area:'Natural', amount:75 },
      { name:'Blade of Grass', area:'Natural', amount:10 },
      { name:'Rock', area:'Natural', amount:18 },
    ],
  },
  vitaminaxey: {
    key:'vitaminaxey', name:'Vitamin Axey',
    desc:'- now with 25% more shit to help YOU go faster! (side effects may cause less idle-ing and more active-ing and intense axe usage sessions (Please dont take this seriously and learn what some stuff does this is just a game))',
    luckMult:3.33, idleEfficiencyMult:1.30,
    bonus:'On every click: +275 rolls at ×5 luck. Offline every 3 min: +36,500 rolls at ×0.2 luck.',
    clickBonus:[{ chance:1, rolls:275, luckMult:5 }],
    offlineBonus:[{ intervalSeconds:180, chancePerInterval:1, minRolls:36500, maxRolls:36500, bonusLuckMult:0.2 }],
    // Rank value: 8×Life(75,000) + 5×Fire(5,000) = 625,000 exactly ✓
    requires:[
      { name:'Life', area:'Natural', amount:8 },
      { name:'Fire', area:'Natural', amount:5 },
    ],
  },
  coinbag: {
    key:'coinbag', name:'Coin Bag',
    desc:'im rich heres money - you ingame',
    luckMult:1.5, rpsMult:1.5,
    coinBagStackChance: 1/5,
    coinBagStackDurationMs: 15000,
    bonus:'On click: 1/5 chance to add a 15-second stack, each worth +5% of your current luck (capped +125% total) and +0.1× mutation luck (capped +1.5× total), additively. Offline every 4 hours: +75,000 rolls at ×50 luck and ×2 mutation luck.',
    offlineBonus:[{ intervalSeconds:14400, chancePerInterval:1, minRolls:75000, maxRolls:75000, bonusLuckMult:50 }],
    // Rank value: 500×Pearl(700,000) + 100×Heavenly(2,500,000) + 15×Aurora Borealis(7,500,000) = 712,500,000 > 700M ✓
    requires:[
      { name:'Pearl', area:'Dreamland', amount:500 },
      { name:'Heavenly', area:'Dreamland', amount:100 },
      { name:'Aurora Borealis', area:'Dreamland', amount:15 },
    ],
  },
  pottedplant: {
    key:'pottedplant', name:'Axe In A Potted Plant (why?)',
    desc:'why?',
    luckMult:1.2, idleEfficiencyMult:2.0, // "+100% offline efficiency" = x2
    bonus:'Every 15th click: 1/5 chance to add (×5 your current bulk) rolls at ×2.5 luck and ×1.2 mutation luck.',
    clickBonus:[{
      everyNClicks:15, oneIn:5,
      dynamicRollsFn(){ return Math.round(effectiveBulk() * 5); },
      luckMult:2.5, mutationLuckMult:1.2,
    }],
    // Rank value: 30×Leviathan(30M, weird) + 15×Entropy(50M, odd) + 20×Aurora Borealis(7.5M, rainbow) = 1,800,000,000 exactly ✓
    // ALL requirements must be VARIANTED ranks — plain/base copies never count toward this recipe.
    requires:[
      { name:'Leviathan',        area:'Natural',   amount:30, variant:'weird'   },
      { name:'Entropy',          area:'Wasteland', amount:15, variant:'odd'     },
      { name:'Aurora Borealis',  area:'Dreamland', amount:20, variant:'rainbow' },
    ],
  },
  fishystarsystem: {
    key:'fishystarsystem', name:'Fishy Starsystem',
    desc:'swimming through the cosmos, somehow.',
    luckMult:2.5, idleEfficiencyMult:3.75, // "+275% offline efficiency" = x3.75
    bonus:'On click: 1/150 chance to add 750 rolls at ×25 luck. Offline every hour: +400,000 rolls at ×7.5 luck and ×2 mutation luck.',
    clickBonus:[{ oneIn:150, rolls:750, luckMult:25 }],
    offlineBonus:[{ intervalSeconds:3600, chancePerInterval:1, minRolls:400000, maxRolls:400000, bonusLuckMult:7.5 }],
    // Rank value: 30×Moon(400M) + 16×Obliterator(750M) + 17×Imaginary(680M) = 35,560,000,000 > 35B ✓
    requires:[
      { name:'Moon',        area:'Natural',   amount:30 },
      { name:'Obliterator', area:'Wasteland', amount:16 },
      { name:'Imaginary',   area:'Dreamland', amount:17 },
    ],
  },
  axenades: {
    key:'axenades', name:'Portable Rechargable Axenades',
    desc:'boom, but portable, and reusable.',
    bombChargeSpeedMult: 2,    // Explosive Axe Bomb charges x2 faster while equipped
    bombEfficiencyMult: 1.5,   // bomb fires x1.5 as many rolls when triggered
    bombTriggerBonus:{ rolls:25000, luckMult:175, mutationLuckMult:5 }, // extra batch on trigger
    bonus:'Offline every 25s: +500 rolls at ×17 luck. Every 100th click: +4,000 rolls at ×2 luck. While equipped, the Explosive Axe Bomb charges ×2 faster and is ×1.5 more efficient — and firing it also adds a bonus 25,000 rolls at ×175 luck and ×5 mutation luck.',
    offlineBonus:[{ intervalSeconds:25, chancePerInterval:1, minRolls:500, maxRolls:500, bonusLuckMult:17 }],
    clickBonus:[{ everyNClicks:100, chance:1, rolls:4000, luckMult:2 }],
    // Rank value: 10×Moon(400M) + 8×Obliterator(750M) + 8×Imaginary(680M) = 15,440,000,000 > 15B ✓
    requires:[
      { name:'Moon',        area:'Natural',   amount:10 },
      { name:'Obliterator', area:'Wasteland', amount:8  },
      { name:'Imaginary',   area:'Dreamland', amount:8  },
    ],
    requiresConsumables:[
      { key:'bomb', amount:2 },
    ],
  },
};
const EQUIP_ORDER = ['punything','vitaminaxey','coinbag','pottedplant','fishystarsystem','axenades'];

const CONSUMABLES = {
  pushpin: {
    key:'pushpin', name:'Pushpin',
    desc:'Stick it through your pinned recipe. The rarest thing you\'re missing gets a little closer.',
    effect:'On use: the rarest unfinished material in your pinned recipe becomes ×2.5 easier to get in its home area, for 500 rolls.',
    duration: 500,
    requires:[
      { name:'Crystal', area:'Natural', amount:25 },
      { name:'Electronic', area:'Wasteland', amount:1 },
    ],
  },
  gloves: {
    key:'gloves', name:'Universal Recipe Gloves',
    desc:'Reach across worlds. Not without a price, though.',
    effect:'On use: the rarest unfinished material in your pinned recipe can drop in any area, at ×2 rarity, for 250 rolls.',
    duration: 250,
    requires:[
      { name:'Illusion Crystal', area:'Dreamland', amount:12 },
      { name:'Sparkles', area:'Dreamland', amount:1 },
      { name:'Dream Powder', area:'Dreamland', amount:2 },
    ],
  },
  bomb: {
    key:'bomb', name:'Explosive Axe Bomb',
    desc:'Not a toy. Takes an hour to arm, then goes off all at once.',
    effect:'On use: charges for 1 hour. Once triggered after charging, fires 50,000 rolls in your current area at ×70 luck and ×1.5 mutation luck. Only one can be charging at a time.',
    chargeSeconds: 3600,
    rollCount: 50000,
    luckMult: 70,
    mutationLuckMult: 1.5,
    requires:[
      { name:'Fragments', area:'Wasteland', amount:70 },
      { name:'Electronic', area:'Wasteland', amount:160 },
      { name:'Unfunctional Tool', area:'Wasteland', amount:15 },
      { name:'Decayal Device', area:'Wasteland', amount:1 },
      { name:'Crystal', area:'Natural', amount:3000 },
    ],
  },
  watergun: {
    key:'watergun', name:'Sentient Watergun',
    desc:"somehow... shoots water? and weirdly makes you be a bit faster.. ok!",
    effect:'On use: AFK roll speed ×0.5 faster, stacks up to ×2.5 total (3 uses max). Each stack lasts 1 hour.',
    maxStacks: 3,
    stackMult: 0.5,
    capMult: 2.5,
    durationSeconds: 3600,
    requires:[
      { name:'Crystal',       area:'Natural',    amount:750 },
      { name:'Electronic',    area:'Wasteland',  amount:17  },
      { name:'Life',          area:'Natural',    amount:1   },
      { name:'Water',         area:'The Fridge', amount:5   },
    ],
  },
  errredirector: {
    key:'errredirector', name:'err.redirector',
    desc:'A little patch cable for the 404 zone. Plug it in and the static clears up, for a while.',
    effect:'On use: temporarily removes the 404 area\'s rarity-truncation gimmick for 12 hours. Rarity numbers display normally the whole time.',
    durationSeconds: 12 * 3600,
    requires:[
      { name:'Bad Request', area:'404', amount:2, variant:'weird' },
      { name:'NaN',         area:'404', amount:40 },
      { name:'corruption',  area:'404', amount:66 },
      { name:'not found',   area:'404', amount:40400 },
    ],
  },
};
const CONSUMABLE_ORDER = ['pushpin','gloves','bomb','watergun','errredirector'];

/* ============================================================
   STATE
   ============================================================ */
let state = {
  worldIdx: 0,
  areaIdx: 0,
  rolls: 0,
  best: null,
  log: [],
  inventory: {},
  ownedAxes: ['default'],
  equippedAxe: 'default',
  ownedEquips: [],
  equippedItem: null,        // key into EQUIPS, or null for bare-handed
  lastSeenAt: Date.now(),
  pinnedRecipe: null,       // { kind:'axe'|'consumable', key }
  consumables: {},          // { pushpin: 2, gloves: 0, bomb: 1 }
  activeBuffs: {},          // { pushpin: { rollsLeft }, gloves: { rollsLeft } }
  bombCharge: null,         // { chargingUntil: timestamp }
  clickCount: 0,
  anticheatLockUntil: null,
  wgunStacks: [],           // array of { expiresAt: timestamp }, max 3
  coinBagStacks: [],        // array of { expiresAt: timestamp } — Coin Bag's 15s luck/mutation-luck stacks
  discoveredSecrets: {},    // { secretKey: firstDiscoveredAtTimestamp }
  errRedirectorUntil: null, // timestamp — while in the future, the 404 area's rarity-truncation gimmick is suppressed
};

function isErrRedirectorActive(){
  return !!state.errRedirectorUntil && Date.now() < state.errRedirectorUntil;
}

const MAX_OFFLINE_SECONDS = 7 * 24 * 60 * 60; // 7 day cap

function currentAxe(){
  return AXES[state.equippedAxe] || AXES.default;
}

// Returns the currently equipped item's data, or null if bare-handed (no equip slotted).
function currentEquip(){
  if(!state.equippedItem) return null;
  return EQUIPS[state.equippedItem] || null;
}

// Effective luck = axe's own luck × equip's luckMult (if any). Equips never replace the axe's
// luck, only multiply on top of it.
function effectiveLuckMult(){
  const axe = currentAxe();
  const equip = currentEquip();
  let mult = axe.stats.luckMult;
  if(equip && equip.luckMult) mult *= equip.luckMult;
  // [Coin Bag] (equip): active stacks add their luck% ADDITIVELY on top of everything else so
  // far (not another flat multiplier stacking multiplicatively), matching "+5% of your current
  // luck" — i.e. current luck grows by a percentage of itself, then that becomes the new total.
  if(equip && equip.key === 'coinbag'){
    const bonus = coinBagBonus();
    if(bonus.luckAddPct > 0) mult *= (1 + bonus.luckAddPct / 100);
  }
  return mult;
}

// Effective bulk = axe's own bulk + equip's flat bulkAdd (if any).
function effectiveBulk(){
  const axe = currentAxe();
  const equip = currentEquip();
  const base = axe.stats.bulk;
  if(!equip || !equip.bulkAdd) return base;
  return base + equip.bulkAdd;
}

/* ============================================================
   