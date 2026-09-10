let globalCrashGuardShown = false;

function handleGlobalCrash(err) {
  if (globalCrashGuardShown) return;
  globalCrashGuardShown = true;
  console.error("Uncaught error after init — showing crash guard.", err);
  if (typeof showInitCrashGuard === "function") showInitCrashGuard(err);
}

window.addEventListener("error", e => {
  handleGlobalCrash(e.error || e.message);
});

window.addEventListener("unhandledrejection", e => {
  handleGlobalCrash(e.reason);
});

const TIERS = [ {
  key: "common",
  label: "Common",
  min: 0,
  max: 1,
  cls: "t-common"
}, {
  key: "usual",
  label: "Usual",
  min: 1,
  max: 250,
  cls: "t-usual"
}, {
  key: "decent",
  label: "Decent",
  min: 250,
  max: 1e3,
  cls: "t-decent"
}, {
  key: "rare",
  label: "Rare",
  min: 1e3,
  max: 7500,
  cls: "t-rare"
}, {
  key: "unusual",
  label: "Unusual",
  min: 7500,
  max: 3e4,
  cls: "t-unusual"
}, {
  key: "good",
  label: "Good",
  min: 3e4,
  max: 9e4,
  cls: "t-good"
}, {
  key: "epic",
  label: "Epic",
  min: 9e4,
  max: 25e4,
  cls: "t-epic"
}, {
  key: "pelicular",
  label: "Pelicular",
  min: 25e4,
  max: 1e6,
  cls: "t-pelicular"
}, {
  key: "horizon",
  label: "Horizon",
  min: 1e6,
  max: 75e5,
  cls: "t-horizon"
}, {
  key: "grandiose",
  label: "Grandiose",
  min: 75e5,
  max: 3e7,
  cls: "t-grandiose"
}, {
  key: "zenith",
  label: "Zenith",
  min: 3e7,
  max: 1e8,
  cls: "t-zenith"
}, {
  key: "unworldly",
  label: "Unworldly",
  min: 1e8,
  max: 1e9,
  cls: "t-unworldly"
}, {
  key: "colossal",
  label: "Colossal",
  min: 1e9,
  max: 25e9,
  cls: "t-colossal"
}, {
  key: "infinite",
  label: "Infinite",
  min: 25e9,
  max: 7e10,
  cls: "t-infinite"
}, {
  key: "insanity",
  label: "Insanity",
  min: 7e10,
  max: 5e11,
  cls: "t-insanity"
}, {
  key: "impossible",
  label: "Impossible",
  min: 5e11,
  max: 1e21,
  cls: "t-impossible"
}, {
  key: "wipehype",
  label: "WIPE HYPE",
  min: 1e21,
  max: Infinity,
  cls: "t-wipehype"
} ];

const TROLL_CHANCE = 1 / 5e3;

const TROLL_TIER_KEYS = [ "unworldly", "colossal", "infinite", "insanity", "impossible" ];

function recordTrollRollForTrollstone() {
  if (!Array.isArray(state.trollRollHistory)) state.trollRollHistory = [];
  state.trollRollHistory.push(state.rolls);
  const cutoff = state.rolls - 1e3;
  state.trollRollHistory = state.trollRollHistory.filter(r => r >= cutoff);
}

function trollRolledFiveInLastThousand() {
  if (!Array.isArray(state.trollRollHistory)) return false;
  const cutoff = state.rolls - 1e3;
  return state.trollRollHistory.filter(r => r >= cutoff).length >= 5;
}

function rollTrollFake(area, excludeName) {
  const candidates = [];
  for (const r of area.ranks) {
    if (TROLL_TIER_KEYS.includes(tierFor(r.rng).key) && r.name !== excludeName) {
      candidates.push({
        name: r.name,
        rng: r.rng,
        isMutation: false
      });
    }
    if (r.mutations) {
      for (const m of r.mutations) {
        if (TROLL_TIER_KEYS.includes(tierFor(m.rng).key) && m.name !== excludeName) {
          candidates.push({
            name: m.name,
            rng: m.rng,
            isMutation: true
          });
        }
      }
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

let rollGeneration = 0;

const SECRET_TIER = {
  key: "secret",
  label: "Secret",
  min: -1,
  max: -1,
  cls: "t-secret"
};

function tierFor(rng) {
  for (const t of TIERS) {
    if (rng > t.min && rng <= t.max) return t;
  }
  if (rng <= 1) return TIERS[0];
  return TIERS[TIERS.length - 1];
}

function hashRankName(name) {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) + h + name.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

const RANK_FONT_PROFILES = [ {
  family: "'Playfair Display', serif",
  weight: 800,
  style: "normal",
  spacing: "0"
}, {
  family: "'Bebas Neue', sans-serif",
  weight: 400,
  style: "normal",
  spacing: "0.03em"
}, {
  family: "'Caveat', cursive",
  weight: 700,
  style: "normal",
  spacing: "0.01em"
}, {
  family: "'UnifrakturMaguntia', cursive",
  weight: 400,
  style: "normal",
  spacing: "0"
}, {
  family: "'Press Start 2P', monospace",
  weight: 400,
  style: "normal",
  spacing: "-0.02em"
}, {
  family: "'Orbitron', sans-serif",
  weight: 800,
  style: "normal",
  spacing: "0.02em"
}, {
  family: "'Pacifico', cursive",
  weight: 400,
  style: "normal",
  spacing: "0"
}, {
  family: "'Rubik Mono One', sans-serif",
  weight: 400,
  style: "normal",
  spacing: "-0.01em"
}, {
  family: "'Abril Fatface', serif",
  weight: 400,
  style: "normal",
  spacing: "0"
}, {
  family: "'VT323', monospace",
  weight: 400,
  style: "normal",
  spacing: "0.03em"
}, {
  family: "'Righteous', sans-serif",
  weight: 400,
  style: "normal",
  spacing: "0.01em"
}, {
  family: "'Space Grotesk', sans-serif",
  weight: 700,
  style: "italic",
  spacing: "0"
}, {
  family: "'Cinzel', serif",
  weight: 900,
  style: "normal",
  spacing: "0.02em"
}, {
  family: "'JetBrains Mono', monospace",
  weight: 700,
  style: "normal",
  spacing: "0"
} ];

const GRADIENT_WORTHY_TIERS = new Set([ "zenith", "unworldly", "colossal", "infinite", "insanity", "impossible" ]);

function rankVisualIdentity(name, tierKey) {
  const hash = hashRankName(name);
  const font = RANK_FONT_PROFILES[hash % RANK_FONT_PROFILES.length];
  const hue = hash % 360;
  const wantsGradient = GRADIENT_WORTHY_TIERS.has(tierKey);
  let colorCss, isGradient;
  if (wantsGradient) {
    const hue2 = (hash >> 5) % 360;
    const spread = 55 + hash % 40;
    const hA = hue2;
    const hB = (hue2 + spread) % 360;
    const hC = (hue2 + spread * 2) % 360;
    colorCss = `linear-gradient(90deg, hsl(${hA},85%,68%), hsl(${hB},90%,72%), hsl(${hC},85%,68%))`;
    isGradient = true;
  } else {
    const sat = 55 + hash % 30;
    const light = 62 + hash % 18;
    colorCss = `hsl(${hue}, ${sat}%, ${light}%)`;
    isGradient = false;
  }
  return {
    fontFamily: font.family,
    fontWeight: font.weight,
    fontStyle: font.style,
    letterSpacing: font.spacing,
    colorCss: colorCss,
    isGradient: isGradient
  };
}

function isLegacyColorFontEnabled() {
  return state.rankVisualStyle === "legacycolorfont";
}

function rankVisualStyleAttr(name, tierKey) {
  if (state.lowDetailMode || state.superOptimize) return "";
  if (isLegacyColorFontEnabled()) return "";
  const v = rankVisualIdentity(name, tierKey);
  const base = `font-family:${v.fontFamily}; font-weight:${v.fontWeight}; font-style:${v.fontStyle}; letter-spacing:${v.letterSpacing};`;
  if (v.isGradient) {
    return `${base} background:${v.colorCss}; background-size:200% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; animation:hueflow 3s linear infinite;`;
  }
  return `${base} color:${v.colorCss};`;
}

function rankVisualFontOnlyStyleAttr(name) {
  if (state.lowDetailMode || state.superOptimize || isLegacyColorFontEnabled()) return "";
  const v = rankVisualIdentity(name, null);
  return `font-family:${v.fontFamily}; font-weight:${v.fontWeight}; font-style:${v.fontStyle}; letter-spacing:${v.letterSpacing};`;
}

const VARIANT_CHAIN = [ {
  key: "weird",
  label: "Weird",
  rng: 15,
  mult: 15,
  cls: "v-weird"
}, {
  key: "odd",
  label: "Odd",
  rng: 20,
  mult: 20,
  cls: "v-odd"
}, {
  key: "rainbow",
  label: "Rainbow",
  rng: 10,
  mult: 10,
  cls: "v-rainbow"
}, {
  key: "grayscale",
  label: "Grayscale",
  rng: 25,
  mult: 25,
  cls: "v-grayscale"
}, {
  key: "frozen",
  label: "Frozen",
  rng: 13.3333333333,
  mult: 13.3333333333,
  cls: "v-frozen"
}, {
  key: "extreme",
  label: "Extreme",
  rng: 1e3,
  mult: 1e3,
  cls: "v-extreme"
} ];

function rollVariant() {
  let current = null;
  let totalMult = 1;
  for (const v of VARIANT_CHAIN) {
    if (Math.random() < 1 / v.rng) {
      current = v;
      totalMult *= v.mult;
    } else {
      break;
    }
  }
  return current ? {
    ...current,
    totalMult: totalMult
  } : null;
}

const SECRET_RANKS = [ {
  key: "serpent_optics",
  name: "Serpent Optics",
  trueRng: 11111,
  worldKey: "subworld1",
  condition(world, area) {
    if (!String(state.rolls).includes("11")) return false;
    const common = area.ranks[0];
    const commonCount = getOwnedCount(area.label, common.name, null);
    if (!String(commonCount).includes("11")) return false;
    const now = new Date;
    if (now.getMinutes() !== 11) return false;
    return true;
  }
}, {
  key: "hot_potato",
  name: "Hot Potato",
  trueRng: 7777,
  worldKey: "world1",
  areaKey: "natural",
  condition(world, area) {
    if (state.rolls % 2 === 0) return false;
    const now = new Date;
    if (now.getSeconds() % 7 !== 0) return false;
    return true;
  }
}, {
  key: "tile_0",
  name: "Tile 0",
  worldKey: "world0",
  areaKey: "2048",
  trueRng(world, area) {
    const now = new Date;
    return now.getMinutes() === 0 ? 2e5 : 75e4;
  },
  condition(world, area) {
    const now = new Date;
    if (now.getMinutes() % 10 !== 0) return false;
    const s = String(state.rolls);
    if (!s.endsWith("0")) return false;
    if (s.slice(0, -1).includes("0")) return false;
    return true;
  }
}, {
  key: "ampersand",
  name: "&",
  trueRng: 700,
  conditionAlreadyRolled: true,
  worldKey: "world0",
  areaKey: "abc",
  condition(world, area) {
    const rollsStr = String(state.rolls);
    const firstFive = Number(rollsStr.slice(0, 5));
    if (firstFive === 0 || firstFive % 26 !== 0) return false;
    if (state._ampersandCheckedClick !== state.clickCount) {
      state._ampersandCheckedClick = state.clickCount;
      state._ampersandClickResult = Math.random() < 1 / 26.9;
    }
    return state._ampersandClickResult;
  }
}, {
  key: "secret_tier",
  name: "Secret Tier",
  trueRng: 5e7,
  worldKey: "world0",
  areaKey: "tiers",
  condition(world, area) {
    return true;
  }
} ];

// Called ONCE per click (not per roll), bypasses luck entirely, never fires from offline sim.
function rollOncePerClickSpecialRank(world, area, isOffline) {
  if (isOffline) return null;
  if (world.key !== "subworld1") return null;
  if (Math.random() >= 1 / ONCE_PER_CLICK_RANK.rng) return null;
  return {
    name: ONCE_PER_CLICK_RANK.name,
    baseRng: ONCE_PER_CLICK_RANK.rng,
    finalRng: ONCE_PER_CLICK_RANK.rng,
    tier: tierFor(ONCE_PER_CLICK_RANK.rng),
    variant: null,
    areaLabel: area.label
  };
}

function rollSecretForArea(world, area) {
  let winner = null;
  let winnerTrueRng = null;
  let winnerVariant = null;
  let winnerHasPreRolledVariant = false;
  for (const secret of SECRET_RANKS) {
    if (secret.worldKey && secret.worldKey !== world.key) continue;
    if (secret.areaKey && secret.areaKey !== area.key) continue;
    if (!secret.condition(world, area)) continue;
    const resolvedTrueRng = typeof secret.trueRng === "function" ? secret.trueRng(world, area) : secret.trueRng;
    const alreadyRolled = !!secret.conditionAlreadyRolled;
    if (alreadyRolled || Math.random() < 1 / resolvedTrueRng) {
      const candidateVariant = secret.key === "secret_tier" ? rollVariant() : null;
      if (secret.key === "secret_tier" && !isSecretTierVariantUnlocked(candidateVariant ? candidateVariant.key : null)) continue;
      if (!winner || resolvedTrueRng > winnerTrueRng) {
        winner = secret;
        winnerTrueRng = resolvedTrueRng;
        winnerVariant = candidateVariant;
        winnerHasPreRolledVariant = secret.key === "secret_tier";
      }
    }
  }
  if (!winner) return null;
  const variant = winnerHasPreRolledVariant ? winnerVariant : rollVariant();
  const finalRng = variant ? winnerTrueRng * variant.totalMult : winnerTrueRng;
  return {
    name: winner.name,
    baseRng: winnerTrueRng,
    finalRng: finalRng,
    tier: SECRET_TIER,
    variant: variant,
    areaLabel: area.label,
    isSecret: true,
    secretKey: winner.key
  };
}

function isSecretDiscovered(key, variantKey) {
  if (!state.discoveredSecrets) return false;
  const lookupKey = variantKey ? `${key}|${variantKey}` : key;
  return !!state.discoveredSecrets[lookupKey];
}

function isSecretTierVariantUnlocked(variantKey) {
  for (const other of SECRET_RANKS) {
    if (other.key === "secret_tier") continue;
    if (!isSecretDiscovered(other.key, variantKey)) return false;
  }
  return true;
}

function markSecretDiscovered(key, variantKey) {
  if (!state.discoveredSecrets) state.discoveredSecrets = {};
  const lookupKey = variantKey ? `${key}|${variantKey}` : key;
  if (!state.discoveredSecrets[lookupKey]) {
    state.discoveredSecrets[lookupKey] = Date.now();
    dbSaveMeta();
    if (typeof currentView !== "undefined" && currentView === "index") buildSecretsAccordion();
  }
}

const WORLD1 = {
  key: "world1",
  label: "World 1",
  global: [ {
    name: "Destiny",
    rng: 177e10
  }, {
    name: "WOKE",
    rng: 6825e21
  } ],
  areas: [ {
    key: "natural",
    label: "Natural",
    ranks: [ {
      name: "Dirt",
      rng: 1,
      mutations: [ {
        name: "Dirtiverse",
        rng: 5e10
      } ]
    }, {
      name: "Blade of Grass",
      rng: 4
    }, {
      name: "Rock",
      rng: 6
    }, {
      name: "Flower",
      rng: 10
    }, {
      name: "Plant",
      rng: 25
    }, {
      name: "Water",
      rng: 50
    }, {
      name: "Crystal",
      rng: 100,
      mutations: [ {
        name: "Apocalypse Crystal",
        rng: 666e7
      } ]
    }, {
      name: "Silver",
      rng: 250
    }, {
      name: "Wood",
      rng: 500
    }, {
      name: "flowers",
      rng: 725,
      mutations: [ {
        name: "最後の花",
        rng: 875165375750
      } ]
    }, {
      name: "Creature",
      rng: 1e3
    }, {
      name: "Disaster",
      rng: 6e3
    }, {
      name: "Fire",
      rng: 15e3,
      mutations: [ {
        name: "Plasmaspark",
        rng: 175e5
      } ]
    }, {
      name: "Life",
      rng: 75e3,
      mutations: [ {
        name: "Corruption",
        rng: 25e4
      } ]
    }, {
      name: "Sporebloom",
      rng: 1e6
    }, {
      name: "Ruins",
      rng: 5e6,
      mutations: [ {
        name: "La Ville Perdue",
        rng: 1e11
      } ]
    }, {
      name: "Leviathan",
      rng: 3e7
    }, {
      name: "Lunar",
      rng: 75e6,
      mutations: [ {
        name: "Lunar Oblivion",
        rng: 325e7
      } ]
    }, {
      name: "Moon",
      rng: 4e8
    }, {
      name: "Universal",
      rng: 725e9
    } ]
  }, {
    key: "wasteland",
    label: "Wasteland",
    ranks: [ {
      name: "Pollution",
      rng: 1
    }, {
      name: "Broken Device",
      rng: 5,
      mutations: [ {
        name: "Electronic",
        rng: 2500
      } ]
    }, {
      name: "Ruincrystal",
      rng: 75
    }, {
      name: "Corruption Fragment",
      rng: 315,
      mutations: [ {
        name: "Doomcrystal",
        rng: 666e6
      } ]
    }, {
      name: "Junk Producer",
      rng: 750
    }, {
      name: "Fragments",
      rng: 5e3
    }, {
      name: "Unfunctional Tool",
      rng: 12500
    }, {
      name: "Slop",
      rng: 5e4,
      mutations: [ {
        name: "Goop Producer",
        rng: 75e4
      } ]
    }, {
      name: "Beyond Recognition Object",
      rng: 175e3
    }, {
      name: "Decayal Device",
      rng: 2e6
    }, {
      name: "Destroyed Thing",
      rng: 8e6
    }, {
      name: "Entropy",
      rng: 5e7,
      mutations: [ {
        name: "Destruction",
        rng: 7e9
      } ]
    }, {
      name: "Garbage Compacter",
      rng: 2e8
    }, {
      name: "Obliterator",
      rng: 75e7
    } ]
  }, {
    key: "dreamland",
    label: "Aberration",
    ranks: [ {
      name: "Abberatite",
      rng: 1
    }, {
      name: "Broken Remnants",
      rng: 15
    }, {
      name: "Unusualite",
      rng: 80
    }, {
      name: "Anomaltic",
      rng: 500
    }, {
      name: "Unstablium",
      rng: 3e3
    }, {
      name: "Abnormal",
      rng: 17e3,
      mutations: [ {
        name: "Unrecognizability",
        rng: 1e6
      } ]
    }, {
      name: "Corrupt Dust",
      rng: 56e3
    }, {
      name: "ERRORCORE",
      rng: 128e3
    }, {
      name: "Esoterium",
      rng: 7e5,
      mutations: [ {
        name: "Blank",
        rng: 55555555
      } ]
    }, {
      name: "Glitchite",
      rng: 25e5
    }, {
      name: "Unstable Core",
      rng: 75e5,
      mutations: [ {
        name: "REACTOR MELTDOWN",
        rng: 7e10
      } ]
    }, {
      name: "Spectral",
      rng: 68e7,
      mutations: [ {
        name: "CORRUPTION",
        rng: 2e10
      } ]
    }, {
      name: "nil",
      rng: 7e11
    } ]
  } ]
};

const SUBWORLD1 = {
  key: "subworld1",
  label: "Subworld 1",
  global: [ {
    name: "have fun getting this its unaffected by luck AND cant spawn when your offline Lol",
    rng: 7777776,
    oncePerClickOnly: true
  }, {
    name: "WOKE",
    rng: 6825e21
  } ],
  areas: [ {
    key: "fridge",
    label: "The Fridge",
    ranks: [ {
      name: "Fridge-ium",
      rng: 1
    }, {
      name: "Water",
      rng: 8e4
    }, {
      name: "Cheese",
      rng: 2e5
    }, {
      name: "Leftover Burger",
      rng: 8e5
    }, {
      name: "Fruits",
      rng: 285e4
    }, {
      name: "Eggs",
      rng: 5961e4
    }, {
      name: "A Cat",
      rng: 3e8
    }, {
      name: "orange juice",
      rng: 8925e5
    }, {
      name: "PIZZA",
      rng: 93e8
    }, {
      name: "Orange",
      rng: 7e10,
      mutations: [ {
        name: "Universe Sized Apple Made For Destroying Universes Without Orange",
        rng: 2e11
      } ]
    }, {
      name: "Fish",
      rng: 69e11
    } ]
  }, {
    key: "scaryland",
    label: "Scary Land",
    ranks: [ {
      name: "SCARY",
      rng: 1.000666
    }, {
      name: "GHOST",
      rng: 66
    }, {
      name: "Mosquito",
      rng: 700
    }, {
      name: "A",
      rng: 5e3
    }, {
      name: "Loser",
      rng: 10660
    }, {
      name: "You Not Get This",
      rng: 66666
    }, {
      name: "Not So Epic",
      rng: 1e5,
      mutations: [ {
        name: "So Epic!!!",
        rng: 1e10
      } ]
    }, {
      name: "The Probably Rarest Thing Ever",
      rng: 1e7
    }, {
      name: "uhh maybe end of something. idk lol!",
      rng: 25e7
    }, {
      name: "light Crystal",
      rng: 8888888888
    } ]
  }, {
    key: "404",
    label: "404",
    truncated: true,
    ranks: [ {
      name: "missing",
      rng: 1
    }, {
      name: "not found",
      rng: 404,
      mutations: [ {
        name: "GONE.",
        rng: 41e9
      } ]
    }, {
      name: "undefined",
      rng: 666
    }, {
      name: "corruption",
      rng: 3333,
      mutations: [ {
        name: "NIL",
        rng: 404e7
      } ]
    }, {
      name: "NaN",
      rng: 40400
    }, {
      name: "Bad Request",
      rng: 80808
    }, {
      name: "FORBIDDEN.",
      rng: 403e3
    }, {
      name: "TIMEOUT",
      rng: 8e6
    }, {
      name: "UNAUTHORIZED.",
      rng: 4e7
    }, {
      name: "NULL",
      rng: 666e6
    }, {
      name: "DENIAL",
      rng: 18e9
    }, {
      name: "NO CONTENT.",
      rng: 2404e7
    }, {
      name: "MISDIRECTED",
      rng: 404e8
    }, {
      name: "dreamcore",
      rng: 404e10
    } ]
  }, {
    key: "factoritization",
    label: "Factoritization",
    ranks: [ {
      name: "ONE",
      rng: 1
    }, {
      name: "TWO",
      rng: 2
    }, {
      name: "THREE",
      rng: 6
    }, {
      name: "FOUR",
      rng: 24
    }, {
      name: "FIVE",
      rng: 120
    }, {
      name: "SIX",
      rng: 720
    }, {
      name: "SEVEN",
      rng: 5040
    }, {
      name: "EIGHT",
      rng: 40320
    }, {
      name: "NINE",
      rng: 362880
    }, {
      name: "TEN",
      rng: 3628800
    }, {
      name: "ELEVEN",
      rng: 39916800
    }, {
      name: "TWELVE",
      rng: 479001600
    }, {
      name: "THIRTEEN",
      rng: 6227020800
    }, {
      name: "FOURTEEN",
      rng: 87178291200
    }, {
      name: "FINALE",
      rng: 1307674368e3
    } ]
  }, {
    key: "cinnamon",
    label: "Cinnamon",
    ranks: [ {
      name: "cinnamon",
      rng: 1
    }, {
      name: "cinnamon Tasty",
      rng: 500
    }, {
      name: "cinnamon Bar",
      rng: 1e4
    }, {
      name: "cinnamon Candy",
      rng: 2e5,
      mutations: [ {
        name: "THE MIGHTY CINNAMON TOAST CRUNCH",
        rng: 777777777777777
      } ]
    }, {
      name: "very cinnabar-y Cinnamon (dont eat)",
      rng: 8e6
    }, {
      name: "SCARY cinnamon",
      rng: 33666333
    }, {
      name: "very evil Cinnamon",
      rng: 77777776
    }, {
      name: "peppermint (whats this doing here??)",
      rng: 1e8
    }, {
      name: '"what am i doing? im supposed to be making progress NOT jokes like THIS!" Cinnamon',
      rng: 6942e5
    }, {
      name: "lucky Cinnamon",
      rng: 777777777
    }, {
      name: "1 billion Cinnamon",
      rng: 1e9
    }, {
      name: "Cinnafinity",
      rng: 4e9
    }, {
      name: "cinnamon Galaxy",
      rng: 75e8
    }, {
      name: "infinite cinnamon",
      rng: 6e10
    }, {
      name: "cinna-sanity",
      rng: 7e10
    }, {
      name: "the scary evil gigantic house sized cinnamon box",
      rng: 666666666666
    } ]
  } ]
};

const WORLD0 = {
  key: "world0",
  label: "Fun",
  global: [ {
    name: "very bad rank",
    rng: 694291e13
  }, {
    name: "WOKE",
    rng: 6825e21
  } ],
  areas: [ {
    key: "2048",
    label: "2048",
    ranks: [ {
      name: "Tile 1",
      rng: 1
    }, {
      name: "Tile 2",
      rng: 2
    }, {
      name: "Tile 4",
      rng: 4
    }, {
      name: "Tile 8",
      rng: 8
    }, {
      name: "Tile 16",
      rng: 16
    }, {
      name: "Tile 32",
      rng: 32
    }, {
      name: "Tile 64",
      rng: 64
    }, {
      name: "Tile 128",
      rng: 128
    }, {
      name: "Tile 256",
      rng: 256
    }, {
      name: "Tile 512",
      rng: 512
    }, {
      name: "Tile 1k",
      rng: 1024
    }, {
      name: "Tile 2k",
      rng: 2048
    }, {
      name: "Tile 4k",
      rng: 4096
    }, {
      name: "Tile 8k",
      rng: 8192
    }, {
      name: "Tile 16k",
      rng: 16384
    }, {
      name: "Tile 32k",
      rng: 32768
    }, {
      name: "Tile 65k",
      rng: 65536
    }, {
      name: "Tile 131k",
      rng: 131072
    }, {
      name: "Tile 262k",
      rng: 262144
    }, {
      name: "Tile 524k",
      rng: 524288
    }, {
      name: "Tile 1m",
      rng: 1048576
    }, {
      name: "Tile 2m",
      rng: 2097152
    }, {
      name: "Tile 4m",
      rng: 4194304
    }, {
      name: "Tile 8m",
      rng: 8388608
    }, {
      name: "Tile 16m",
      rng: 16777216
    }, {
      name: "Tile 33m",
      rng: 33554432
    }, {
      name: "Tile 67m",
      rng: 67108864
    }, {
      name: "Tile 134m",
      rng: 134217728
    }, {
      name: "Tile 268m",
      rng: 268435456
    }, {
      name: "Tile 536m",
      rng: 536870912
    }, {
      name: "Tile 1b",
      rng: 1073741824
    }, {
      name: "Tile 2b",
      rng: 2147483648
    }, {
      name: "Tile 4b",
      rng: 4294967296
    }, {
      name: "Tile 8b",
      rng: 8589934592
    }, {
      name: "Tile 17b",
      rng: 17179869184
    }, {
      name: "Tile 34b",
      rng: 34359738368
    }, {
      name: "Tile 68b",
      rng: 68719476736
    }, {
      name: "Tile 137b",
      rng: 137438953472
    }, {
      name: "Tile 274b",
      rng: 274877906944
    }, {
      name: "Tile 549b",
      rng: 549755813888
    }, {
      name: "Tile 1t",
      rng: 1099511627776
    }, {
      name: "Tile 2t",
      rng: 2199023255552
    }, {
      name: "Tile 4t",
      rng: 4398046511104
    }, {
      name: "Tile 9t",
      rng: 8796093022208
    }, {
      name: "Tile 18t",
      rng: 17592186044416
    }, {
      name: "Tile 35t",
      rng: 35184372088832
    }, {
      name: "Tile 70t",
      rng: 70368744177664
    }, {
      name: "Tile 141t",
      rng: 0x800000000000
    }, {
      name: "Tile 281t",
      rng: 281474976710656
    }, {
      name: "Tile 563t",
      rng: 562949953421312
    }, {
      name: "Tile 1q",
      rng: 0x4000000000000
    }, {
      name: "Tile 2q",
      rng: 0x8000000000000
    }, {
      name: "Tile 5q",
      rng: 4503599627370496
    }, {
      name: "Tile 9q",
      rng: 9007199254740992
    }, {
      name: "Tile 18q",
      rng: 0x40000000000000
    }, {
      name: "Tile 36q",
      rng: 0x80000000000000
    }, {
      name: "Tile 72q",
      rng: 72057594037927940
    }, {
      name: "Tile 144q",
      rng: 0x200000000000000
    }, {
      name: "Tile 288q",
      rng: 0x400000000000000
    }, {
      name: "Tile 576q",
      rng: 0x800000000000000
    }, {
      name: "Tile 1Qi",
      rng: 0x1000000000000000
    }, {
      name: "Tile 2Qi",
      rng: 0x2000000000000000
    }, {
      name: "Tile 5Qi",
      rng: 0x4000000000000000
    }, {
      name: "Tile 9Qi",
      rng: 0x8000000000000000
    }, {
      name: "Tile 18Qi",
      rng: 0x10000000000000000
    }, {
      name: "Tile 37Qi",
      rng: 0x20000000000000000
    }, {
      name: "Tile 74Qi",
      rng: 7378697629483821e4
    }, {
      name: "Tile 148Qi",
      rng: 0x80000000000000000
    }, {
      name: "Tile 295Qi",
      rng: 29514790517935283e4
    }, {
      name: "Tile 590Qi",
      rng: 5902958103587057e5
    }, {
      name: "Tile 1Qn",
      rng: 11805916207174113e5
    } ]
  }, {
    key: "abc",
    label: "ABC",
    ranks: [ {
      name: "A",
      rng: 4
    }, {
      name: "B",
      rng: 20
    }, {
      name: "C",
      rng: 73
    }, {
      name: "D",
      rng: 224
    }, {
      name: "E",
      rng: 626
    }, {
      name: "F",
      rng: 1646
    }, {
      name: "G",
      rng: 4149
    }, {
      name: "H",
      rng: 10137
    }, {
      name: "I",
      rng: 24192
    }, {
      name: "J",
      rng: 56668
    }, {
      name: "K",
      rng: 130755
    }, {
      name: "L",
      rng: 297968
    }, {
      name: "M",
      rng: 671959
    }, {
      name: "N",
      rng: 1501931
    }, {
      name: "O",
      rng: 3331385
    }, {
      name: "P",
      rng: 7340032
    }, {
      name: "Q",
      rng: 16077605
    }, {
      name: "R",
      rng: 35033758
    }, {
      name: "S",
      rng: 75986837
    }, {
      name: "T",
      rng: 164128105
    }, {
      name: "U",
      rng: 353180649
    }, {
      name: "V",
      rng: 757411639
    }, {
      name: "W",
      rng: 1619271615
    }, {
      name: "X",
      rng: 3452031954
    }, {
      name: "Y",
      rng: 7340032e3
    }, {
      name: "Z",
      rng: 15569618022
    } ]
  }, {
    key: "tiers",
    label: "Tiers",
    ranks: [ {
      name: "Common",
      rng: 1
    }, {
      name: "Usual",
      rng: 25
    }, {
      name: "Decent",
      rng: 251
    }, {
      name: "Rare",
      rng: 1001
    }, {
      name: "Unusual",
      rng: 7501
    }, {
      name: "Good",
      rng: 30001
    }, {
      name: "Epic",
      rng: 90001
    }, {
      name: "Pelicular",
      rng: 250001
    }, {
      name: "Horizon",
      rng: 1000001
    }, {
      name: "Grandiose",
      rng: 7500001
    }, {
      name: "Zenith",
      rng: 30000001
    }, {
      name: "Unworldly",
      rng: 100000001
    }, {
      name: "Colossal",
      rng: 1000000001
    }, {
      name: "Infinite",
      rng: 25000000001
    }, {
      name: "Insanity",
      rng: 70000000001
    }, {
      name: "Impossible",
      rng: 500000000001
    }, {
      name: "WIPE HYPE",
      rng: 1e21 + 1e6
    } ]
  }, {
    key: "gimmicks",
    label: "Gimmicks",
    ranks: [ {
      name: "Gimmick Crystal",
      rng: 1
    }, {
      name: "Weakling",
      rng: 25,
      requirement: "Have Puny Thingy equipped",
      condition: () => currentEquip() && currentEquip().key === "punything"
    }, {
      name: "Default Axe",
      rng: 500,
      requirement: "Have Default Axe equipped",
      condition: () => currentAxe().key === "default"
    }, {
      name: "Pushpin",
      rng: 1e3,
      requirement: "Must have Pushpin active",
      condition: () => state.activeBuffs && state.activeBuffs.pushpin && state.activeBuffs.pushpin.rollsLeft > 0
    }, {
      name: "Thumbtacks",
      rng: 1750,
      requirement: "Have any recipe pinned",
      condition: () => state.pinnedRecipe && state.pinnedRecipe.key
    }, {
      name: "Crude Axe",
      rng: 2e3,
      requirement: "Have Crude Axe equipped",
      condition: () => currentAxe().key === "crude"
    }, {
      name: "Destructive Destroyed Destroyer",
      rng: 3500,
      requirement: "Have Destructive Destroyed Destroyer equipped",
      condition: () => currentAxe().key === "destroyer"
    }, {
      name: "Disaster Bringer",
      rng: 5e3,
      requirement: "Have Disaster Bringer equipped",
      condition: () => currentAxe().key === "disaster"
    }, {
      name: "Welcome Back",
      rng: 7500,
      requirement: "Come back after 1h or longer idle time",
      condition: (w, a, opts) => opts.isOffline && state.lastOfflineElapsed >= 3600
    }, {
      name: "Potato But Cold",
      rng: 7777,
      requirement: "Meet same requirements as Hot Potato but in this area",
      condition: () => state.rolls % 2 !== 0 && (new Date).getSeconds() % 7 === 0
    }, {
      name: "Trophy",
      rng: 1e4,
      requirement: "Get something rarer than 1/100m today",
      condition: () => state.best && state.best.finalRng >= 1e8
    }, {
      name: "Snek Eys",
      rng: 11111,
      requirement: "Have '11' anywhere in your rolls",
      condition: () => String(state.rolls).includes("11")
    }, {
      name: "Dark Axe",
      rng: 16666,
      requirement: "Have Dark Axe equipped",
      condition: () => currentAxe().key === "dark"
    }, {
      name: "And Sand",
      rng: 20006,
      requirement: "Have '26' anywhere in your rolls",
      condition: () => String(state.rolls).includes("26")
    }, {
      name: "Food Eater",
      rng: 25e3,
      requirement: "Have Food Eater equipped",
      condition: () => currentAxe().key === "foodeater"
    }, {
      name: "Emblem of the Jackpot",
      rng: 3e4,
      requirement: "Have Emblem of the Jackpot equipped",
      condition: () => currentAxe().key === "emblem"
    }, {
      name: "Dreamers Prism",
      rng: 5e4,
      requirement: "Have Dreamer's Prism equipped",
      condition: () => currentAxe().key === "dreamersprism"
    }, {
      name: "Tail Zero",
      rng: 65e3,
      requirement: "Time must end in x:x0",
      condition: () => (new Date).getMinutes() % 10 === 0
    }, {
      name: "Sentient Watergun",
      rng: 75e3,
      requirement: "Have Sentient Watergun active",
      condition: () => state.activeBuffs && state.activeBuffs.watergun && state.activeBuffs.watergun.rollsLeft > 0
    }, {
      name: "Universal Recipe Gloves",
      rng: 8e4,
      requirement: "Have Universal Recipe Gloves active",
      condition: () => state.activeBuffs && state.activeBuffs.gloves && state.activeBuffs.gloves.rollsLeft > 0
    }, {
      name: "Glowaxe",
      rng: 1e5,
      requirement: "Have Glowaxe equipped",
      condition: () => currentAxe().key === "glowaxe"
    }, {
      name: "Coin Bag",
      rng: 222e3,
      requirement: "Must have Coin Bag equipped",
      condition: () => currentEquip() && currentEquip().key === "coinbag"
    }, {
      name: "Bedtime",
      rng: 5e5,
      requirement: "Have AFK time be higher than 1d when you return",
      condition: (w, a, opts) => opts.isOffline && state.lastOfflineElapsed >= 86400
    }, {
      name: "Day",
      rng: 75e4,
      requirement: "Must be daytime",
      condition: () => {
        const h = (new Date).getHours();
        return h >= 6 && h < 18;
      }
    }, {
      name: "Night",
      rng: 1e6,
      requirement: "Must be night",
      condition: () => {
        const h = (new Date).getHours();
        return h < 6 || h >= 18;
      }
    }, {
      name: "Explosive Axe Bomb",
      rng: 5e6,
      requirement: "Must be rolled from Explosive Axe Bombs usage",
      condition: (w, a, opts) => opts.isBomb
    }, {
      name: "Vitamin Axey",
      rng: 13333e3,
      requirement: "Must have Vitamin Axey equipped",
      condition: () => currentEquip() && currentEquip().key === "vitaminaxey"
    }, {
      name: "Silkinator",
      rng: 175e5,
      requirement: "Must use Silkinator",
      condition: () => currentAxe().key === "silkinator"
    }, {
      name: "Geomathaxe",
      rng: 6e7,
      requirement: "Must use Geomathaxe",
      condition: () => currentAxe().key === "geomathaxe"
    }, {
      name: "Bland Axe",
      rng: 7e7,
      requirement: "Must use Bland Axe",
      condition: () => currentAxe().key === "blandaxe"
    }, {
      name: "Magic Wand",
      rng: 9e7,
      requirement: "Must use Magic Wand",
      condition: () => currentAxe().key === "magicwand"
    }, {
      name: "Rage Axe",
      rng: 25e7,
      requirement: "Must use Rage Axe",
      condition: () => currentAxe().key === "rageaxe"
    }, {
      name: "God Axe",
      rng: 125e8,
      requirement: "Must use God Axe",
      condition: () => currentAxe().key === "godaxe"
    }, {
      name: "nan.axe",
      rng: 404e7,
      requirement: "Must use nan.axe",
      condition: () => currentAxe().key === "nanaxe"
    }, {
      name: "Specific Minute",
      rng: 8e7,
      requirement: "Can only be rolled at a random minute per hour",
      condition: () => {
        const now = new Date;
        const targetMin = (now.getHours() * 17 + 42) % 60;
        return now.getMinutes() === targetMin;
      }
    }, {
      name: "Read The Manual",
      rng: 99999999,
      requirement: "Must have How To Hold An Axe: A Guide For The Overconfident equipped",
      condition: () => currentEquip() && currentEquip().key === "twohandedbook"
    }, {
      name: "Youre Winner",
      rng: 125e6,
      requirement: "Must have all ranks less rare or equal to 1/1,000,000,000 in any area",
      condition: (w, a, opts) => {
        for (const world of WORLDS) for (const area of world.areas) for (const r of area.ranks) if (r.rng >= 1e9 && !hasEverFoundRank(area.label, r.name)) return false;
        return true;
      }
    }, {
      name: "Bootleg Tier",
      rng: 2e8,
      requirement: "Have Tail Zero found, Snek Eys, Potato But Cold, and And Sand found here",
      condition: () => hasEverFoundRank("2048", "Tile 0") && hasEverFoundRank("Gimmicks", "Snek Eys") && hasEverFoundRank("Gimmicks", "Potato But Cold") && hasEverFoundRank("Gimmicks", "And Sand")
    }, {
      name: "Fishy Starsystem",
      rng: 265e6,
      requirement: "Must have Fishy Starsystem equipped",
      condition: () => currentEquip() && currentEquip().key === "fishystarsystem"
    }, {
      name: "Lord of Requirements",
      rng: 3e8,
      requirement: "Have 10 or more requirements active",
      condition: (world, area, opts) => {
        let active = 0;
        for (const r of area.ranks) {
          if (r.name === "Lord of Requirements") continue;
          if (r.condition && r.condition(world, area, {})) active++;
        }
        return active >= 10;
      }
    }, {
      name: "3 AM Demon",
      rng: 666666666,
      requirement: "Time must be between 3 and 4 am",
      condition: () => (new Date).getHours() === 3
    }, {
      name: "Sakura Tree",
      rng: 7e8,
      requirement: "Only rollable on Sundays, the hour before it becomes Monday",
      condition: () => {
        const now = new Date;
        return now.getDay() === 0 && now.getHours() === 23;
      }
    }, {
      name: "Portable Rechargable Axenades",
      rng: 75e7,
      requirement: "Have Portable Rechargable Axenades equipped",
      condition: () => currentEquip() && currentEquip().key === "axenades"
    }, {
      name: "Trollstone",
      rng: 3,
      requirement: "Has a chance to appear next roll if youve been troll rolled",
      condition: () => state.trollstoneEligible
    }, {
      name: "U Win",
      rng: 15e8,
      requirement: "Can only spawn if you have found every OTHER rank rarer than or equal to 1/1,000,000,000 in this area (Sakura Tree, Fishy Starsystem, craziest TROLLSTONE, Specific Minute, and Portable Rechargable Axenades are excluded — too extreme to require)",
      condition: (world, area, opts) => {
        const uWinExcluded = [ "Sakura Tree", "Fishy Starsystem", "craziest TROLLSTONE", "Specific Minute", "Portable Rechargable Axenades" ];
        for (const r of area.ranks) if (r.name !== "U Win" && !uWinExcluded.includes(r.name) && r.rng < 1e9 && !hasEverFoundRank(area.label, r.name)) return false;
        return true;
      }
    }, {
      name: "craziest TROLLSTONE",
      rng: 3333333,
      requirement: "Must be troll rolled 5 times within your last 1,000 rolls",
      condition: () => trollRolledFiveInLastThousand()
    }, {
      name: "injector",
      rng: 66666666,
      requirement: "Must have Stablizer active",
      condition: () => isStablizerActive()
    }, {
      name: "super gimmick crystal",
      rng: 5e9,
      requirement: "Must have over 250,000,000 Gimmick Crystal",
      condition: () => getOwnedCount("Gimmicks", "Gimmick Crystal", null) > 25e7
    }, {
      name: "ONE CHANCE",
      rng: 77777777777,
      requirement: "Must ONLY be rolled from one swing of Juni's Axe",
      condition: (w, a, opts) => !!opts.isJuniSwing
    }, {
      name: "1%",
      rng: 25e13,
      requirement: "Must have juni axe (1% power) equipped",
      condition: () => currentAxe().key === "juniaxe1power"
    } ]
  }, {
    key: "lame",
    label: "LAME world",
    ranks: [ {
      name: "nothing",
      rng: 1
    }, {
      name: "boringest thingy ever",
      rng: 3e7
    }, {
      name: "lame crystal",
      rng: 8e7
    }, {
      name: "boringite",
      rng: 3e8,
      mutations: [ {
        name: "evil-ish rare boringite",
        rng: 999999999
      } ]
    }, {
      name: "nothing but its GIANT",
      rng: 8e9
    }, {
      name: "WASTELAND FROM WORLD 1 AREA 2",
      rng: 1e10
    }, {
      name: "something because nothing was boring",
      rng: 15e9
    }, {
      name: "great an infinite tier we dont need",
      rng: 55e9
    }, {
      name: "weird concept of nothing",
      rng: 7e10
    }, {
      name: "GO AWAY-IUM",
      rng: 25e10
    }, {
      name: "lightbulb",
      rng: 8e11
    } ]
  }, {
    key: "all",
    label: "All",
    debuffMult: 200,
    isUniversalPool: true,
    ranks: []
  }, {
    key: "placeholderland",
    label: "Placeholder Land",
    ranks: [ {
      name: "Weird Fragment",
      rng: 1
    }, {
      name: "Goofy Gring",
      rng: 25
    }, {
      name: "el powder",
      rng: 125
    }, {
      name: "H-ium",
      rng: 169
    }, {
      name: "☢️",
      rng: 400
    }, {
      name: "Canna Beans",
      rng: 700
    }, {
      name: "A Trillionth Of A J",
      rng: 1e3,
      mutations: [ {
        name: "The Rest Of The J",
        rng: 1e15
      } ]
    }, {
      name: "🥉",
      rng: 2500,
      mutations: [ {
        name: "🥈",
        rng: 1e6
      }, {
        name: "🥇",
        rng: 25e9
      } ]
    }, {
      name: "Toilet",
      rng: 15e3,
      mutations: [ {
        name: "GOLDEN TOILET AWARD",
        rng: 2e8
      } ]
    }, {
      name: "Yummy Delicious Chocolate",
      rng: 7e4
    }, {
      name: "1 lb of Hair (eww)",
      rng: 100001
    }, {
      name: "Air",
      rng: 25e4,
      mutations: [ {
        name: "         ",
        rng: 69e8
      } ]
    }, {
      name: "Granky",
      rng: 5555555
    }, {
      name: "Oumbaß",
      rng: 12345678
    }, {
      name: "Eel",
      rng: 39916800
    }, {
      name: "GLOVE",
      rng: 5257e4
    }, {
      name: "Comic Book",
      rng: 1e8
    }, {
      name: "ELECTRIC BLANKET!!!",
      rng: 333222111
    }, {
      name: "The Burger YOU Ate",
      rng: 6942e5
    }, {
      name: "'Every Area Needs A Rare Ass Thing' Shut Up Bro",
      rng: 25e10
    }, {
      name: "Botl Cap",
      rng: 75e10
    } ]
  } ]
};

const WORLD2 = {
  key: "world2",
  label: "World 2",
  global: [ {
    name: "crazy tate",
    rng: 75e9
  }, {
    name: "WOKE",
    rng: 6825e21
  }, {
    name: "Was A Second World Necessary? Probably Yeah But This Is The Rarest Rank Ingame and It Has The LONGEST NAME EVER Itll Probably STRETCH EVERYTHING SO FAR ITLL BE FUNNY MAYBE Lol AND It Only Spawns In This God Damn World of Unseriousness and Seriousness And No One Will PROBABLY EVER NEVER GET THIS RANK EVER",
    rng: 1e30
  } ],
  areas: [ {
    key: "winterstone",
    label: "winterstone",
    ranks: [ {
      name: "snowflake",
      rng: 1
    }, {
      name: "borealium",
      rng: 75
    }, {
      name: "raindrops",
      rng: 180
    }, {
      name: "ice crystal",
      rng: 700
    }, {
      name: "snowstorm",
      rng: 2500,
      mutations: [ {
        name: "raging blizzard",
        rng: 8e11
      } ]
    }, {
      name: "ice fragments",
      rng: 12745
    }, {
      name: "permafrost",
      rng: 47200
    }, {
      name: "slush",
      rng: 78533
    }, {
      name: "frozen lapis",
      rng: 122e3
    }, {
      name: "0c",
      rng: 273150,
      mutations: [ {
        name: "Subzero",
        rng: 27315e4
      } ]
    }, {
      name: "frigid",
      rng: 749999.5
    }, {
      name: "vermeil",
      rng: 1761700
    }, {
      name: "lavandite",
      rng: 792e4
    }, {
      name: "freezecrystal",
      rng: 2618e4
    }, {
      name: "frozen",
      rng: 78e6
    }, {
      name: "amazing ice cold stone",
      rng: 25e7
    } ]
  }, {
    key: "boiworld",
    label: "Boi World",
    ranks: [ {
      name: "Boi",
      rng: 1,
      mutations: [ {
        name: "Boi Crystal",
        rng: 7e4
      }, {
        name: "Boi Stone",
        rng: 9e5
      }, {
        name: "Omega Boi",
        rng: 7e6
      }, {
        name: "Super Boi",
        rng: 95e6
      }, {
        name: "CRAZY Boi",
        rng: 6e8
      }, {
        name: "Universal Boi",
        rng: 25e8
      }, {
        name: "ALMOST RAREST Boi",
        rng: 75e8
      }, {
        name: "Boi-Ultimate",
        rng: 25e9
      }, {
        name: "RAREST Boi",
        rng: 1e11
      }, {
        name: "i lied this is the rarest Boi ever lol",
        rng: 25e21
      } ]
    } ]
  }, {
    key: "perilous",
    label: "Perilous",
    perilous: true,
    ranks: [ {
      name: "Perlite",
      rng: 1
    }, {
      name: "Omitium",
      rng: 85
    }, {
      name: "Fadite",
      rng: 300
    }, {
      name: "Embrite",
      rng: 725
    }, {
      name: "Voidite",
      rng: 6850,
      mutations: [ {
        name: "Evanescence",
        rng: 782187842537
      } ]
    }, {
      name: "Aporia",
      rng: 38416
    }, {
      name: "Kenite",
      rng: 63716,
      mutations: [ {
        name: "Kenosis",
        rng: 8176618
      } ]
    }, {
      name: "Abeyance",
      rng: 91762
    }, {
      name: "Impermanence",
      rng: 317519,
      mutations: [ {
        name: "Entropicium",
        rng: 18151815181
      } ]
    }, {
      name: "Cessation",
      rng: 2615728
    }, {
      name: "Obstarite",
      rng: 24916526,
      mutations: [ {
        name: "Oblivion",
        rng: 43816745197
      } ]
    }, {
      name: "Incessant",
      rng: 73523752
    }, {
      name: "Catastrophe",
      rng: 172577376
    }, {
      name: "Armageddon",
      rng: 237159572,
      mutations: [ {
        name: "Ragnarok",
        rng: 89e12
      } ]
    }, {
      name: "Nilihity",
      rng: 490715177
    }, {
      name: "Nexull",
      rng: 892518772
    }, {
      name: "Aphanisis",
      rng: 2684185386
    }, {
      name: "Eterium",
      rng: 6149525841
    }, {
      name: "Nixisite",
      rng: 9486176971
    }, {
      name: "Ciphite",
      rng: 12651962275
    } ]
  } ]
};

const WORLDS = [ WORLD1, SUBWORLD1, WORLD0, WORLD2 ];

const ONCE_PER_CLICK_RANK = SUBWORLD1.global.find(g => g.oncePerClickOnly);

const AXES = {
  default: {
    key: "default",
    name: "Default Axe",
    desc: "Nothing special. It just chops.",
    stats: {
      luckMult: 1,
      bulk: 1,
      rps: 0
    },
    requires: [],
    free: true
  },
  crude: {
    key: "crude",
    name: "Crude Axe",
    desc: "Your first axe. Happy?",
    stats: {
      luckMult: 1.5,
      bulk: 2,
      rps: 1.1
    },
    requires: [ {
      name: "Dirt",
      area: "Natural",
      amount: 25
    }, {
      name: "Rock",
      area: "Natural",
      amount: 6
    }, {
      name: "Blade of Grass",
      area: "Natural",
      amount: 15
    }, {
      name: "Crystal",
      area: "Natural",
      amount: 1
    } ]
  },
  destroyer: {
    key: "destroyer",
    name: "Destructive Destroyed Destroyer",
    desc: "...an axe thats destructive, yet is destroyed? Ironic..",
    stats: {
      luckMult: 4,
      bulk: 5,
      rps: 3
    },
    requires: [ {
      name: "Pollution",
      area: "Wasteland",
      amount: 5e3
    }, {
      name: "Crystal",
      area: "Natural",
      amount: 25
    }, {
      name: "Ruincrystal",
      area: "Wasteland",
      amount: 100
    }, {
      name: "Junk Producer",
      area: "Wasteland",
      amount: 3
    }, {
      name: "Fragments",
      area: "Wasteland",
      amount: 1
    } ]
  },
  disaster: {
    key: "disaster",
    name: "Disaster Bringer",
    desc: "Self explanatory name, lots of rolls BUT your luck is less!",
    stats: {
      luckMult: .85,
      bulk: 8,
      rps: 10
    },
    requires: [ {
      name: "Disaster",
      area: "Natural",
      amount: 10
    }, {
      name: "Unfunctional Tool",
      area: "Wasteland",
      amount: 3
    }, {
      name: "Slop",
      area: "Wasteland",
      amount: 1
    } ]
  },
  dark: {
    key: "dark",
    name: "Dark Axe",
    desc: "Darker then 0,0,0 in HEX?",
    stats: {
      luckMult: 6.66,
      bulk: 6,
      rps: 15
    },
    bonus: "Offline: every second, 1/666 chance to add 6 rolls at ×66 luck.",
    offlineBonus: [ {
      intervalSeconds: 1,
      chancePerInterval: 1 / 666,
      minRolls: 6,
      maxRolls: 6,
      bonusLuckMult: 66
    } ],
    requires: [ {
      name: "Corruption Fragment",
      area: "Wasteland",
      amount: 320
    }, {
      name: "Fire",
      area: "Natural",
      amount: 20
    }, {
      name: "Rock",
      area: "Natural",
      amount: 10,
      variant: "odd"
    }, {
      name: "Silver",
      area: "Natural",
      amount: 50
    } ]
  },
  foodeater: {
    key: "foodeater",
    name: "Food Eater",
    desc: "*chew*",
    stats: {
      luckMult: 15,
      bulk: 7,
      rps: 20
    },
    bonus: "Offline: every second, 1/20 chance to add 50 rolls at ×50 luck. On roll click: 1/70 chance to do 100 extra rolls at ×10 luck.",
    offlineBonus: [ {
      intervalSeconds: 1,
      chancePerInterval: 1 / 20,
      minRolls: 50,
      maxRolls: 50,
      bonusLuckMult: 50
    } ],
    clickBonus: [ {
      oneIn: 70,
      rolls: 100,
      luckMult: 10
    } ],
    requires: [ {
      name: "Leftover Burger",
      area: "The Fridge",
      amount: 3
    }, {
      name: "Water",
      area: "The Fridge",
      amount: 20
    }, {
      name: "Fruits",
      area: "The Fridge",
      amount: 1
    } ]
  },
  dreamersprism: {
    key: "dreamersprism",
    name: "Dreamer's Prism",
    desc: "A shard of something that was never fully awake.",
    stats: {
      luckMult: 10,
      bulk: 9,
      rps: 27
    },
    bonus: "Offline: every minute, 1 roll at ×5000 luck; every second, 1/900 chance to add 1k–2.5k rolls at ×25 luck. On roll click: 1/120 chance for 1 extra roll at ×1500 luck.",
    offlineBonus: [ {
      intervalSeconds: 60,
      chancePerInterval: 1,
      minRolls: 1,
      maxRolls: 1,
      bonusLuckMult: 5e3
    }, {
      intervalSeconds: 1,
      chancePerInterval: 1 / 900,
      minRolls: 1e3,
      maxRolls: 2500,
      bonusLuckMult: 25
    } ],
    clickBonus: [ {
      oneIn: 120,
      rolls: 1,
      luckMult: 1500
    } ],
    requires: [ {
      name: "Esoterium",
      area: "Aberration",
      amount: 8
    }, {
      name: "Abnormal",
      area: "Aberration",
      amount: 250
    }, {
      name: "Unrecognizability",
      area: "Aberration",
      amount: 5
    } ]
  },
  emblem: {
    key: "emblem",
    name: "Emblem of the Jackpot",
    desc: "Every unfinished dream, one lucky pull closer.",
    stats: {
      luckMult: 1.77,
      bulk: 17,
      rps: 77
    },
    bonus: "[Blessing] ×1.7 luck to every unfinished material in your pinned recipe. [Reach] Pinned materials can drop in any area, at ×5 rarity. [7 Leaf Clover] Offline every 7 min: +7 rolls at ×7,777 luck. [Big Wins] On roll: 1/777,777 for +777 rolls at ×777,777 luck. [Synergy Pushpin] While Pushpin is also active: an extra ×1.7 luck to the most COMMON unfinished material in your pinned recipe — stacks with Pushpin.",
    offlineBonus: [ {
      intervalSeconds: 420,
      chancePerInterval: 1,
      minRolls: 7,
      maxRolls: 7,
      bonusLuckMult: 7777
    } ],
    clickBonus: [ {
      oneIn: 777777,
      rolls: 777,
      luckMult: 777777
    } ],
    blessingLuckMult: 1.7,
    reachRarityMult: 5,
    synergyPushpinLuckMult: 1.7,
    requires: [ {
      name: "Blank",
      area: "Aberration",
      amount: 1
    }, {
      name: "Unstable Core",
      area: "Aberration",
      amount: 2
    }, {
      name: "Glitchite",
      area: "Aberration",
      amount: 2
    }, {
      name: "Esoterium",
      area: "Aberration",
      amount: 3
    }, {
      name: "Abnormal",
      area: "Aberration",
      amount: 7
    }, {
      name: "Unstablium",
      area: "Aberration",
      amount: 1
    }, {
      name: "Abberatite",
      area: "Aberration",
      amount: 222
    } ]
  },
  glowaxe: {
    key: "glowaxe",
    name: "GlowAxe",
    desc: "Carved from light that refuses to fade.",
    stats: {
      luckMult: 20,
      bulk: 4,
      rps: 15
    },
    bonus: "[Lightburst] Every hour offline: +5,000 rolls at ×2,500 luck. [Guidance] On click: 1/500 for +25 rolls at ×10,000 luck. [Sunrays] Every 75th click: +50 rolls at ×2,000 luck.",
    offlineBonus: [ {
      intervalSeconds: 3600,
      chancePerInterval: 1,
      minRolls: 5e3,
      maxRolls: 5e3,
      bonusLuckMult: 2500
    } ],
    clickBonus: [ {
      oneIn: 500,
      rolls: 25,
      luckMult: 1e4
    } ],
    sunrays: {
      everyNClicks: 75,
      rolls: 50,
      luckMult: 2e3
    },
    requires: [ {
      name: "Leviathan",
      area: "Natural",
      amount: 3
    }, {
      name: "Entropy",
      area: "Wasteland",
      amount: 3
    }, {
      name: "Esoterium",
      area: "Aberration",
      amount: 10
    }, {
      name: "Fruits",
      area: "The Fridge",
      amount: 5
    }, {
      name: "Glitchite",
      area: "Aberration",
      amount: 10
    } ]
  },
  silkinator: {
    key: "silkinator",
    name: "Silkinator",
    desc: "Spun from something that was never quite alive.",
    stats: {
      luckMult: 5,
      bulk: 40,
      rps: 625
    },
    bonus: "[Spider Web] Offline every minute: +2,500 rolls at ×12.5 luck. [Creepy Crawlies] Offline every 22 min: 1/2.2 chance for +22,222 rolls at ×22.2 luck.",
    offlineBonus: [ {
      intervalSeconds: 60,
      chancePerInterval: 1,
      minRolls: 2500,
      maxRolls: 2500,
      bonusLuckMult: 12.5
    }, {
      intervalSeconds: 1320,
      chancePerInterval: 1 / 2.2,
      minRolls: 22222,
      maxRolls: 22222,
      bonusLuckMult: 22.2
    } ],
    requires: [ {
      name: "Moon",
      area: "Natural",
      amount: 1
    }, {
      name: "Garbage Compacter",
      area: "Wasteland",
      amount: 1
    }, {
      name: "Leviathan",
      area: "Natural",
      amount: 3
    }, {
      name: "Unstable Core",
      area: "Aberration",
      amount: 5
    }, {
      name: "The Probably Rarest Thing Ever",
      area: "Scary Land",
      amount: 2
    }, {
      name: "Leftover Burger",
      area: "The Fridge",
      amount: 5
    }, {
      name: "Glitchite",
      area: "Aberration",
      amount: 10
    } ]
  },
  geomathaxe: {
    key: "geomathaxe",
    name: "GeomathAxe",
    desc: "It does math. That's it. That's the axe.",
    stats: {
      luckMult: .628,
      bulk: 2718,
      rps: 1618
    },
    bonus: "[Addition] Offline every minute: +628 rolls at ×314 luck. [Division] Every 5th click: +628 rolls at ×62.8 luck and ×3.14 mutation luck. [Multiplication] Every minute: 1/5 for +5n rolls at ×16.18 luck, where n = (hours offline so far) × 5, capped at 1,000 rolls per trigger.",
    offlineBonus: [ {
      intervalSeconds: 60,
      chancePerInterval: 1,
      minRolls: 628,
      maxRolls: 628,
      bonusLuckMult: 314
    }, {
      intervalSeconds: 60,
      chancePerInterval: 1 / 5,
      bonusLuckMult: 16.18,
      dynamicRolls(tickIndex, intervalSeconds) {
        const hoursIdle = tickIndex * intervalSeconds / 3600;
        const n = hoursIdle * 5;
        return Math.round(Math.min(5 * n, 1e3));
      }
    } ],
    clickBonus: [ {
      everyNClicks: 5,
      chance: 1,
      rolls: 628,
      luckMult: 62.8,
      mutationLuckMult: 3.14
    } ],
    requires: [ {
      name: "Moon",
      area: "Natural",
      amount: 2
    }, {
      name: "Garbage Compacter",
      area: "Wasteland",
      amount: 1
    }, {
      name: "Unstable Core",
      area: "Aberration",
      amount: 20
    }, {
      name: "Leviathan",
      area: "Natural",
      amount: 1
    }, {
      name: "Glitchite",
      area: "Aberration",
      amount: 8
    } ]
  },
  rageaxe: {
    key: "rageaxe",
    name: "Rage Axe",
    desc: "wow! totally expensive and op, is it even WORTH??? STOP!!!! THIS IS SUCH AN ANGRY AXE!!! *scream.mp3*",
    stats: {
      luckMult: 100,
      bulk: 163,
      rps: 475
    },
    bonus: "[Angriness] Offline every 5s: 1/50 for +1,050 rolls at ×26.66 luck. [Tableflip] On click: 1/25 for +450 rolls at ×100 luck. [Angst] Offline every hour: 1/5 for +150k rolls at ×13 luck. [Fist O' Hurt] Every 3rd click: 1/150 for +7 rolls at ×8,750 luck. [Anger] Every 70th click: +900 rolls at ×16.65 luck (×1.25 mutation luck). [Slam] Every 20th click: +7 rolls at ×50,000 luck. [Frustration] Offline every hour: +11,250 rolls at ×250 luck. [Irritation] Each full day idle: +27.5% efficiency to every OTHER idle bonus on this axe (resets the moment you're active again).",
    offlineBonus: [ {
      intervalSeconds: 5,
      chancePerInterval: 1 / 50,
      minRolls: 1050,
      maxRolls: 1050,
      bonusLuckMult: 26.66,
      irritationScales: true
    }, {
      intervalSeconds: 3600,
      chancePerInterval: 1 / 5,
      minRolls: 15e4,
      maxRolls: 15e4,
      bonusLuckMult: 13,
      irritationScales: true
    }, {
      intervalSeconds: 3600,
      chancePerInterval: 1,
      minRolls: 11250,
      maxRolls: 11250,
      bonusLuckMult: 250,
      irritationScales: true
    } ],
    clickBonus: [ {
      oneIn: 25,
      rolls: 450,
      luckMult: 100
    }, {
      everyNClicks: 3,
      oneIn: 150,
      rolls: 7,
      luckMult: 8750
    }, {
      everyNClicks: 70,
      chance: 1,
      rolls: 900,
      luckMult: 16.65,
      mutationLuckMult: 1.25
    }, {
      everyNClicks: 20,
      chance: 1,
      rolls: 7,
      luckMult: 5e4
    } ],
    irritation: {
      perDayPct: 27.5,
      appliesToRps: true
    },
    requires: [ {
      name: "Moon",
      area: "Natural",
      amount: 5
    }, {
      name: "Obliterator",
      area: "Wasteland",
      amount: 3
    }, {
      name: "Spectral",
      area: "Aberration",
      amount: 5
    }, {
      name: "PIZZA",
      area: "The Fridge",
      amount: 1
    }, {
      name: "The Probably Rarest Thing Ever",
      area: "Scary Land",
      amount: 100
    } ]
  },
  nanaxe: {
    key: "nanaxe",
    name: "nan.axe",
    desc: "404: axe not found. Somehow still swings.",
    stats: {
      luckMult: 404,
      bulk: 404,
      rps: 404
    },
    bonus: "[Deletion] Offline every 404s: 1/4.04 for +40 rolls at ×4,040,404 luck. [Bad Gateway] Every 5th click: +5,030 rolls at ×5,030 luck, guaranteed. [Segmentation Fault] Offline every hour: 1/40.3 for +4,030 rolls at ×403,403 luck. [Unstability] Every 10th click: 1/50 for +5,678 rolls at ×4,040 luck. [Corruption] Every 4th click: 1/4.04 for +4,040 rolls at ×4.04 luck (×4.04 mutation luck). [Nilbomb] Every 404th click: 1/4 for +40,404 rolls at ×404 luck (×1.4 mutation luck). [MISSING TEXTURE] Offline every 6s: 1/666 to add +666 rolls at ×6,666 luck.",
    offlineBonus: [ {
      intervalSeconds: 404,
      chancePerInterval: 1 / 4.04,
      minRolls: 40,
      maxRolls: 40,
      bonusLuckMult: 4040404
    }, {
      intervalSeconds: 3600,
      chancePerInterval: 1 / 40.3,
      minRolls: 4030,
      maxRolls: 4030,
      bonusLuckMult: 403403
    }, {
      intervalSeconds: 6,
      chancePerInterval: 1 / 666,
      minRolls: 666,
      maxRolls: 666,
      bonusLuckMult: 6666
    } ],
    clickBonus: [ {
      everyNClicks: 5,
      chance: 1,
      rolls: 5030,
      luckMult: 5030
    }, {
      everyNClicks: 10,
      oneIn: 50,
      rolls: 5678,
      luckMult: 4040
    }, {
      everyNClicks: 4,
      oneIn: 4.04,
      rolls: 4040,
      luckMult: 4.04,
      mutationLuckMult: 4.04
    }, {
      everyNClicks: 404,
      oneIn: 4,
      rolls: 40404,
      luckMult: 404,
      mutationLuckMult: 1.4
    } ],
    requires: [ {
      consumable: "errredirector",
      amount: 40
    }, {
      name: "not found",
      area: "404",
      amount: 29099982
    }, {
      name: "undefined",
      area: "404",
      amount: 17156092
    }, {
      name: "corruption",
      area: "404",
      amount: 305e4
    }, {
      name: "NaN",
      area: "404",
      amount: 25e4
    }, {
      name: "Bad Request",
      area: "404",
      amount: 125e3
    }, {
      name: "FORBIDDEN.",
      area: "404",
      amount: 25e3
    }, {
      name: "TIMEOUT",
      area: "404",
      amount: 1250
    }, {
      name: "UNAUTHORIZED.",
      area: "404",
      amount: 262
    }, {
      name: "NULL",
      area: "404",
      amount: 16
    }, {
      name: "NIL",
      area: "404",
      amount: 5
    }, {
      name: "DENIAL",
      area: "404",
      amount: 2
    }, {
      name: "NO CONTENT.",
      area: "404",
      amount: 1
    } ]
  },
  blandaxe: {
    key: "blandaxe",
    name: "Bland Axe",
    desc: '"hi i noticed there wasnt any active axes so consider this a blessing if you hate hybrids or idles" - juni (also good luck if youre doing the active way ! theres a long way to grind)',
    stats: {
      luckMult: 1.5,
      bulk: 80,
      rps: 5
    },
    bonus: "[lameness] On click: 1/10 to add 30 rolls at ×300 luck (×1.25 mutation luck). [yay active also 4th wall break] Every 10th click, always: +300 rolls at ×30 luck (×3 mutation luck).",
    clickBonus: [ {
      chance: 1 / 10,
      rolls: 30,
      luckMult: 300,
      mutationLuckMult: 1.25
    }, {
      everyNClicks: 10,
      chance: 1,
      rolls: 300,
      luckMult: 30,
      mutationLuckMult: 3
    } ],
    requires: [ {
      name: "Wood",
      area: "Natural",
      amount: 100
    }, {
      name: "Crystal",
      area: "Natural",
      amount: 500
    }, {
      name: "Silver",
      area: "Natural",
      amount: 100
    } ]
  },
  magicwand: {
    key: "magicwand",
    name: "Magic Wand",
    desc: "why a wand and not an axe? oh wait theres literally a person who eats food and literal math as an axe",
    stats: {
      luckMult: 3.5,
      bulk: 75,
      rps: 10
    },
    bonus: "[luck ium blast] Every 10th click: 1/5 to add 2,000 rolls at ×(random number between 5-10) luck (×1.5 mutation luck). [illusions] Always on the 25th click: +50 rolls at ×250 luck (×1.2 mutation luck). [glitter spread] On EVERY roll (not click), 1/1,250 to add +125 more rolls at ×1,250 luck (×1.25 mutation luck) — these bonus rolls can themselves trigger Glitter Spread again, chaining, capped at 75,000 chained rolls per click. Does not trigger from offline rolls.",
    clickBonus: [ {
      everyNClicks: 10,
      oneIn: 5,
      rolls: 2e3,
      dynamicLuckMultFn: () => 5 + Math.random() * 5,
      mutationLuckMult: 1.5
    }, {
      everyNClicks: 25,
      chance: 1,
      rolls: 50,
      luckMult: 250,
      mutationLuckMult: 1.2
    } ],
    perRollBonus: {
      oneIn: 1250,
      rolls: 125,
      luckMult: 1250,
      mutationLuckMult: 1.25,
      chainCapPerClick: 75e3
    },
    requires: [ {
      name: "Esoterium",
      area: "Aberration",
      amount: 280
    }, {
      name: "Glitchite",
      area: "Aberration",
      amount: 100
    }, {
      name: "Unstable Core",
      area: "Aberration",
      amount: 20
    } ]
  },
  godaxe: {
    key: "godaxe",
    name: "God Axe",
    desc: "stay awake. you cant get rid of the power youve reached for... will you stay or join the corruption?",
    stats: {
      luckMult: 2e4,
      bulk: 5,
      rps: 0
    },
    bonus: "[divinity] Every click: 1/50 to add +30 rolls at ×700,000 luck (×20 mutation luck). [ascension] Every 20th click, always: +30,000 rolls at ×800 luck (×4 mutation luck). [supremity] Every 75th click, always: +7,000 rolls at ×3,500 luck. [prayers] Every 5th click: 1/25 to add +40,000 rolls at ×750 luck. [omnipotence] Every 10 clicks: 1/10 to add +10,000 rolls at ×2,500 luck.",
    clickBonus: [ {
      chance: 1 / 50,
      rolls: 30,
      luckMult: 7e5,
      mutationLuckMult: 20
    }, {
      everyNClicks: 20,
      chance: 1,
      rolls: 3e4,
      luckMult: 800,
      mutationLuckMult: 4
    }, {
      everyNClicks: 75,
      chance: 1,
      rolls: 7e3,
      luckMult: 3500
    }, {
      everyNClicks: 5,
      oneIn: 25,
      rolls: 4e4,
      luckMult: 750
    }, {
      everyNClicks: 10,
      oneIn: 10,
      rolls: 1e4,
      luckMult: 2500
    } ],
    requires: [ {
      name: "DENIAL",
      area: "404",
      amount: 5
    }, {
      name: "MISDIRECTED",
      area: "404",
      amount: 2
    }, {
      name: "Obliterator",
      area: "Wasteland",
      amount: 6
    } ]
  },
  fraudaxe: {
    key: "fraudaxe",
    name: "Fraud Axe",
    desc: "im the best axe ever - said liar or truth-er (finally a REAL idle axe!)",
    stats: {
      luckMult: 2.5,
      bulk: 3,
      rps: 300
    },
    bonus: "[SCAM TOUCH] Offline every hour, always: +5 rolls at ×200,000 luck (×10 mutation luck). [blockfraud] Offline every 5 min, always: +1,000 rolls at ×5 luck. [real blocks for free] Offline every 15 min, always: +500,000 rolls at ×0.5 luck.",
    offlineBonus: [ {
      intervalSeconds: 3600,
      chancePerInterval: 1,
      minRolls: 5,
      maxRolls: 5,
      bonusLuckMult: 2e5,
      bonusMutationLuckMult: 10
    }, {
      intervalSeconds: 300,
      chancePerInterval: 1,
      minRolls: 1e3,
      maxRolls: 1e3,
      bonusLuckMult: 5
    }, {
      intervalSeconds: 900,
      chancePerInterval: 1,
      minRolls: 5e5,
      maxRolls: 5e5,
      bonusLuckMult: .5
    } ],
    requires: [ {
      name: "Moon",
      area: "Natural",
      amount: 1
    }, {
      name: "Leviathan",
      area: "Natural",
      amount: 5
    }, {
      name: "Unstable Core",
      area: "Aberration",
      amount: 40
    }, {
      name: "Fragments",
      area: "Wasteland",
      amount: 2e4
    } ]
  },
  juniaxe1power: {
    key: "juniaxe1power",
    name: "juni axe (1% power)",
    desc: '<img class="juni-axe-gif" src="./textures/juni-axe.gif" alt="juni axe (1% power)">',
    stats: {
      luckMult: 25e3,
      bulk: 1e5,
      rps: 75e3
    },
    bonus: '<img class="juni-bonus-gif" src="./textures/juni-axe.gif" alt=""> Every click: 1/2 to add 250,000 rolls at ×10,000 luck. <img class="juni-bonus-gif" src="./textures/juni-axe.gif" alt=""> Offline every millisecond: 1/69,420 to add 69,420 rolls at ×69,420 luck. <img class="juni-bonus-gif" src="./textures/juni-axe.gif" alt=""> On click: 1/5 to add 125 rolls at ×50,000,000 luck; offline every 5s: 1/2.5 to add 750 rolls at ×50,000,000 luck.',
    hiddenUntilBallUpgrade: "unlockJuniAxe",
    discountExempt: true,
    clickBonus: [ {
      chance: 1 / 2,
      rolls: 25e4,
      luckMult: 1e4
    }, {
      chance: 1 / 5,
      rolls: 125,
      luckMult: 5e7
    } ],
    offlineBonus: [ {
      workerSim: true,
      intervalSeconds: .001,
      chancePerInterval: 1 / 69420,
      minRolls: 69420,
      maxRolls: 69420,
      bonusLuckMult: 69420
    }, {
      intervalSeconds: 5,
      chancePerInterval: 1 / 2.5,
      minRolls: 750,
      maxRolls: 750,
      bonusLuckMult: 5e7
    } ],
    requires: [ {
      name: "The Probably Rarest Thing Ever",
      area: "Scary Land",
      amount: 725e5
    }, {
      name: "         ",
      area: "Placeholder Land",
      amount: 12500
    }, {
      name: "lavandite",
      area: "winterstone",
      amount: 2682500
    }, {
      name: "lame crystal",
      area: "LAME world",
      amount: 4250
    }, {
      name: "Spectral",
      area: "Aberration",
      amount: 153e3
    }, {
      name: "Esoterium",
      area: "Aberration",
      variant: "odd",
      amount: 7350
    }, {
      name: "Lunar",
      area: "Natural",
      variant: "weird",
      amount: 52500
    }, {
      name: "Slop",
      area: "Wasteland",
      variant: "grayscale",
      amount: 99999
    }, {
      name: "Destruction",
      area: "Wasteland",
      amount: 9500
    }, {
      name: "Blank",
      area: "Aberration",
      amount: 175e4
    }, {
      ball: "black",
      amount: 10
    }, {
      ball: "pink",
      amount: 35
    }, {
      ball: "cyan",
      amount: 25
    }, {
      ball: "purple",
      amount: 20
    }, {
      consumable: "juniaxeswing",
      amount: 2500
    }, {
      name: "Destiny",
      area: "Natural",
      globalWorld: "world1",
      amount: 777
    }, {
      name: "crazy tate",
      area: "winterstone",
      globalWorld: "world2",
      amount: 5e3
    }, {
      name: "Dirtiverse",
      area: "Natural",
      amount: 500
    }, {
      name: "Doomcrystal",
      area: "Wasteland",
      variant: "weird",
      amount: 2750
    } ]
  }
};

const AXE_ORDER = [ "default", "crude", "destroyer", "blandaxe", "disaster", "dark", "foodeater", "dreamersprism", "emblem", "glowaxe", "magicwand", "silkinator", "geomathaxe", "fraudaxe", "rageaxe", "godaxe", "nanaxe", "juniaxe1power" ];

const EQUIPS = {
  punything: {
    key: "punything",
    name: "Puny Thingy",
    desc: "is this just a weak ahh thing? 😂",
    luckMult: 1.05,
    idleEfficiencyMult: 1.1,
    bonus: "On click: 1/25 chance to add (current bulk / 2) rolls at ×2 your current luck and dynamic mutation luck (luck×0.2, clamped between ×0.2 and ×5).",
    clickBonus: [ {
      oneIn: 25,
      dynamicRollsFn() {
        return Math.round(effectiveBulk() / 2);
      },
      dynamicLuckMultFn() {
        return effectiveLuckMult() * 2;
      },
      dynamicMutationLuckFn() {
        return Math.max(.2, Math.min(5, effectiveLuckMult() * .2));
      }
    } ],
    requires: [ {
      name: "Dirt",
      area: "Natural",
      amount: 75
    }, {
      name: "Blade of Grass",
      area: "Natural",
      amount: 10
    }, {
      name: "Rock",
      area: "Natural",
      amount: 18
    } ]
  },
  vitaminaxey: {
    key: "vitaminaxey",
    name: "Vitamin Axey",
    desc: "- now with 25% more shit to help YOU go faster! (side effects may cause less idle-ing and more active-ing and intense axe usage sessions (Please dont take this seriously and learn what some stuff does this is just a game))",
    luckMult: 3.33,
    idleEfficiencyMult: 1.3,
    bonus: "On every click: +275 rolls at ×5 luck. Offline every 3 min: +36,500 rolls at ×0.2 luck.",
    clickBonus: [ {
      chance: 1,
      rolls: 275,
      luckMult: 5
    } ],
    offlineBonus: [ {
      intervalSeconds: 180,
      chancePerInterval: 1,
      minRolls: 36500,
      maxRolls: 36500,
      bonusLuckMult: .2
    } ],
    requires: [ {
      name: "Life",
      area: "Natural",
      amount: 8
    }, {
      name: "Fire",
      area: "Natural",
      amount: 5
    } ]
  },
  coinbag: {
    key: "coinbag",
    name: "Coin Bag",
    desc: "im rich heres money - you ingame",
    luckMult: 1.5,
    rpsMult: 1.5,
    coinBagStackChance: 1 / 5,
    coinBagStackDurationMs: 15e3,
    bonus: "On click: 1/5 chance to add a 15-second stack, each worth +5% of your current luck (capped +125% total) and +0.1× mutation luck (capped +1.5× total), additively. Offline every 4 hours: +75,000 rolls at ×50 luck and ×2 mutation luck.",
    offlineBonus: [ {
      intervalSeconds: 14400,
      chancePerInterval: 1,
      minRolls: 75e3,
      maxRolls: 75e3,
      bonusLuckMult: 50
    } ],
    requires: [ {
      name: "Esoterium",
      area: "Aberration",
      amount: 500
    }, {
      name: "Glitchite",
      area: "Aberration",
      amount: 100
    }, {
      name: "Unstable Core",
      area: "Aberration",
      amount: 15
    } ]
  },
  twohandedbook: {
    key: "twohandedbook",
    name: "How To Hold An Axe: A Guide For The Overconfident",
    desc: "A thick instructional manual explaining, at length, that you should probably be using two hands.",
    luckMult: 1.5,
    bulkMult: 2,
    idleEfficiencyMult: 2,
    bonus: "On click: 1/25 chance to use ×4 bulk for that roll instead of the usual ×2.",
    bulkMultOverrideChance: 1 / 25,
    bulkMultOverride: 4,
    requires: [ {
      name: "Moon",
      area: "Natural",
      amount: 5
    }, {
      name: "Obliterator",
      area: "Wasteland",
      amount: 2
    }, {
      name: "Spectral",
      area: "Aberration",
      amount: 1
    }, {
      name: "Leviathan",
      area: "Natural",
      amount: 27
    }, {
      name: "Fragments",
      area: "Wasteland",
      amount: 2e3
    } ]
  },
  fishystarsystem: {
    key: "fishystarsystem",
    name: "Fishy Starsystem",
    desc: "swimming through the cosmos, somehow.",
    luckMult: 2.5,
    idleEfficiencyMult: 3.75,
    bonus: "On click: 1/150 chance to add 750 rolls at ×25 luck. Offline every hour: +400,000 rolls at ×7.5 luck and ×2 mutation luck.",
    clickBonus: [ {
      oneIn: 150,
      rolls: 750,
      luckMult: 25
    } ],
    offlineBonus: [ {
      intervalSeconds: 3600,
      chancePerInterval: 1,
      minRolls: 4e5,
      maxRolls: 4e5,
      bonusLuckMult: 7.5
    } ],
    requires: [ {
      name: "Moon",
      area: "Natural",
      amount: 30
    }, {
      name: "Obliterator",
      area: "Wasteland",
      amount: 16
    }, {
      name: "Spectral",
      area: "Aberration",
      amount: 17
    } ]
  },
  axenades: {
    key: "axenades",
    name: "Portable Rechargable Axenades",
    desc: "boom, but portable, and reusable.",
    bombChargeSpeedMult: 2,
    bombEfficiencyMult: 1.5,
    bombTriggerBonus: {
      rolls: 25e3,
      luckMult: 175,
      mutationLuckMult: 5
    },
    bonus: "Offline every 25s: +500 rolls at ×17 luck. Every 100th click: +4,000 rolls at ×2 luck. While equipped, the Explosive Axe Bomb charges ×2 faster and is ×1.5 more efficient — and firing it also adds a bonus 25,000 rolls at ×175 luck and ×5 mutation luck.",
    offlineBonus: [ {
      intervalSeconds: 25,
      chancePerInterval: 1,
      minRolls: 500,
      maxRolls: 500,
      bonusLuckMult: 17
    } ],
    clickBonus: [ {
      everyNClicks: 100,
      chance: 1,
      rolls: 4e3,
      luckMult: 2
    } ],
    requires: [ {
      name: "Moon",
      area: "Natural",
      amount: 10
    }, {
      name: "Obliterator",
      area: "Wasteland",
      amount: 8
    }, {
      name: "Spectral",
      area: "Aberration",
      amount: 8
    } ],
    requiresConsumables: [ {
      key: "bomb",
      amount: 2
    } ]
  },
  axinator: {
    key: "axinator",
    name: "Axinator",
    desc: "A high-speed active accessory that turns precision clicks into heavy bonus batches.",
    luckMult: 1.5,
    rpsMult: .125,
    rankValue: 8e8,
    bonus: "Every 10th click: 1/2 chance for +500 rolls at ×10 luck and ×1.25 mutation luck. Every click: 1/10 chance for +10 rolls at ×500 luck and ×5 mutation luck. Every 50th click: +2,500 rolls at ×25 luck and ×2.5 mutation luck.",
    clickBonus: [ {
      everyNClicks: 10,
      oneIn: 2,
      rolls: 500,
      luckMult: 10,
      mutationLuckMult: 1.25
    }, {
      oneIn: 10,
      rolls: 10,
      luckMult: 500,
      mutationLuckMult: 5
    }, {
      everyNClicks: 50,
      chance: 1,
      rolls: 2500,
      luckMult: 25,
      mutationLuckMult: 2.5
    } ],
    requires: [ {
      name: "Obliterator",
      area: "Wasteland",
      amount: 1
    }, {
      name: "Entropy",
      area: "Wasteland",
      amount: 1
    } ]
  },
  exponentia: {
    key: "exponentia",
    name: "Exponentia",
    desc: "It refuses to idle. Its luck only grows by raising itself to a higher power.",
    luckMult: 1.25,
    luckExponent: 1.05,
    rpsMult: 0,
    rankValue: 75e9,
    bonus: "No offline RPS. Your total equipped luck is raised to the power of 1.05. Every 3rd click: 1/25 chance for +250 rolls with (current luck)^1.5, capped at ×10,000 luck. Every 75th click: +750 rolls with (current luck)^1.33, capped at ×10,000 luck.",
    clickBonus: [ {
      everyNClicks: 3,
      oneIn: 25,
      rolls: 250,
      dynamicLuckMultFn: () => Math.min(1e4, Math.pow(effectiveLuckMult(), 1.5))
    }, {
      everyNClicks: 75,
      chance: 1,
      rolls: 750,
      dynamicLuckMultFn: () => Math.min(1e4, Math.pow(effectiveLuckMult(), 1.33))
    } ],
    requires: [ {
      name: "PIZZA",
      area: "The Fridge",
      amount: 5
    }, {
      name: "Obliterator",
      area: "Wasteland",
      amount: 20
    }, {
      name: "Slop",
      area: "Wasteland",
      amount: 5e4
    }, {
      name: "Fragments",
      area: "Wasteland",
      amount: 1e5
    }, {
      name: "Entropy",
      area: "Wasteland",
      amount: 1
    }, {
      name: "Glitchite",
      area: "Aberration",
      amount: 202
    }, {
      name: "Unstable Core",
      area: "Aberration",
      amount: 1326
    } ]
  }
};

const EQUIP_ORDER = [ "punything", "vitaminaxey", "coinbag", "twohandedbook", "fishystarsystem", "axenades", "axinator", "exponentia" ];

const CONSUMABLES = {
  pushpin: {
    key: "pushpin",
    name: "Pushpin",
    desc: "Stick it through your pinned recipe. The rarest thing you're missing gets a little closer.",
    effect: "On use: the rarest unfinished material in your pinned recipe becomes ×2.5 easier to get in its home area, for 500 clicks.",
    duration: 500,
    requires: [ {
      name: "Crystal",
      area: "Natural",
      amount: 25
    }, {
      name: "Electronic",
      area: "Wasteland",
      amount: 1
    } ]
  },
  gloves: {
    key: "gloves",
    name: "Universal Recipe Gloves",
    desc: "Reach across worlds. Not without a price, though.",
    effect: "On use: EVERY unfinished material in your pinned recipe can drop in any area, at ×2 rarity, for 250 clicks. Stacks additively alongside whatever already drops there — nothing gets replaced.",
    duration: 250,
    requires: [ {
      name: "Unstablium",
      area: "Aberration",
      amount: 12
    }, {
      name: "ERRORCORE",
      area: "Aberration",
      amount: 1
    }, {
      name: "Corrupt Dust",
      area: "Aberration",
      amount: 2
    } ]
  },
  bomb: {
    key: "bomb",
    name: "Explosive Axe Bomb",
    desc: "Not a toy. Takes an hour to arm, then goes off all at once.",
    effect: "On use: charges for 1 hour. Once triggered after charging, fires 50,000 rolls in your current area at ×70 luck and ×1.5 mutation luck. Only one can be charging at a time.",
    chargeSeconds: 3600,
    rollCount: 5e4,
    luckMult: 70,
    mutationLuckMult: 1.5,
    requires: [ {
      name: "Fragments",
      area: "Wasteland",
      amount: 70
    }, {
      name: "Electronic",
      area: "Wasteland",
      amount: 160
    }, {
      name: "Unfunctional Tool",
      area: "Wasteland",
      amount: 15
    }, {
      name: "Decayal Device",
      area: "Wasteland",
      amount: 1
    }, {
      name: "Crystal",
      area: "Natural",
      amount: 3e3
    } ]
  },
  nullbomb: {
    key: "nullbomb",
    name: "null_bomb",
    desc: "Error at: github/junisrng/bomb/item/null_bomb: 40:4 Expected value, got null or nil",
    effect: "On use: charges for 4h 4m 4s. Once triggered after charging, fires 40.4 million rolls in your current area at ×40.4 luck and ×1.404 mutation luck. Processed gradually in the background over a few seconds so it never freezes the game. Only one can be charging at a time.",
    chargeSeconds: 4 * 3600 + 4 * 60 + 4,
    rollCount: 404e5,
    luckMult: 40.4,
    mutationLuckMult: 1.404,
    requires: [ {
      consumable: "bomb",
      amount: 15
    }, {
      name: "Obliterator",
      area: "Wasteland",
      amount: 3
    }, {
      name: "TIMEOUT",
      area: "404",
      amount: 50
    }, {
      name: "☢️",
      area: "Placeholder Land",
      amount: 25e5
    } ]
  },
  watergun: {
    key: "watergun",
    name: "Sentient Watergun",
    desc: "somehow... shoots water? and weirdly makes you be a bit faster.. ok!",
    effect: "On use: AFK roll speed ×0.5 faster, stacks up to ×2.5 total (3 uses max). Each stack lasts 1 hour.",
    maxStacks: 3,
    stackMult: .5,
    capMult: 2.5,
    durationSeconds: 3600,
    requires: [ {
      name: "Crystal",
      area: "Natural",
      amount: 750
    }, {
      name: "Electronic",
      area: "Wasteland",
      amount: 17
    }, {
      name: "Life",
      area: "Natural",
      amount: 1
    }, {
      name: "Water",
      area: "The Fridge",
      amount: 5
    } ]
  },
  errredirector: {
    key: "errredirector",
    name: "err.redirector",
    desc: "A little patch cable for the 404 zone. Plug it in and the static clears up, for a while.",
    effect: "On use: temporarily removes the 404 area's rarity-truncation gimmick for 12 hours. Rarity numbers display normally the whole time.",
    durationSeconds: 12 * 3600,
    requires: [ {
      name: "Bad Request",
      area: "404",
      amount: 2,
      variant: "weird"
    }, {
      name: "NaN",
      area: "404",
      amount: 40
    }, {
      name: "corruption",
      area: "404",
      amount: 66
    }, {
      name: "not found",
      area: "404",
      amount: 40400
    } ]
  },
  nukinamachina: {
    key: "nukinamachina",
    name: "Nukina Machina",
    desc: "A reactor-sized roll engine. It burns a startling amount of rare material in one use.",
    effect: "On use: adds 2,500,000 rolls in your current area at ×50 luck and ×2.5 mutation luck. The batch is processed safely over multiple frames.",
    useWithoutPin: true,
    instantRollBatch: true,
    rollCount: 25e5,
    luckMult: 50,
    mutationLuckMult: 2.5,
    requires: [ {
      name: "Obliterator",
      area: "Wasteland",
      amount: 1
    }, {
      name: "Corruption",
      area: "Natural",
      amount: 250
    }, {
      name: "Blank",
      area: "Aberration",
      amount: 4
    }, {
      name: "☢️",
      area: "Placeholder Land",
      amount: 5e5
    } ]
  },
  juniaxeswing: {
    key: "juniaxeswing",
    name: "One Swing of Juni's Axe",
    desc: "A single stored swing. Each eligible area contributes exactly 20 billion rank value to forge it.",
    effect: "On use: adds 1 roll in your current area at ×1,000,000,000 luck.",
    useWithoutPin: true,
    instantRollBatch: true,
    rollCount: 1,
    luckMult: 1e9,
    mutationLuckMult: 1,
    requires: [ {
      name: "Moon",
      area: "Natural",
      amount: 50
    }, {
      name: "Obliterator",
      area: "Wasteland",
      amount: 26
    }, {
      name: "Entropy",
      area: "Wasteland",
      amount: 10
    }, {
      name: "Spectral",
      area: "Aberration",
      amount: 28
    }, {
      name: "Unstable Core",
      area: "Aberration",
      amount: 128
    }, {
      name: "PIZZA",
      area: "The Fridge",
      amount: 2
    }, {
      name: "A Cat",
      area: "The Fridge",
      amount: 4
    }, {
      name: "Cheese",
      area: "The Fridge",
      amount: 1e3
    }, {
      name: "The Probably Rarest Thing Ever",
      area: "Scary Land",
      amount: 2e3
    }, {
      name: "DENIAL",
      area: "404",
      amount: 1
    }, {
      name: "UNAUTHORIZED.",
      area: "404",
      amount: 50
    }, {
      name: "THIRTEEN",
      area: "Factoritization",
      amount: 3
    }, {
      name: "TWELVE",
      area: "Factoritization",
      amount: 2
    }, {
      name: "ELEVEN",
      area: "Factoritization",
      amount: 9
    }, {
      name: "NINE",
      area: "Factoritization",
      amount: 4
    }, {
      name: "EIGHT",
      area: "Factoritization",
      amount: 5
    }, {
      name: "SEVEN",
      area: "Factoritization",
      amount: 5
    }, {
      name: "SIX",
      area: "Factoritization",
      amount: 6
    }, {
      name: "FIVE",
      area: "Factoritization",
      amount: 4
    }, {
      name: "FOUR",
      area: "Factoritization",
      amount: 3
    }, {
      name: "TWO",
      area: "Factoritization",
      amount: 4
    }, {
      name: "GOLDEN TOILET AWARD",
      area: "Placeholder Land",
      amount: 100
    } ]
  },
  stablizer: {
    key: "stablizer",
    name: "Stablizer",
    desc: "Inject with caution.",
    effect: "On use: Perilous danger progresses ×2 slower for 30 minutes. Only one can be owned at a time, and only one can be active at a time.",
    useWithoutPin: true,
    maxOwned: 1,
    durationSeconds: 30 * 60,
    requires: [ {
      name: "Kenosis",
      area: "Perilous",
      amount: 150
    }, {
      name: "Obstarite",
      area: "Perilous",
      amount: 80
    }, {
      name: "Armageddon",
      area: "Perilous",
      amount: 8
    }, {
      name: "Nilihity",
      area: "Perilous",
      amount: 4
    } ]
  },
  doublinator: {
    key: "doublinator",
    name: "Doublinator",
    desc: "2",
    effect: "On use: doubles bulk rolls, luck, and rolls per second for 12 hours. Only one can be active at a time; after it ends, this item has a 2-day cooldown.",
    useWithoutPin: true,
    durationSeconds: 12 * 3600,
    cooldownSeconds: 2 * 24 * 3600,
    requires: [ {
      name: "Universal Boi",
      area: "Boi World",
      amount: 1
    }, {
      name: "Fruits",
      area: "The Fridge",
      amount: 750
    }, {
      name: "Unstable Core",
      area: "Aberration",
      amount: 200
    } ]
  },
  boiconsumable: {
    key: "boiconsumable",
    name: "Boi Consumable",
    desc: "Boi",
    effect: "Boi",
    useWithoutPin: true,
    scalesRecipePerUse: true,
    requires: [ {
      name: "Boi",
      area: "Boi World",
      amount: 5e9
    }, {
      name: "Boi Crystal",
      area: "Boi World",
      amount: 71428
    }, {
      name: "Boi Stone",
      area: "Boi World",
      amount: 5555
    }, {
      name: "Omega Boi",
      area: "Boi World",
      amount: 714
    }, {
      name: "Super Boi",
      area: "Boi World",
      amount: 52
    }, {
      name: "CRAZY Boi",
      area: "Boi World",
      amount: 9
    }, {
      name: "Universal Boi",
      area: "Boi World",
      amount: 2
    } ]
  }
};

const CONSUMABLE_ORDER = [ "pushpin", "gloves", "bomb", "nullbomb", "watergun", "errredirector", "nukinamachina", "juniaxeswing", "stablizer", "doublinator", "boiconsumable" ];

const BALL_LIFETIME_MS = 30 * 1e3;

const BALL_DEFS = [ {
  key: "yellow",
  label: "Yellow",
  chance: 1 / 125,
  asset: "./textures/yellowball.PNG",
  glow: "#ffe15a"
}, {
  key: "white",
  label: "White",
  chance: 1 / 250,
  asset: "./textures/whiteball.PNG",
  glow: "#ffffff"
}, {
  key: "red",
  label: "Red",
  chance: 1 / 500,
  asset: "./textures/redball.PNG",
  glow: "#ff3131"
}, {
  key: "blue",
  label: "Blue",
  chance: 1 / 1e3,
  asset: "./textures/blueball.PNG",
  glow: "#304dff"
}, {
  key: "green",
  label: "Green",
  chance: 1 / 1750,
  asset: "./textures/greenball.PNG",
  glow: "#26dc35"
}, {
  key: "pink",
  label: "Pink",
  chance: 1 / 2500,
  asset: "./textures/pinkball.PNG",
  glow: "#ffb4e6"
}, {
  key: "cyan",
  label: "Cyan",
  chance: 1 / 3333,
  asset: "./textures/cyanball.PNG",
  glow: "#25eaf0"
}, {
  key: "purple",
  label: "Purple",
  chance: 1 / 5e3,
  asset: "./textures/purpleball.PNG",
  glow: "#ef2eff"
}, {
  key: "black",
  label: "Black",
  chance: 1 / 1e4,
  asset: "./textures/blackball.PNG",
  glow: "#d8d8e5"
} ];

const BALL_BY_KEY = Object.fromEntries(BALL_DEFS.map(ball => [ ball.key, ball ]));

const BALL_UPGRADE_LIMITS = {
  manualAutoroll: 10,
  discount: 10,
  doubleChance: 5,
  offlineTickspeed: 5,
  expoballs: 5,
  holdToClick: 5,
  moreWatergun: 7
};

function blankBallCounts() {
  return Object.fromEntries(BALL_DEFS.map(ball => [ ball.key, 0 ]));
}

let state = {
  worldIdx: 0,
  areaIdx: 0,
  rolls: 0,
  best: null,
  log: [],
  inventory: {},
  ownedAxes: [ "default" ],
  equippedAxe: "default",
  ownedEquips: [],
  equippedItem: null,
  lastSeenAt: Date.now(),
  pinnedRecipe: null,
  consumables: {},
  activeBuffs: {},
  bombCharge: null,
  nullBombCharge: null,
  instantConsumableBatch: null,
  clickCount: 0,
  anticheatLockUntil: null,
  wgunStacks: [],
  coinBagStacks: [],
  discoveredSecrets: {},
  rankVisualStyle: "modernrandom",
  lowDetailMode: false,
  compactInventoryVariants: false,
  showFps: false,
  superOptimize: false,
  errRedirectorUntil: null,
  doublinatorUntil: null,
  doublinatorCooldownUntil: null,
  boiConsumableUses: 0,
  balls: blankBallCounts(),
  spawnedBalls: [],
  ballUpgrades: {},
  ballAutoUse: {},
  stablizerUntil: null,
  perilousVisit: null,
  trollRollHistory: [],
  roulette: null,
  evilTokens: 0,
  _rouletteForcedDefaultThisClick: false
};

const PERILOUS_METER_TICK_MS = 30;

const PERILOUS_PASSIVE_GAIN = .05;

const PERILOUS_CLICK_GAIN = .5;

const PERILOUS_RARE_CLICK_RNG = 5e7;

const PERILOUS_METER_RELIEF_RNG = 5e8;

const PERILOUS_METER_RELIEF = 7.5;

function currentArea() {
  const world = WORLDS[state.worldIdx];
  return world && world.areas[state.areaIdx] ? world.areas[state.areaIdx] : null;
}

// Single chokepoint used everywhere (meter tick, click processing, offline gate) — Roulette's
// "always active" curse hooks in HERE so every downstream system picks it up automatically.
function isPerilousArea(area = currentArea()) {
  if (roulettePerilousAlwaysActive()) return true;
  return !!(area && area.perilous);
}

function isInCinnamonArea(area = currentArea()) {
  return !!(area && area.key === "cinnamon");
}

function isStablizerActive() {
  return !!state.stablizerUntil && Date.now() < state.stablizerUntil;
}

function perilousMeterSpeedMult() {
  let mult = isStablizerActive() ? .5 : 1;
  if (roulettePerilousAlwaysActive()) mult *= .2;
  return mult;
}

function perilousRareClickRng() {
  return roulettePerilousAlwaysActive() ? PERILOUS_RARE_CLICK_RNG / 2.5 : PERILOUS_RARE_CLICK_RNG;
}

function perilousMeterReliefRng() {
  return roulettePerilousAlwaysActive() ? PERILOUS_METER_RELIEF_RNG / 2.5 : PERILOUS_METER_RELIEF_RNG;
}

function ensurePerilousVisit() {
  if (!isPerilousArea()) return null;
  if (!state.perilousVisit || typeof state.perilousVisit !== "object") {
    state.perilousVisit = {
      meter: 0,
      gains: {},
      startedAt: Date.now(),
      lastMeterAt: Date.now()
    };
  }
  state.perilousVisit.meter = Math.max(0, Math.min(100, Number(state.perilousVisit.meter) || 0));
  if (!state.perilousVisit.gains || typeof state.perilousVisit.gains !== "object") state.perilousVisit.gains = {};
  return state.perilousVisit;
}

function updatePerilousPresentation() {
  const active = isPerilousArea();
  document.documentElement.classList.toggle("perilous-active", active);
  const wrap = document.getElementById("perilousMeter");
  const fill = document.getElementById("perilousMeterFill");
  const value = document.getElementById("perilousMeterValue");
  const note = document.getElementById("perilousMeterNote");
  if (!wrap) return;
  wrap.hidden = !active;
  if (!active) return;
  const visit = ensurePerilousVisit();
  const meter = visit ? visit.meter : 0;
  if (fill) fill.style.width = `${meter}%`;
  if (value) value.textContent = `${meter.toFixed(2)}%`;
  if (note) note.textContent = isStablizerActive() ? `Stablizer active — danger rises at half speed for ${fmtDuration(Math.ceil((state.stablizerUntil - Date.now()) / 1e3))}.` : "Leave before danger reaches 100% or lose this visit’s Perilous rolls.";
}

function recordPerilousGain(result, count) {
  const visit = ensurePerilousVisit();
  if (!visit || !result || result.areaLabel !== "Perilous") return;
  const key = invKey(result.areaLabel, result.name, result.variant ? result.variant.key : null);
  visit.gains[key] = (visit.gains[key] || 0) + Math.max(0, Number(count) || 0);
}

function recalculateBestAfterPerilousRollback() {
  if (state.best && state.best.areaLabel !== "Perilous") return;
  let best = null;
  for (const item of Object.values(state.inventory)) {
    if (!best || item.lastRng > best.finalRng) {
      best = {
        name: item.name,
        baseRng: item.baseRng,
        finalRng: item.lastRng,
        tier: tierFor(item.baseRng),
        variant: item.variant,
        areaLabel: item.areaLabel,
        isSecret: !!item.isSecret
      };
    }
  }
  state.best = best;
}

function leavePerilousSafely() {
  if (!state.perilousVisit) return;
  state.perilousVisit = null;
  updatePerilousPresentation();
}

function ejectFromPerilous() {
  const visit = state.perilousVisit;
  if (!visit) return;
  for (const [key, lostCount] of Object.entries(visit.gains || {})) {
    const item = state.inventory[key];
    if (!item) continue;
    item.count -= Math.min(item.count, Math.max(0, Number(lostCount) || 0));
    if (item.count <= 0) {
      delete state.inventory[key];
      dbDeleteInvItem(key);
    } else {
      dbSaveInvItem(item);
    }
  }
  state.log = state.log.filter(entry => entry.areaLabel !== "Perilous");
  state.perilousVisit = null;
  state.perilousEjected = true;
  const naturalWorld = WORLDS.findIndex(world => world === WORLD1);
  state.worldIdx = naturalWorld >= 0 ? naturalWorld : 0;
  state.areaIdx = Math.max(0, WORLDS[state.worldIdx].areas.findIndex(area => area.label === "Natural"));
  recalculateBestAfterPerilousRollback();
  renderWorldTabs();
  renderAreaSelect();
  buildIndexAccordion();
  updateAberrationVisual();
  renderInventory();
  renderAxeStrip();
  updateStatStrip();
  alertUser("Perilous reached 100%. You were thrown back to Natural and lost this visit’s Perilous rolls.");
  dbSaveMeta();
}

function adjustPerilousMeter(amount) {
  const visit = ensurePerilousVisit();
  if (!visit) return;
  visit.meter = Math.max(0, Math.min(100, visit.meter + amount));
  updatePerilousPresentation();
  if (visit.meter >= 100) ejectFromPerilous();
}

function processPerilousClick(results) {
  if (!isPerilousArea()) return;
  const list = Array.isArray(results) ? results : [];
  if (!list.some(result => result.baseRng > perilousRareClickRng())) adjustPerilousMeter(PERILOUS_CLICK_GAIN * perilousMeterSpeedMult());
  const reliefHits = list.filter(result => result.baseRng > perilousMeterReliefRng()).length;
  if (reliefHits) adjustPerilousMeter(-PERILOUS_METER_RELIEF * reliefHits);
}

let lastPerilousMetaSaveAt = 0;

function tickPerilousMeter() {
  if (!isPerilousArea()) return;
  const visit = ensurePerilousVisit();
  const now = Date.now();
  const previous = Number(visit.lastMeterAt) || now;
  const elapsedTicks = Math.max(0, (now - previous) / PERILOUS_METER_TICK_MS);
  visit.lastMeterAt = now;
  if (elapsedTicks > 0) adjustPerilousMeter(PERILOUS_PASSIVE_GAIN * elapsedTicks * perilousMeterSpeedMult());
  if (now - lastPerilousMetaSaveAt >= 1e3) {
    lastPerilousMetaSaveAt = now;
    dbSaveMeta();
  }
}

function isErrRedirectorActive() {
  return !!state.errRedirectorUntil && Date.now() < state.errRedirectorUntil;
}

function isDoublinatorActive() {
  return !!state.doublinatorUntil && Date.now() < state.doublinatorUntil;
}

function isDoublinatorCoolingDown() {
  return !!state.doublinatorCooldownUntil && Date.now() < state.doublinatorCooldownUntil;
}

function boiConsumableUses() {
  return Math.max(0, Number(state.boiConsumableUses) || 0);
}

function boiConsumableLuckMult() {
  return 1 + boiConsumableUses() * .1;
}

function recipeDiscountPercent() {
  return ballUpgradeLevel("discount");
}

function discountedRecipeAmount(amount) {
  const base = Math.max(0, Number(amount) || 0);
  const discount = recipeDiscountPercent();
  if (discount <= 0 || base <= 0) return base;
  return Math.max(1, Math.ceil(base * (1 - discount / 100)));
}

function discountedRecipeRequirements(requirements) {
  return (requirements || []).map(req => ({
    ...req,
    amount: discountedRecipeAmount(req.amount)
  }));
}

function renderRouletteBubble() {
  let el = document.getElementById("rouletteBubble");
  const bubble = isRouletteActive() ? state.roulette.bubble : null;
  if (!bubble) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("button");
    el.type = "button";
    el.id = "rouletteBubble";
    el.className = "roulette-bubble";
    el.textContent = "CLICK!";
    document.body.appendChild(el);
    el.addEventListener("click", rouletteClickBubble);
  }
  const margin = 90;
  const maxX = Math.max(margin, window.innerWidth - margin);
  const maxY = Math.max(margin, window.innerHeight - margin);
  el.style.left = `${margin + Math.random() * (maxX - margin)}px`;
  el.style.top = `${margin + Math.random() * (maxY - margin)}px`;
}

function rouletteTargetProgressPercent() {
  if (!isRouletteActive()) return 0;
  const target = state.roulette.target;
  switch (target.key) {
   case "billionRolls":
    return Math.min(100, state.rolls / 1e9 * 100);

   case "rarer250b":
    {
      let best = 0;
      for (const item of Object.values(state.inventory)) if (item.baseRng > best) best = item.baseRng;
      return Math.min(100, best / 25e10 * 100);
    }

   case "nanaxe":
    return state.ownedAxes.includes("nanaxe") ? 100 : 0;

   case "juniaxe":
    return state.ownedAxes.includes("juniaxe1power") ? 100 : 0;

   case "uwin":
    {
      const gimmicks = WORLD0.areas.find(a => a.key === "gimmicks");
      let total = 0, found = 0;
      for (const r of gimmicks.ranks) {
        if (r.name === "U Win" || r.name === "Sakura Tree") continue;
        if (r.rng < 1e9) {
          total++;
          if (hasEverFoundRank(gimmicks.label, r.name)) found++;
        }
      }
      return total ? found / total * 100 : 0;
    }

   case "area100":
    {
      const areaLabel = target.area100Label;
      if (!areaLabel) return 0;
      let area = null;
      for (const w of WORLDS) {
        const found = w.areas.find(a => a.label === areaLabel);
        if (found) {
          area = found;
          break;
        }
      }
      if (!area) return 0;
      let total = 0, found = 0;
      for (const r of area.ranks) {
        total++;
        if (hasEverFoundRank(area.label, r.name)) found++;
        if (r.mutations) for (const m of r.mutations) {
          total++;
          if (hasEverFoundRank(area.label, m.name)) found++;
        }
      }
      return total ? found / total * 100 : 0;
    }

   default:
    return 0;
  }
}

function rouletteTargetDescription(target) {
  const opt = ROULETTE_WHEEL3.find(o => o.key === target.key);
  if (!opt) return "";
  if (target.key === "area100") return `100% the "${target.area100Label}" area — find every base rank and mutation there (secrets don't count).`;
  return opt.label + ".";
}

const MINING_LOREBOOK_UNLOCK_COST = 12500;

function hasMiningLorebookUnlocked() {
  return !!(state.ballUpgrades && state.ballUpgrades.miningLorebook);
}

function purchaseMiningLorebookUnlock() {
  if (hasMiningLorebookUnlocked()) return false;
  if ((state.evilTokens || 0) < MINING_LOREBOOK_UNLOCK_COST) return false;
  state.evilTokens -= MINING_LOREBOOK_UNLOCK_COST;
  if (!state.ballUpgrades) state.ballUpgrades = {};
  state.ballUpgrades.miningLorebook = true;
  dbSaveMeta();
  return true;
}

let currentRouletteSubtab = "roulette";
function updateRouletteSubtabAvailability() {
  const unlocked = hasMiningLorebookUnlocked();
  document.querySelectorAll('.roulette-subtab-btn[data-subtab="mining"], .roulette-subtab-btn[data-subtab="lorebook"]').forEach(b => {
    b.hidden = !unlocked;
  });
  if (!unlocked && currentRouletteSubtab !== "roulette") showRouletteSubtab("roulette");
}
function showRouletteSubtab(name) {
  if ((name === "mining" || name === "lorebook") && !hasMiningLorebookUnlocked()) name = "roulette";
  currentRouletteSubtab = name;
  document.querySelectorAll(".roulette-subtab-btn").forEach(b => b.classList.toggle("active", b.dataset.subtab === name));
  document.getElementById("rouletteContent").style.display = name === "roulette" ? "" : "none";
  document.getElementById("miningContent").style.display = name === "mining" ? "" : "none";
  document.getElementById("lorebookContent").style.display = name === "lorebook" ? "" : "none";
  if (name === "mining") renderMiningView();
  if (name === "lorebook") renderLorebookView();
}
document.querySelectorAll(".roulette-subtab-btn").forEach(btn => {
  btn.addEventListener("click", () => showRouletteSubtab(btn.dataset.subtab));
});

// Both WIP — placeholder content until built out.
function renderMiningView() {
  const el = document.getElementById("miningContent");
  if (!el) return;
  el.innerHTML = `<p class="roulette-lede">⛏️ Mining is still WIP — nothing here yet.</p>`;
}
function renderLorebookView() {
  const el = document.getElementById("lorebookContent");
  if (!el) return;
  el.innerHTML = `<p class="roulette-lede">📓 Lorebook is still WIP — nothing here yet.</p>`;
}

function renderRouletteView() {
  const el = document.getElementById("rouletteContent");
  if (!el) return;
  if (!isRouletteActive()) {
    const blackCount = state.balls && state.balls.black || 0;
    const canAfford = blackCount >= ROULETTE_COST_BLACK_BALLS;
    const evilTokens = state.evilTokens || 0;
    const unlockUnlocked = hasMiningLorebookUnlocked();
    const unlockAffordable = evilTokens >= MINING_LOREBOOK_UNLOCK_COST;
    const unlockRow = unlockUnlocked
      ? `<p class="roulette-abandon-note">⛏️📓 Mining & Lorebook unlocked.</p>`
      : `<div class="roulette-cost-row">
           <button type="button" class="roulette-spin-btn" id="miningLorebookUnlockBtn" ${unlockAffordable ? "" : "disabled"}>Unlock Mining &amp; Lorebook</button>
           <span class="ball-cost">😈 ${evilTokens.toLocaleString()} / ${MINING_LOREBOOK_UNLOCK_COST.toLocaleString()}</span>
         </div>`;
    el.innerHTML = `\n      <p class="roulette-lede">Spin all three wheels at once for ${ROULETTE_COST_BLACK_BALLS} Black Balls. You'll get two curses to survive and one target to hit — clear it and everything you earned merges back into your real save. Walk away any time; nothing's lost except by getting ejected from Perilous the normal way, and you can pick the run back up here whenever you're ready.</p>\n      <div class="roulette-cost-row">\n        <button type="button" class="roulette-spin-btn" id="rouletteSpinBtn" ${canAfford ? "" : "disabled"}>Spin</button>\n        <span class="ball-cost"><img src="${BALL_BY_KEY.black.asset}" alt="Black ball"> ${blackCount.toLocaleString()} / ${ROULETTE_COST_BLACK_BALLS}</span>\n      </div>\n      <p class="roulette-abandon-note">😈 Evil Tokens: ${evilTokens.toLocaleString()}</p>\n      ${unlockRow}`;
    const unlockBtn = document.getElementById("miningLorebookUnlockBtn");
    if (unlockBtn) unlockBtn.addEventListener("click", () => {
      if (purchaseMiningLorebookUnlock()) {
        updateRouletteSubtabAvailability();
        renderRouletteView();
      }
    });
    const btn = document.getElementById("rouletteSpinBtn");
    if (btn) btn.addEventListener("click", () => {
      if (startRouletteSpin()) {
        refreshLiveViews();
        renderWorldTabs();
        renderAreaSelect();
        buildIndexAccordion();
        renderInventory();
        renderAxeStrip();
        updateStatStrip();
        renderRouletteView();
      }
    });
    return;
  }
  const r = state.roulette;
  const w1 = ROULETTE_WHEEL1.find(o => o.key === r.wheelResults.wheel1);
  const w2 = ROULETTE_WHEEL2.find(o => o.key === r.wheelResults.wheel2);
  const w3 = ROULETTE_WHEEL3.find(o => o.key === r.wheelResults.wheel3);
  const progress = Math.max(0, Math.min(100, rouletteTargetProgressPercent()));
  el.innerHTML = `\n    <p class="roulette-lede">This run is on its own temporary save. Finish the target below to merge everything earned here back into your real save.</p>\n    <div class="roulette-wheels">\n      <div class="roulette-wheel"><div class="roulette-wheel-label">Wheel 1 — Luck</div><div class="roulette-wheel-result">${escapeHtml(w1 ? w1.label : "?")}</div></div>\n      <div class="roulette-wheel"><div class="roulette-wheel-label">Wheel 2 — Curse</div><div class="roulette-wheel-result">${escapeHtml(w2 ? w2.label : "?")}</div></div>\n      <div class="roulette-wheel"><div class="roulette-wheel-label">Wheel 3 — Target</div><div class="roulette-wheel-result">${escapeHtml(w3 ? w3.label : "?")}</div></div>\n    </div>\n    <div class="roulette-status-grid">\n      <div class="roulette-panel">\n        <h3>Active curses</h3>\n        <ul class="roulette-debuff-list">\n          ${r.debuffs.map(key => {
    const opt = ROULETTE_WHEEL1.find(o => o.key === key) || ROULETTE_WHEEL2.find(o => o.key === key);
    return `<li>${escapeHtml(opt ? opt.label : key)}</li>`;
  }).join("")}\n          ${r.noConsumables ? "<li>No Consumables</li>" : ""}\n        </ul>\n      </div>\n      <div class="roulette-panel">\n        <h3>Target</h3>\n        <p class="roulette-target-desc">${escapeHtml(rouletteTargetDescription(r.target))}</p>\n        <div class="roulette-target-progress"><div class="roulette-target-progress-fill" style="width:${progress.toFixed(1)}%"></div></div>\n      </div>\n    </div>\n    <div class="roulette-abandon-note">Leaving this tab doesn't lose anything — this run just sits here as your active save until you come back and finish it.</div>`;
}

const ROULETTE_COST_BLACK_BALLS = 3;

const ROULETTE_WHEEL1 = [ {
  key: "luck_001",
  label: "×0.01 Luck",
  chance: 1 / 666,
  luckMult: .01
}, {
  key: "luck_01",
  label: "×0.1 Luck",
  chance: 1 / 5,
  luckMult: .1
}, {
  key: "luck_033",
  label: "×0.33 Luck",
  chance: 1 / 3,
  luckMult: .33
}, {
  key: "luck_05",
  label: "×0.5 Luck",
  chance: 1 / 1,
  luckMult: .5
} ];

const ROULETTE_WHEEL2 = [ {
  key: "all_at_once",
  label: "ALL AT ONCE + No Consumables",
  chance: 1 / 666,
  combo: [ "cant_idle", "click_default", "perilous_always", "less_bulk", "no_bonuses", "bubble" ],
  noConsumables: true
}, {
  key: "bubble",
  label: "Bubble Click-or-Lose",
  chance: 1 / 30
}, {
  key: "no_bonuses",
  label: "Bonuses Can't Fire + No Equip",
  chance: 1 / 20
}, {
  key: "less_bulk",
  label: "×5 Less Bulk (min 1)",
  chance: 1 / 15
}, {
  key: "perilous_always",
  label: "Perilous Always Active",
  chance: 1 / 8
}, {
  key: "click_default",
  label: "1/5 Click = Default Axe + No Equip",
  chance: 1 / 4
}, {
  key: "cant_idle",
  label: "Can't Idle",
  chance: 1 / 2
} ];

const ROULETTE_WHEEL3 = [ {
  key: "area100",
  label: "100% An Area",
  chance: 1 / 35,
  difficulty: 5
}, {
  key: "juniaxe",
  label: "Unlock juni axe (1% power)",
  chance: 1 / 25,
  difficulty: 20
}, {
  key: "uwin",
  label: 'Get "U Win" (excluding Sakura Tree)',
  chance: 1 / 15,
  difficulty: 15
}, {
  key: "nanaxe",
  label: "Craft nan.axe",
  chance: 1 / 10,
  difficulty: 8
}, {
  key: "rarer250b",
  label: "Catch Anything Rarer Than 1/250,000,000,000",
  chance: 1 / 4,
  difficulty: 6
}, {
  key: "billionRolls",
  label: "Get 1,000,000,000 Rolls",
  chance: 1 / 2,
  difficulty: 2
} ];

const ROULETTE_AREA100_ELIGIBLE = [ "Wasteland", "Scary Land", "ABC" ];

function rouletteSpinWheel(options) {
  for (let guard = 0; guard < 1e4; guard++) {
    for (const opt of options) {
      if (Math.random() < opt.chance) return opt;
    }
  }
  return options[options.length - 1];
}

function isRouletteActive() {
  return !!(state.roulette && state.roulette.target);
}

function blankRouletteState() {
  const fresh = {
    worldIdx: 0,
    areaIdx: 0,
    rolls: 0,
    best: null,
    log: [],
    inventory: {},
    ownedAxes: [ "default" ],
    equippedAxe: "default",
    ownedEquips: [],
    equippedItem: null,
    lastSeenAt: Date.now(),
    pinnedRecipe: null,
    consumables: {},
    activeBuffs: {},
    bombCharge: null,
    nullBombCharge: null,
    instantConsumableBatch: null,
    clickCount: 0,
    anticheatLockUntil: null,
    wgunStacks: [],
    coinBagStacks: [],
    discoveredSecrets: {},
    rankVisualStyle: state.rankVisualStyle,
    lowDetailMode: state.lowDetailMode,
    compactInventoryVariants: state.compactInventoryVariants,
    showFps: state.showFps,
    superOptimize: state.superOptimize,
    errRedirectorUntil: null,
    doublinatorUntil: null,
    doublinatorCooldownUntil: null,
    boiConsumableUses: 0,
    balls: blankBallCounts(),
    spawnedBalls: [],
    ballUpgrades: {},
    ballAutoUse: {},
    stablizerUntil: null,
    perilousVisit: null,
    trollRollHistory: [],
    roulette: null,
    _rouletteForcedDefaultThisClick: false,
    evilTokens: 0
  };
  return fresh;
}

function startRouletteSpin() {
  if (isRouletteActive()) return false;
  if ((state.balls.black || 0) < ROULETTE_COST_BLACK_BALLS) return false;
  state.balls.black -= ROULETTE_COST_BLACK_BALLS;
  dbSaveMetaImmediate();
  const w1 = rouletteSpinWheel(ROULETTE_WHEEL1);
  const w2 = rouletteSpinWheel(ROULETTE_WHEEL2);
  const w3 = rouletteSpinWheel(ROULETTE_WHEEL3);
  const debuffKeys = w2.combo ? [ w1.key, ...w2.combo ] : [ w1.key, w2.key ];
  const temp = blankRouletteState();
  temp.roulette = {
    wheelResults: {
      wheel1: w1.key,
      wheel2: w2.key,
      wheel3: w3.key
    },
    debuffs: debuffKeys,
    noConsumables: !!w2.noConsumables,
    target: {
      key: w3.key,
      area100Label: w3.key === "area100" ? ROULETTE_AREA100_ELIGIBLE[Math.floor(Math.random() * ROULETTE_AREA100_ELIGIBLE.length)] : null
    },
    startedAt: Date.now(),
    bubble: null,
    nextBubbleAt: rouletteHasDebuff(debuffKeys, "bubble") ? Date.now() + rouletteRandBubbleDelay() : null,
    snapshots: []
  };
  state = temp;
  setRouletteRunPersisted(true);
  dbSaveMeta();
  return true;
}

function rouletteRandBubbleDelay() {
  return (3 + Math.random() * 2) * 1e3;
}

function rouletteHasDebuff(debuffList, key) {
  const list = debuffList || state.roulette && state.roulette.debuffs || [];
  return list.includes(key);
}

// random(2-5) x floor((1/wheel1.luckMult)/2) x (1/wheel2.chance) / 1.5 x wheel3.difficulty
function calculateEvilTokensReward(wheelResults) {
  const w1 = ROULETTE_WHEEL1.find(o => o.key === wheelResults.wheel1);
  const w2 = ROULETTE_WHEEL2.find(o => o.key === wheelResults.wheel2);
  const w3 = ROULETTE_WHEEL3.find(o => o.key === wheelResults.wheel3);
  if (!w1 || !w2 || !w3) return 0;
  const randomFactor = 2 + Math.random() * 3;
  const luckFactor = Math.floor(1 / w1.luckMult / 2);
  const secondDebuffRarity = 1 / w2.chance;
  const difficultyFactor = w3.difficulty;
  const raw = randomFactor * luckFactor * secondDebuffRarity / 1.5 * difficultyFactor;
  return Math.max(0, Math.round(raw));
}

function completeRouletteTarget() {
  if (!isRouletteActive()) return;
  const temp = state;
  const {meta: mainMeta, items: mainItems} = modernEngineLoad();
  const mainInventory = {};
  if (mainItems) for (const it of mainItems) mainInventory[it.key] = it;
  for (const [key, item] of Object.entries(temp.inventory)) {
    if (mainInventory[key]) {
      mainInventory[key].count += item.count;
      if (item.lastRng > mainInventory[key].lastRng) mainInventory[key].lastRng = item.lastRng;
    } else {
      mainInventory[key] = {
        ...item
      };
    }
  }
  const mergedMeta = mainMeta ? {
    ...mainMeta
  } : buildMetaSnapshot();
  mergedMeta.rolls = (mainMeta ? mainMeta.rolls : 0) + temp.rolls;
  mergedMeta.balls = {
    ...blankBallCounts(),
    ...mainMeta && mainMeta.balls ? mainMeta.balls : {}
  };
  for (const color of Object.keys(mergedMeta.balls)) mergedMeta.balls[color] += temp.balls[color] || 0;
  if (temp.best && (!mergedMeta.best || temp.best.finalRng > mergedMeta.best.finalRng)) mergedMeta.best = temp.best;
  const evilTokensAwarded = calculateEvilTokensReward(temp.roulette.wheelResults);
  mergedMeta.evilTokens = (mainMeta && Number.isFinite(mainMeta.evilTokens) ? mainMeta.evilTokens : 0) + evilTokensAwarded;
  mergedMeta.roulette = null;
  modernEngineSaveMeta(mergedMeta);
  modernEngineSaveInventory(mainInventory);
  clearRouletteStorage();
  applyMetaToState(mergedMeta);
  state.inventory = mainInventory;
  renderRouletteBubble();
  alertUser(`Roulette target complete! Everything earned has been merged into your main save, plus ${evilTokensAwarded.toLocaleString()} Evil Tokens.`);
  renderWorldTabs();
  renderAreaSelect();
  buildIndexAccordion();
  renderInventory();
  renderAxeStrip();
  refreshLiveViews();
  updateStatStrip();
}

function rouletteTargetComplete() {
  if (!isRouletteActive()) return false;
  const target = state.roulette.target;
  switch (target.key) {
   case "billionRolls":
    return state.rolls >= 1e9;

   case "rarer250b":
    return Object.values(state.inventory).some(item => item.baseRng > 25e10);

   case "nanaxe":
    return state.ownedAxes.includes("nanaxe");

   case "juniaxe":
    return state.ownedAxes.includes("juniaxe1power");

   case "uwin":
    return rouletteHasUWin();

   case "area100":
    return rouletteArea100Complete(target.area100Label);

   default:
    return false;
  }
}

function rouletteHasUWin() {
  const gimmicks = WORLD0.areas.find(a => a.key === "gimmicks");
  for (const r of gimmicks.ranks) {
    if (r.name === "U Win" || r.name === "Sakura Tree") continue;
    if (r.rng < 1e9 && !hasEverFoundRank(gimmicks.label, r.name)) return false;
  }
  return true;
}

function rouletteArea100Complete(areaLabel) {
  if (!areaLabel) return false;
  let area = null;
  for (const w of WORLDS) {
    const found = w.areas.find(a => a.label === areaLabel);
    if (found) {
      area = found;
      break;
    }
  }
  if (!area) return false;
  for (const r of area.ranks) {
    if (!hasEverFoundRank(area.label, r.name)) return false;
    if (r.mutations) for (const m of r.mutations) if (!hasEverFoundRank(area.label, m.name)) return false;
  }
  return true;
}

function rouletteLuckMult() {
  if (!isRouletteActive()) return 1;
  const luckDebuffOpt = ROULETTE_WHEEL1.find(o => rouletteHasDebuff(null, o.key));
  return luckDebuffOpt ? luckDebuffOpt.luckMult : 1;
}

function rouletteCantIdle() {
  return isRouletteActive() && rouletteHasDebuff(null, "cant_idle");
}

function roulettePerilousAlwaysActive() {
  return isRouletteActive() && rouletteHasDebuff(null, "perilous_always");
}

function rouletteNoBonuses() {
  return isRouletteActive() && rouletteHasDebuff(null, "no_bonuses");
}

function rouletteNoEquip() {
  return isRouletteActive() && rouletteHasDebuff(null, "no_bonuses");
}

function rouletteNoConsumables() {
  return isRouletteActive() && !!state.roulette.noConsumables;
}

function rouletteLessBulk(bulk) {
  if (!isRouletteActive() || !rouletteHasDebuff(null, "less_bulk")) return bulk;
  return Math.max(1, Math.ceil(bulk / 5));
}

function rouletteClickDefaultAxeRoll() {
  return isRouletteActive() && rouletteHasDebuff(null, "click_default") && Math.random() < .2;
}

const ROULETTE_SNAPSHOT_INTERVAL_MS = 30 * 1e3;

const ROULETTE_ROLLBACK_MS = 15 * 60 * 1e3;

function rouletteRecordSnapshotIfDue() {
  if (!isRouletteActive() || !rouletteHasDebuff(null, "bubble")) return;
  const r = state.roulette;
  const now = Date.now();
  const last = r.snapshots.length ? r.snapshots[r.snapshots.length - 1].at : 0;
  if (now - last < ROULETTE_SNAPSHOT_INTERVAL_MS) return;
  r.snapshots.push({
    at: now,
    rolls: state.rolls,
    inventory: JSON.parse(JSON.stringify(state.inventory)),
    balls: {
      ...state.balls
    }
  });
  const cutoff = now - ROULETTE_ROLLBACK_MS - ROULETTE_SNAPSHOT_INTERVAL_MS * 2;
  r.snapshots = r.snapshots.filter(s => s.at >= cutoff);
}

function rouletteMaybeSpawnBubble() {
  if (!isRouletteActive() || !rouletteHasDebuff(null, "bubble")) return;
  const r = state.roulette;
  const now = Date.now();
  if (r.bubble) {
    if (now > r.bubble.expiresAt) rouletteBubbleMissed();
    return;
  }
  if (r.nextBubbleAt != null && now >= r.nextBubbleAt) {
    r.bubble = {
      spawnedAt: now,
      expiresAt: now + 1500
    };
    r.nextBubbleAt = null;
    renderRouletteBubble();
  }
}

function rouletteClickBubble() {
  if (!isRouletteActive() || !state.roulette.bubble) return;
  state.roulette.bubble = null;
  state.roulette.nextBubbleAt = Date.now() + rouletteRandBubbleDelay();
  renderRouletteBubble();
  dbSaveMeta();
}

function rouletteBubbleMissed() {
  const r = state.roulette;
  r.bubble = null;
  r.nextBubbleAt = Date.now() + rouletteRandBubbleDelay();
  const now = Date.now();
  const targetAt = now - ROULETTE_ROLLBACK_MS;
  let restore = null;
  for (const snap of r.snapshots) {
    if (snap.at <= targetAt) restore = snap;
  }
  if (!restore && r.snapshots.length) restore = r.snapshots[0];
  if (restore) {
    state.rolls = restore.rolls;
    state.inventory = restore.inventory;
    state.balls = restore.balls;
    recalculateBestAfterPerilousRollback();
  }
  renderRouletteBubble();
  refreshLiveViews();
  updateStatStrip();
  alertUser("Missed the bubble — lost roughly 15 minutes of Roulette progress!");
  dbSaveMeta();
}

function rouletteTick() {
  if (!isRouletteActive()) return;
  rouletteRecordSnapshotIfDue();
  rouletteMaybeSpawnBubble();
  if (rouletteTargetComplete()) completeRouletteTarget();
}

function effectivePinnedRecipeRequirements() {
  const recipe = pinnedRecipeData();
  if (!recipe) return [];
  if (state.pinnedRecipe && state.pinnedRecipe.kind === "consumable") return consumableRequirements(state.pinnedRecipe.key, 1);
  if (state.pinnedRecipe && state.pinnedRecipe.kind === "axe") return effectiveAxeRequirements(recipe);
  return discountedRecipeRequirements(recipe.requires);
}

function recipeAreaRanks() {
  const recipe = pinnedRecipeData();
  if (!recipe) return [];
  const areas = new Set((recipe.requires || []).filter(req => req.area && req.name).map(req => req.area));
  const ranks = [];
  for (const world of WORLDS) {
    for (const area of world.areas) {
      if (!areas.has(area.label)) continue;
      for (const rank of area.ranks) {
        ranks.push({
          name: rank.name,
          area: area.label,
          rng: rank.rng,
          isMutation: false
        });
        for (const mutation of rank.mutations || []) ranks.push({
          name: mutation.name,
          area: area.label,
          rng: mutation.rng,
          isMutation: true
        });
      }
    }
  }
  return ranks;
}

function consumableRequirements(key, quantity = 1) {
  const item = CONSUMABLES[key];
  if (!item) return [];
  const craftQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  const totalMultiplier = item.scalesRecipePerUse ? craftQuantity * (1 + boiConsumableUses()) + craftQuantity * (craftQuantity - 1) / 2 : craftQuantity;
  return item.requires.map(req => ({
    ...req,
    amount: discountedRecipeAmount(req.amount * totalMultiplier)
  }));
}

const MAX_OFFLINE_SECONDS = 7 * 24 * 60 * 60;

// Transient per-click override lives HERE (not as a local var in performClick) so every caller
// downstream (rollOnce, effectiveBulk, effectiveLuckMult, bonuses...) sees it consistently.
function currentAxe() {
  if (state._rouletteForcedDefaultThisClick) return AXES.default;
  return AXES[state.equippedAxe] || AXES.default;
}

function currentEquip() {
  if (state._rouletteForcedDefaultThisClick) return null;
  if (rouletteNoEquip()) return null;
  if (!state.equippedItem) return null;
  return EQUIPS[state.equippedItem] || null;
}

function effectiveLuckMult() {
  const axe = currentAxe();
  const equip = currentEquip();
  let mult = axe.stats.luckMult;
  if (axe.key === "foodeater" && isInCinnamonArea()) mult *= 25;
  // ^ secret, undocumented synergy — never stated in the UI
  if (equip && equip.luckMult) mult *= equip.luckMult;
  if (equip && equip.luckExponent) mult = Math.pow(mult, equip.luckExponent);
  if (ballUpgradeLevel("expoballs") > 0) mult = Math.pow(mult, expoballsLuckExponent());
  if (equip && equip.key === "coinbag") {
    const bonus = coinBagBonus();
    if (bonus.luckAddPct > 0) mult *= 1 + bonus.luckAddPct / 100;
  }
  mult *= boiConsumableLuckMult();
  if (isDoublinatorActive()) mult *= 2;
  mult *= rouletteLuckMult();
  return mult;
}

function effectiveBulk() {
  const axe = currentAxe();
  const equip = currentEquip();
  let bulk = axe.stats.bulk;
  if (equip && equip.bulkMult) bulk *= equip.bulkMult;
  if (equip && equip.bulkAdd) bulk += equip.bulkAdd;
  if (isDoublinatorActive()) bulk *= 2;
  bulk = rouletteLessBulk(bulk);
  return bulk;
}

const STORAGE_ENGINE_KEY = "junis_rng_storage_engine";

const STORAGE_ENGINE_DONT_ASK_KEY = "junis_rng_storage_engine_dont_ask";

const MODERN_LS_META_KEY = "junis_rng_modern_meta";

const MODERN_LS_INV_KEY = "junis_rng_modern_inv";

// Roulette runs live under their OWN keys — the main save is never touched while a run is active.
const ROULETTE_ACTIVE_KEY = "junis_rng_roulette_active";

const ROULETTE_LS_META_KEY = "junis_rng_roulette_meta";

const ROULETTE_LS_INV_KEY = "junis_rng_roulette_inv";

function isRouletteRunPersisted() {
  try {
    return localStorage.getItem(ROULETTE_ACTIVE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function setRouletteRunPersisted(active) {
  try {
    if (active) localStorage.setItem(ROULETTE_ACTIVE_KEY, "1"); else localStorage.removeItem(ROULETTE_ACTIVE_KEY);
  } catch (e) {}
}

function rouletteEngineSaveMeta(meta) {
  try {
    localStorage.setItem(ROULETTE_LS_META_KEY, JSON.stringify(meta));
    return true;
  } catch (e) {
    console.error("Roulette: failed to save meta", e);
    return false;
  }
}

function rouletteEngineSaveInventory(inventoryObj) {
  try {
    const compact = encodeCompactInventory(inventoryObj);
    localStorage.setItem(ROULETTE_LS_INV_KEY, JSON.stringify(compact));
    return true;
  } catch (e) {
    console.error("Roulette: failed to save inventory", e);
    return false;
  }
}

function rouletteEngineLoad() {
  let meta = null, items = null;
  try {
    const metaStr = localStorage.getItem(ROULETTE_LS_META_KEY);
    if (metaStr) meta = JSON.parse(metaStr);
  } catch (e) {
    console.error("Roulette: failed to parse saved meta", e);
  }
  try {
    const invStr = localStorage.getItem(ROULETTE_LS_INV_KEY);
    if (invStr) {
      const saved = JSON.parse(invStr);
      const inventoryObj = decodeCompactInventory(saved);
      items = Object.values(inventoryObj);
    }
  } catch (e) {
    console.error("Roulette: failed to parse saved inventory", e);
  }
  return {
    meta: meta,
    items: items
  };
}

function clearRouletteStorage() {
  try {
    localStorage.removeItem(ROULETTE_LS_META_KEY);
  } catch (e) {}
  try {
    localStorage.removeItem(ROULETTE_LS_INV_KEY);
  } catch (e) {}
  setRouletteRunPersisted(false);
}

function getStorageEngineChoice() {
  try {
    return localStorage.getItem(STORAGE_ENGINE_KEY);
  } catch (e) {
    return null;
  }
}

function setStorageEngineChoice(engine) {
  try {
    localStorage.setItem(STORAGE_ENGINE_KEY, engine);
  } catch (e) {}
}

function getStorageEngineDontAsk() {
  try {
    return localStorage.getItem(STORAGE_ENGINE_DONT_ASK_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function setStorageEngineDontAsk(val) {
  try {
    localStorage.setItem(STORAGE_ENGINE_DONT_ASK_KEY, val ? "1" : "0");
  } catch (e) {}
}

const ITEM_ID_TABLE_VERSION = 1;

// Permanent save-format IDs. NEVER reuse or reorder — always APPEND new entries with a new ID.
const ITEM_ID_TABLE = [ [ 1, "2048", "Tile 1" ], [ 2, "2048", "Tile 128" ], [ 3, "2048", "Tile 131k" ], [ 4, "2048", "Tile 134m" ], [ 5, "2048", "Tile 137b" ], [ 6, "2048", "Tile 16" ], [ 7, "2048", "Tile 16k" ], [ 8, "2048", "Tile 16m" ], [ 9, "2048", "Tile 17b" ], [ 10, "2048", "Tile 1b" ], [ 11, "2048", "Tile 1k" ], [ 12, "2048", "Tile 1m" ], [ 13, "2048", "Tile 1t" ], [ 14, "2048", "Tile 2" ], [ 15, "2048", "Tile 256" ], [ 16, "2048", "Tile 262k" ], [ 17, "2048", "Tile 268m" ], [ 18, "2048", "Tile 274b" ], [ 19, "2048", "Tile 2b" ], [ 20, "2048", "Tile 2k" ], [ 21, "2048", "Tile 2m" ], [ 22, "2048", "Tile 32" ], [ 23, "2048", "Tile 32k" ], [ 24, "2048", "Tile 33m" ], [ 25, "2048", "Tile 34b" ], [ 26, "2048", "Tile 4" ], [ 27, "2048", "Tile 4b" ], [ 28, "2048", "Tile 4k" ], [ 29, "2048", "Tile 4m" ], [ 30, "2048", "Tile 512" ], [ 31, "2048", "Tile 524k" ], [ 32, "2048", "Tile 536m" ], [ 33, "2048", "Tile 549b" ], [ 34, "2048", "Tile 64" ], [ 35, "2048", "Tile 65k" ], [ 36, "2048", "Tile 67m" ], [ 37, "2048", "Tile 68b" ], [ 38, "2048", "Tile 8" ], [ 39, "2048", "Tile 8b" ], [ 40, "2048", "Tile 8k" ], [ 41, "2048", "Tile 8m" ], [ 42, "404", "Bad Request" ], [ 43, "404", "DENIAL" ], [ 44, "404", "FORBIDDEN." ], [ 45, "404", "GONE." ], [ 46, "404", "MISDIRECTED" ], [ 47, "404", "NIL" ], [ 48, "404", "NO CONTENT." ], [ 49, "404", "NULL" ], [ 50, "404", "NaN" ], [ 51, "404", "TIMEOUT" ], [ 52, "404", "UNAUTHORIZED." ], [ 53, "404", "corruption" ], [ 54, "404", "dreamcore" ], [ 55, "404", "missing" ], [ 56, "404", "not found" ], [ 57, "404", "undefined" ], [ 58, "ABC", "A" ], [ 59, "ABC", "B" ], [ 60, "ABC", "C" ], [ 61, "ABC", "D" ], [ 62, "ABC", "E" ], [ 63, "ABC", "F" ], [ 64, "ABC", "G" ], [ 65, "ABC", "H" ], [ 66, "ABC", "I" ], [ 67, "ABC", "J" ], [ 68, "ABC", "K" ], [ 69, "ABC", "L" ], [ 70, "ABC", "M" ], [ 71, "ABC", "N" ], [ 72, "ABC", "O" ], [ 73, "ABC", "P" ], [ 74, "ABC", "Q" ], [ 75, "ABC", "R" ], [ 76, "ABC", "S" ], [ 77, "ABC", "T" ], [ 78, "ABC", "U" ], [ 79, "ABC", "V" ], [ 80, "ABC", "W" ], [ 81, "ABC", "X" ], [ 82, "ABC", "Y" ], [ 83, "ABC", "Z" ], [ 84, "Aberration", "Ascended" ], [ 85, "Aberration", "Unstable Core" ], [ 86, "Aberration", "Unusualite" ], [ 87, "Aberration", "Destiny" ], [ 88, "Aberration", "Corrupt Dust" ], [ 89, "Aberration", "nil" ], [ 90, "Aberration", "Abberatite" ], [ 91, "Aberration", "REACTOR MELTDOWN" ], [ 92, "Aberration", "Glitchite" ], [ 93, "Aberration", "Unrecognizability" ], [ 94, "Aberration", "Unstablium" ], [ 95, "Aberration", "Spectral" ], [ 96, "Aberration", "Esoterium" ], [ 97, "Aberration", "Blank" ], [ 98, "Aberration", "Abnormal" ], [ 99, "Aberration", "ERRORCORE" ], [ 100, "Aberration", "Broken Remnants" ], [ 101, "Aberration", "CORRUPTION" ], [ 102, "Aberration", "Anomaltic" ], [ 103, "Factoritization", "EIGHT" ], [ 104, "Factoritization", "ELEVEN" ], [ 105, "Factoritization", "FINALE" ], [ 106, "Factoritization", "FIVE" ], [ 107, "Factoritization", "FOUR" ], [ 108, "Factoritization", "FOURTEEN" ], [ 109, "Factoritization", "NINE" ], [ 110, "Factoritization", "ONE" ], [ 111, "Factoritization", "SEVEN" ], [ 112, "Factoritization", "SIX" ], [ 113, "Factoritization", "TEN" ], [ 114, "Factoritization", "THIRTEEN" ], [ 115, "Factoritization", "THREE" ], [ 116, "Factoritization", "TWELVE" ], [ 117, "Factoritization", "TWO" ], [ 118, "Gimmicks", "3 AM Demon" ], [ 119, "Gimmicks", "And Sand" ], [ 120, "Gimmicks", "Read The Manual" ], [ 121, "Gimmicks", "Bedtime" ], [ 122, "Gimmicks", "Bland Axe" ], [ 123, "Gimmicks", "Bootleg Tier" ], [ 124, "Gimmicks", "Coin Bag" ], [ 125, "Gimmicks", "Crude Axe" ], [ 126, "Gimmicks", "Dark Axe" ], [ 127, "Gimmicks", "Day" ], [ 128, "Gimmicks", "Default Axe" ], [ 129, "Gimmicks", "Destructive Destroyed Destroyer" ], [ 130, "Gimmicks", "Disaster Bringer" ], [ 131, "Gimmicks", "Dreamers Prism" ], [ 132, "Gimmicks", "Emblem of the Jackpot" ], [ 133, "Gimmicks", "Explosive Axe Bomb" ], [ 134, "Gimmicks", "Fishy Starsystem" ], [ 135, "Gimmicks", "Food Eater" ], [ 136, "Gimmicks", "Geomathaxe" ], [ 137, "Gimmicks", "Gimmick Crystal" ], [ 138, "Gimmicks", "Glowaxe" ], [ 139, "Gimmicks", "God Axe" ], [ 140, "Gimmicks", "Lord of Requirements" ], [ 141, "Gimmicks", "Magic Wand" ], [ 142, "Gimmicks", "Night" ], [ 143, "Gimmicks", "Portable Rechargable Axenades" ], [ 144, "Gimmicks", "Potato But Cold" ], [ 145, "Gimmicks", "Pushpin" ], [ 146, "Gimmicks", "Rage Axe" ], [ 147, "Gimmicks", "Sakura Tree" ], [ 148, "Gimmicks", "Sentient Watergun" ], [ 149, "Gimmicks", "Silkinator" ], [ 150, "Gimmicks", "Snek Eys" ], [ 151, "Gimmicks", "Specific Minute" ], [ 152, "Gimmicks", "Tail Zero" ], [ 153, "Gimmicks", "Thumbtacks" ], [ 154, "Gimmicks", "Trollstone" ], [ 155, "Gimmicks", "Trophy" ], [ 156, "Gimmicks", "U Win" ], [ 157, "Gimmicks", "Universal Recipe Gloves" ], [ 158, "Gimmicks", "Vitamin Axey" ], [ 159, "Gimmicks", "Weakling" ], [ 160, "Gimmicks", "Welcome Back" ], [ 161, "Gimmicks", "Youre Winner" ], [ 162, "Gimmicks", "nan.axe" ], [ 163, "LAME world", "GO AWAY-IUM" ], [ 164, "LAME world", "WASTELAND FROM WORLD 1 AREA 2" ], [ 165, "LAME world", "boringest thingy ever" ], [ 166, "LAME world", "boringite" ], [ 167, "LAME world", "evil-ish rare boringite" ], [ 168, "LAME world", "great an infinite tier we dont need" ], [ 169, "LAME world", "lame crystal" ], [ 170, "LAME world", "lightbulb" ], [ 171, "LAME world", "nothing" ], [ 172, "LAME world", "nothing but its GIANT" ], [ 173, "LAME world", "something because nothing was boring" ], [ 174, "LAME world", "weird concept of nothing" ], [ 175, "Natural", "Apocalypse Crystal" ], [ 176, "Natural", "Blade of Grass" ], [ 177, "Natural", "Corruption" ], [ 178, "Natural", "Creature" ], [ 179, "Natural", "Crystal" ], [ 180, "Natural", "Destiny" ], [ 181, "Natural", "Dirt" ], [ 182, "Natural", "Dirtiverse" ], [ 183, "Natural", "Disaster" ], [ 184, "Natural", "Fire" ], [ 185, "Natural", "Flower" ], [ 186, "Natural", "La Ville Perdue" ], [ 187, "Natural", "Leviathan" ], [ 188, "Natural", "Life" ], [ 189, "Natural", "Lunar" ], [ 190, "Natural", "Lunar Oblivion" ], [ 191, "Natural", "Moon" ], [ 192, "Natural", "Plant" ], [ 193, "Natural", "Plasmaspark" ], [ 194, "Natural", "Rock" ], [ 195, "Natural", "Ruins" ], [ 196, "Natural", "Silver" ], [ 197, "Natural", "Sporebloom" ], [ 198, "Natural", "Universal" ], [ 199, "Natural", "Water" ], [ 200, "Natural", "Wood" ], [ 201, "Placeholder Land", "         " ], [ 202, "Placeholder Land", "'Every Area Needs A Rare Ass Thing' Shut Up Bro" ], [ 203, "Placeholder Land", "1 lb of Hair (eww)" ], [ 204, "Placeholder Land", "A Trillionth Of A J" ], [ 205, "Placeholder Land", "Air" ], [ 206, "Placeholder Land", "Botl Cap" ], [ 207, "Placeholder Land", "Canna Beans" ], [ 208, "Placeholder Land", "Comic Book" ], [ 209, "Placeholder Land", "ELECTRIC BLANKET!!!" ], [ 210, "Placeholder Land", "Eel" ], [ 211, "Placeholder Land", "GLOVE" ], [ 212, "Placeholder Land", "GOLDEN TOILET AWARD" ], [ 213, "Placeholder Land", "Goofy Gring" ], [ 214, "Placeholder Land", "Granky" ], [ 215, "Placeholder Land", "H-ium" ], [ 216, "Placeholder Land", "Oumbaß" ], [ 217, "Placeholder Land", "The Burger YOU Ate" ], [ 218, "Placeholder Land", "The Rest Of The J" ], [ 219, "Placeholder Land", "Toilet" ], [ 220, "Placeholder Land", "Weird Fragment" ], [ 221, "Placeholder Land", "Yummy Delicious Chocolate" ], [ 222, "Placeholder Land", "☢️" ], [ 223, "Placeholder Land", "🥇" ], [ 224, "Placeholder Land", "🥈" ], [ 225, "Placeholder Land", "🥉" ], [ 226, "Scary Land", "A" ], [ 227, "Scary Land", "GHOST" ], [ 228, "Scary Land", "Loser" ], [ 229, "Scary Land", "Mosquito" ], [ 230, "Scary Land", "Not So Epic" ], [ 231, "Scary Land", "SCARY" ], [ 232, "Scary Land", "So Epic!!!" ], [ 233, "Scary Land", "The Probably Rarest Thing Ever" ], [ 234, "Scary Land", "You Not Get This" ], [ 235, "The Fridge", "A Cat" ], [ 236, "The Fridge", "Cheese" ], [ 237, "The Fridge", "Eggs" ], [ 238, "The Fridge", "Fish" ], [ 239, "The Fridge", "Fridge-ium" ], [ 240, "The Fridge", "Fruits" ], [ 241, "The Fridge", "Leftover Burger" ], [ 242, "The Fridge", "Orange" ], [ 243, "The Fridge", "PIZZA" ], [ 244, "The Fridge", "Universe Sized Apple Made For Destroying Universes Without Orange" ], [ 245, "The Fridge", "Water" ], [ 246, "Tiers", "Colossal" ], [ 247, "Tiers", "Common" ], [ 248, "Tiers", "Decent" ], [ 249, "Tiers", "Epic" ], [ 250, "Tiers", "Good" ], [ 251, "Tiers", "Grandiose" ], [ 252, "Tiers", "Horizon" ], [ 253, "Tiers", "Impossible" ], [ 254, "Tiers", "Infinite" ], [ 255, "Tiers", "Insanity" ], [ 256, "Tiers", "Pelicular" ], [ 257, "Tiers", "Rare" ], [ 258, "Tiers", "Unusual" ], [ 259, "Tiers", "Unworldly" ], [ 260, "Tiers", "Usual" ], [ 261, "Tiers", "Zenith" ], [ 262, "Wasteland", "Beyond Recognition Object" ], [ 263, "Wasteland", "Broken Device" ], [ 264, "Wasteland", "Corruption Fragment" ], [ 265, "Wasteland", "Decayal Device" ], [ 266, "Wasteland", "Destiny" ], [ 267, "Wasteland", "Destroyed Thing" ], [ 268, "Wasteland", "Destruction" ], [ 269, "Wasteland", "Doomcrystal" ], [ 270, "Wasteland", "Electronic" ], [ 271, "Wasteland", "Entropy" ], [ 272, "Wasteland", "Fragments" ], [ 273, "Wasteland", "Garbage Compacter" ], [ 274, "Wasteland", "Goop Producer" ], [ 275, "Wasteland", "Junk Producer" ], [ 276, "Wasteland", "Obliterator" ], [ 277, "Wasteland", "Pollution" ], [ 278, "Wasteland", "Ruincrystal" ], [ 279, "Wasteland", "Slop" ], [ 280, "Wasteland", "Unfunctional Tool" ], [ 294, "Placeholder Land", "el powder" ], [ 300, "Natural", "WOKE" ], [ 301, "Wasteland", "WOKE" ], [ 302, "Aberration", "WOKE" ], [ 303, "The Fridge", "WOKE" ], [ 304, "Scary Land", "WOKE" ], [ 305, "404", "WOKE" ], [ 306, "Factoritization", "WOKE" ], [ 307, "2048", "WOKE" ], [ 308, "ABC", "WOKE" ], [ 309, "Tiers", "WOKE" ], [ 310, "Gimmicks", "WOKE" ], [ 311, "LAME world", "WOKE" ], [ 312, "All", "WOKE" ], [ 313, "Placeholder Land", "WOKE" ], [ 314, "winterstone", "WOKE" ], [ 315, "Boi World", "WOKE" ], [ 316, "Perilous", "WOKE" ], [ 319, "2048", "very bad rank" ], [ 320, "ABC", "very bad rank" ], [ 321, "Tiers", "very bad rank" ], [ 322, "Gimmicks", "very bad rank" ], [ 323, "LAME world", "very bad rank" ], [ 324, "All", "very bad rank" ], [ 325, "Placeholder Land", "very bad rank" ], [ 326, "2048", "Tile 2t" ], [ 327, "2048", "Tile 4t" ], [ 328, "2048", "Tile 9t" ], [ 329, "2048", "Tile 18t" ], [ 330, "2048", "Tile 35t" ], [ 331, "2048", "Tile 70t" ], [ 332, "2048", "Tile 141t" ], [ 333, "2048", "Tile 281t" ], [ 334, "2048", "Tile 563t" ], [ 335, "2048", "Tile 1q" ], [ 336, "2048", "Tile 2q" ], [ 337, "2048", "Tile 5q" ], [ 338, "2048", "Tile 9q" ], [ 339, "2048", "Tile 18q" ], [ 340, "2048", "Tile 36q" ], [ 341, "2048", "Tile 72q" ], [ 342, "2048", "Tile 144q" ], [ 343, "2048", "Tile 288q" ], [ 344, "2048", "Tile 576q" ], [ 345, "2048", "Tile 1Qi" ], [ 346, "2048", "Tile 2Qi" ], [ 347, "2048", "Tile 5Qi" ], [ 348, "2048", "Tile 9Qi" ], [ 349, "2048", "Tile 18Qi" ], [ 350, "2048", "Tile 37Qi" ], [ 351, "2048", "Tile 74Qi" ], [ 352, "2048", "Tile 148Qi" ], [ 353, "2048", "Tile 295Qi" ], [ 354, "2048", "Tile 590Qi" ], [ 355, "2048", "Tile 1Qn" ], [ 356, "Tiers", "WIPE HYPE" ], [ 357, "Boi World", "i lied this is the rarest Boi ever lol" ], [ 358, "The Fridge", "orange juice" ], [ 359, "Gimmicks", "craziest TROLLSTONE" ], [ 360, "Gimmicks", "injector" ], [ 361, "Gimmicks", "super gimmick crystal" ], [ 362, "Gimmicks", "ONE CHANCE" ], [ 363, "Gimmicks", "1%" ], [ 364, "The Fridge", "have fun getting this its unaffected by luck AND cant spawn when your offline Lol" ], [ 365, "Scary Land", "have fun getting this its unaffected by luck AND cant spawn when your offline Lol" ], [ 366, "404", "have fun getting this its unaffected by luck AND cant spawn when your offline Lol" ], [ 367, "Factoritization", "have fun getting this its unaffected by luck AND cant spawn when your offline Lol" ], [ 368, "Scary Land", "uhh maybe end of something. idk lol!" ], [ 369, "Scary Land", "light Crystal" ], [ 370, "Natural", "flowers" ], [ 371, "Natural", "最後の花" ], [ 372, "Cinnamon", "cinnamon" ], [ 373, "Cinnamon", "cinnamon Tasty" ], [ 374, "Cinnamon", "cinnamon Bar" ], [ 375, "Cinnamon", "cinnamon Candy" ], [ 376, "Cinnamon", "THE MIGHTY CINNAMON TOAST CRUNCH" ], [ 377, "Cinnamon", "very cinnabar-y Cinnamon (dont eat)" ], [ 378, "Cinnamon", "SCARY cinnamon" ], [ 379, "Cinnamon", "very evil Cinnamon" ], [ 380, "Cinnamon", "peppermint (whats this doing here??)" ], [ 381, "Cinnamon", '"what am i doing? im supposed to be making progress NOT jokes like THIS!" Cinnamon' ], [ 382, "Cinnamon", "lucky Cinnamon" ], [ 383, "Cinnamon", "1 billion Cinnamon" ], [ 384, "Cinnamon", "Cinnafinity" ], [ 385, "Cinnamon", "cinnamon Galaxy" ], [ 386, "Cinnamon", "infinite cinnamon" ], [ 387, "Cinnamon", "cinna-sanity" ], [ 388, "Cinnamon", "the scary evil gigantic house sized cinnamon box" ] ];

// variantId 1=normal, 2..N = VARIANT_CHAIN index+2. Always APPEND new variants, never reorder.
const VARIANT_ID_NORMAL = 1;

function variantKeyToId(variantKey) {
  if (!variantKey) return VARIANT_ID_NORMAL;
  const idx = VARIANT_CHAIN.findIndex(v => v.key === variantKey);
  return idx === -1 ? VARIANT_ID_NORMAL : idx + 2;
}

function variantIdToKey(variantId) {
  if (variantId === VARIANT_ID_NORMAL || variantId == null) return null;
  const v = VARIANT_CHAIN[variantId - 2];
  return v ? v.key : null;
}

let _itemIdLookupCache = null;

function itemKeyToId(areaLabel, name) {
  if (!_itemIdLookupCache) {
    _itemIdLookupCache = new Map;
    for (const [id, area, nm] of ITEM_ID_TABLE) _itemIdLookupCache.set(area + "|" + nm, id);
  }
  return _itemIdLookupCache.get(areaLabel + "|" + name) || null;
}

let _itemIdReverseCache = null;

function itemIdToKey(id) {
  if (!_itemIdReverseCache) {
    _itemIdReverseCache = new Map;
    for (const [tid, area, nm] of ITEM_ID_TABLE) _itemIdReverseCache.set(tid, [ area, nm ]);
  }
  return _itemIdReverseCache.get(id) || null;
}

function encodeCompactInventory(inventoryObj) {
  const compact = {};
  const overflow = [];
  for (const key in inventoryObj) {
    const it = inventoryObj[key];
    if (it.isSecret) {
      overflow.push(it);
      continue;
    }
    const itemId = itemKeyToId(it.areaLabel, it.name);
    if (itemId == null) {
      overflow.push(it);
      continue;
    }
    const variantId = variantKeyToId(it.variant ? it.variant.key : null);
    if (!compact[itemId]) compact[itemId] = {};
    compact[itemId][variantId] = [ it.count, it.lastRng != null ? it.lastRng : it.baseRng ];
  }
  return {
    v: ITEM_ID_TABLE_VERSION,
    compact: compact,
    overflow: overflow
  };
}

function decodeCompactInventory(saved) {
  const inventoryObj = {};
  if (!saved) return inventoryObj;
  const compact = saved.compact || {};
  for (const itemIdStr in compact) {
    const itemId = Number(itemIdStr);
    const loc = itemIdToKey(itemId);
    if (!loc) continue;
    const [areaLabel, name] = loc;
    const baseRng = findRankRng(areaLabel, name);
    if (baseRng == null) continue;
    const variants = compact[itemIdStr];
    for (const variantIdStr in variants) {
      const variantId = Number(variantIdStr);
      const [count, lastRng] = variants[variantIdStr];
      const variantKey = variantIdToKey(variantId);
      const variantDef = variantKey ? VARIANT_CHAIN.find(v => v.key === variantKey) : null;
      const t = tierFor(baseRng);
      const key = invKey(areaLabel, name, variantKey);
      inventoryObj[key] = {
        key: key,
        name: name,
        areaLabel: areaLabel,
        baseRng: baseRng,
        lastRng: lastRng != null ? lastRng : baseRng,
        tierKey: t.key,
        tierLabel: t.label,
        tierCls: t.cls,
        variant: variantDef ? {
          key: variantDef.key,
          label: variantDef.label,
          mult: variantDef.mult
        } : null,
        count: count,
        firstAt: Date.now(),
        isSecret: false
      };
    }
  }
  for (const it of saved.overflow || []) {
    inventoryObj[it.key] = it;
  }
  return inventoryObj;
}

function modernEngineSaveMeta(meta) {
  try {
    localStorage.setItem(MODERN_LS_META_KEY, JSON.stringify(meta));
    return true;
  } catch (e) {
    console.error("Modern engine: failed to save meta", e);
    return false;
  }
}

function modernEngineSaveInventory(inventoryObj) {
  try {
    const compact = encodeCompactInventory(inventoryObj);
    localStorage.setItem(MODERN_LS_INV_KEY, JSON.stringify(compact));
    return true;
  } catch (e) {
    console.error("Modern engine: failed to save inventory", e);
    return false;
  }
}

function modernEngineLoad() {
  let meta = null, items = null;
  try {
    const metaStr = localStorage.getItem(MODERN_LS_META_KEY);
    if (metaStr) meta = JSON.parse(metaStr);
  } catch (e) {
    console.error("Modern engine: failed to parse saved meta", e);
  }
  try {
    const invStr = localStorage.getItem(MODERN_LS_INV_KEY);
    if (invStr) {
      const saved = JSON.parse(invStr);
      const inventoryObj = decodeCompactInventory(saved);
      items = Object.values(inventoryObj);
    }
  } catch (e) {
    console.error("Modern engine: failed to parse saved inventory", e);
  }
  return {
    meta: meta,
    items: items
  };
}

function modernEngineHasData() {
  try {
    return !!localStorage.getItem(MODERN_LS_META_KEY);
  } catch (e) {
    return false;
  }
}

async function readSnapshotFromEngine(engine) {
  if (engine === "modern") {
    const {meta: meta, items: items} = modernEngineLoad();
    return {
      meta: meta,
      items: items || []
    };
  }
  let meta = null, items = [];
  try {
    const db = await openDB();
    const metaTx = db.transaction(STORE_META, "readonly");
    const metaReq = metaTx.objectStore(STORE_META).get("state");
    meta = await new Promise((res, rej) => {
      metaReq.onsuccess = () => res(metaReq.result || null);
      metaReq.onerror = e => rej(e);
    });
    const invTx = db.transaction(STORE_INV, "readonly");
    const invReq = invTx.objectStore(STORE_INV).getAll();
    items = await new Promise((res, rej) => {
      invReq.onsuccess = () => res(invReq.result || []);
      invReq.onerror = e => rej(e);
    });
  } catch (err) {
    console.warn("Failed to read legacy engine snapshot from IndexedDB, trying localStorage backup...", err);
  }
  if (!meta || meta.rolls === 0) {
    try {
      const lsMetaStr = localStorage.getItem("junis_rng_backup_meta");
      if (lsMetaStr) {
        const lsMeta = JSON.parse(lsMetaStr);
        if (lsMeta && (!meta || lsMeta.rolls > meta.rolls)) meta = lsMeta;
      }
      if (!items.length) {
        const lsInvStr = localStorage.getItem("junis_rng_backup_inv");
        if (lsInvStr) {
          const lsItems = JSON.parse(lsInvStr);
          if (lsItems && Array.isArray(lsItems)) items = lsItems;
        }
      }
    } catch (lsErr) {
      console.error("Legacy engine localStorage backup fallback also failed", lsErr);
    }
  }
  return {
    meta: meta,
    items: items
  };
}

async function writeSnapshotToEngine(engine, meta, items) {
  if (!meta) return;
  if (engine === "modern") {
    modernEngineSaveMeta(meta);
    const invObj = {};
    for (const it of items) invObj[it.key] = it;
    modernEngineSaveInventory(invObj);
    return;
  }
  try {
    await withDbRetry(async db => {
      const tx = db.transaction(STORE_META, "readwrite");
      tx.objectStore(STORE_META).put(Object.assign({
        id: "state"
      }, meta));
    });
    await withDbRetry(async db => {
      const tx = db.transaction(STORE_INV, "readwrite");
      const store = tx.objectStore(STORE_INV);
      for (const it of items) store.put(it);
    });
  } catch (err) {
    console.error("Failed to write legacy engine snapshot for copy", err);
  }
}

async function syncSaveIntoEngine(targetEngine) {
  const otherEngine = targetEngine === "modern" ? "legacy" : "modern";
  const {meta: meta, items: items} = await readSnapshotFromEngine(otherEngine);
  if (!meta) return;
  await writeSnapshotToEngine(targetEngine, meta, items);
}

async function ensureStorageEngineChosen() {
  const existing = getStorageEngineChoice();
  if (existing === "modern") return;
  await syncSaveIntoEngine("modern");
  setStorageEngineChoice("modern");
  setStorageEngineDontAsk(true);
}

function showStorageEngineSwitchModal(targetEngine) {
  const currentEngine = getStorageEngineChoice() || "legacy";
  if (currentEngine === targetEngine) return;
  const modal = document.getElementById("storageEngineSwitchModal");
  if (!modal) return;
  const label = e => e === "modern" ? "Modern (stable)" : "Legacy (buggy)";
  const textEl = document.getElementById("storageEngineSwitchText");
  if (textEl) textEl.textContent = `Switch from ${label(currentEngine)} to ${label(targetEngine)}? Your save will be copied over automatically, so both stay in sync — nothing is lost either way.`;
  modal.style.display = "flex";
  const copyBtn = document.getElementById("storageEngineSwitchCopyBtn");
  const cancelBtn = document.getElementById("storageEngineSwitchCancelBtn");
  function cleanup() {
    modal.style.display = "none";
    if (copyBtn) copyBtn.removeEventListener("click", onSwitch);
    if (cancelBtn) cancelBtn.removeEventListener("click", onCancel);
  }
  async function onSwitch() {
    cleanup();
    await syncSaveIntoEngine(targetEngine);
    setStorageEngineChoice(targetEngine);
    location.reload();
  }
  function onCancel() {
    cleanup();
  }
  if (copyBtn) copyBtn.addEventListener("click", onSwitch);
  if (cancelBtn) cancelBtn.addEventListener("click", onCancel);
}

const PERSISTENCE_WORKER_SRC = String.raw`/* ============================================================
   PERSISTENCE WORKER
   Owns all IndexedDB WRITES for meta + inventory. The main thread posts fire-and-forget
   messages here instead of running JSON encoding / IndexedDB transactions inline on every
   roll click, which is what was causing the ROLL button to feel unresponsive under load
   (backupToLocalStorage's full-inventory JSON.stringify + an IDB write were both running
   synchronously in the middle of the click handler, once per distinct item per click).

   IndexedDB is available inside workers, so this can open its own connection and write
   directly — no main-thread involvement needed once a message is posted.

   localStorage is NOT available inside workers, so the worker periodically sends the
   serialized backup strings back to the main thread (batched/throttled), which does one
   cheap localStorage.setItem with an already-built string — much cheaper than the main
   thread building that string itself on every click.
   ============================================================ */

const DB_NAME = 'junis-rng-db';
const DB_VERSION = 1;
const STORE_META = 'meta';
const STORE_INV  = 'inventory';

let dbPromise = null;

function openDB(){
  if(dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e)=>{
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath:'id' });
      if(!db.objectStoreNames.contains(STORE_INV)) db.createObjectStore(STORE_INV, { keyPath:'key' });
    };
    req.onsuccess = (e)=>{
      const db = e.target.result;
      db.onclose = ()=>{ dbPromise = null; };
      db.onversionchange = ()=>{ db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = (e)=>{ dbPromise = null; reject(e); };
  });
  return dbPromise;
}

async function withDbRetry(fn){
  try{
    const db = await openDB();
    return await fn(db);
  }catch(err){
    const isStaleConnection = err && (err.name === 'InvalidStateError' || /closing/i.test(err.message || ''));
    if(isStaleConnection){
      dbPromise = null;
      const db = await openDB();
      return await fn(db);
    }
    throw err;
  }
}

async function saveMeta(meta){
  await withDbRetry(async (db)=>{
    const tx = db.transaction(STORE_META, 'readwrite');
    tx.objectStore(STORE_META).put(Object.assign({ id:'state' }, meta));
  });
}

async function saveInvItem(item){
  await withDbRetry(async (db)=>{
    const tx = db.transaction(STORE_INV, 'readwrite');
    tx.objectStore(STORE_INV).put(item);
  });
}

async function deleteInvItem(key){
  await withDbRetry(async (db)=>{
    const tx = db.transaction(STORE_INV, 'readwrite');
    tx.objectStore(STORE_INV).delete(key);
  });
}

// Batched localStorage backup: the main thread's inventory can be large (hundreds of distinct
// ranks/variants). Rather than re-stringifying it on every single message, we cache the latest
// inventory snapshot the worker has been told about and only build+post the backup string on a
// throttle, so a burst of rolls (e.g. a big bulk click, or the mobile skillcheck payout) only
// pays this cost once every LS_BACKUP_INTERVAL_MS rather than once per item.
const LS_BACKUP_INTERVAL_MS = 2000;
let latestMeta = null;
let latestInventoryMap = null; // key -> item, mirrors state.inventory shape
let lsBackupTimer = null;
let lsBackupDirty = false;

function scheduleLsBackup(){
  lsBackupDirty = true;
  if(lsBackupTimer) return;
  lsBackupTimer = setTimeout(flushLsBackup, LS_BACKUP_INTERVAL_MS);
}

function flushLsBackup(){
  lsBackupTimer = null;
  if(!lsBackupDirty) return;
  lsBackupDirty = false;
  const metaStr = latestMeta ? JSON.stringify(latestMeta) : null;
  const invStr = latestInventoryMap ? JSON.stringify(Object.values(latestInventoryMap)) : null;
  postMessage({ type:'ls-backup', metaStr, invStr });
}

self.onmessage = async (e)=>{
  const msg = e.data;
  if(!msg || !msg.type) return;

  try{
    switch(msg.type){
      case 'save-meta':
        latestMeta = msg.meta;
        await saveMeta(msg.meta);
        scheduleLsBackup();
        break;

      case 'save-inv-item':
        if(!latestInventoryMap) latestInventoryMap = {};
        latestInventoryMap[msg.item.key] = msg.item;
        await saveInvItem(msg.item);
        scheduleLsBackup();
        break;

      case 'delete-inv-item':
        if(latestInventoryMap) delete latestInventoryMap[msg.key];
        await deleteInvItem(msg.key);
        scheduleLsBackup();
        break;

      // Lets the main thread hand over its full current inventory snapshot once (e.g. right
      // after load, or after a bulk operation that touched many keys at once) so the worker's
      // localStorage-backup cache stays accurate without needing a message per item.
      case 'sync-inventory-snapshot':
        latestInventoryMap = msg.inventory;
        scheduleLsBackup();
        break;

      case 'flush':
        // Force an immediate backup (used e.g. on page hide/unload where a 2s delay might not
        // get a chance to fire).
        if(lsBackupTimer){ clearTimeout(lsBackupTimer); lsBackupTimer = null; }
        flushLsBackup();
        break;
    }
  }catch(err){
    postMessage({ type:'error', op: msg.type, message: (err && err.message) || String(err) });
  }
};
`;

let persistenceWorker = null;

if (getStorageEngineChoice() === "legacy") try {
  const workerBlob = new Blob([ PERSISTENCE_WORKER_SRC ], {
    type: "application/javascript"
  });
  persistenceWorker = new Worker(URL.createObjectURL(workerBlob));
  persistenceWorker.onmessage = e => {
    const msg = e.data;
    if (!msg || !msg.type) return;
    if (msg.type === "ls-backup") {
      try {
        if (msg.metaStr) localStorage.setItem("junis_rng_backup_meta", msg.metaStr);
        if (msg.invStr) localStorage.setItem("junis_rng_backup_inv", msg.invStr);
      } catch (e) {
        console.warn(`LocalStorage backup write failed: ${e && e.message || e}`);
      }
    } else if (msg.type === "error") {
      console.error(`Persistence worker error during ${msg.op}: ${msg.message}`);
    }
  };
  persistenceWorker.onerror = e => {
    const details = [ `message=${e && e.message || "(none)"}`, `filename=${e && e.filename || "(none)"}`, `lineno=${e && e.lineno || "(none)"}`, `colno=${e && e.colno || "(none)"}`, `error=${e && e.error ? e.error.stack || e.error.message || String(e.error) : "(none)"}` ].join(", ");
    console.error(`Persistence worker crashed — falling back to main-thread persistence. [${details}]`);
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    persistenceWorker = null;
  };
} catch (e) {
  console.warn(`Web Worker unavailable, persistence will run on the main thread as a fallback. ${e && e.message || e}`);
  persistenceWorker = null;
}

const LOW_DETAIL_WORKER_SRC = `\n  self.onmessage = function(event){\n    const msg = event.data;\n    if(!msg || msg.type !== 'sort-inventory') return;\n    const orderedKeys = msg.items.slice().sort((a, b) => {\n      if(a.isSecret && !b.isSecret) return -1;\n      if(!a.isSecret && b.isSecret) return 1;\n      return b.lastRng - a.lastRng;\n    }).map(item => item.key);\n    self.postMessage({ type:'inventory-order', requestId:msg.requestId, signature:msg.signature, orderedKeys });\n  };\n`;

let lowDetailWorkers = [];

let lowDetailWorkerUrl = null;

let lowDetailInventoryRequestId = 0;

let lowDetailInventoryPendingSignature = null;

let lowDetailInventoryOrderCache = {
  signature: null,
  orderedKeys: []
};

function stopLowDetailWorker() {
  for (const worker of lowDetailWorkers) worker.terminate();
  lowDetailWorkers = [];
  if (lowDetailWorkerUrl) {
    URL.revokeObjectURL(lowDetailWorkerUrl);
    lowDetailWorkerUrl = null;
  }
  lowDetailInventoryPendingSignature = null;
  lowDetailInventoryOrderCache = {
    signature: null,
    orderedKeys: []
  };
}

function ensureLowDetailWorkers() {
  if (!state.lowDetailMode && !state.superOptimize || typeof Worker === "undefined") return [];
  const cores = Math.max(2, Number(navigator.hardwareConcurrency) || 2);
  const targetCount = state.superOptimize ? Math.max(2, Math.min(4, cores)) : 1;
  try {
    if (!lowDetailWorkerUrl) lowDetailWorkerUrl = URL.createObjectURL(new Blob([ LOW_DETAIL_WORKER_SRC ], {
      type: "application/javascript"
    }));
    while (lowDetailWorkers.length < targetCount) {
      const worker = new Worker(lowDetailWorkerUrl);
      worker.onmessage = event => {
        const msg = event.data;
        if (!msg || msg.type !== "inventory-order") return;
        lowDetailInventoryPendingSignature = null;
        lowDetailInventoryOrderCache = {
          signature: msg.signature,
          orderedKeys: msg.orderedKeys || []
        };
        if (currentView === "inventory") renderInventory();
      };
      worker.onerror = () => stopLowDetailWorker();
      lowDetailWorkers.push(worker);
    }
  } catch (_) {
    stopLowDetailWorker();
  }
  return lowDetailWorkers;
}

function orderedInventoryItems(items) {
  const sortLocal = values => [ ...values ].sort((a, b) => {
    if (a.isSecret && !b.isSecret) return -1;
    if (!a.isSecret && b.isSecret) return 1;
    return b.lastRng - a.lastRng;
  });
  const workerMode = state.lowDetailMode || state.superOptimize;
  const workerThreshold = state.superOptimize ? 8 : 24;
  if (!workerMode || items.length < workerThreshold) return sortLocal(items);
  const signature = items.map(item => `${item.key}:${item.lastRng}:${item.isSecret ? 1 : 0}`).sort().join("|");
  if (lowDetailInventoryOrderCache.signature === signature) {
    const byKey = new Map(items.map(item => [ item.key, item ]));
    const ordered = lowDetailInventoryOrderCache.orderedKeys.map(key => byKey.get(key)).filter(Boolean);
    if (ordered.length === items.length) return ordered;
  }
  const workers = ensureLowDetailWorkers();
  if (workers.length && lowDetailInventoryPendingSignature !== signature) {
    lowDetailInventoryPendingSignature = signature;
    const requestId = ++lowDetailInventoryRequestId;
    workers[requestId % workers.length].postMessage({
      type: "sort-inventory",
      requestId: requestId,
      signature: signature,
      items: items.map(item => ({
        key: item.key,
        lastRng: item.lastRng,
        isSecret: !!item.isSecret
      }))
    });
  }
  return items;
}

function buildMetaSnapshot() {
  return {
    rolls: state.rolls,
    best: state.best,
    worldIdx: state.worldIdx,
    areaIdx: state.areaIdx,
    ownedAxes: state.ownedAxes,
    equippedAxe: state.equippedAxe,
    ownedEquips: state.ownedEquips,
    equippedItem: state.equippedItem,
    lastSeenAt: state.lastSeenAt,
    pinnedRecipe: state.pinnedRecipe,
    consumables: state.consumables,
    activeBuffs: state.activeBuffs,
    bombCharge: state.bombCharge,
    nullBombCharge: state.nullBombCharge,
    clickCount: state.clickCount,
    anticheatLockUntil: state.anticheatLockUntil,
    wgunStacks: state.wgunStacks,
    coinBagStacks: state.coinBagStacks,
    discoveredSecrets: state.discoveredSecrets,
    rankVisualStyle: state.rankVisualStyle,
    lowDetailMode: !!state.lowDetailMode,
    compactInventoryVariants: !!state.compactInventoryVariants,
    showFps: !!state.showFps,
    superOptimize: !!state.superOptimize,
    errRedirectorUntil: state.errRedirectorUntil,
    doublinatorUntil: state.doublinatorUntil,
    doublinatorCooldownUntil: state.doublinatorCooldownUntil,
    boiConsumableUses: state.boiConsumableUses,
    balls: state.balls,
    spawnedBalls: state.spawnedBalls,
    ballUpgrades: state.ballUpgrades,
    ballAutoUse: state.ballAutoUse,
    stablizerUntil: state.stablizerUntil,
    perilousVisit: state.perilousVisit,
    trollRollHistory: state.trollRollHistory,
    evilTokens: state.evilTokens
  };
}

const DB_NAME = "junis-rng-db";

const DB_VERSION = 1;

const STORE_META = "meta";

const STORE_INV = "inventory";

let dbPromise = null;

let saveLoadedSuccessfully = false;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, {
        keyPath: "id"
      });
      if (!db.objectStoreNames.contains(STORE_INV)) db.createObjectStore(STORE_INV, {
        keyPath: "key"
      });
    };
    req.onsuccess = e => {
      const db = e.target.result;
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = e => {
      dbPromise = null;
      console.error(`IndexedDB open failed: ${e && e.target && e.target.error || e}`);
      reject(e);
    };
  });
  return dbPromise;
}

async function withDbRetry(fn) {
  try {
    const db = await openDB();
    return await fn(db);
  } catch (err) {
    const isStaleConnection = err && (err.name === "InvalidStateError" || /closing/i.test(err.message || ""));
    if (isStaleConnection) {
      dbPromise = null;
      const db = await openDB();
      return await fn(db);
    }
    throw err;
  }
}

function backupToLocalStorageInline() {
  try {
    localStorage.setItem("junis_rng_backup_meta", JSON.stringify(buildMetaSnapshot()));
    localStorage.setItem("junis_rng_backup_inv", JSON.stringify(Object.values(state.inventory)));
  } catch (e) {
    console.warn("LocalStorage backup failed:", e);
  }
}

function dbSaveMetaImmediate() {
  if (!saveLoadedSuccessfully && state.rolls === 0 && Object.keys(state.inventory).length === 0) {
    console.warn("Refusing to save empty state over uninitialized load to prevent permanent data loss.");
    return;
  }
  if (isRouletteActive()) {
    rouletteEngineSaveMeta({
      ...buildMetaSnapshot(),
      roulette: state.roulette
    });
    setRouletteRunPersisted(true);
    return;
  }
  if (state.rolls > 0 || Object.keys(state.inventory).length > 0) {
    try {
      localStorage.setItem("junis_rng_has_played", "1");
    } catch (e) {}
  }
  const meta = buildMetaSnapshot();
  if (getStorageEngineChoice() === "modern") {
    modernEngineSaveMeta(meta);
    return;
  }
  if (persistenceWorker) {
    persistenceWorker.postMessage({
      type: "save-meta",
      meta: meta
    });
  } else {
    backupToLocalStorageInline();
    withDbRetry(async db => {
      const tx = db.transaction(STORE_META, "readwrite");
      tx.objectStore(STORE_META).put(Object.assign({
        id: "state"
      }, meta));
    }).catch(err => console.error("Failed to save meta to IndexedDB, fallback localStorage active", err));
  }
}

function dbSaveInvItemImmediate(item) {
  if (isRouletteActive()) {
    rouletteEngineSaveInventory(state.inventory);
    return;
  }
  if (getStorageEngineChoice() === "modern") {
    modernEngineSaveInventory(state.inventory);
    return;
  }
  if (persistenceWorker) {
    persistenceWorker.postMessage({
      type: "save-inv-item",
      item: item
    });
  } else {
    backupToLocalStorageInline();
    withDbRetry(async db => {
      const tx = db.transaction(STORE_INV, "readwrite");
      tx.objectStore(STORE_INV).put(item);
    }).catch(err => console.error("Failed to save inventory item", err));
  }
}

function dbDeleteInvItemImmediate(key) {
  if (isRouletteActive()) {
    rouletteEngineSaveInventory(state.inventory);
    return;
  }
  if (getStorageEngineChoice() === "modern") {
    modernEngineSaveInventory(state.inventory);
    return;
  }
  if (persistenceWorker) {
    persistenceWorker.postMessage({
      type: "delete-inv-item",
      key: key
    });
  } else {
    backupToLocalStorageInline();
    withDbRetry(async db => {
      const tx = db.transaction(STORE_INV, "readwrite");
      tx.objectStore(STORE_INV).delete(key);
    }).catch(err => console.error("Failed to delete inventory item", err));
  }
}

const SAVE_DEBOUNCE_MS = 330;

let saveDebounceTimer = null;

let pendingMetaSave = false;

let pendingInvSaves = new Map;

function flushPendingSaves() {
  saveDebounceTimer = null;
  if (pendingMetaSave) {
    pendingMetaSave = false;
    dbSaveMetaImmediate();
  }
  if (pendingInvSaves.size > 0) {
    const toFlush = pendingInvSaves;
    pendingInvSaves = new Map;
    for (const [key, item] of toFlush) {
      if (item === null) dbDeleteInvItemImmediate(key); else dbSaveInvItemImmediate(item);
    }
  }
}

function scheduleSaveFlush() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(flushPendingSaves, SAVE_DEBOUNCE_MS);
}

function dbSaveMeta() {
  pendingMetaSave = true;
  scheduleSaveFlush();
}

function dbSaveInvItem(item) {
  pendingInvSaves.set(item.key, item);
  scheduleSaveFlush();
}

function dbDeleteInvItem(key) {
  pendingInvSaves.set(key, null);
  scheduleSaveFlush();
}

function applyMetaToState(meta) {
  if (!meta) return;
  state.rolls = meta.rolls || 0;
  state.best = meta.best || null;
  state.worldIdx = meta.worldIdx || 0;
  state.areaIdx = meta.areaIdx || 0;
  state.ownedAxes = meta.ownedAxes && meta.ownedAxes.length ? meta.ownedAxes : [ "default" ];
  state.equippedAxe = meta.equippedAxe || "default";
  state.ownedEquips = meta.ownedEquips || [];
  state.equippedItem = meta.equippedItem || null;
  state.lastSeenAt = meta.lastSeenAt || Date.now();
  state.pinnedRecipe = meta.pinnedRecipe || null;
  state.consumables = meta.consumables || {};
  state.activeBuffs = meta.activeBuffs || {};
  state.bombCharge = meta.bombCharge || null;
  state.nullBombCharge = meta.nullBombCharge || null;
  state.anticheatLockUntil = meta.anticheatLockUntil || null;
  state.clickCount = meta.clickCount || 0;
  state.wgunStacks = meta.wgunStacks || [];
  state.coinBagStacks = meta.coinBagStacks || [];
  state.discoveredSecrets = meta.discoveredSecrets || {};
  state.rankVisualStyle = meta.rankVisualStyle === "legacycolorfont" ? "legacycolorfont" : "modernrandom";
  state.lowDetailMode = !!meta.lowDetailMode;
  state.compactInventoryVariants = !!meta.compactInventoryVariants;
  state.showFps = !!meta.showFps;
  state.superOptimize = !!meta.superOptimize;
  state.errRedirectorUntil = meta.errRedirectorUntil || null;
  state.doublinatorUntil = meta.doublinatorUntil || null;
  state.doublinatorCooldownUntil = meta.doublinatorCooldownUntil || null;
  state.boiConsumableUses = Math.max(0, Number(meta.boiConsumableUses) || 0);
  state.balls = {
    ...blankBallCounts(),
    ...meta.balls && typeof meta.balls === "object" ? meta.balls : {}
  };
  state.spawnedBalls = Array.isArray(meta.spawnedBalls) ? meta.spawnedBalls : [];
  state.ballUpgrades = meta.ballUpgrades && typeof meta.ballUpgrades === "object" ? meta.ballUpgrades : {};
  state.ballAutoUse = meta.ballAutoUse && typeof meta.ballAutoUse === "object" ? meta.ballAutoUse : {};
  state.stablizerUntil = meta.stablizerUntil || null;
  state.perilousVisit = meta.perilousVisit && typeof meta.perilousVisit === "object" ? meta.perilousVisit : null;
  state.trollRollHistory = Array.isArray(meta.trollRollHistory) ? meta.trollRollHistory : [];
  state.roulette = meta.roulette && typeof meta.roulette === "object" ? meta.roulette : null;
  state.evilTokens = Number.isFinite(meta.evilTokens) ? meta.evilTokens : 0;
  normalizeBallState();
  saveLoadedSuccessfully = true;
}

async function dbLoadAll() {
  if (isRouletteRunPersisted()) {
    try {
      const {meta: meta, items: items} = rouletteEngineLoad();
      if (meta) {
        applyMetaToState(meta);
        state.inventory = {};
        if (items && Array.isArray(items)) for (const it of items) state.inventory[it.key] = it;
        if (state.roulette && state.roulette.target) {
          return;
        }
      }
      console.warn("Roulette: persisted run marker found but its save looked invalid — clearing it and loading the main save instead.");
      clearRouletteStorage();
    } catch (err) {
      console.error("Roulette: failed to resume persisted run, clearing it and loading the main save instead", err);
      clearRouletteStorage();
    }
  }
  if (getStorageEngineChoice() === "modern") {
    try {
      const {meta: meta, items: items} = modernEngineLoad();
      if (meta) applyMetaToState(meta);
      if (items && Array.isArray(items) && items.length > 0) {
        state.inventory = {};
        for (const it of items) state.inventory[it.key] = it;
      }
      await migrateMisattributedInventory();
    } catch (err) {
      console.error("Modern engine: fatal load error, initiating safe mode (saving disabled until manual action)", err);
      saveLoadedSuccessfully = false;
    }
    return;
  }
  try {
    let loadedFromIDB = false;
    try {
      const db = await openDB();
      const metaTx = db.transaction(STORE_META, "readonly");
      const metaReq = metaTx.objectStore(STORE_META).get("state");
      const meta = await new Promise((res, rej) => {
        metaReq.onsuccess = () => res(metaReq.result);
        metaReq.onerror = e => rej(e);
      });
      if (meta) {
        applyMetaToState(meta);
        loadedFromIDB = true;
      }
      const invTx = db.transaction(STORE_INV, "readonly");
      const invReq = invTx.objectStore(STORE_INV).getAll();
      const items = await new Promise((res, rej) => {
        invReq.onsuccess = () => res(invReq.result);
        invReq.onerror = e => rej(e);
      });
      if (items && items.length > 0) {
        state.inventory = {};
        for (const it of items) state.inventory[it.key] = it;
      }
    } catch (idbErr) {
      console.warn("IndexedDB load encountered an error, attempting localStorage fallback...", idbErr);
    }
    if (!loadedFromIDB || state.rolls === 0) {
      try {
        const lsMetaStr = localStorage.getItem("junis_rng_backup_meta");
        if (lsMetaStr) {
          const lsMeta = JSON.parse(lsMetaStr);
          if (lsMeta && lsMeta.rolls > state.rolls) {
            applyMetaToState(lsMeta);
            console.info("Successfully recovered save state from localStorage backup!");
          }
        }
        const lsInvStr = localStorage.getItem("junis_rng_backup_inv");
        if (lsInvStr) {
          const lsItems = JSON.parse(lsInvStr);
          if (lsItems && Array.isArray(lsItems) && lsItems.length > 0) {
            if (Object.keys(state.inventory).length === 0) {
              state.inventory = {};
              for (const it of lsItems) state.inventory[it.key] = it;
            }
          }
        }
      } catch (lsErr) {
        console.error("LocalStorage fallback load failed:", lsErr);
      }
    }
    await migrateMisattributedInventory();
    if (persistenceWorker) {
      persistenceWorker.postMessage({
        type: "sync-inventory-snapshot",
        inventory: state.inventory
      });
    }
  } catch (err) {
    console.error("Fatal load error, initiating safe mode (saving disabled until manual action)", err);
    saveLoadedSuccessfully = false;
  }
}

async function migrateMisattributedInventory() {
  const toDelete = [];
  const toMerge = {};
  for (const key in state.inventory) {
    const it = state.inventory[key];
    if (it.isSecret) continue;
    const trueRng = findRankRng(it.areaLabel, it.name);
    if (trueRng == null) {
      let realArea = null, realRng = null;
      for (const world of WORLDS) {
        for (const area of world.areas) {
          for (const r of area.ranks) {
            if (r.name === it.name) {
              realArea = area.label;
              realRng = r.rng;
              break;
            }
            if (r.mutations) {
              const m = r.mutations.find(mm => mm.name === it.name);
              if (m) {
                realArea = area.label;
                realRng = m.rng;
                break;
              }
            }
          }
          if (realArea) break;
        }
        if (realArea) break;
      }
      if (realArea) {
        const correctKey = invKey(realArea, it.name, it.variant ? it.variant.key : null);
        toMerge[correctKey] = (toMerge[correctKey] || 0) + it.count;
        toDelete.push(key);
      }
      continue;
    }
    if (it.baseRng !== trueRng) {
      const correctKey = invKey(it.areaLabel, it.name, it.variant ? it.variant.key : null);
      if (correctKey !== key) {
        toMerge[correctKey] = (toMerge[correctKey] || 0) + it.count;
        toDelete.push(key);
      } else {
        it.baseRng = trueRng;
        const fixedTier = tierFor(trueRng);
        it.tierKey = fixedTier.key;
        it.tierLabel = fixedTier.label;
        it.tierCls = fixedTier.cls;
        dbSaveInvItem(it);
      }
    }
  }
  if (toDelete.length === 0) return;
  for (const key of toDelete) {
    delete state.inventory[key];
    dbDeleteInvItem(key);
  }
  for (const correctKey in toMerge) {
    const existing = state.inventory[correctKey];
    if (existing) {
      existing.count += toMerge[correctKey];
      dbSaveInvItem(existing);
    } else {
      const [areaLabel, name, variantKey] = correctKey.split("|");
      const rng = findRankRng(areaLabel, name);
      if (rng != null) {
        const t = tierFor(rng);
        const fresh = {
          key: correctKey,
          name: name,
          areaLabel: areaLabel,
          baseRng: rng,
          lastRng: rng,
          tierKey: t.key,
          tierLabel: t.label,
          tierCls: t.cls,
          variant: null,
          count: toMerge[correctKey],
          firstAt: Date.now(),
          isSecret: false
        };
        state.inventory[correctKey] = fresh;
        dbSaveInvItem(fresh);
      }
    }
  }
  console.log(`Migrated ${toDelete.length} mis-attributed inventory entries.`);
}

function invKey(areaLabel, name, variantKey) {
  return `${areaLabel}|${name}|${variantKey || "none"}`;
}

function addToInventory(result, count) {
  count = count || 1;
  const key = invKey(result.areaLabel, result.name, result.variant ? result.variant.key : null);
  const existing = state.inventory[key];
  const baseTier = result.isSecret ? SECRET_TIER : tierFor(result.baseRng);
  if (existing) {
    existing.count += count;
    existing.lastRng = result.finalRng;
    state.inventory[key] = existing;
    dbSaveInvItem(existing);
  } else {
    const item = {
      key: key,
      name: result.name,
      areaLabel: result.areaLabel,
      baseRng: result.baseRng,
      lastRng: result.finalRng,
      tierKey: baseTier.key,
      tierLabel: baseTier.label,
      tierCls: baseTier.cls,
      variant: result.variant ? {
        key: result.variant.key,
        label: result.variant.label,
        cls: result.variant.cls,
        totalMult: result.variant.totalMult
      } : null,
      count: count,
      firstAt: Date.now(),
      isSecret: !!result.isSecret
    };
    state.inventory[key] = item;
    dbSaveInvItem(item);
  }
  recordPerilousGain(result, count);
}

function getOwnedCount(areaLabel, name, variantKey) {
  const key = invKey(areaLabel, name, variantKey || null);
  return state.inventory[key] ? state.inventory[key].count : 0;
}

function globalRequirementEntries(req) {
  const world = WORLDS.find(candidate => candidate.key === req.globalWorld);
  if (!world) return [];
  const areaLabels = new Set(world.areas.map(area => area.label));
  const wantedVariant = req.variant || null;
  return Object.values(state.inventory).filter(item => item && areaLabels.has(item.areaLabel) && item.name === req.name && (item.variant ? item.variant.key : null) === wantedVariant);
}

function getReqOwnedCount(req) {
  if (req.consumable) return getConsumableCount(req.consumable);
  if (req.ball) return Math.max(0, Number(state.balls && state.balls[req.ball]) || 0);
  if (req.globalWorld) return globalRequirementEntries(req).reduce((total, item) => total + item.count, 0);
  return getOwnedCount(req.area, req.name, req.variant);
}

function consumeRequirement(req) {
  if (req.consumable) {
    state.consumables[req.consumable] -= req.amount;
    return;
  }
  if (req.ball) {
    state.balls[req.ball] -= req.amount;
    return;
  }
  if (!req.globalWorld) {
    const key = invKey(req.area, req.name, req.variant || null);
    state.inventory[key].count -= req.amount;
    dbSaveInvItem(state.inventory[key]);
    return;
  }
  let remaining = req.amount;
  for (const item of globalRequirementEntries(req).sort((a, b) => a.key.localeCompare(b.key))) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, item.count);
    item.count -= used;
    remaining -= used;
    if (item.count <= 0) {
      delete state.inventory[item.key];
      dbDeleteInvItem(item.key);
    } else {
      dbSaveInvItem(item);
    }
  }
}

function requirementRng(req) {
  if (!req.globalWorld) return findRankRng(req.area, req.name);
  const world = WORLDS.find(candidate => candidate.key === req.globalWorld);
  const global = world && world.global.find(rank => rank.name === req.name);
  return global ? global.rng : null;
}

function effectiveAxeRequirements(axe) {
  if (!axe) return [];
  return axe.discountExempt ? axe.requires : discountedRecipeRequirements(axe.requires);
}

function requirementLabel(req) {
  if (req.consumable) return CONSUMABLES[req.consumable] ? CONSUMABLES[req.consumable].name : req.consumable;
  if (req.ball) return `${BALL_BY_KEY[req.ball] ? BALL_BY_KEY[req.ball].label : req.ball} ball`;
  return req.name || "";
}

function hasEverFoundRank(areaLabel, name) {
  const plainKey = invKey(areaLabel, name, null);
  if (state.inventory[plainKey] && state.inventory[plainKey].count > 0) return true;
  for (const v of VARIANT_CHAIN) {
    const vKey = invKey(areaLabel, name, v.key);
    if (state.inventory[vKey] && state.inventory[vKey].count > 0) return true;
  }
  return false;
}

function getPinnableRecipe(kind, key) {
  if (kind === "axe") return AXES[key];
  if (kind === "consumable") return CONSUMABLES[key];
  return null;
}

function pinnedRecipeData() {
  if (!state.pinnedRecipe) return null;
  const recipe = getPinnableRecipe(state.pinnedRecipe.kind, state.pinnedRecipe.key);
  if (!recipe || !recipe.requires) return null;
  return recipe;
}

function rarestUnfinishedMaterial() {
  const list = allUnfinishedMaterials();
  if (!list.length) return null;
  return list.reduce((a, b) => b.rng > a.rng ? b : a);
}

function mostCommonUnfinishedMaterial() {
  const list = allUnfinishedMaterials();
  if (!list.length) return null;
  return list.reduce((a, b) => b.rng < a.rng ? b : a);
}

function allUnfinishedMaterials() {
  const recipe = pinnedRecipeData();
  if (!recipe) return [];
  const list = [];
  for (const req of effectivePinnedRecipeRequirements()) {
    const have = getReqOwnedCount(req);
    if (have >= req.amount) continue;
    const rng = requirementRng(req);
    if (rng == null) continue;
    list.push({
      name: req.name,
      area: req.area,
      rng: rng,
      variant: req.variant || null
    });
  }
  return list;
}

function findRankRng(areaLabel, name) {
  const r = findRankObj(areaLabel, name);
  return r ? r.rng : null;
}

function findRankObj(areaLabel, name) {
  for (const world of WORLDS) {
    for (const area of world.areas) {
      if (area.label !== areaLabel) continue;
      for (const r of area.ranks) {
        if (r.name === name) return r;
        if (r.mutations) {
          for (const m of r.mutations) {
            if (m.name === name) return m;
          }
        }
      }
    }
    if (world.areas.some(a => a.label === areaLabel)) {
      for (const g of world.global) {
        if (g.name === name) return g;
      }
    }
  }
  return null;
}

function setPinnedRecipe(kind, key) {
  state.pinnedRecipe = {
    kind: kind,
    key: key
  };
  dbSaveMeta();
}

function clearPinnedRecipe() {
  state.pinnedRecipe = null;
  dbSaveMeta();
}

function buildAreaPool(world, area, opts) {
  opts = opts || {};
  const pool = [];
  const areaDebuffMult = area.debuffMult || 1;
  if (area.isUniversalPool) {
    for (const w of WORLDS) {
      for (const a of w.areas) {
        if (a.key === area.key || a.perilous) continue;
        for (const r of a.ranks) {
          if (r.condition && !r.condition(w, a, opts)) continue;
          pool.push({
            name: r.name,
            rng: r.rng * areaDebuffMult,
            isMutation: false,
            injectedAreaLabel: a.label
          });
          if (r.mutations) {
            for (const m of r.mutations) {
              if (m.condition && !m.condition(w, a, opts)) continue;
              pool.push({
                name: m.name,
                rng: m.rng * areaDebuffMult,
                isMutation: true,
                injectedAreaLabel: a.label
              });
            }
          }
        }
      }
    }
  } else {
    for (const r of area.ranks) {
      if (r.condition && !r.condition(world, area, opts)) continue;
      pool.push({
        name: r.name,
        rng: r.rng * areaDebuffMult,
        isMutation: false
      });
      if (r.mutations) {
        for (const m of r.mutations) {
          if (m.condition && !m.condition(world, area, opts)) continue;
          pool.push({
            name: m.name,
            rng: m.rng * areaDebuffMult,
            isMutation: true
          });
        }
      }
    }
  }
  for (const g of world.global) {
    if (g.oncePerClickOnly) continue;
    pool.push({
      name: g.name,
      rng: g.rng === Infinity ? Infinity : g.rng * areaDebuffMult,
      isMutation: false
    });
  }
  return pool;
}

const LUCK_AFFECTED_CHANCE_CAP = .5;

function cappedLuckChance(luckMult, rng, areaMaxChance = LUCK_AFFECTED_CHANCE_CAP) {
  return Math.min(luckMult / rng, LUCK_AFFECTED_CHANCE_CAP, areaMaxChance);
}

function chooseUniformWinner(candidates) {
  if (!candidates || candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function chooseLuckExceededWinner(candidates, fullPool) {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const finiteRngs = [ ...new Set((fullPool || candidates).map(item => item.rng).filter(Number.isFinite)) ].sort((a, b) => a - b);
  const rankBelow = rng => {
    let below = 1;
    for (const candidateRng of finiteRngs) {
      if (candidateRng >= rng) break;
      below = candidateRng;
    }
    return below;
  };
  const logWeights = candidates.map(item => 2 * Math.log(Math.max(1, rankBelow(item.rng) * 5)));
  const maxLogWeight = Math.max(...logWeights);
  const weights = logWeights.map(logWeight => Math.exp(logWeight - maxLogWeight));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = Math.random() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    cursor -= weights[i];
    if (cursor <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function rollOnceForArea(world, area, luckMult, opts) {
  opts = opts || {};
  const mutationLuckMult = opts.mutationLuckMult || 1;
  const applyBuffs = opts.applyBuffs !== false;
  const pool = buildAreaPool(world, area, opts);
  const equippedAxe = currentAxe();
  const pushpinActive = applyBuffs && state.activeBuffs && state.activeBuffs.pushpin && state.activeBuffs.pushpin.rollsLeft > 0;
  const glovesActive = applyBuffs && state.activeBuffs && state.activeBuffs.gloves && state.activeBuffs.gloves.rollsLeft > 0;
  const emblemActive = applyBuffs && equippedAxe.key === "emblem";
  const reachSources = [];
  if (glovesActive) {
    const mats = hasBallUpgrade("upgradedGloves") ? recipeAreaRanks() : allUnfinishedMaterials();
    const rarityMult = hasBallUpgrade("upgradedGloves") ? 1.5 : 2;
    if (mats.length) reachSources.push({
      materials: mats,
      rarityMult: rarityMult
    });
  }
  if (emblemActive) {
    const mats = allUnfinishedMaterials();
    if (mats.length) reachSources.push({
      materials: mats,
      rarityMult: equippedAxe.reachRarityMult
    });
  }
  const injectedRarity = {};
  for (const source of reachSources) {
    for (const mat of source.materials) {
      if (mat.area === area.label) continue;
      if (injectedRarity[mat.name] == null || source.rarityMult < injectedRarity[mat.name]) {
        injectedRarity[mat.name] = source.rarityMult;
      }
    }
  }
  for (const name in injectedRarity) {
    const alreadyInPool = pool.some(p => p.name === name);
    if (alreadyInPool) continue;
    let mat = null;
    for (const source of reachSources) {
      mat = source.materials.find(m => m.name === name);
      if (mat) break;
    }
    if (mat) pool.push({
      name: mat.name,
      rng: mat.rng * injectedRarity[name],
      isMutation: !!mat.isMutation,
      injectedAreaLabel: mat.area
    });
  }
  const buffTarget = pushpinActive ? rarestUnfinishedMaterial() : null;
  const pushpinCommonTarget = pushpinActive && hasBallUpgrade("upgradedPushpin") ? mostCommonUnfinishedMaterial() : null;
  const emblemUnfinished = emblemActive ? allUnfinishedMaterials() : [];
  const emblemCommonTarget = emblemActive && pushpinActive ? mostCommonUnfinishedMaterial() : null;
  function effectiveRng(item) {
    let rng = item.rng;
    if (pushpinActive && !hasBallUpgrade("upgradedPushpin") && buffTarget && buffTarget.area === area.label && buffTarget.name === item.name) {
      rng = rng / 2.5;
    }
    return rng;
  }
  function effectiveLuckForItem(item, baseLuck) {
    let l = baseLuck;
    if (pushpinActive && hasBallUpgrade("upgradedPushpin")) {
      if (buffTarget && buffTarget.area === area.label && buffTarget.name === item.name) l *= 5; else if (pushpinCommonTarget && pushpinCommonTarget.area === area.label && pushpinCommonTarget.name === item.name) l *= 2.5;
    }
    if (emblemActive && emblemUnfinished.some(m => m.name === item.name)) {
      l *= equippedAxe.blessingLuckMult;
      if (emblemCommonTarget && emblemCommonTarget.name === item.name) {
        l *= equippedAxe.synergyPushpinLuckMult;
      }
    }
    if (area.perilous) l = Math.min(l / 5, 750);
    return l;
  }
  const maxRollChance = area.isUniversalPool ? 1 / 3 : LUCK_AFFECTED_CHANCE_CAP;
  const luckExceededCandidates = [];
  let normalWinners = [];
  for (const item of pool) {
    if (item.rng === Infinity) {
      if (Math.random() < Math.min(5e-4 * luckMult, LUCK_AFFECTED_CHANCE_CAP)) {
        if (normalWinners.length === 0 || item.rng > normalWinners[0].rng) normalWinners = [ item ]; else if (item.rng === normalWinners[0].rng) normalWinners.push(item);
      }
      continue;
    }
    const rng = effectiveRng(item);
    const itemLuckMult = effectiveLuckForItem(item, item.isMutation ? luckMult * mutationLuckMult : luckMult);
    if (!area.isUniversalPool && itemLuckMult >= rng) {
      luckExceededCandidates.push({
        ...item,
        rng: rng
      });
      continue;
    }
    const effectiveChance = cappedLuckChance(itemLuckMult, rng, maxRollChance);
    if (Math.random() < effectiveChance) {
      const candidate = rng === item.rng ? item : {
        ...item,
        rng: rng
      };
      if (normalWinners.length === 0 || candidate.rng > normalWinners[0].rng) normalWinners = [ candidate ]; else if (candidate.rng === normalWinners[0].rng) normalWinners.push(candidate);
    }
  }
  const effectivePoolForWeight = pool.map(item => ({
    ...item,
    rng: item.rng === Infinity ? Infinity : effectiveRng(item)
  }));
  const guaranteedWinner = chooseLuckExceededWinner(luckExceededCandidates, effectivePoolForWeight);
  let winner;
  if (normalWinners.length && (!guaranteedWinner || normalWinners[0].rng > guaranteedWinner.rng)) {
    winner = chooseUniformWinner(normalWinners);
  } else if (guaranteedWinner) {
    winner = guaranteedWinner;
  } else if (normalWinners.length) {
    winner = chooseUniformWinner(normalWinners);
  } else {
    winner = pool.reduce((a, b) => a.rng < b.rng ? a : b);
  }
  const variant = rollVariant();
  const trueRng = findRankRng(winner.injectedAreaLabel || area.label, winner.name);
  const trueAreaLabel = winner.injectedAreaLabel || area.label;
  const resolvedBaseRng = trueRng != null ? trueRng : winner.rng;
  const finalRng = variant ? resolvedBaseRng * variant.totalMult : resolvedBaseRng;
  const tier = tierFor(finalRng);
  return {
    name: winner.name,
    baseRng: resolvedBaseRng,
    finalRng: finalRng,
    tier: tier,
    variant: variant,
    areaLabel: trueAreaLabel
  };
}

function rollOnce(opts) {
  const world = WORLDS[state.worldIdx];
  const area = world.areas[state.areaIdx];
  const secretHit = rollSecretForArea(world, area);
  if (secretHit) {
    markSecretDiscovered(secretHit.secretKey, secretHit.variant ? secretHit.variant.key : null);
    return secretHit;
  }
  const luckMult = effectiveLuckMult();
  return rollOnceForArea(world, area, luckMult, opts);
}

const WIPE_HYPE_COLORS = [ "#ff2fb0", "#ffffff", "#ff7fd0", "#ffffff" ];

function wipeHypeCharsHtml(text, skipColor) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === " ") {
      out += " ";
      continue;
    }
    const h = hashRankName(text + "|" + i);
    const color = WIPE_HYPE_COLORS[h % WIPE_HYPE_COLORS.length];
    const dur = (.1 + h % 7 * .02).toFixed(2);
    const delay = (h % 11 * .017).toFixed(3);
    const colorStyle = skipColor ? "" : `color:${color}; `;
    out += `<span class="wipehype-char" style="${colorStyle}animation-duration:${dur}s; animation-delay:-${delay}s;">${ch}</span>`;
  }
  return out;
}

// Single span, no overlay layer (old two-layer trick could render as duplicate stacked text).
// Variants get font-only inline style so their CSS class's color isn't beaten by inline style specificity.
function rankNameHtml(name, tierCls, variant, extraCls, tierKey, displayText) {
  extraCls = extraCls || "";
  const rawText = displayText != null ? displayText : name;
  const usePerCharShake = tierKey === "wipehype" && isLegacyColorFontEnabled() || variant && variant.key === "extreme";
  const isExtremeVariant = !!(variant && variant.key === "extreme");
  const text = usePerCharShake && !(state.lowDetailMode || state.superOptimize) ? wipeHypeCharsHtml(escapeHtml(rawText), isExtremeVariant) : escapeHtml(rawText);
  const styleAttr = tierKey ? ` style="${variant ? rankVisualFontOnlyStyleAttr(name) : rankVisualStyleAttr(name, tierKey)}"` : "";
  if (!variant) return `<span class="${tierCls} ${extraCls}"${styleAttr}>${text}</span>`;
  return `<span class="${tierCls} ${variant.cls} ${extraCls}"${styleAttr}>${text}</span>`;
}

function fmtRng(n) {
  if (n === Infinity) return "∞";
  if (n < 1) return "1";
  return Math.round(n).toLocaleString();
}

function conditionalRarityDisplay(n) {
  return `(${fmtRng(n)})?`;
}

function fmtRngOrSecret(isSecret, n) {
  return isSecret ? conditionalRarityDisplay(n) : fmtRng(n);
}

const GLITCH_SYMBOLS = [ "#", "%", "&", "$", "?", "@", "*", "■", "░", "▒", "×" ];

function seededRandFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = h * 31 + str.charCodeAt(i) >>> 0;
  }
  return function() {
    h = h * 1664525 + 1013904223 >>> 0;
    return h / 4294967296;
  };
}

function glitchRngText(name, n) {
  const clean = fmtRng(n);
  const rand = seededRandFromString(name + "|" + n);
  let out = "";
  for (const ch of clean) {
    if (/[0-9]/.test(ch) && rand() < .5) {
      out += GLITCH_SYMBOLS[Math.floor(rand() * GLITCH_SYMBOLS.length)];
    } else {
      out += ch;
    }
  }
  return out;
}

function fmtRngForResult(r) {
  const n = r.finalRng != null ? r.finalRng : r.lastRng;
  if (r.isSecret) return conditionalRarityDisplay(n);
  if (r.areaLabel === "404" && !isErrRedirectorActive()) return glitchRngText(r.name, n);
  return fmtRng(n);
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function fmtDuration(seconds) {
  seconds = Math.floor(seconds);
  const d = Math.floor(seconds / 86400);
  seconds -= d * 86400;
  const h = Math.floor(seconds / 3600);
  seconds -= h * 3600;
  const m = Math.floor(seconds / 60);
  seconds -= m * 60;
  const parts = [];
  if (d) parts.push(d + "d");
  if (h) parts.push(h + "h");
  if (m) parts.push(m + "m");
  if (!d && !h) parts.push(seconds + "s");
  return parts.join(" ") || "0s";
}

function tierGlowColor(key) {
  const map = {
    pelicular: "rgba(232,121,249,0.5)",
    horizon: "rgba(251,113,133,0.5)",
    grandiose: "rgba(245,158,11,0.5)",
    zenith: "rgba(255,215,0,0.55)",
    unworldly: "rgba(34,211,238,0.5)",
    colossal: "rgba(67,56,202,0.6)",
    infinite: "rgba(255,0,150,0.5)",
    insanity: "rgba(255,0,60,0.6)",
    impossible: "rgba(255,255,255,0.6)"
  };
  return map[key] || "rgba(124,92,255,0.4)";
}

function renderAxeStrip() {
  const axe = currentAxe();
  const equip = currentEquip();
  const stacks = wgunActiveStacks();
  const rps = effectiveRps();
  const luck = effectiveLuckMult();
  const bulk = effectiveBulk();
  const rpsLabel = stacks > 0 ? `${rps.toFixed(1)} rolls/sec offline 💧×${stacks}` : `${rps} rolls/sec offline`;
  const equipLabel = equip ? ` · 🛡️ ${equip.name}` : "";
  const el = document.getElementById("axeStrip");
  el.innerHTML = `\n    <span class="aname">🪓 ${axe.name}${equipLabel}</span>\n    <span class="astats">luck ×${luck} · bulk ${bulk} · ${rpsLabel}</span>\n  `;
}

let lastRenderedStage = null;

function renderStage(result, count, trollOverride, clicksNote) {
  lastRenderedStage = {
    result: result,
    count: count,
    trollOverride: trollOverride,
    clicksNote: clicksNote
  };
  const stage = document.getElementById("stage");
  const baseTier = result.isSecret ? SECRET_TIER : tierFor(result.baseRng);
  const glowCls = result.isSecret ? "glow-secret" : [ "epic", "pelicular", "horizon", "grandiose", "zenith", "unworldly" ].includes(baseTier.key) ? `glow-${baseTier.key}` : "";
  if (trollOverride) {
    const fakeTier = tierFor(trollOverride.rng);
    const fakeGlow = [ "epic", "pelicular", "horizon", "grandiose", "zenith", "unworldly" ].includes(fakeTier.key) ? `glow-${fakeTier.key}` : "";
    const fakeNameHtml = rankNameHtml(trollOverride.name, fakeTier.cls, null, fakeGlow, fakeTier.key);
    stage.innerHTML = `\n      <div class="result-tier">${result.areaLabel} · ${fakeTier.label}</div>\n      <div class="result-name">${fakeNameHtml}</div>\n      <div class="result-rng">1 in ${fmtRng(trollOverride.rng)}</div>\n      ${clicksNote ? `<div class="multi-note">${clicksNote}</div>` : count && count > 1 ? `<div class="multi-note">shown: rarest of ${count} rolls (bulk)</div>` : ""}\n    `;
    if (!state.lowDetailMode && !state.superOptimize && [ "pelicular", "horizon", "grandiose", "zenith", "unworldly", "colossal", "infinite", "insanity", "impossible" ].includes(fakeTier.key)) {
      const flash = document.getElementById("flashBg");
      flash.style.background = `radial-gradient(circle at 50% 40%, ${tierGlowColor(fakeTier.key)}, transparent 70%)`;
      flash.classList.remove("go");
      void flash.offsetWidth;
      flash.classList.add("go");
    }
    return;
  }
  const nameHtml = rankNameHtml(result.name, baseTier.cls, result.variant, glowCls, result.isSecret ? null : baseTier.key);
  stage.innerHTML = `\n    <div class="result-tier">${result.areaLabel} · ${baseTier.label}</div>\n    <div class="result-name">${nameHtml}</div>\n    <div class="result-rng">1 in ${fmtRngForResult(result)}</div>\n    ${result.variant ? `<div class="result-variant">✦ ${result.variant.label} variant (×${result.variant.totalMult})</div>` : ""}\n    ${result.isSecret ? `<div class="result-variant">🔒 Secret rank discovered!</div>` : ""}\n    ${clicksNote ? `<div class="multi-note">${clicksNote}</div>` : count && count > 1 ? `<div class="multi-note">shown: rarest of ${count} rolls (bulk)</div>` : ""}\n  `;
  if (!state.lowDetailMode && !state.superOptimize && (result.isSecret || [ "pelicular", "horizon", "grandiose", "zenith", "unworldly", "colossal", "infinite", "insanity", "impossible" ].includes(baseTier.key))) {
    const flash = document.getElementById("flashBg");
    flash.style.background = `radial-gradient(circle at 50% 40%, ${result.isSecret ? "#a855f7" : tierGlowColor(baseTier.key)}, transparent 70%)`;
    flash.classList.remove("go");
    void flash.offsetWidth;
    flash.classList.add("go");
  }
}

function pushLog(result) {
  state.log.unshift(result);
  if (state.log.length > 4) state.log.pop();
}

function applyLowDetailMode() {
  document.documentElement.classList.toggle("low-detail-mode", !!state.lowDetailMode);
  const toggle = document.getElementById("lowDetailModeToggle");
  if (toggle) toggle.checked = !!state.lowDetailMode;
}

function setLowDetailMode(enabled) {
  state.lowDetailMode = !!enabled;
  if (!state.lowDetailMode && !state.superOptimize) stopLowDetailWorker();
  applyLowDetailMode();
  dbSaveMeta();
  if (lastRenderedStage) renderStage(lastRenderedStage.result, lastRenderedStage.count, lastRenderedStage.trollOverride, lastRenderedStage.clicksNote);
  renderInventory();
  buildIndexAccordion();
  buildSecretsAccordion();
  renderSettingsView();
}

function setLegacyColorFontEnabled(enabled) {
  state.rankVisualStyle = enabled ? "legacycolorfont" : "modernrandom";
  applyRankVisualStyle();
  dbSaveMeta();
  if (lastRenderedStage) renderStage(lastRenderedStage.result, lastRenderedStage.count, lastRenderedStage.trollOverride, lastRenderedStage.clicksNote);
  renderInventory();
  buildIndexAccordion();
  buildSecretsAccordion();
  renderSettingsView();
}

function setupLegacyColorFontToggle() {
  const toggle = document.getElementById("legacyColorFontToggle");
  if (!toggle) return;
  toggle.checked = isLegacyColorFontEnabled();
  toggle.addEventListener("change", () => setLegacyColorFontEnabled(toggle.checked));
}

function setupLowDetailModeToggle() {
  const toggle = document.getElementById("lowDetailModeToggle");
  if (!toggle) return;
  toggle.checked = !!state.lowDetailMode;
  toggle.addEventListener("change", () => setLowDetailMode(toggle.checked));
}

function setCompactInventoryVariants(enabled) {
  const wasEnabled = !!state.compactInventoryVariants;
  state.compactInventoryVariants = !!enabled;
  const toggle = document.getElementById("compactInventoryVariantsToggle");
  if (toggle) toggle.checked = state.compactInventoryVariants;
  if (state.compactInventoryVariants && !wasEnabled) {
    const variantFilter = document.getElementById("filterVariant");
    if (variantFilter && !variantFilter.value) variantFilter.value = "normal";
  }
  dbSaveMeta();
  renderInventory();
}

function setupCompactInventoryVariantsToggle() {
  const toggle = document.getElementById("compactInventoryVariantsToggle");
  if (!toggle) return;
  toggle.checked = !!state.compactInventoryVariants;
  toggle.addEventListener("change", () => setCompactInventoryVariants(toggle.checked));
}

let fpsAnimationFrame = null;

let fpsFrameCount = 0;

let fpsWindowStart = 0;

function stopFpsCounter() {
  if (fpsAnimationFrame != null) {
    cancelAnimationFrame(fpsAnimationFrame);
    fpsAnimationFrame = null;
  }
  fpsFrameCount = 0;
  fpsWindowStart = 0;
}

function runFpsCounter(timestamp) {
  const counter = document.getElementById("fpsCounter");
  if (!state.showFps || !counter) {
    stopFpsCounter();
    return;
  }
  if (!fpsWindowStart) fpsWindowStart = timestamp;
  fpsFrameCount++;
  const elapsed = timestamp - fpsWindowStart;
  if (elapsed >= 500) {
    counter.textContent = `FPS: ${Math.round(fpsFrameCount * 1e3 / elapsed)}`;
    fpsFrameCount = 0;
    fpsWindowStart = timestamp;
  }
  fpsAnimationFrame = requestAnimationFrame(runFpsCounter);
}

function applyShowFps() {
  const counter = document.getElementById("fpsCounter");
  const toggle = document.getElementById("showFpsToggle");
  if (toggle) toggle.checked = !!state.showFps;
  if (counter) counter.classList.toggle("show", !!state.showFps);
  if (state.showFps && fpsAnimationFrame == null) fpsAnimationFrame = requestAnimationFrame(runFpsCounter);
  if (!state.showFps) stopFpsCounter();
}

function applySuperOptimize() {
  document.documentElement.classList.toggle("super-optimize-mode", !!state.superOptimize);
  const toggle = document.getElementById("superOptimizeToggle");
  if (toggle) toggle.checked = !!state.superOptimize;
}

function closeSuperOptimizeModal() {
  const modal = document.getElementById("superOptimizeModal");
  if (modal) modal.style.display = "none";
  document.documentElement.classList.remove("super-optimize-preview");
  const toggle = document.getElementById("superOptimizeToggle");
  if (toggle) toggle.checked = !!state.superOptimize;
}

function setSuperOptimize(enabled) {
  state.superOptimize = !!enabled;
  if (!state.superOptimize && !state.lowDetailMode) stopLowDetailWorker();
  applySuperOptimize();
  dbSaveMeta();
  if (lastRenderedStage) renderStage(lastRenderedStage.result, lastRenderedStage.count, lastRenderedStage.trollOverride, lastRenderedStage.clicksNote);
  renderInventory();
  renderSettingsView();
}

function showSuperOptimizeStep(step) {
  const modal = document.getElementById("superOptimizeModal");
  const title = document.getElementById("superOptimizeModalTitle");
  const text = document.getElementById("superOptimizeModalText");
  const preview = document.getElementById("superOptimizePreview");
  const actions = document.getElementById("superOptimizeModalActions");
  if (!modal || !title || !text || !preview || !actions) return;
  const steps = {
    1: {
      title: "hey!",
      text: "turning this on will.. make everything look ugly. after all, it is made for performance!",
      buttons: [ [ "dont care", () => showSuperOptimizeStep(2) ], [ "oh ok", closeSuperOptimizeModal ] ]
    },
    2: {
      title: "you sure?",
      text: "",
      buttons: [ [ "yeah", () => showSuperOptimizeStep(3) ], [ "no", closeSuperOptimizeModal ] ]
    },
    3: {
      title: "ok!",
      text: "",
      buttons: [ [ "yes", () => {
        closeSuperOptimizeModal();
        setSuperOptimize(true);
      } ], [ "no", closeSuperOptimizeModal ] ]
    }
  };
  const current = steps[step];
  title.textContent = current.title;
  text.textContent = current.text;
  preview.style.display = step === 2 ? "block" : "none";
  document.documentElement.classList.toggle("super-optimize-preview", step === 2);
  actions.innerHTML = "";
  for (const [label, handler] of current.buttons) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = label === "oh ok" || label === "no" ? "btn secondary" : "btn";
    button.textContent = label;
    button.addEventListener("click", handler);
    actions.appendChild(button);
  }
  modal.style.display = "flex";
}

function requestSuperOptimize(enabled) {
  if (enabled && !state.superOptimize) showSuperOptimizeStep(1); else if (!enabled && state.superOptimize) setSuperOptimize(false); else applySuperOptimize();
}

function setupSuperOptimizeToggle() {
  const toggle = document.getElementById("superOptimizeToggle");
  if (!toggle) return;
  toggle.checked = !!state.superOptimize;
  toggle.addEventListener("change", () => requestSuperOptimize(toggle.checked));
}

function setShowFps(enabled) {
  state.showFps = !!enabled;
  applyShowFps();
  dbSaveMeta();
}

function setupShowFpsToggle() {
  const toggle = document.getElementById("showFpsToggle");
  if (!toggle) return;
  toggle.checked = !!state.showFps;
  toggle.addEventListener("change", () => setShowFps(toggle.checked));
}

function applyRankVisualStyle() {
  const enabled = isLegacyColorFontEnabled();
  document.documentElement.classList.toggle("legacycolorfont-active", enabled);
  const toggle = document.getElementById("legacyColorFontToggle");
  if (toggle) toggle.checked = enabled;
}

function renderSettingsView() {
  applyLowDetailMode();
  applyRankVisualStyle();
  const compactToggle = document.getElementById("compactInventoryVariantsToggle");
  if (compactToggle) compactToggle.checked = !!state.compactInventoryVariants;
  applyShowFps();
  applySuperOptimize();
  const autoUseEl = document.getElementById("settingsAutoUseOptions");
  if (!autoUseEl) return;
  const helpers = [ {
    unlock: "autoPushpin",
    key: "pushpin",
    title: "Auto use Pushpin",
    detail: "Use Pushpin automatically when a pinned recipe has unfinished materials."
  }, {
    unlock: "holdToClick",
    key: "holdToClick",
    title: "Hold to click",
    detail: `Hold ROLL for ${formatHoldClickInterval(holdToClickIntervalMs())}. Current Ball level: ${ballUpgradeLevel("holdToClick")}/5.`
  }, {
    unlock: "autoGloves",
    key: "gloves",
    title: "Auto use Universal Recipe Gloves",
    detail: "Use Universal Recipe Gloves automatically when a pinned recipe has unfinished materials."
  } ];
  autoUseEl.innerHTML = helpers.map(helper => {
    if (!hasBallUpgrade(helper.unlock)) return `<div class="settings-card"><span class="settings-copy"><b>${helper.title}</b><small>Unlock this option from the Balls tab.</small></span></div>`;
    return `<label class="settings-card setting-toggle"><span class="settings-copy"><b>${helper.title}</b><small>${helper.detail}</small></span><input type="checkbox" data-settings-auto-use="${helper.key}" ${state.ballAutoUse[helper.key] ? "checked" : ""} role="switch"></label>`;
  }).join("");
  autoUseEl.querySelectorAll("[data-settings-auto-use]").forEach(input => input.addEventListener("change", () => setBallAutoUse(input.dataset.settingsAutoUse, input.checked)));
}

function updateStatStrip() {
  document.getElementById("statRolls").textContent = state.rolls.toLocaleString();
  document.getElementById("statRps").textContent = effectiveRps();
  document.getElementById("statBest").textContent = state.best ? state.best.isSecret ? "Secret ✦" : tierFor(state.best.baseRng).label : "—";
}

function renderWorldTabs() {
  const el = document.getElementById("worldTabs");
  el.innerHTML = WORLDS.map((w, i) => `<button class="world-tab ${i === state.worldIdx ? "active" : ""}" data-idx="${i}">${w.label}</button>`).join("");
  el.querySelectorAll(".world-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      if (isPerilousArea()) leavePerilousSafely();
      state.worldIdx = parseInt(btn.dataset.idx);
      state.areaIdx = 0;
      renderWorldTabs();
      renderAreaSelect();
      buildIndexAccordion();
      updateAberrationVisual();
      const titleEl = document.getElementById("indexPanelTitle");
      if (titleEl) titleEl.textContent = `Rank index — ${WORLDS[state.worldIdx].label}`;
      dbSaveMeta();
    });
  });
}

function updateAberrationVisual() {
  const world = WORLDS[state.worldIdx];
  const area = world ? world.areas[state.areaIdx] : null;
  const isAberration = !!(area && area.key === "dreamland");
  document.documentElement.classList.toggle("aberration-active", isAberration);
  updatePerilousPresentation();
}

function renderAreaSelect() {
  const world = WORLDS[state.worldIdx];
  const el = document.getElementById("areaSelect");
  el.innerHTML = world.areas.map((a, i) => `<button class="area-btn ${i === state.areaIdx ? "active" : ""}" data-idx="${i}">${a.label}</button>`).join("");
  el.querySelectorAll(".area-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const nextAreaIdx = parseInt(btn.dataset.idx);
      const leavingPerilous = isPerilousArea() && !world.areas[nextAreaIdx].perilous;
      if (leavingPerilous) leavePerilousSafely();
      state.areaIdx = nextAreaIdx;
      if (isPerilousArea()) ensurePerilousVisit();
      renderAreaSelect();
      updateAberrationVisual();
      dbSaveMeta();
    });
  });
}

function renderInventory() {
  if (invViewMode === "folders") renderInventoryFolders();
  const list = document.getElementById("invList");
  const summary = document.getElementById("invSummary");
  const allItems = Object.values(state.inventory);
  const areaWorldMap = {};
  for (const world of WORLDS) {
    for (const area of world.areas) {
      areaWorldMap[area.label] = world.label;
    }
  }
  const fWorld = document.getElementById("filterWorld");
  const fArea = document.getElementById("filterArea");
  const fVariant = document.getElementById("filterVariant");
  const fRank = document.getElementById("filterRank");
  if (!fWorld) return;
  const selWorld = fWorld.value;
  const selArea = fArea.value;
  const selVariant = state.compactInventoryVariants && !fVariant.value ? "normal" : fVariant.value;
  const selRank = fRank.value;
  const worlds = [ ...new Set(allItems.map(i => areaWorldMap[i.areaLabel] || "?").filter(Boolean)) ].sort();
  const areas = [ ...new Set(allItems.map(i => i.areaLabel)) ].sort();
  const variants = [ {
    value: "normal",
    label: "Normal"
  }, ...VARIANT_CHAIN.map(variant => ({
    value: variant.key,
    label: variant.label
  })) ];
  const ranks = [ ...new Set(allItems.map(i => i.name)) ].sort();
  function rebuildSelect(el, values, placeholder) {
    const prev = el.value;
    el.innerHTML = `<option value="">${placeholder}</option>` + values.map(v => `<option value="${escapeHtml(v)}" ${v === prev ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
  }
  rebuildSelect(fWorld, worlds, "All worlds");
  rebuildSelect(fArea, areas, "All areas");
  fVariant.innerHTML = `<option value="">All variants</option>` + variants.map(variant => `<option value="${variant.value}" ${variant.value === selVariant ? "selected" : ""}>${variant.label}</option>`).join("");
  rebuildSelect(fRank, ranks, "All ranks");
  fWorld.value = selWorld;
  fArea.value = selArea;
  fVariant.value = selVariant;
  fRank.value = selRank;
  let itemsBeforeVariant = allItems;
  if (fWorld.value) itemsBeforeVariant = itemsBeforeVariant.filter(i => (areaWorldMap[i.areaLabel] || "") === fWorld.value);
  if (fArea.value) itemsBeforeVariant = itemsBeforeVariant.filter(i => i.areaLabel === fArea.value);
  if (fRank.value) itemsBeforeVariant = itemsBeforeVariant.filter(i => i.name === fRank.value);
  let items = itemsBeforeVariant;
  if (fVariant.value === "normal") items = items.filter(i => !i.variant); else if (fVariant.value) items = items.filter(i => i.variant && i.variant.key === fVariant.value);
  const totalCount = allItems.reduce((s, i) => s + i.count, 0);
  const allCompactGroupCount = state.compactInventoryVariants ? new Set(allItems.map(item => `${item.isSecret ? "secret" : "rank"}|${item.areaLabel}|${item.name}`)).size : allItems.length;
  summary.textContent = `${allCompactGroupCount} ${state.compactInventoryVariants ? "unique ranks" : "unique"} · ${totalCount.toLocaleString()} total`;
  if (items.length === 0) {
    list.innerHTML = `<div class="inv-empty">${allItems.length === 0 ? "Nothing collected yet. Go roll something." : "No items match the current filters."}</div>`;
    return;
  }
  const displayItems = orderedInventoryItems(items);
  if (!state.compactInventoryVariants) {
    summary.textContent = `${allItems.length} unique · ${totalCount.toLocaleString()} total`;
    list.innerHTML = displayItems.map(it => {
      const variantTxt = it.variant ? ` · ${it.variant.label}` : "";
      const suffix = it.variant ? " ✦" : it.isSecret ? " 🔒" : "";
      const nameEl = rankNameHtml(it.name, it.tierCls, it.variant, "", it.isSecret ? null : it.tierKey);
      return `\n        <div class="inv-row">\n          <div>\n            <div class="iname">${nameEl}${suffix}</div>\n            <div class="imeta">${it.areaLabel} · ${fmtRngForResult(it)} · ${it.tierLabel}${variantTxt}</div>\n          </div>\n          <span class="icount">×${it.count.toLocaleString()}</span>\n        </div>\n      `;
    }).join("");
    return;
  }
  const variantOrder = [ null, ...VARIANT_CHAIN.map(variant => variant.key) ];
  const groupKeyForItem = item => `${item.isSecret ? "secret" : "rank"}|${item.areaLabel}|${item.name}`;
  const grouped = new Map;
  for (const item of items) {
    const groupKey = groupKeyForItem(item);
    if (!grouped.has(groupKey)) grouped.set(groupKey, {
      representative: item,
      counts: Object.fromEntries(variantOrder.map(key => [ key == null ? "normal" : key, 0 ])),
      ownedItems: {}
    });
  }
  for (const item of itemsBeforeVariant) {
    const group = grouped.get(groupKeyForItem(item));
    if (!group) continue;
    const variantKey = item.variant ? item.variant.key : "normal";
    group.counts[variantKey] = (group.counts[variantKey] || 0) + item.count;
    group.ownedItems[variantKey] = item;
    if (item.lastRng > group.representative.lastRng) group.representative = item;
  }
  const compactItems = [ ...grouped.values() ].sort((a, b) => {
    if (a.representative.isSecret && !b.representative.isSecret) return -1;
    if (!a.representative.isSecret && b.representative.isSecret) return 1;
    return b.representative.lastRng - a.representative.lastRng;
  });
  list.innerHTML = compactItems.map(group => {
    const it = group.representative;
    const nameEl = rankNameHtml(it.name, it.tierCls, null, "", it.isSecret ? null : it.tierKey);
    const variantCounts = variantOrder.map((key, index) => {
      const variantKey = key == null ? "normal" : key;
      const count = group.counts[variantKey] || 0;
      const countHtml = `<button type="button" class="compact-variant-count" data-compact-variant-area="${escapeHtml(it.areaLabel)}" data-compact-variant-name="${escapeHtml(it.name)}" data-compact-variant-key="${variantKey}" ${count > 0 ? "" : "disabled"}>${count.toLocaleString()}</button>`;
      return `${index ? '<span class="compact-variant-separator">|</span>' : ""}${countHtml}`;
    }).join("");
    const metadata = it.isSecret ? `${it.areaLabel} · ${it.tierLabel} · rarity hidden` : `${it.areaLabel} · ${fmtRng(it.baseRng)} · ${it.tierLabel}`;
    return `\n      <div class="inv-row compact-variant-row">\n        <div>\n          <div class="iname">${nameEl}${it.isSecret ? " 🔒" : ""}</div>\n          <div class="imeta">${metadata}</div>\n        </div>\n        <span class="icount compact-variant-counts" title="normal | Weird | Odd | Rainbow | Grayscale; click an owned value for its RNG">${variantCounts}</span>\n      </div>\n    `;
  }).join("");
  list.querySelectorAll("[data-compact-variant-key]").forEach(button => button.addEventListener("click", () => {
    const variantKey = button.dataset.compactVariantKey;
    const item = Object.values(state.inventory).find(entry => entry.areaLabel === button.dataset.compactVariantArea && entry.name === button.dataset.compactVariantName && (variantKey === "normal" ? !entry.variant : entry.variant && entry.variant.key === variantKey));
    if (!item) return;
    if (item.isSecret) {
      alertUser("Secret rank rarity is hidden.");
      return;
    }
    const variantLabel = variantKey === "normal" ? "Normal" : VARIANT_CHAIN.find(variant => variant.key === variantKey)?.label || variantKey;
    alertUser(`${item.name} · ${variantLabel}: 1/${fmtRngForResult(item)}`);
  }));
}

function setupInventoryFilters() {
  [ "filterWorld", "filterArea", "filterVariant", "filterRank" ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", renderInventory);
  });
}

const FOLDER_DECOR_PATH = "junisrng/game/userdata/inventory";

const FOLDER_VARIANT_KEYS = [ "all", ...VARIANT_CHAIN.map(v => v.key) ];

function folderVariantLabel(vKey) {
  if (vKey === "all") return "All";
  const v = VARIANT_CHAIN.find(x => x.key === vKey);
  return v ? v.label : vKey;
}

function buildInventoryFolderTree() {
  const areaWorldMap = {};
  for (const world of WORLDS) {
    for (const area of world.areas) areaWorldMap[area.label] = world.label;
  }
  const tree = {};
  for (const vKey of FOLDER_VARIANT_KEYS) tree[vKey] = {};
  for (const key in state.inventory) {
    const it = state.inventory[key];
    const worldLabel = areaWorldMap[it.areaLabel] || "Unknown World";
    const itemVariantKey = it.variant ? it.variant.key : null;
    const tierKey = it.isSecret ? "secret" : it.tierKey;
    const targets = itemVariantKey ? [ "all", itemVariantKey ] : [ "all" ];
    for (const vKey of targets) {
      const branch = tree[vKey];
      if (!branch[worldLabel]) branch[worldLabel] = {};
      if (!branch[worldLabel][it.areaLabel]) branch[worldLabel][it.areaLabel] = {};
      if (!branch[worldLabel][it.areaLabel][tierKey]) branch[worldLabel][it.areaLabel][tierKey] = [];
      branch[worldLabel][it.areaLabel][tierKey].push(it);
    }
  }
  return tree;
}

function folderTierLabel(tierKey) {
  if (tierKey === "secret") return "Secret";
  const t = TIERS.find(x => x.key === tierKey);
  return t ? t.label : tierKey;
}

function folderLeafItemsHtml(items) {
  const sorted = [ ...items ].sort((a, b) => b.lastRng - a.lastRng);
  return `<div class="folder-leaf-list">` + sorted.map(it => {
    const variantTxt = it.variant ? ` · ${it.variant.label}` : "";
    const suffix = it.variant ? " ✦" : it.isSecret ? " 🔒" : "";
    const nameEl = rankNameHtml(it.name, it.tierCls, it.variant, "", it.isSecret ? null : it.tierKey);
    return `\n      <div class="inv-row">\n        <div>\n          <div class="iname">${nameEl}${suffix}</div>\n          <div class="imeta">${it.areaLabel} · ${fmtRngForResult(it)} · ${it.tierLabel}${variantTxt}</div>\n        </div>\n        <span class="icount">×${it.count.toLocaleString()}</span>\n      </div>\n    `;
  }).join("") + `</div>`;
}

function folderItemCount(items) {
  return items.reduce((s, it) => s + it.count, 0);
}

function renderInventoryFoldersAccordion() {
  const el = document.getElementById("invFolders");
  if (!el) return;
  const tree = buildInventoryFolderTree();
  let html = `<div class="folder-decor-path">${FOLDER_DECOR_PATH}/ranks/</div><div class="accordion">`;
  for (const vKey of FOLDER_VARIANT_KEYS) {
    const worlds = tree[vKey];
    const worldLabels = Object.keys(worlds);
    if (worldLabels.length === 0) continue;
    let worldsHtml = "";
    for (const worldLabel of worldLabels) {
      const areas = worlds[worldLabel];
      const areaLabels = Object.keys(areas);
      let areasHtml = "";
      for (const areaLabel of areaLabels) {
        const tiers = areas[areaLabel];
        const tierKeys = Object.keys(tiers);
        let tiersHtml = "";
        for (const tierKey of tierKeys) {
          const items = tiers[tierKey];
          tiersHtml += `\n            <div class="acc-item sub-acc-item" data-acc="tier">\n              <div class="acc-head"><span>${folderTierLabel(tierKey)} <span class="folder-count">(${folderItemCount(items)})</span></span><span class="chev">▾</span></div>\n              <div class="acc-body">${folderLeafItemsHtml(items)}</div>\n            </div>`;
        }
        areasHtml += `\n          <div class="acc-item sub-acc-item" data-acc="area">\n            <div class="acc-head"><span>${escapeHtml(areaLabel)}</span><span class="chev">▾</span></div>\n            <div class="acc-body">${tiersHtml}</div>\n          </div>`;
      }
      worldsHtml += `\n        <div class="acc-item sub-acc-item" data-acc="world">\n          <div class="acc-head"><span>${escapeHtml(worldLabel)}</span><span class="chev">▾</span></div>\n          <div class="acc-body">${areasHtml}</div>\n        </div>`;
    }
    html += `\n      <div class="acc-item" data-acc="variant">\n        <div class="acc-head"><span>📁 ${folderVariantLabel(vKey)}</span><span class="chev">▾</span></div>\n        <div class="acc-body">${worldsHtml}</div>\n      </div>`;
  }
  html += `</div>`;
  if (Object.values(tree).every(w => Object.keys(w).length === 0)) {
    html = `<div class="folder-decor-path">${FOLDER_DECOR_PATH}/ranks/</div><div class="inv-empty">Nothing collected yet. Go roll something.</div>`;
  }
  el.innerHTML = html;
  el.querySelectorAll(".acc-head").forEach(head => {
    head.addEventListener("click", () => {
      head.parentElement.classList.toggle("open");
    });
  });
}

let folderBreadcrumbPath = [];

function renderInventoryFoldersBreadcrumb() {
  const el = document.getElementById("invFolders");
  if (!el) return;
  const tree = buildInventoryFolderTree();
  let node = tree;
  const validPath = [];
  for (const seg of folderBreadcrumbPath) {
    if (node && Object.prototype.hasOwnProperty.call(node, seg)) {
      validPath.push(seg);
      node = node[seg];
    } else break;
  }
  folderBreadcrumbPath = validPath;
  const crumbLabels = [ "ranks", ...folderBreadcrumbPath.map((seg, i) => i === 0 ? folderVariantLabel(seg) : seg) ];
  const crumbHtml = `<div class="folder-decor-path">${FOLDER_DECOR_PATH}/</div><div class="folder-breadcrumb">` + crumbLabels.map((label, i) => {
    const isLast = i === crumbLabels.length - 1;
    const sep = i > 0 ? `<span class="folder-crumb-sep">/</span>` : "";
    return `${sep}<span class="folder-crumb ${isLast ? "current" : ""}" data-crumb-depth="${i}">${escapeHtml(label)}</span>`;
  }).join("") + `</div>`;
  const depth = folderBreadcrumbPath.length;
  let bodyHtml = "";
  if (depth === 0) {
    const rows = FOLDER_VARIANT_KEYS.filter(vKey => Object.keys(tree[vKey]).length > 0);
    bodyHtml = rows.length ? rows.map(vKey => folderRowHtml("📁", folderVariantLabel(vKey), vKey)).join("") : `<div class="inv-empty">Nothing collected yet. Go roll something.</div>`;
  } else if (depth === 1) {
    const worldLabels = Object.keys(node);
    bodyHtml = worldLabels.map(w => folderRowHtml("🌍", w, w)).join("");
  } else if (depth === 2) {
    const areaLabels = Object.keys(node);
    bodyHtml = areaLabels.map(a => folderRowHtml("📂", a, a)).join("");
  } else if (depth === 3) {
    const tierKeys = Object.keys(node);
    bodyHtml = tierKeys.map(t => folderRowHtml("📄", folderTierLabel(t) + ` (${folderItemCount(node[t])})`, t)).join("");
  } else if (depth === 4) {
    bodyHtml = folderLeafItemsHtml(node);
  }
  el.innerHTML = crumbHtml + bodyHtml;
  el.querySelectorAll(".folder-crumb[data-crumb-depth]").forEach(crumb => {
    crumb.addEventListener("click", () => {
      const d = Number(crumb.getAttribute("data-crumb-depth"));
      if (d >= crumbLabels.length - 1) return;
      folderBreadcrumbPath = folderBreadcrumbPath.slice(0, d);
      renderInventoryFoldersBreadcrumb();
    });
  });
  el.querySelectorAll(".folder-row[data-folder-key]").forEach(row => {
    row.addEventListener("click", () => {
      folderBreadcrumbPath.push(row.getAttribute("data-folder-key"));
      renderInventoryFoldersBreadcrumb();
    });
  });
}

function folderRowHtml(icon, label, key) {
  return `<div class="folder-row" data-folder-key="${escapeHtml(key)}"><span><span class="folder-icon">${icon}</span>${escapeHtml(label)}</span></div>`;
}

let invFolderNavMode = "accordion";

function renderInventoryFolders() {
  if (invFolderNavMode === "breadcrumb") renderInventoryFoldersBreadcrumb(); else renderInventoryFoldersAccordion();
}

let invViewMode = "list";

function setupInventoryModeToggles() {
  const modeToggle = document.getElementById("invModeToggle");
  const navToggle = document.getElementById("invFolderNavToggle");
  const filtersEl = document.getElementById("invFilters");
  const listEl = document.getElementById("invList");
  const foldersEl = document.getElementById("invFolders");
  if (!modeToggle) return;
  modeToggle.querySelectorAll("[data-inv-mode]").forEach(btn => {
    btn.addEventListener("click", () => {
      invViewMode = btn.getAttribute("data-inv-mode");
      modeToggle.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("active", b === btn));
      const showFolders = invViewMode === "folders";
      if (filtersEl) filtersEl.style.display = showFolders ? "none" : "";
      if (listEl) listEl.style.display = showFolders ? "none" : "";
      if (foldersEl) foldersEl.style.display = showFolders ? "" : "none";
      if (navToggle) navToggle.style.display = showFolders ? "inline-flex" : "none";
      if (showFolders) renderInventoryFolders();
    });
  });
  if (navToggle) {
    navToggle.querySelectorAll("[data-folder-nav]").forEach(btn => {
      btn.addEventListener("click", () => {
        invFolderNavMode = btn.getAttribute("data-folder-nav");
        navToggle.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("active", b === btn));
        folderBreadcrumbPath = [];
        renderInventoryFolders();
      });
    });
  }
}

function getConsumableCraftAmount() {
  const choice = document.getElementById("consumableCraftAmount");
  const custom = document.getElementById("consumableCraftCustomAmount");
  const raw = choice && choice.value === "custom" ? custom ? custom.value : 1 : choice ? choice.value : 1;
  const parsed = Math.floor(Number(raw));
  return Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, 1e6)) : 1;
}

function setupConsumableBulkCraftControls() {
  const choice = document.getElementById("consumableCraftAmount");
  const custom = document.getElementById("consumableCraftCustomAmount");
  if (!choice || !custom || choice.dataset.ready) return;
  choice.dataset.ready = "1";
  const updateChoice = () => {
    custom.style.display = choice.value === "custom" ? "" : "none";
    renderConsumableCards();
  };
  choice.addEventListener("change", updateChoice);
  custom.addEventListener("input", () => {
    if (choice.value === "custom") renderConsumableCards();
  });
}

function setupItemCategorySelect() {
  const sel = document.getElementById("itemCategorySelect");
  if (!sel || sel.dataset.ready) return;
  sel.dataset.ready = "1";
  const updateCategory = () => {
    const axesEl = document.getElementById("itemCards");
    const consumablesEl = document.getElementById("consumableCards");
    const equipsEl = document.getElementById("equipCards");
    const bulkControls = document.getElementById("consumableBulkCraftControls");
    axesEl.style.display = sel.value === "axes" ? "" : "none";
    consumablesEl.style.display = sel.value === "consumables" ? "" : "none";
    equipsEl.style.display = sel.value === "equips" ? "" : "none";
    if (bulkControls) bulkControls.style.display = sel.value === "consumables" ? "flex" : "none";
  };
  sel.addEventListener("change", updateCategory);
  updateCategory();
}

function hasEverFoundGlobal(world, name) {
  for (const area of world.areas) {
    if (hasEverFoundRank(area.label, name)) return true;
  }
  return false;
}

function isInPinnedRecipe(areaLabel, name) {
  const recipe = pinnedRecipeData();
  if (!recipe) return false;
  return recipe.requires.some(req => req.area === areaLabel && req.name === name);
}

const INDEX_MYSTERY_THRESHOLD = 1e9;

function indexRankRowHtml(name, rng, isMutation, sourceTag, foundCheck, areaLabel) {
  const t = tierFor(rng);
  const indent = isMutation ? ' style="padding-left:16px; opacity:0.9;"' : "";
  const arrow = isMutation ? "↳ " : "";
  const fontSize = isMutation ? ' style="font-size:13px;"' : "";
  const src = sourceTag ? ` <span class="rank-src">(${sourceTag})</span>` : "";
  let displayName = name;
  if (name === "Specific Minute") {
    const now = new Date;
    const targetMin = (now.getHours() * 17 + 42) % 60;
    displayName = `Specific Minute (xx:${targetMin.toString().padStart(2, "0")})`;
  }
  const isMystery = rng >= INDEX_MYSTERY_THRESHOLD && !foundCheck() && !(areaLabel && isInPinnedRecipe(areaLabel, name));
  if (isMystery) {
    const mysteryHtml = rankNameHtml(name, t.cls, null, "", t.key, "???");
    return `<div class="rank-row mystery-row"${indent}><span${fontSize}>${mysteryHtml}</span><span class="rrng">??? · ???${src}</span></div>`;
  }
  const rankObj = findRankObj(areaLabel, name);
  let reqHtml = "";
  if (rankObj && rankObj.requirement) {
    reqHtml = `\n        <div class="sub-acc-item">\n          <div class="sub-acc-head"><span>Requirement</span><span class="chev">▾</span></div>\n          <div class="sub-acc-body">\n            <div style="font-family:var(--mono); font-size:11px; color:var(--text-dim); padding:4px 0;">\n              ${rankObj.requirement}\n            </div>\n          </div>\n        </div>\n      `;
  }
  const isGimmickRank = !!(rankObj && rankObj.requirement);
  const rarityText = isGimmickRank ? conditionalRarityDisplay(rng) : `1/${fmtRng(rng)}`;
  const pinnedTag = areaLabel && isInPinnedRecipe(areaLabel, name) ? ' <span class="pin-tag">📌</span>' : "";
  const nameHtml = rankNameHtml(name, t.cls, null, "", t.key, displayName);
  return `<div class="rank-row"${indent}><div style="flex:1;"><span${fontSize}>${arrow}${nameHtml}${pinnedTag}</span><span class="rrng">${rarityText} · ${t.label}${src}</span>${reqHtml}</div></div>`;
}

function buildSecretsAccordion() {
  const el = document.getElementById("secretsAccordion");
  if (!el) return;
  let totalSlots = 0;
  let foundSlots = 0;
  let html = "";
  for (const secret of SECRET_RANKS) {
    const plainFound = isSecretDiscovered(secret.key, null);
    const variantResults = VARIANT_CHAIN.map(v => ({
      v: v,
      found: isSecretDiscovered(secret.key, v.key)
    }));
    const foundCount = (plainFound ? 1 : 0) + variantResults.filter(r => r.found).length;
    totalSlots += 1 + VARIANT_CHAIN.length;
    foundSlots += foundCount;
    const anyFound = foundCount > 0;
    const displayName = anyFound ? secret.name : "???";
    const progressTag = `<span class="secret-progress-tag">${foundCount}/${VARIANT_CHAIN.length + 1}</span>`;
    const plainRow = `<div class="rank-row ${plainFound ? "" : "mystery-row"}">\n      <span class="rname ${plainFound ? "t-secret" : ""}">${plainFound ? "🔒 " + secret.name : "???"}</span>\n      <span class="rrng">${plainFound ? "??? · Secret" : "??? · ???"}</span>\n    </div>`;
    const variantRows = variantResults.map(({v: v, found: found}) => `\n      <div class="rank-row ${found ? "" : "mystery-row"}" style="padding-left:16px; opacity:0.9;">\n        <span class="rname ${found ? "t-secret " + v.cls : ""}" style="font-size:13px;">${found ? `🔒 ↳ ${secret.name} ✦` : `↳ ???`}</span>\n        <span class="rrng">${found ? `??? · Secret (${v.label})` : "??? · ???"}</span>\n      </div>\n    `).join("");
    html += `\n      <div class="acc-item" data-acc="secret-${secret.key}">\n        <div class="acc-head"><span>${anyFound ? "🔒 " : "🔒 "}${displayName} ${progressTag}</span><span class="chev">▾</span></div>\n        <div class="acc-body">${plainRow}${variantRows}</div>\n      </div>\n    `;
  }
  const summaryHtml = `<div class="secrets-summary">Overall: <b>${foundSlots} / ${totalSlots}</b> secret forms discovered</div>`;
  el.innerHTML = summaryHtml + html;
  el.querySelectorAll(".acc-head").forEach(head => {
    head.addEventListener("click", () => {
      head.parentElement.classList.toggle("open");
    });
  });
}

function buildIndexAccordion() {
  const el = document.getElementById("indexAccordion");
  const world = WORLDS[state.worldIdx];
  let html = "";
  if (world.global && world.global.length) {
    html += `\n      <div class="acc-item" data-acc="global">\n        <div class="acc-head"><span>Global — spawns everywhere</span><span class="chev">▾</span></div>\n        <div class="acc-body">\n          ${world.global.map(g => indexRankRowHtml(g.name, g.rng, false, null, () => hasEverFoundGlobal(world, g.name), null)).join("")}\n        </div>\n      </div>\n    `;
  }
  for (const area of world.areas) {
    let rowsHtml = "";
    if (area.isUniversalPool) {
      for (const w of WORLDS) {
        for (const a of w.areas) {
          if (a.key === area.key) continue;
          for (const r of a.ranks) {
            rowsHtml += indexRankRowHtml(r.name, r.rng, false, a.label, () => hasEverFoundRank(a.label, r.name), a.label);
            if (r.mutations) {
              for (const m of r.mutations) {
                rowsHtml += indexRankRowHtml(m.name, m.rng, true, a.label, () => hasEverFoundRank(a.label, m.name), a.label);
              }
            }
          }
        }
      }
    } else {
      for (const r of area.ranks) {
        rowsHtml += indexRankRowHtml(r.name, r.rng, false, null, () => hasEverFoundRank(area.label, r.name), area.label);
        if (r.mutations) {
          for (const m of r.mutations) {
            rowsHtml += indexRankRowHtml(m.name, m.rng, true, null, () => hasEverFoundRank(area.label, m.name), area.label);
          }
        }
      }
    }
    for (const secret of SECRET_RANKS) {
      if (secret.worldKey && secret.worldKey !== world.key) continue;
      if (secret.areaKey && secret.areaKey !== area.key) continue;
      if (isSecretDiscovered(secret.key, null)) {
        rowsHtml += `<div class="rank-row secret-row"><span class="rname t-secret">🔒 ${secret.name}</span><span class="rrng">??? · Secret</span></div>`;
      }
      for (const v of VARIANT_CHAIN) {
        if (isSecretDiscovered(secret.key, v.key)) {
          rowsHtml += `<div class="rank-row secret-row" style="padding-left:16px; opacity:0.9;"><span class="rname t-secret ${v.cls}" style="font-size:13px;">🔒 ↳ ${secret.name} ✦</span><span class="rrng">??? · Secret (${v.label})</span></div>`;
        }
      }
    }
    html += `\n      <div class="acc-item" data-acc="${area.key}">\n        <div class="acc-head"><span>${area.label}</span><span class="chev">▾</span></div>\n        <div class="acc-body">${rowsHtml}</div>\n      </div>\n    `;
  }
  el.innerHTML = html;
  el.querySelectorAll(".acc-head").forEach(head => {
    head.addEventListener("click", () => {
      head.parentElement.classList.toggle("open");
    });
  });
  setupSubAccordions(el);
}

function renderItemCards() {
  renderPinnedRecipePanel();
  const el = document.getElementById("itemCards");
  const visibleAxeKeys = AXE_ORDER.filter(key => {
    const axe = AXES[key];
    return !axe.hiddenUntilBallUpgrade || hasBallUpgrade(axe.hiddenUntilBallUpgrade) || state.ownedAxes.includes(key);
  });
  el.innerHTML = visibleAxeKeys.map(key => {
    const axe = AXES[key];
    const owned = state.ownedAxes.includes(key);
    const equipped = state.equippedAxe === key;
    const isPinned = state.pinnedRecipe && state.pinnedRecipe.kind === "axe" && state.pinnedRecipe.key === key;
    let reqHtml = "";
    let canCraft = true;
    if (axe.free) {
      reqHtml = `<div class="req-row ok">Free · auto-equipped at start</div>`;
    } else {
      const requirements = effectiveAxeRequirements(axe);
      reqHtml = requirements.map(req => {
        const have = getReqOwnedCount(req);
        const ok = have >= req.amount;
        if (!ok) canCraft = false;
        const variantTag = req.variant ? ` (${req.variant})` : "";
        const label = requirementLabel(req);
        return `<div class="req-row ${ok ? "ok" : "short"}">${label}${variantTag} <span>${have.toLocaleString()} / ${req.amount.toLocaleString()}</span></div>`;
      }).join("");
    }
    const statsHtml = `\n      <div class="istats">\n        <span class="stat">luck <b>×${axe.stats.luckMult}</b></span>\n        <span class="stat">bulk <b>${axe.stats.bulk}</b></span>\n        <span class="stat">rolls/sec offline <b>${axe.stats.rps}</b></span>\n      </div>\n    `;
    let actionHtml = "";
    if (equipped) {
      actionHtml = `<span class="badge-equipped">Equipped</span>`;
    } else if (owned) {
      actionHtml = `<button class="btn small" data-equip="${key}">Equip</button>`;
    } else if (axe.free) {
      actionHtml = "";
    } else {
      actionHtml = `<button class="btn small ${canCraft ? "" : "secondary"}" data-craft="${key}" ${canCraft ? "" : "disabled"}>Craft</button>`;
    }
    const pinBtn = axe.free ? "" : `<button class="btn small ${isPinned ? "pinned-btn" : "secondary"}" data-pin-axe="${key}" style="margin-right:6px;">${isPinned ? "📌 Pinned" : "📌 Pin"}</button>`;
    const bonusSub = axe.bonus ? `\n      <div class="sub-acc-item" data-sub-acc="bonus-${key}">\n        <div class="sub-acc-head"><span>✦ Bonus</span><span class="chev">▾</span></div>\n        <div class="sub-acc-body"><span class="stat" style="color:var(--accent-2);">${axe.bonus}</span></div>\n      </div>` : "";
    const recipeSub = !axe.free ? `\n      <div class="sub-acc-item" data-sub-acc="recipe-${key}">\n        <div class="sub-acc-head"><span>📋 Recipe${canCraft && !owned ? ' <span class="ready-tag">ready</span>' : ""}</span><span class="chev">▾</span></div>\n        <div class="sub-acc-body"><div class="req-list">${reqHtml}</div></div>\n      </div>` : "";
    return `\n      <div class="item-card ${equipped ? "equipped" : ""} ${isPinned ? "pinned-card" : ""}">\n        <div class="ihead">\n          <span class="iname">${axe.name}</span>\n          ${owned && !equipped ? '<span class="badge-owned">Owned</span>' : ""}\n          ${isPinned ? '<span class="badge-pinned">Pinned</span>' : ""}\n        </div>\n        <div class="idesc">${axe.desc}</div>\n        ${statsHtml}\n        ${bonusSub}\n        ${recipeSub}\n        <div style="text-align:right; margin-top:10px;">${pinBtn}${actionHtml}</div>\n      </div>\n    `;
  }).join("");
  setupSubAccordions(el);
  el.querySelectorAll("[data-craft]").forEach(btn => {
    btn.addEventListener("click", () => craftAxe(btn.dataset.craft));
  });
  el.querySelectorAll("[data-equip]").forEach(btn => {
    btn.addEventListener("click", () => equipAxe(btn.dataset.equip));
  });
  el.querySelectorAll("[data-pin-axe]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const k = btn.dataset.pinAxe;
      if (state.pinnedRecipe && state.pinnedRecipe.kind === "axe" && state.pinnedRecipe.key === k) {
        clearPinnedRecipe();
      } else {
        setPinnedRecipe("axe", k);
      }
      renderItemCards();
      renderConsumableCards();
      buildIndexAccordion();
    });
  });
}

function setupSubAccordions(container) {
  container.querySelectorAll(".sub-acc-head").forEach(head => {
    head.addEventListener("click", e => {
      e.stopPropagation();
      head.parentElement.classList.toggle("open");
    });
  });
}

function renderPinnedRecipePanel() {
  const el = document.getElementById("pinnedRecipePanel");
  if (!el) return;
  if (!state.pinnedRecipe) {
    el.innerHTML = `<div class="pinned-panel empty">📌 No recipe pinned — pin an axe or consumable to track progress and use Pushpin / Gloves.</div>`;
    return;
  }
  const recipe = pinnedRecipeData();
  if (!recipe) {
    el.innerHTML = "";
    return;
  }
  const kind = state.pinnedRecipe.kind;
  const label = kind === "axe" ? AXES[state.pinnedRecipe.key].name : CONSUMABLES[state.pinnedRecipe.key].name;
  const target = rarestUnfinishedMaterial();
  const targetHtml = target ? `<span class="pin-target">🎯 Rarest missing: <b>${target.name}</b> (1/${fmtRng(target.rng)}) in ${target.area}</span>` : `<span class="pin-target" style="color:var(--ok)">✅ All materials gathered!</span>`;
  const reqRows = effectivePinnedRecipeRequirements().map(req => {
    const have = getReqOwnedCount(req);
    const ok = have >= req.amount;
    return `<div class="req-row ${ok ? "ok" : "short"}">${requirementLabel(req)} <span>${have.toLocaleString()} / ${req.amount.toLocaleString()}</span></div>`;
  }).join("");
  el.innerHTML = `\n    <div class="pinned-panel">\n      <div class="pinned-header">\n        <span>📌 Pinned: <b>${escapeHtml(label)}</b></span>\n        <button class="btn small secondary" id="unpinBtn">Unpin</button>\n      </div>\n      ${targetHtml}\n      <div class="req-list" style="margin-top:6px;">${reqRows}</div>\n    </div>`;
  el.querySelector("#unpinBtn").addEventListener("click", () => {
    clearPinnedRecipe();
    renderItemCards();
    renderConsumableCards();
    buildIndexAccordion();
  });
}

function ballAdjustedConsumableEffect(item) {
  if (!item) return "";
  if (item.key === "pushpin" && hasBallUpgrade("upgradedPushpin")) return "On use: for 500 clicks, the most common unfinished material gets ×2.5 luck and the rarest unfinished material gets ×5 luck in its home area.";
  if (item.key === "gloves" && hasBallUpgrade("upgradedGloves")) return "On use: every rank from each area represented in your pinned recipe can drop in any area at ×1.5 rarity, for 250 clicks. Nothing native is replaced.";
  if (item.key === "bomb" && hasBallUpgrade("upgradedBombs")) return "On use: charges for 15 minutes. Once triggered, fires 1,250,000 rolls in your current area at ×100 luck and ×5 mutation luck.";
  if (item.key === "nukinamachina" && hasBallUpgrade("upgradedBombs")) return "On use: adds 5,000,000 rolls in your current area at ×150 luck and ×10 mutation luck.";
  if (item.key === "nullbomb" && hasBallUpgrade("upgradedBombs")) return "On use: charges for 4h 4m 4s. Once triggered, fires 40.4 million rolls in your current area at ×404 luck and ×4.04 mutation luck.";
  if (item.key === "watergun") {
    const durationLevel = ballUpgradeLevel("moreWatergun");
    const durationText = durationLevel > 0 ? `${fmtDuration(watergunStackDurationSeconds())}` : "1 hour";
    if (hasBallUpgrade("sentientWaterhose")) return `On use: AFK roll speed +1× per stack, up to ×4 total (3 uses max). Each stack lasts ${durationText}.`;
    if (durationLevel > 0) return `On use: AFK roll speed ×0.5 faster, stacks up to ×2.5 total (3 uses max). Each stack lasts ${durationText}.`;
  }
  return item.effect;
}

function ballAdjustedEquipBonus(item) {
  if (item && item.key === "axenades" && hasBallUpgrade("upgradedBombs")) {
    return `${item.bonus} Balls upgrade: every Axenades roll/luck/mutation-luck bonus is doubled; Explosive Axe Bomb charge speed and efficiency are doubled again.`;
  }
  return item ? item.bonus : "";
}

function renderEquipCards() {
  const el = document.getElementById("equipCards");
  if (!el) return;
  if (EQUIP_ORDER.length === 0) {
    el.innerHTML = `<div class="inv-empty">No equippables exist yet — check back later.</div>`;
    return;
  }
  el.innerHTML = EQUIP_ORDER.map(key => {
    const item = EQUIPS[key];
    const owned = state.ownedEquips.includes(key);
    const equipped = state.equippedItem === key;
    let reqHtml = "";
    let canCraft = true;
    const requirements = discountedRecipeRequirements(item.requires);
    reqHtml = requirements.map(req => {
      const have = getOwnedCount(req.area, req.name, req.variant);
      const ok = have >= req.amount;
      if (!ok) canCraft = false;
      const variantTag = req.variant ? ` (${req.variant})` : "";
      return `<div class="req-row ${ok ? "ok" : "short"}">${req.name}${variantTag} <span>${have.toLocaleString()} / ${req.amount.toLocaleString()}</span></div>`;
    }).join("");
    if (item.requiresConsumables) {
      reqHtml += discountedRecipeRequirements(item.requiresConsumables).map(creq => {
        const have = getConsumableCount(creq.key);
        const ok = have >= creq.amount;
        if (!ok) canCraft = false;
        const cname = CONSUMABLES[creq.key] ? CONSUMABLES[creq.key].name : creq.key;
        return `<div class="req-row ${ok ? "ok" : "short"}">${cname} (consumable) <span>${have.toLocaleString()} / ${creq.amount.toLocaleString()}</span></div>`;
      }).join("");
    }
    const statParts = [];
    if (item.luckMult) statParts.push(`<span class="stat">luck <b>×${item.luckMult}</b></span>`);
    if (item.luckExponent) statParts.push(`<span class="stat">luck <b>^${item.luckExponent}</b></span>`);
    if (item.bulkAdd) statParts.push(`<span class="stat">bulk <b>+${item.bulkAdd}</b></span>`);
    if (item.rpsMult != null) statParts.push(`<span class="stat">rps <b>×${item.rpsMult}</b></span>`);
    if (item.idleEfficiencyMult) statParts.push(`<span class="stat">idle efficiency <b>×${item.idleEfficiencyMult}</b></span>`);
    const statsHtml = statParts.length ? `<div class="istats">${statParts.join("")}</div>` : "";
    let actionHtml = "";
    if (equipped) {
      actionHtml = `<button class="btn small secondary" data-unequip="1">Unequip</button>`;
    } else if (owned) {
      actionHtml = `<button class="btn small" data-equip-item="${key}">Equip</button>`;
    } else {
      actionHtml = `<button class="btn small ${canCraft ? "" : "secondary"}" data-craft-equip="${key}" ${canCraft ? "" : "disabled"}>Craft</button>`;
    }
    const bonusSub = item.bonus ? `\n      <div class="sub-acc-item" data-sub-acc="ebonus-${key}">\n        <div class="sub-acc-head"><span>✦ Bonus</span><span class="chev">▾</span></div>\n        <div class="sub-acc-body"><span class="stat" style="color:var(--accent-2);">${ballAdjustedEquipBonus(item)}</span></div>\n      </div>` : "";
    const recipeSub = `\n      <div class="sub-acc-item" data-sub-acc="erecipe-${key}">\n        <div class="sub-acc-head"><span>📋 Recipe${canCraft && !owned ? ' <span class="ready-tag">ready</span>' : ""}</span><span class="chev">▾</span></div>\n        <div class="sub-acc-body"><div class="req-list">${reqHtml}</div></div>\n      </div>`;
    return `\n      <div class="item-card ${equipped ? "equipped" : ""}">\n        <div class="ihead">\n          <span class="iname">${item.name}</span>\n          ${owned && !equipped ? '<span class="badge-owned">Owned</span>' : ""}\n        </div>\n        <div class="idesc">${item.desc}</div>\n        ${statsHtml}\n        ${bonusSub}\n        ${recipeSub}\n        <div style="text-align:right; margin-top:10px;">${actionHtml}</div>\n      </div>\n    `;
  }).join("");
  setupSubAccordions(el);
  el.querySelectorAll("[data-craft-equip]").forEach(btn => {
    btn.addEventListener("click", () => craftEquip(btn.dataset.craftEquip));
  });
  el.querySelectorAll("[data-equip-item]").forEach(btn => {
    btn.addEventListener("click", () => equipItem(btn.dataset.equipItem));
  });
  el.querySelectorAll("[data-unequip]").forEach(btn => {
    btn.addEventListener("click", () => unequipItem());
  });
}

function craftAxe(key) {
  const axe = AXES[key];
  if (!axe || axe.free || state.ownedAxes.includes(key)) return;
  const requirements = effectiveAxeRequirements(axe);
  for (const req of requirements) {
    if (getReqOwnedCount(req) < req.amount) return;
  }
  for (const req of requirements) {
    consumeRequirement(req);
  }
  state.ownedAxes.push(key);
  state.equippedAxe = key;
  dbSaveMeta();
  renderItemCards();
  renderInventory();
  renderConsumableCards();
  renderAxeStrip();
  updateStatStrip();
}

function equipAxe(key) {
  if (!state.ownedAxes.includes(key)) return;
  state.equippedAxe = key;
  dbSaveMeta();
  renderItemCards();
  renderAxeStrip();
  updateStatStrip();
}

function craftEquip(key) {
  const item = EQUIPS[key];
  if (!item || state.ownedEquips.includes(key)) return;
  const requirements = discountedRecipeRequirements(item.requires);
  for (const req of requirements) {
    if (getOwnedCount(req.area, req.name, req.variant) < req.amount) return;
  }
  const consumableRequirements = discountedRecipeRequirements(item.requiresConsumables || []);
  if (consumableRequirements.length) {
    for (const creq of consumableRequirements) {
      if (getConsumableCount(creq.key) < creq.amount) return;
    }
  }
  for (const req of requirements) {
    const k = invKey(req.area, req.name, req.variant || null);
    state.inventory[k].count -= req.amount;
    dbSaveInvItem(state.inventory[k]);
  }
  if (consumableRequirements.length) {
    for (const creq of consumableRequirements) {
      state.consumables[creq.key] -= creq.amount;
    }
  }
  state.ownedEquips.push(key);
  state.equippedItem = key;
  dbSaveMeta();
  renderEquipCards();
  renderConsumableCards();
  renderInventory();
  renderAxeStrip();
  updateStatStrip();
}

function equipItem(key) {
  if (!state.ownedEquips.includes(key)) return;
  state.equippedItem = state.equippedItem === key ? null : key;
  dbSaveMeta();
  renderEquipCards();
  renderAxeStrip();
  updateStatStrip();
}

function unequipItem() {
  state.equippedItem = null;
  dbSaveMeta();
  renderEquipCards();
  renderAxeStrip();
  updateStatStrip();
}

function renderConsumableCards() {
  const el = document.getElementById("consumableCards");
  if (!el) return;
  const openSubAccordions = new Set([ ...el.querySelectorAll(".sub-acc-item.open[data-sub-acc]") ].map(item => item.dataset.subAcc));
  const now = Date.now();
  el.innerHTML = CONSUMABLE_ORDER.map(key => {
    const item = CONSUMABLES[key];
    const count = getConsumableCount(key);
    const isPinned = state.pinnedRecipe && state.pinnedRecipe.kind === "consumable" && state.pinnedRecipe.key === key;
    const craftAmount = getConsumableCraftAmount();
    const requirements = consumableRequirements(key, craftAmount);
    let canCraft = !(item.maxOwned != null && count + craftAmount > item.maxOwned);
    const reqHtml = requirements.map(req => {
      const have = getReqOwnedCount(req);
      const ok = have >= req.amount;
      if (!ok) canCraft = false;
      const label = req.consumable ? CONSUMABLES[req.consumable].name : req.name;
      return `<div class="req-row ${ok ? "ok" : "short"}">${label} <span>${have.toLocaleString()} / ${req.amount.toLocaleString()}</span></div>`;
    }).join("");
    let statusHtml = "";
    if (key === "pushpin" && state.activeBuffs && state.activeBuffs.pushpin) {
      statusHtml = `<div class="buff-active">⚡ Active: ${state.activeBuffs.pushpin.rollsLeft.toLocaleString()} clicks left</div>`;
    }
    if (key === "gloves" && state.activeBuffs && state.activeBuffs.gloves) {
      statusHtml = `<div class="buff-active">⚡ Active: ${state.activeBuffs.gloves.rollsLeft.toLocaleString()} clicks left</div>`;
    }
    if (key === "bomb") {
      if (state.bombCharge) {
        const msLeft = state.bombCharge.chargingUntil - now;
        if (state.bombCharge.detonating) {
          statusHtml = `<div class="buff-active">💥 Detonating…</div>`;
        } else if (msLeft > 0) {
          statusHtml = `<div class="buff-active">⏳ Charging: ${fmtDuration(Math.ceil(msLeft / 1e3))} left</div>`;
        } else {
          statusHtml = `<div class="buff-active ready">💥 READY — trigger to fire!</div>`;
        }
      }
    }
    if (key === "nullbomb") {
      if (state.nullBombCharge) {
        const msLeft = state.nullBombCharge.chargingUntil - now;
        if (state.nullBombCharge.detonating) {
          const pct = Math.floor((state.nullBombCharge.progress || 0) * 100);
          statusHtml = `<div class="buff-active">💣 Detonating… ${pct}%</div>`;
        } else if (msLeft > 0) {
          statusHtml = `<div class="buff-active">⏳ Charging: ${fmtDuration(Math.ceil(msLeft / 1e3))} left</div>`;
        } else {
          statusHtml = `<div class="buff-active ready">💣 READY — trigger to fire!</div>`;
        }
      }
    }
    if (key === "watergun") {
      const activeStacks = wgunActiveStacks();
      if (activeStacks > 0) {
        const stackLines = state.wgunStacks.map((s, i) => {
          const msLeft = s.expiresAt - now;
          return `<div>Stack ${i + 1}: ${fmtDuration(Math.ceil(msLeft / 1e3))} left</div>`;
        }).join("");
        const curMult = Math.min(1 + activeStacks * upgradedWatergunStackMult(), upgradedWatergunCapMult());
        statusHtml = `<div class="buff-active">💧 ${activeStacks}/3 stacks active · ×${curMult.toFixed(1)} rps<br>${stackLines}</div>`;
      }
    }
    if (key === "errredirector" && isErrRedirectorActive()) {
      const msLeft = state.errRedirectorUntil - now;
      statusHtml = `<div class="buff-active">📡 404 static cleared — ${fmtDuration(Math.ceil(msLeft / 1e3))} left</div>`;
    }
    if (key === "stablizer" && isStablizerActive()) {
      statusHtml = `<div class="buff-active">⚠ Perilous danger ×2 slower — ${fmtDuration(Math.ceil((state.stablizerUntil - now) / 1e3))} left</div>`;
    }
    if (key === "doublinator") {
      if (isDoublinatorActive()) {
        statusHtml = `<div class="buff-active">×2 bulk · ×2 luck · ×2 rps — ${fmtDuration(Math.ceil((state.doublinatorUntil - now) / 1e3))} left</div>`;
      } else if (isDoublinatorCoolingDown()) {
        statusHtml = `<div class="buff-active ready">⏳ Cooldown: ${fmtDuration(Math.ceil((state.doublinatorCooldownUntil - now) / 1e3))} left</div>`;
      }
    }
    if (key === "boiconsumable") {
      const uses = boiConsumableUses();
      statusHtml = `<div class="buff-active">Boi uses: ${uses.toLocaleString()} · permanent luck ×${boiConsumableLuckMult().toFixed(1)} · next recipe ×${(1 + uses).toLocaleString()}</div>`;
    }
    if (item.instantRollBatch && state.instantConsumableBatch && state.instantConsumableBatch.key === key) {
      const pct = Math.floor((state.instantConsumableBatch.progress || 0) * 100);
      statusHtml = `<div class="buff-active">⚙️ Rolling… ${pct}%</div>`;
    }
    let actionHtml = "";
    if (key === "bomb" && state.bombCharge) {
      const msLeft = state.bombCharge.chargingUntil - now;
      if (state.bombCharge.detonating) {
        actionHtml = `<button class="btn small secondary" disabled>Detonating…</button>`;
      } else if (msLeft <= 0) {
        actionHtml = `<button class="btn small" data-trigger-bomb="1">💥 Trigger</button>`;
      } else {
        actionHtml = `<button class="btn small secondary" disabled>Charging…</button>`;
      }
    } else if (key === "nullbomb" && state.nullBombCharge) {
      const msLeft = state.nullBombCharge.chargingUntil - now;
      if (state.nullBombCharge.detonating) {
        actionHtml = `<button class="btn small secondary" disabled>Detonating…</button>`;
      } else if (msLeft <= 0) {
        actionHtml = `<button class="btn small" data-trigger-nullbomb="1">💣 Trigger</button>`;
      } else {
        actionHtml = `<button class="btn small secondary" disabled>Charging…</button>`;
      }
    } else if (key === "watergun") {
      const activeStacks = wgunActiveStacks();
      const atCap = activeStacks >= CONSUMABLES.watergun.maxStacks;
      const useDisabled = count <= 0 || atCap;
      const useTitle = count <= 0 ? "None owned" : atCap ? "Already at max stacks" : "";
      actionHtml = `\n        <button class="btn small secondary" data-craft-consumable="${key}" ${canCraft ? "" : "disabled"}>Craft ×${craftAmount.toLocaleString()}</button>\n        <button class="btn small ${useDisabled ? "secondary" : ""}" data-use-consumable="${key}" ${useDisabled ? "disabled" : ""} title="${useTitle}">Use${count > 0 ? ` (${count})` : ""}</button>\n      `;
    } else if (key === "errredirector") {
      const useDisabled = count <= 0;
      const useTitle = count <= 0 ? "None owned" : isErrRedirectorActive() ? "Extends the current 12h window" : "";
      actionHtml = `\n        <button class="btn small secondary" data-craft-consumable="${key}" ${canCraft ? "" : "disabled"}>Craft ×${craftAmount.toLocaleString()}</button>\n        <button class="btn small ${useDisabled ? "secondary" : ""}" data-use-consumable="${key}" ${useDisabled ? "disabled" : ""} title="${useTitle}">Use${count > 0 ? ` (${count})` : ""}</button>\n      `;
    } else if (key === "stablizer") {
      const active = isStablizerActive();
      const useDisabled = count <= 0 || active;
      const useTitle = count <= 0 ? "None owned" : active ? "Already active" : "";
      actionHtml = `\n        <button class="btn small secondary" data-craft-consumable="${key}" ${canCraft ? "" : "disabled"}>Craft ×${craftAmount.toLocaleString()}</button>\n        <button class="btn small ${useDisabled ? "secondary" : ""}" data-use-consumable="${key}" ${useDisabled ? "disabled" : ""} title="${useTitle}">Use${count > 0 ? ` (${count})` : ""}</button>\n      `;
    } else if (key === "doublinator") {
      const active = isDoublinatorActive();
      const cooling = isDoublinatorCoolingDown();
      const useDisabled = count <= 0 || active || cooling;
      const useTitle = count <= 0 ? "None owned" : active ? "Already active" : cooling ? "Cooling down" : "";
      actionHtml = `\n        <button class="btn small secondary" data-craft-consumable="${key}" ${canCraft ? "" : "disabled"}>Craft ×${craftAmount.toLocaleString()}</button>\n        <button class="btn small ${useDisabled ? "secondary" : ""}" data-use-consumable="${key}" ${useDisabled ? "disabled" : ""} title="${useTitle}">Use${count > 0 ? ` (${count})` : ""}</button>\n      `;
    } else {
      const needsPinnedRecipe = !item.useWithoutPin;
      const batchInProgress = item.instantRollBatch && state.instantConsumableBatch && state.instantConsumableBatch.key === key;
      const useDisabled = count <= 0 || batchInProgress || needsPinnedRecipe && !state.pinnedRecipe;
      const useTitle = batchInProgress ? "Roll batch in progress" : needsPinnedRecipe && !state.pinnedRecipe ? "Pin a recipe first" : count <= 0 ? "None owned" : "";
      actionHtml = `\n        <button class="btn small secondary" data-craft-consumable="${key}" ${canCraft ? "" : "disabled"}>Craft ×${craftAmount.toLocaleString()}</button>\n        ${key !== "bomb" || !state.bombCharge ? `<button class="btn small ${useDisabled ? "secondary" : ""}" data-use-consumable="${key}" ${useDisabled ? "disabled" : ""} title="${useTitle}">Use${count > 0 ? ` (${count})` : ""}</button>` : ""}\n      `;
    }
    const pinBtn = `<button class="btn small ${isPinned ? "pinned-btn" : "secondary"}" data-pin-consumable="${key}" style="margin-right:6px;">${isPinned ? "📌 Pinned" : "📌 Pin"}</button>`;
    const effectSub = `\n      <div class="sub-acc-item" data-sub-acc="effect-${key}">\n        <div class="sub-acc-head"><span>✦ Effect</span><span class="chev">▾</span></div>\n        <div class="sub-acc-body"><span class="stat" style="color:var(--accent-2);">${ballAdjustedConsumableEffect(item)}</span></div>\n      </div>`;
    const recipeSub = `\n      <div class="sub-acc-item" data-sub-acc="recipe-${key}">\n        <div class="sub-acc-head"><span>📋 Recipe ×${craftAmount.toLocaleString()}${canCraft ? ' <span class="ready-tag">ready</span>' : ""}</span><span class="chev">▾</span></div>\n        <div class="sub-acc-body"><div class="req-list">${reqHtml}</div></div>\n      </div>`;
    return `\n      <div class="item-card ${isPinned ? "pinned-card" : ""}">\n        <div class="ihead">\n          <span class="iname">${item.name}</span>\n          ${count > 0 ? `<span class="badge-owned">×${count}</span>` : ""}\n          ${isPinned ? '<span class="badge-pinned">Pinned</span>' : ""}\n        </div>\n        <div class="idesc">${item.desc}</div>\n        ${statusHtml}\n        ${effectSub}\n        ${recipeSub}\n        <div style="text-align:right; margin-top:10px;">${pinBtn}${actionHtml}</div>\n      </div>\n    `;
  }).join("");
  setupSubAccordions(el);
  el.querySelectorAll(".sub-acc-item[data-sub-acc]").forEach(item => {
    if (openSubAccordions.has(item.dataset.subAcc)) item.classList.add("open");
  });
  el.querySelectorAll("[data-craft-consumable]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      craftConsumable(btn.dataset.craftConsumable, getConsumableCraftAmount());
    });
  });
  el.querySelectorAll("[data-use-consumable]").forEach(btn => {
    setupConsumableUseHold(btn);
  });
  el.querySelectorAll("[data-trigger-bomb]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      triggerBomb();
    });
  });
  el.querySelectorAll("[data-trigger-nullbomb]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      triggerNullBomb();
    });
  });
  el.querySelectorAll("[data-pin-consumable]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const k = btn.dataset.pinConsumable;
      if (state.pinnedRecipe && state.pinnedRecipe.kind === "consumable" && state.pinnedRecipe.key === k) {
        clearPinnedRecipe();
      } else {
        setPinnedRecipe("consumable", k);
      }
      renderItemCards();
      renderConsumableCards();
      buildIndexAccordion();
    });
  });
}

function getConsumableCount(key) {
  return state.consumables && state.consumables[key] || 0;
}

function wgunActiveStacks() {
  if (!state.wgunStacks) return 0;
  const now = Date.now();
  state.wgunStacks = state.wgunStacks.filter(s => s.expiresAt > now);
  return state.wgunStacks.length;
}

function coinBagActiveStacks() {
  if (!state.coinBagStacks) return 0;
  const now = Date.now();
  state.coinBagStacks = state.coinBagStacks.filter(s => s.expiresAt > now);
  return state.coinBagStacks.length;
}

function coinBagBonus() {
  const stacks = coinBagActiveStacks();
  if (stacks === 0) return {
    luckAddPct: 0,
    mutationLuckAdd: 0
  };
  return {
    luckAddPct: Math.min(stacks * 5, 125),
    mutationLuckAdd: Math.min(stacks * .1, 1.5)
  };
}

function effectiveRps() {
  const base = currentAxe().stats.rps;
  const stacks = wgunActiveStacks();
  const wgunMult = stacks === 0 ? 1 : Math.min(1 + stacks * upgradedWatergunStackMult(), upgradedWatergunCapMult());
  const equip = currentEquip();
  const equipMult = equip && equip.rpsMult != null ? equip.rpsMult : 1;
  const idleEffMult = equip && equip.idleEfficiencyMult ? equip.idleEfficiencyMult : 1;
  const doublinatorMult = isDoublinatorActive() ? 2 : 1;
  return base * wgunMult * equipMult * idleEffMult * doublinatorMult * offlineTickspeedMultiplier();
}

function irritationMultiplier(axe, idleSeconds) {
  if (!axe.irritation) return 1;
  const fullDaysIdle = Math.floor(idleSeconds / 86400);
  if (fullDaysIdle <= 0) return 1;
  return 1 + axe.irritation.perDayPct / 100 * fullDaysIdle;
}

function craftConsumable(key, quantity = 1) {
  const item = CONSUMABLES[key];
  if (!item) return false;
  const craftQuantity = Math.max(1, Math.min(Math.floor(Number(quantity) || 1), 1e6));
  if (item.maxOwned != null && getConsumableCount(key) + craftQuantity > item.maxOwned) {
    alertUser(`You can only own ${item.maxOwned} ${item.name} at a time.`);
    return false;
  }
  const requirements = consumableRequirements(key, craftQuantity);
  for (const req of requirements) {
    if (getReqOwnedCount(req) < req.amount) return false;
  }
  for (const req of requirements) {
    if (req.consumable) {
      state.consumables[req.consumable] -= req.amount;
    } else {
      const k = invKey(req.area, req.name, req.variant || null);
      state.inventory[k].count -= req.amount;
      dbSaveInvItem(state.inventory[k]);
    }
  }
  if (!state.consumables) state.consumables = {};
  state.consumables[key] = (state.consumables[key] || 0) + craftQuantity;
  dbSaveMeta();
  renderConsumableCards();
  renderInventory();
  return true;
}

const CONSUMABLE_HOLD_DELAY_MS = 1500;

const CONSUMABLE_HOLD_INTERVAL_MS = 25;

let activeConsumableUseHold = null;

let consumableUseHoldDocumentBound = false;

function useConsumableMany(key, quantity) {
  const requested = Math.max(1, Math.floor(Number(quantity) || 1));
  let used = 0;
  for (let i = 0; i < requested; i++) {
    const before = getConsumableCount(key);
    if (before <= 0 || !useConsumable(key, {
      silent: true
    })) break;
    if (getConsumableCount(key) >= before) break;
    used++;
  }
  if (used > 0) {
    dbSaveMeta();
    renderConsumableCards();
    renderInventory();
    renderAxeStrip();
    updateStatStrip();
  }
  return used;
}

function clearConsumableUseHold(cancelled = false) {
  const hold = activeConsumableUseHold;
  if (!hold) return;
  if (hold.delayTimer) clearTimeout(hold.delayTimer);
  if (hold.repeatTimer) clearInterval(hold.repeatTimer);
  activeConsumableUseHold = null;
  if (!cancelled && !hold.repeating) useConsumable(hold.key);
}

function startConsumableUseHold(key) {
  if (getConsumableCount(key) <= 0) return;
  clearConsumableUseHold(true);
  const hold = {
    key: key,
    startingOwned: getConsumableCount(key),
    repeating: false,
    delayTimer: null,
    repeatTimer: null
  };
  activeConsumableUseHold = hold;
  hold.delayTimer = setTimeout(() => {
    if (activeConsumableUseHold !== hold) return;
    hold.repeating = true;
    const perTick = Math.max(1, Math.floor(hold.startingOwned * .01));
    const useHeldBatch = () => {
      if (activeConsumableUseHold !== hold) return;
      if (useConsumableMany(hold.key, perTick) <= 0) clearConsumableUseHold(true);
    };
    useHeldBatch();
    if (activeConsumableUseHold === hold) {
      hold.repeatTimer = setInterval(useHeldBatch, CONSUMABLE_HOLD_INTERVAL_MS);
    }
  }, CONSUMABLE_HOLD_DELAY_MS);
}

function setupConsumableUseHold(button) {
  if (button.dataset.holdReady) return;
  button.dataset.holdReady = "1";
  button.style.touchAction = "manipulation";
  button.addEventListener("pointerdown", event => {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    startConsumableUseHold(button.dataset.useConsumable);
  });
  button.addEventListener("click", event => {
    if (event.detail === 0) {
      event.preventDefault();
      useConsumable(button.dataset.useConsumable);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  });
  if (!consumableUseHoldDocumentBound) {
    consumableUseHoldDocumentBound = true;
    document.addEventListener("pointerup", () => clearConsumableUseHold(false));
    document.addEventListener("pointercancel", () => clearConsumableUseHold(true));
  }
}

function useConsumable(key, options = {}) {
  const silent = !!options.silent;
  const refreshCards = () => {
    if (!silent) renderConsumableCards();
  };
  const refreshInventory = () => {
    if (!silent) renderInventory();
  };
  const refreshStats = () => {
    if (!silent) {
      renderAxeStrip();
      updateStatStrip();
    }
  };
  const deny = msg => {
    if (!silent && msg) alertUser(msg);
    return false;
  };
  if (getConsumableCount(key) <= 0) return false;
  if (rouletteNoConsumables()) return deny("Consumables are blocked by this Roulette run's curse.");
  if (key === "watergun") {
    if (!state.wgunStacks) state.wgunStacks = [];
    const now = Date.now();
    state.wgunStacks = state.wgunStacks.filter(s => s.expiresAt > now);
    if (state.wgunStacks.length >= CONSUMABLES.watergun.maxStacks) {
      return deny(`Already at max watergun stacks (×${upgradedWatergunCapMult().toFixed(1)})! Wait for one to expire first.`);
    }
    state.consumables.watergun--;
    state.wgunStacks.push({
      expiresAt: now + watergunStackDurationSeconds() * 1e3
    });
    dbSaveMeta();
    refreshCards();
    refreshStats();
    return true;
  }
  if (key === "errredirector") {
    state.consumables.errredirector--;
    const now = Date.now();
    const base = isErrRedirectorActive() ? state.errRedirectorUntil : now;
    state.errRedirectorUntil = base + CONSUMABLES.errredirector.durationSeconds * 1e3;
    dbSaveMeta();
    refreshCards();
    refreshInventory();
    return true;
  }
  if (key === "stablizer") {
    const now = Date.now();
    if (isStablizerActive()) return deny("Stablizer is already active. Only one can be active at a time.");
    state.consumables.stablizer--;
    state.stablizerUntil = now + CONSUMABLES.stablizer.durationSeconds * 1e3;
    dbSaveMeta();
    refreshCards();
    updatePerilousPresentation();
    return true;
  }
  if (key === "doublinator") {
    const now = Date.now();
    if (isDoublinatorActive()) return deny("Doublinator is already active. Only one can be active at a time.");
    if (isDoublinatorCoolingDown()) return deny(`Doublinator is cooling down for ${fmtDuration(Math.ceil((state.doublinatorCooldownUntil - now) / 1e3))}.`);
    state.consumables.doublinator--;
    state.doublinatorUntil = now + CONSUMABLES.doublinator.durationSeconds * 1e3;
    state.doublinatorCooldownUntil = state.doublinatorUntil + CONSUMABLES.doublinator.cooldownSeconds * 1e3;
    dbSaveMeta();
    refreshCards();
    refreshStats();
    return true;
  }
  if (key === "boiconsumable") {
    state.consumables.boiconsumable--;
    state.boiConsumableUses = boiConsumableUses() + 1;
    dbSaveMeta();
    refreshCards();
    refreshStats();
    return true;
  }
  if (CONSUMABLES[key] && CONSUMABLES[key].instantRollBatch) {
    if (silent) return false;
    triggerInstantConsumableBatch(key);
    return true;
  }
  if (key === "nullbomb") {
    if (state.nullBombCharge) return deny("null_bomb is already charging — only one can charge at a time.");
    state.consumables.nullbomb--;
    state.nullBombCharge = {
      chargingUntil: Date.now() + CONSUMABLES.nullbomb.chargeSeconds * 1e3
    };
    dbSaveMeta();
    refreshCards();
    return true;
  }
  if (!state.pinnedRecipe) return deny("Pin a recipe first — this only works on your pinned axe or consumable.");
  if (key === "pushpin" || key === "gloves") {
    const target = rarestUnfinishedMaterial();
    if (!target) return deny("Your pinned recipe has nothing left to gather — no target to boost.");
    state.consumables[key]--;
    if (!state.activeBuffs) state.activeBuffs = {};
    const existingClicksLeft = state.activeBuffs[key] && state.activeBuffs[key].rollsLeft || 0;
    state.activeBuffs[key] = {
      rollsLeft: existingClicksLeft + CONSUMABLES[key].duration
    };
    dbSaveMeta();
    refreshCards();
    return true;
  }
  if (key === "bomb") {
    if (state.bombCharge) return deny("The bomb is already armed — only one can charge at a time.");
    state.consumables.bomb--;
    const equip = currentEquip();
    const chargeSpeedMult = ballAdjustedAxenadesScalar(equip, equip && equip.bombChargeSpeedMult ? equip.bombChargeSpeedMult : 1);
    const bombCfg = ballAdjustedConsumableConfig("bomb");
    state.bombCharge = {
      chargingUntil: Date.now() + bombCfg.chargeSeconds * 1e3 / chargeSpeedMult
    };
    dbSaveMeta();
    refreshCards();
    return true;
  }
  return false;
}

function alertUser(msg) {
  const el = document.getElementById("offlineBanner");
  if (!el) {
    console.log(msg);
    return;
  }
  el.innerHTML = `<div class="offline-banner"><p>${escapeHtml(msg)}</p><button class="btn small" id="dismissOffline">Got it</button></div>`;
  document.getElementById("dismissOffline").addEventListener("click", () => {
    el.innerHTML = "";
  });
}

const DETONATION_CHUNK_BUDGET_MS = 8;

function triggerBomb() {
  if (!state.bombCharge) return;
  if (Date.now() < state.bombCharge.chargingUntil) return;
  if (state.bombCharge.detonating) return;
  state.bombCharge.detonating = true;
  renderConsumableCards();
  const world = WORLDS[state.worldIdx];
  const area = world.areas[state.areaIdx];
  const equip = currentEquip();
  const cfg = ballAdjustedConsumableConfig("bomb");
  const bombEffMult = ballAdjustedAxenadesScalar(equip, equip && equip.bombEfficiencyMult ? equip.bombEfficiencyMult : 1);
  const bombRollCount = Math.round(cfg.rollCount * bombEffMult);
  const extraBatch = ballAdjustedAxenadesTriggerBonus(equip);
  const totalPlanned = bombRollCount + (extraBatch ? extraBatch.rolls : 0);
  let best = null;
  const counts = {};
  let totalRollsFired = 0;
  let i = 0;
  function fireOne() {
    const inExtra = i >= bombRollCount;
    const r = inExtra ? rollOnceForArea(world, area, extraBatch.luckMult, {
      mutationLuckMult: extraBatch.mutationLuckMult || 1,
      isBomb: true
    }) : rollOnceForArea(world, area, cfg.luckMult, {
      mutationLuckMult: cfg.mutationLuckMult,
      isBomb: true
    });
    const k = invKey(r.areaLabel, r.name, r.variant ? r.variant.key : null);
    if (!counts[k]) counts[k] = {
      result: r,
      count: 0
    };
    counts[k].count++;
    totalRollsFired++;
    if (!best || r.finalRng > best.finalRng) best = r;
    i++;
  }
  function processChunk() {
    const chunkStart = performance.now();
    while (i < totalPlanned && performance.now() - chunkStart < DETONATION_CHUNK_BUDGET_MS) {
      fireOne();
    }
    if (i < totalPlanned) {
      requestAnimationFrame(processChunk);
      return;
    }
    for (const k in counts) {
      addToInventory(counts[k].result, counts[k].count);
    }
    state.rolls += totalRollsFired;
    state.bombCharge = null;
    if (best) {
      pushLog(best);
      renderStage(best, totalRollsFired);
      if (!state.best || best.finalRng > state.best.finalRng) state.best = best;
    }
    renderInventory();
    refreshLiveViews();
    updateStatStrip();
    renderConsumableCards();
    dbSaveMeta();
  }
  processChunk();
}

function triggerInstantConsumableBatch(key) {
  const cfg = ballAdjustedConsumableConfig(key);
  if (!cfg || !cfg.instantRollBatch || getConsumableCount(key) <= 0) return;
  if (state.instantConsumableBatch) {
    alertUser("A consumable roll batch is already in progress.");
    return;
  }
  state.consumables[key]--;
  state.instantConsumableBatch = {
    key: key,
    progress: 0
  };
  dbSaveMeta();
  renderConsumableCards();
  const world = WORLDS[state.worldIdx];
  const area = world.areas[state.areaIdx];
  const totalPlanned = cfg.rollCount;
  let best = null;
  const counts = {};
  let totalRollsFired = 0;
  let i = 0;
  let lastUiUpdate = 0;
  function processChunk() {
    const chunkStart = performance.now();
    while (i < totalPlanned && performance.now() - chunkStart < DETONATION_CHUNK_BUDGET_MS) {
      const r = rollOnceForArea(world, area, cfg.luckMult, {
        mutationLuckMult: cfg.mutationLuckMult || 1,
        isBomb: true,
        isJuniSwing: key === "juniaxeswing"
      });
      const inv = invKey(r.areaLabel, r.name, r.variant ? r.variant.key : null);
      if (!counts[inv]) counts[inv] = {
        result: r,
        count: 0
      };
      counts[inv].count++;
      totalRollsFired++;
      if (!best || r.finalRng > best.finalRng) best = r;
      i++;
    }
    if (i < totalPlanned) {
      const now = performance.now();
      if (now - lastUiUpdate > 200) {
        state.instantConsumableBatch.progress = i / totalPlanned;
        renderConsumableCards();
        lastUiUpdate = now;
      }
      requestAnimationFrame(processChunk);
      return;
    }
    for (const inv in counts) addToInventory(counts[inv].result, counts[inv].count);
    state.rolls += totalRollsFired;
    state.instantConsumableBatch = null;
    if (best) {
      pushLog(best);
      renderStage(best, totalRollsFired);
      if (!state.best || best.finalRng > state.best.finalRng) state.best = best;
    }
    renderInventory();
    refreshLiveViews();
    updateStatStrip();
    renderConsumableCards();
    dbSaveMeta();
  }
  processChunk();
}

function triggerNullBomb() {
  if (!state.nullBombCharge) return;
  if (Date.now() < state.nullBombCharge.chargingUntil) return;
  if (state.nullBombCharge.detonating) return;
  const world = WORLDS[state.worldIdx];
  const area = world.areas[state.areaIdx];
  const cfg = ballAdjustedConsumableConfig("nullbomb");
  const totalPlanned = cfg.rollCount;
  state.nullBombCharge.detonating = true;
  state.nullBombCharge.progress = 0;
  renderConsumableCards();
  let best = null;
  const counts = {};
  let totalRollsFired = 0;
  let i = 0;
  let lastUiUpdate = 0;
  function processChunk() {
    const chunkStart = performance.now();
    while (i < totalPlanned && performance.now() - chunkStart < DETONATION_CHUNK_BUDGET_MS) {
      const r = rollOnceForArea(world, area, cfg.luckMult, {
        mutationLuckMult: cfg.mutationLuckMult,
        isBomb: true
      });
      const k = invKey(r.areaLabel, r.name, r.variant ? r.variant.key : null);
      if (!counts[k]) counts[k] = {
        result: r,
        count: 0
      };
      counts[k].count++;
      totalRollsFired++;
      if (!best || r.finalRng > best.finalRng) best = r;
      i++;
    }
    if (i < totalPlanned) {
      const now = performance.now();
      if (now - lastUiUpdate > 200) {
        state.nullBombCharge.progress = i / totalPlanned;
        renderConsumableCards();
        lastUiUpdate = now;
      }
      requestAnimationFrame(processChunk);
      return;
    }
    for (const k in counts) {
      addToInventory(counts[k].result, counts[k].count);
    }
    state.rolls += totalRollsFired;
    state.nullBombCharge = null;
    if (best) {
      pushLog(best);
      renderStage(best, totalRollsFired);
      if (!state.best || best.finalRng > state.best.finalRng) state.best = best;
    }
    renderInventory();
    refreshLiveViews();
    updateStatStrip();
    renderConsumableCards();
    dbSaveMeta();
  }
  processChunk();
}

function normalizeBallState() {
  const sourceCounts = state.balls && typeof state.balls === "object" ? state.balls : {};
  state.balls = blankBallCounts();
  for (const ball of BALL_DEFS) {
    state.balls[ball.key] = Math.max(0, Math.floor(Number(sourceCounts[ball.key]) || 0));
  }
  const rawSpawned = Array.isArray(state.spawnedBalls) ? state.spawnedBalls : [];
  state.spawnedBalls = rawSpawned.filter(ball => ball && BALL_BY_KEY[ball.key] && Number.isFinite(Number(ball.expiresAt))).map(ball => ({
    id: String(ball.id || `ball-${Math.random().toString(36).slice(2)}`),
    key: ball.key,
    expiresAt: Number(ball.expiresAt)
  }));
  const sourceUpgrades = state.ballUpgrades && typeof state.ballUpgrades === "object" ? state.ballUpgrades : {};
  state.ballUpgrades = {
    showAutorollTimer: !!sourceUpgrades.showAutorollTimer,
    showPerfectTime: !!sourceUpgrades.showPerfectTime,
    autoPushpin: !!sourceUpgrades.autoPushpin,
    autoGloves: !!sourceUpgrades.autoGloves,
    upgradedGloves: !!sourceUpgrades.upgradedGloves,
    upgradedPushpin: !!sourceUpgrades.upgradedPushpin,
    upgradedBombs: !!sourceUpgrades.upgradedBombs,
    sentientWaterhose: !!sourceUpgrades.sentientWaterhose,
    unlockJuniAxe: !!sourceUpgrades.unlockJuniAxe,
    roulette: !!sourceUpgrades.roulette,
    miningLorebook: !!sourceUpgrades.miningLorebook,
    manualAutoroll: Math.min(BALL_UPGRADE_LIMITS.manualAutoroll, Math.max(0, Math.floor(Number(sourceUpgrades.manualAutoroll) || 0))),
    discount: Math.min(BALL_UPGRADE_LIMITS.discount, Math.max(0, Math.floor(Number(sourceUpgrades.discount) || 0))),
    doubleChance: Math.min(BALL_UPGRADE_LIMITS.doubleChance, Math.max(0, Math.floor(Number(sourceUpgrades.doubleChance) || 0))),
    offlineTickspeed: Math.min(BALL_UPGRADE_LIMITS.offlineTickspeed, Math.max(0, Math.floor(Number(sourceUpgrades.offlineTickspeed) || 0))),
    expoballs: Math.min(BALL_UPGRADE_LIMITS.expoballs, Math.max(0, Math.floor(Number(sourceUpgrades.expoballs) || 0))),
    holdToClick: Math.min(BALL_UPGRADE_LIMITS.holdToClick, Math.max(0, Math.floor(Number(sourceUpgrades.holdToClick) || 0))),
    moreWatergun: Math.min(BALL_UPGRADE_LIMITS.moreWatergun, Math.max(0, Math.floor(Number(sourceUpgrades.moreWatergun) || 0)))
  };
  const sourceAutoUse = state.ballAutoUse && typeof state.ballAutoUse === "object" ? state.ballAutoUse : {};
  state.ballAutoUse = {
    pushpin: !!sourceAutoUse.pushpin && state.ballUpgrades.autoPushpin,
    gloves: !!sourceAutoUse.gloves && state.ballUpgrades.autoGloves,
    holdToClick: !!sourceAutoUse.holdToClick && state.ballUpgrades.holdToClick > 0
  };
}

function ballUpgradeLevel(key) {
  return Math.max(0, Math.floor(Number(state.ballUpgrades && state.ballUpgrades[key]) || 0));
}

function hasBallUpgrade(key) {
  return !!(state.ballUpgrades && state.ballUpgrades[key]);
}

function manualAutorollMultiplier() {
  return 1 + ballUpgradeLevel("manualAutoroll") * .1;
}

function offlineTickspeedMultiplier() {
  return 1 + ballUpgradeLevel("offlineTickspeed") * .2;
}

function expoballsLuckExponent() {
  return 1 + ballUpgradeLevel("expoballs") * .0125;
}

const HOLD_TO_CLICK_INTERVALS_MS = [ 1e3, 750, 660, 500, 1e3 / 3, 250 ];

function holdToClickIntervalMs() {
  return HOLD_TO_CLICK_INTERVALS_MS[Math.min(BALL_UPGRADE_LIMITS.holdToClick, ballUpgradeLevel("holdToClick"))];
}

function formatHoldClickInterval(ms) {
  if (ms === 250) return "1 click every 1/4s";
  if (Math.abs(ms - 1e3 / 3) < 1) return "1 click every 1/3s";
  if (ms === 500) return "1 click every 0.5s";
  if (ms === 660) return "1 click every 0.66s";
  if (ms === 750) return "1 click every 0.75s";
  return "1 click every 1s";
}

function tryAutoUseRecipeConsumables() {
  if (!state.pinnedRecipe || !allUnfinishedMaterials().length) return;
  if (state.ballAutoUse && state.ballAutoUse.pushpin && !state.activeBuffs?.pushpin && getConsumableCount("pushpin") > 0) {
    useConsumable("pushpin", {
      silent: true
    });
  }
  if (state.ballAutoUse && state.ballAutoUse.gloves && !state.activeBuffs?.gloves && getConsumableCount("gloves") > 0) {
    useConsumable("gloves", {
      silent: true
    });
  }
}

function upgradedWatergunStackMult() {
  return hasBallUpgrade("sentientWaterhose") ? 1 : CONSUMABLES.watergun.stackMult;
}

function upgradedWatergunCapMult() {
  return 1 + CONSUMABLES.watergun.maxStacks * upgradedWatergunStackMult();
}

function watergunStackDurationSeconds() {
  return CONSUMABLES.watergun.durationSeconds + ballUpgradeLevel("moreWatergun") * 3600;
}

function ballAdjustedConsumableConfig(key) {
  const cfg = CONSUMABLES[key];
  if (!cfg || !hasBallUpgrade("upgradedBombs")) return cfg;
  if (key === "bomb") return {
    ...cfg,
    chargeSeconds: 15 * 60,
    rollCount: 125e4,
    luckMult: 100,
    mutationLuckMult: 5
  };
  if (key === "nukinamachina") return {
    ...cfg,
    rollCount: 5e6,
    luckMult: 150,
    mutationLuckMult: 10
  };
  if (key === "nullbomb") return {
    ...cfg,
    rollCount: 404e5,
    luckMult: 404,
    mutationLuckMult: 4.04
  };
  return cfg;
}

function ballAdjustedAxenadesScalar(equip, value) {
  return equip && equip.key === "axenades" && hasBallUpgrade("upgradedBombs") ? value * 2 : value;
}

function ballAdjustedAxenadesRules(equip, field) {
  if (!equip || equip.key !== "axenades" || !hasBallUpgrade("upgradedBombs")) return equip && equip[field];
  const rules = equip[field] ? Array.isArray(equip[field]) ? equip[field] : [ equip[field] ] : [];
  return rules.map(rule => ({
    ...rule,
    rolls: rule.rolls != null ? rule.rolls * 2 : rule.rolls,
    minRolls: rule.minRolls != null ? rule.minRolls * 2 : rule.minRolls,
    maxRolls: rule.maxRolls != null ? rule.maxRolls * 2 : rule.maxRolls,
    bonusRolls: rule.bonusRolls != null ? rule.bonusRolls * 2 : rule.bonusRolls,
    luckMult: rule.luckMult != null ? rule.luckMult * 2 : rule.luckMult,
    bonusLuckMult: rule.bonusLuckMult != null ? rule.bonusLuckMult * 2 : rule.bonusLuckMult,
    mutationLuckMult: rule.mutationLuckMult != null ? rule.mutationLuckMult * 2 : rule.mutationLuckMult
  }));
}

function ballAdjustedAxenadesTriggerBonus(equip) {
  if (!equip || !equip.bombTriggerBonus) return null;
  const bonus = equip.bombTriggerBonus;
  if (equip.key !== "axenades" || !hasBallUpgrade("upgradedBombs")) return bonus;
  return {
    ...bonus,
    rolls: bonus.rolls * 2,
    luckMult: bonus.luckMult * 2,
    mutationLuckMult: bonus.mutationLuckMult * 2
  };
}

function pruneExpiredBalls(now = Date.now()) {
  if (!Array.isArray(state.spawnedBalls)) {
    state.spawnedBalls = [];
    return false;
  }
  const before = state.spawnedBalls.length;
  state.spawnedBalls = state.spawnedBalls.filter(ball => ball && BALL_BY_KEY[ball.key] && ball.expiresAt > now);
  return state.spawnedBalls.length !== before;
}

function updateBallsNavDot() {
  const dot = document.getElementById("ballsNavDot");
  if (dot) dot.hidden = !state.spawnedBalls || state.spawnedBalls.length === 0;
}

function makeSpawnedBall(key) {
  return {
    id: `ball-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    key: key,
    expiresAt: Date.now() + BALL_LIFETIME_MS
  };
}

function trySpawnBallsFromPlayerClick() {
  normalizeBallState();
  const expired = pruneExpiredBalls();
  if (expired) {
    updateBallsNavDot();
    dbSaveMeta();
  }
  const spawned = [];
  const duplicateChance = ballUpgradeLevel("doubleChance") / 100;
  for (const ball of BALL_DEFS) {
    if (Math.random() >= ball.chance) continue;
    spawned.push(makeSpawnedBall(ball.key));
    if (duplicateChance > 0 && Math.random() < duplicateChance) {
      spawned.push(makeSpawnedBall(ball.key));
    }
  }
  if (!spawned.length) return [];
  state.spawnedBalls.push(...spawned);
  updateBallsNavDot();
  if (currentView === "balls") renderBallsView();
  dbSaveMeta();
  return spawned;
}

function collectSpawnedBall(id) {
  normalizeBallState();
  const index = state.spawnedBalls.findIndex(ball => ball.id === id && ball.expiresAt > Date.now());
  if (index < 0) {
    renderBallsView();
    return false;
  }
  const [ball] = state.spawnedBalls.splice(index, 1);
  state.balls[ball.key] = (state.balls[ball.key] || 0) + 1;
  updateBallsNavDot();
  dbSaveMeta();
  renderBallsView();
  return true;
}

function ballCostHtml(cost) {
  return Object.entries(cost).map(([key, amount]) => {
    const ball = BALL_BY_KEY[key];
    if (!ball) return "";
    return `<span class="ball-cost"><img src="${ball.asset}" alt="">${amount.toLocaleString()} ${escapeHtml(ball.label)}</span>`;
  }).join("");
}

const BALL_UPGRADES = [ {
  key: "showAutorollTimer",
  title: "Show timer on autoroll sphere",
  cost: {
    yellow: 3
  },
  desc: "Shows the remaining lifetime on each autoroll sphere."
}, {
  key: "showPerfectTime",
  title: "Show perfect time on autoroll sphere",
  cost: {
    yellow: 10,
    red: 1
  },
  desc: "Shows the sphere’s perfect-time window alongside its timer."
}, {
  key: "autoPushpin",
  title: "Auto use Pushpin option",
  cost: {
    green: 1
  },
  desc: "Unlocks a saved option to automatically use Pushpin for a valid pinned recipe.",
  autoUse: "pushpin"
}, {
  key: "autoGloves",
  title: "Auto use Universal Recipe Gloves option",
  cost: {
    white: 5
  },
  desc: "Unlocks a saved option to automatically use Universal Recipe Gloves for a valid pinned recipe.",
  autoUse: "gloves"
}, {
  key: "upgradedGloves",
  title: "Upgrade Universal Recipe Gloves",
  cost: {
    yellow: 25,
    red: 15
  },
  desc: "Gloves use ×1.5 rarity instead of ×2 and can reach every rank in any area represented in the pinned recipe."
}, {
  key: "upgradedPushpin",
  title: "Upgrade Pushpin",
  cost: {
    green: 10,
    red: 20
  },
  desc: "Pushpin gives ×2.5 luck to the most common unfinished material and ×5 luck to the rarest unfinished material."
}, {
  key: "upgradedBombs",
  title: "Upgrade bomb related items",
  cost: {
    purple: 2,
    white: 50,
    blue: 40
  },
  desc: "improves the bomb related items"
}, {
  key: "sentientWaterhose",
  title: "Sentient waterhose",
  cost: {
    red: 50,
    yellow: 250,
    blue: 25
  },
  desc: "Sentient Watergun gives +1× offline-roll speed per stack instead of +0.5×."
}, {
  key: "moreWatergun",
  title: "MORE WATERGUN idk",
  max: BALL_UPGRADE_LIMITS.moreWatergun,
  costForLevel: level => ({
    pink: 3 + level
  }),
  desc: level => `Level ${level}/7. Each Sentient Watergun stack lasts ${1 + level} hour${level === 1 ? "" : "s"} instead of 1.`
}, {
  key: "manualAutoroll",
  title: "Manual autoroll upgrade",
  max: 10,
  costForLevel: level => ({
    black: level + 1
  }),
  desc: level => `Level ${level}/10. Each level adds +10% sphere appearance speed, sphere duration, and sphere efficiency.`
}, {
  key: "discount",
  title: "Discount",
  max: 10,
  costForLevel: level => ({
    black: level + 1
  }),
  desc: level => `Level ${level}/10. Recipes are ${level}% cheaper; Balls upgrades are excluded.`
}, {
  key: "doubleChance",
  title: "Double chance",
  max: 5,
  costForLevel: level => ({
    black: 2 + level * 2
  }),
  desc: level => `Level ${level}/5. Balls have +${level}% chance to duplicate when they spawn.`
}, {
  key: "offlineTickspeed",
  title: "Offline tickspeed",
  max: 5,
  costForLevel: level => ({
    pink: level + 1
  }),
  desc: level => `Level ${level}/5. Offline roll speed is +${level * 20}%.`
}, {
  key: "expoballs",
  title: "Expoballs",
  max: 5,
  costForLevel: () => ({
    cyan: 5
  }),
  desc: level => `Level ${level}/5. Luck exponent is ^${(1 + level * .0125).toFixed(4)}.`
}, {
  key: "holdToClick",
  title: "Hold to click",
  max: 5,
  costForLevel: () => ({
    pink: 2
  }),
  desc: level => `Level ${level}/5. ${formatHoldClickInterval(HOLD_TO_CLICK_INTERVALS_MS[Math.min(5, level)])}; each level improves held rolling, ending at 1 click every 1/4s.`
}, {
  key: "unlockJuniAxe",
  title: "???",
  cost: {
    black: 5,
    blue: 5,
    cyan: 5,
    green: 5,
    pink: 5,
    purple: 5,
    red: 5,
    white: 5,
    yellow: 5
  },
  desc: "unlocks ???"
}, {
  key: "roulette",
  title: "Roulette",
  requires: [ {
    axe: "nanaxe"
  }, {
    name: "Catastrophe",
    area: "Perilous",
    amount: 20
  }, {
    name: "Armageddon",
    area: "Perilous",
    amount: 12
  }, {
    name: "Incessant",
    area: "Perilous",
    amount: 50
  }, {
    ball: "black",
    amount: 3
  }, {
    name: "Aphanisis",
    area: "Perilous",
    amount: 1
  } ],
  desc: "unlock the machine!"
} ];

const BALL_UPGRADE_BY_KEY = Object.fromEntries(BALL_UPGRADES.map(upgrade => [ upgrade.key, upgrade ]));

function ballUpgradeIsLevelled(upgrade) {
  return !!(upgrade && upgrade.max != null);
}

function ballUpgradeOwned(upgrade) {
  return ballUpgradeIsLevelled(upgrade) ? ballUpgradeLevel(upgrade.key) > 0 : hasBallUpgrade(upgrade.key);
}

function ballUpgradeIsMaxed(upgrade) {
  return ballUpgradeIsLevelled(upgrade) && ballUpgradeLevel(upgrade.key) >= upgrade.max;
}

function ballUpgradeCost(upgrade) {
  if (ballUpgradeIsLevelled(upgrade)) return upgrade.costForLevel(ballUpgradeLevel(upgrade.key));
  return upgrade.cost || {};
}

function canAffordBallCost(cost) {
  return Object.entries(cost).every(([key, amount]) => (state.balls[key] || 0) >= amount);
}

function spendBallCost(cost) {
  for (const [key, amount] of Object.entries(cost)) state.balls[key] -= amount;
}

function ballUpgradeRequirements(upgrade) {
  if (upgrade && Array.isArray(upgrade.requires)) return upgrade.requires;
  return Object.entries(ballUpgradeCost(upgrade)).map(([ball, amount]) => ({
    ball: ball,
    amount: amount
  }));
}

function ballUpgradeRequirementOwned(req) {
  if (req.axe) return state.ownedAxes.includes(req.axe) ? 1 : 0;
  return getReqOwnedCount(req);
}

function canAffordBallUpgrade(upgrade) {
  return ballUpgradeRequirements(upgrade).every(req => ballUpgradeRequirementOwned(req) >= (req.amount || 1));
}

function spendBallUpgradeRequirements(upgrade) {
  for (const req of ballUpgradeRequirements(upgrade)) {
    if (req.axe) continue;
    consumeRequirement(req);
  }
}

function ballUpgradeRequirementsHtml(upgrade) {
  return ballUpgradeRequirements(upgrade).map(req => {
    if (req.axe) {
      const axe = AXES[req.axe];
      const owned = state.ownedAxes.includes(req.axe);
      return `<span class="ball-cost ${owned ? "" : "short"}">${escapeHtml(axe ? axe.name : req.axe)} ${owned ? "✓" : "required"}</span>`;
    }
    if (req.ball) return ballCostHtml({
      [req.ball]: req.amount
    });
    const have = getReqOwnedCount(req);
    return `<span class="ball-cost ${have >= req.amount ? "" : "short"}">${escapeHtml(req.name)} ${have.toLocaleString()} / ${req.amount.toLocaleString()}</span>`;
  }).join("");
}

function purchaseBallUpgrade(key) {
  normalizeBallState();
  const upgrade = BALL_UPGRADE_BY_KEY[key];
  if (!upgrade) return false;
  if (!ballUpgradeIsLevelled(upgrade) && ballUpgradeOwned(upgrade)) return false;
  if (ballUpgradeIsMaxed(upgrade)) return false;
  if (!canAffordBallUpgrade(upgrade)) {
    alertUser("You do not meet this upgrade’s requirements.");
    return false;
  }
  spendBallUpgradeRequirements(upgrade);
  if (ballUpgradeIsLevelled(upgrade)) state.ballUpgrades[key] = ballUpgradeLevel(key) + 1; else state.ballUpgrades[key] = true;
  dbSaveMeta();
  renderBallsView();
  renderSettingsView();
  renderAxeStrip();
  updateStatStrip();
  updateRouletteAvailability();
  if (currentView === "items") refreshLiveViews();
  return true;
}

function setBallAutoUse(key, enabled) {
  if (![ "pushpin", "gloves", "holdToClick" ].includes(key)) return;
  const unlockKey = key === "pushpin" ? "autoPushpin" : key === "gloves" ? "autoGloves" : "holdToClick";
  if (!hasBallUpgrade(unlockKey)) return;
  state.ballAutoUse[key] = !!enabled;
  if (key === "holdToClick" && !enabled) stopHoldToClick();
  dbSaveMeta();
  if (currentView === "balls") renderBallsView();
  renderSettingsView();
}

function renderBallUpgradeCards() {
  const el = document.getElementById("ballUpgradeCards");
  if (!el) return;
  normalizeBallState();
  el.innerHTML = BALL_UPGRADES.map(upgrade => {
    const level = ballUpgradeLevel(upgrade.key);
    const owned = ballUpgradeOwned(upgrade);
    const maxed = ballUpgradeIsMaxed(upgrade);
    const canBuy = !maxed && (!owned || ballUpgradeIsLevelled(upgrade)) && canAffordBallUpgrade(upgrade);
    const desc = typeof upgrade.desc === "function" ? upgrade.desc(level) : upgrade.desc;
    const buttonLabel = maxed ? "Maxed" : !ballUpgradeIsLevelled(upgrade) && owned ? "Owned" : `Buy${ballUpgradeIsLevelled(upgrade) ? ` · ${ballUpgradeLevel(upgrade.key) + 1}/${upgrade.max}` : ""}`;
    const autoToggle = "";
    return `<div class="ball-upgrade-card ${owned ? "owned" : ""}">\n      <h3>${escapeHtml(upgrade.title)}</h3>\n      <p>${escapeHtml(desc)}</p>\n      <div class="upgrade-cost">${maxed ? '<span class="ball-cost">MAXED</span>' : ballUpgradeRequirementsHtml(upgrade)}</div>\n      <button class="btn small ${canBuy ? "" : "secondary"}" type="button" data-ball-upgrade="${upgrade.key}" ${canBuy ? "" : "disabled"}>${buttonLabel}</button>${autoToggle}\n    </div>`;
  }).join("");
  el.querySelectorAll("[data-ball-upgrade]").forEach(button => button.addEventListener("click", () => purchaseBallUpgrade(button.dataset.ballUpgrade)));
}

function renderBallsView() {
  normalizeBallState();
  const expired = pruneExpiredBalls();
  if (expired) dbSaveMeta();
  updateBallsNavDot();
  const wallet = document.getElementById("ballWallet");
  const spawnedEl = document.getElementById("spawnedBalls");
  if (!wallet || !spawnedEl) return;
  wallet.innerHTML = BALL_DEFS.map(ball => `\n    <div class="ball-wallet-item" title="${escapeHtml(ball.label)} balls collected">\n      <img src="${ball.asset}" alt="${escapeHtml(ball.label)} ball"><span>${escapeHtml(ball.label)}</span><span class="ball-count">${(state.balls[ball.key] || 0).toLocaleString()}</span>\n    </div>`).join("");
  if (!state.spawnedBalls.length) {
    spawnedEl.innerHTML = '<div class="balls-empty">clicking has a chance to spawn balls! and you can buy upgrades with it</div>';
  } else {
    const now = Date.now();
    spawnedEl.innerHTML = state.spawnedBalls.map(spawn => {
      const ball = BALL_BY_KEY[spawn.key];
      const seconds = Math.max(0, Math.ceil((spawn.expiresAt - now) / 1e3));
      return `<button class="spawned-ball" type="button" data-collect-ball="${escapeHtml(spawn.id)}" style="--ball-glow:${ball.glow}" title="Collect ${escapeHtml(ball.label)} ball">\n        <img src="${ball.asset}" alt="${escapeHtml(ball.label)} ball"><span class="ball-name">${escapeHtml(ball.label)} ball</span><span class="ball-timer">${seconds}s left</span>\n      </button>`;
    }).join("");
    spawnedEl.querySelectorAll("[data-collect-ball]").forEach(button => {
      button.addEventListener("click", () => collectSpawnedBall(button.dataset.collectBall));
    });
  }
  renderBallUpgradeCards();
}

let currentView = "roll";

function hasRouletteUnlocked() {
  return hasBallUpgrade("roulette") || isRouletteActive();
}

function updateRouletteAvailability() {
  const nav = document.getElementById("rouletteNavBtn");
  if (nav) nav.hidden = !hasRouletteUnlocked();
  if (!hasRouletteUnlocked() && currentView === "roulette") currentView = "roll";
  if (typeof renderNavWindow === "function") renderNavWindow();
}

function showView(name) {
  if (name === "roulette" && !hasRouletteUnlocked()) name = "roll";
  currentView = name;
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById("view-" + name).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  refreshLiveViews();
  scrollNavToActive();
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

// Bottom nav windowing: only 3 buttons show at once (the rest get .nav-btn-offscreen), with two
// arrows shifting which 3 are visible. "hidden" buttons (like rouletteNavBtn before it's
// unlocked) are excluded from the visible set entirely — they don't count as one of the 3 slots
// and can't be scrolled to, same as if they didn't exist in the DOM at all.
let navScrollOffset = 0;
function navVisibleButtons() {
  return Array.from(document.querySelectorAll(".nav-btn")).filter(b => !b.hidden);
}
function renderNavWindow() {
  const buttons = navVisibleButtons();
  const maxOffset = Math.max(0, buttons.length - 3);
  navScrollOffset = Math.min(navScrollOffset, maxOffset);
  buttons.forEach((b, i) => {
    b.classList.toggle("nav-btn-offscreen", i < navScrollOffset || i >= navScrollOffset + 3);
  });
  const leftArrow = document.getElementById("navScrollLeft");
  const rightArrow = document.getElementById("navScrollRight");
  if (leftArrow) leftArrow.disabled = navScrollOffset <= 0;
  if (rightArrow) rightArrow.disabled = navScrollOffset >= maxOffset;
}
function scrollNavToActive() {
  const buttons = navVisibleButtons();
  const activeIdx = buttons.findIndex(b => b.dataset.view === currentView);
  if (activeIdx === -1) { renderNavWindow(); return; }
  const maxOffset = Math.max(0, buttons.length - 3);
  if (activeIdx < navScrollOffset) navScrollOffset = activeIdx;
  else if (activeIdx >= navScrollOffset + 3) navScrollOffset = Math.min(maxOffset, activeIdx - 2);
  renderNavWindow();
}
document.getElementById("navScrollLeft").addEventListener("click", () => {
  navScrollOffset = Math.max(0, navScrollOffset - 1);
  renderNavWindow();
});
document.getElementById("navScrollRight").addEventListener("click", () => {
  const buttons = navVisibleButtons();
  navScrollOffset = Math.min(Math.max(0, buttons.length - 3), navScrollOffset + 1);
  renderNavWindow();
});
renderNavWindow();

function refreshLiveViews() {
  if (currentView === "items") {
    renderItemCards();
    renderConsumableCards();
    renderEquipCards();
  }
  if (currentView === "inventory") renderInventory();
  if (currentView === "balls") renderBallsView();
  if (currentView === "settings") renderSettingsView();
  if (currentView === "roulette") {
    renderRouletteView();
    updateRouletteSubtabAvailability();
    if (currentRouletteSubtab === "mining") renderMiningView();
    if (currentRouletteSubtab === "lorebook") renderLorebookView();
  }
  updateRouletteAvailability();
}

function processPerRollBonus(rule, world, area, results, updateBest, baseRollCount) {
  if (!rule) return 0;
  const chance = rule.chance != null ? rule.chance : 1 / (rule.oneIn || 1);
  let fired = 0;
  let toCheck = baseRollCount;
  while (toCheck > 0 && fired < rule.chainCapPerClick) {
    toCheck--;
    if (Math.random() < chance) {
      const remainingBudget = rule.chainCapPerClick - fired;
      const rollCount = Math.min(rule.rolls, remainingBudget);
      const pool = buildAreaPool(world, area, {
        mutationLuckMult: rule.mutationLuckMult || 1
      });
      for (let i = 0; i < rollCount; i++) {
        const r = rollOnceForArea(world, area, rule.luckMult, {
          mutationLuckMult: rule.mutationLuckMult || 1
        }, pool);
        results.push(r);
        fired++;
        updateBest(r);
      }
      toCheck += rollCount;
    }
  }
  return fired;
}

function processClickBonusRules(rules, world, area, results, updateBest) {
  if (!rules) return 0;
  const ruleList = Array.isArray(rules) ? rules : [ rules ];
  let fired = 0;
  for (const rule of ruleList) {
    if (rule.everyNClicks && state.clickCount % rule.everyNClicks !== 0) continue;
    const chance = rule.chance != null ? rule.chance : 1 / (rule.oneIn || 1);
    if (Math.random() < chance) {
      const rollCount = rule.dynamicRollsFn ? Math.max(0, Math.round(rule.dynamicRollsFn())) : rule.rolls || 1;
      const luckMult = rule.dynamicLuckMultFn ? rule.dynamicLuckMultFn() : rule.luckMult;
      const mutationLuckMult = rule.dynamicMutationLuckFn ? rule.dynamicMutationLuckFn() : rule.mutationLuckMult || 1;
      const pool = buildAreaPool(world, area, {
        mutationLuckMult: mutationLuckMult
      });
      for (let i = 0; i < rollCount; i++) {
        const r = rollOnceForArea(world, area, luckMult, {
          mutationLuckMult: mutationLuckMult
        }, pool);
        results.push(r);
        fired++;
        updateBest(r);
      }
    }
  }
  return fired;
}

function performClick() {
  state.perilousEjected = false;
  tryAutoUseRecipeConsumables();
  state.trollstoneEligible = !!state.lastRollWasTroll;
  state.lastRollWasTroll = false;
  state._rouletteForcedDefaultThisClick = rouletteClickDefaultAxeRoll();
  try {
    return performClickInner();
  } finally {
    state._rouletteForcedDefaultThisClick = false;
  }
}

function performClickInner() {
  const axe = currentAxe();
  const equip = currentEquip();
  let bulk = effectiveBulk();
  if (equip && equip.bulkMultOverrideChance && equip.bulkMultOverride) {
    if (Math.random() < equip.bulkMultOverrideChance) {
      bulk = Math.round(axe.stats.bulk * equip.bulkMultOverride);
    }
  }
  let best = null;
  const results = [];
  const coinBagMutBonus = equip && equip.key === "coinbag" ? coinBagBonus().mutationLuckAdd : 0;
  const rollOpts = coinBagMutBonus > 0 ? {
    mutationLuckMult: 1 + coinBagMutBonus
  } : undefined;
  for (let i = 0; i < bulk; i++) {
    const r = rollOnce(rollOpts);
    results.push(r);
    if (!best || r.finalRng > best.finalRng) best = r;
  }
  state.rolls += bulk;
  state.clickCount = (state.clickCount || 0) + 1;
  const world = WORLDS[state.worldIdx];
  const area = world.areas[state.areaIdx];
  const onceClickHit = rollOncePerClickSpecialRank(world, area, false);
  if (onceClickHit) {
    results.push(onceClickHit);
    if (!best || onceClickHit.finalRng > best.finalRng) best = onceClickHit;
  }
  const updateBest = r => {
    if (!best || r.finalRng > best.finalRng) best = r;
  };
  let perRollBonusFired = 0;
  const bonusesBlocked = rouletteNoBonuses();
  if (!bonusesBlocked && axe.perRollBonus) {
    perRollBonusFired = processPerRollBonus(axe.perRollBonus, world, area, results, updateBest, bulk);
  }
  if (!bonusesBlocked && equip && equip.perRollBonus) {
    perRollBonusFired += processPerRollBonus(equip.perRollBonus, world, area, results, updateBest, bulk);
  }
  let clickBonusFired = (bonusesBlocked ? 0 : processClickBonusRules(axe.clickBonus, world, area, results, updateBest)) + perRollBonusFired;
  if (!bonusesBlocked && equip) {
    clickBonusFired += processClickBonusRules(ballAdjustedAxenadesRules(equip, "clickBonus"), world, area, results, updateBest);
  }
  if (equip && equip.key === "coinbag" && equip.coinBagStackChance) {
    if (Math.random() < equip.coinBagStackChance) {
      if (!state.coinBagStacks) state.coinBagStacks = [];
      state.coinBagStacks.push({
        expiresAt: Date.now() + equip.coinBagStackDurationMs
      });
    }
  }
  if (!bonusesBlocked && axe.sunrays && state.clickCount % axe.sunrays.everyNClicks === 0) {
    for (let i = 0; i < axe.sunrays.rolls; i++) {
      const r = rollOnceForArea(world, area, axe.sunrays.luckMult);
      results.push(r);
      clickBonusFired++;
      updateBest(r);
    }
  }
  state.rolls += clickBonusFired;
  tickActiveBuffs(true);
  for (const r of results) {
    addToInventory(r, 1);
  }
  processPerilousClick(results);
  const ejected = !!state.perilousEjected;
  if (!ejected) pushLog(best);
  return {
    best: best,
    totalRolls: bulk + clickBonusFired,
    ejected: ejected
  };
}

function doRoll() {
  const {best: best, totalRolls: totalRolls, ejected: ejected} = performClick();
  trySpawnBallsFromPlayerClick();
  if (ejected) {
    refreshLiveViews();
    updateStatStrip();
    dbSaveMeta();
    return;
  }
  const trollArea = WORLDS[state.worldIdx].areas[state.areaIdx];
  const fake = !state.lowDetailMode && !state.superOptimize && Math.random() < TROLL_CHANCE ? rollTrollFake(trollArea, best.name) : null;
  if (fake) {
    state.lastRollWasTroll = true;
    recordTrollRollForTrollstone();
    rollGeneration++;
    const myGeneration = rollGeneration;
    renderStage(best, totalRolls, fake);
    setTimeout(() => {
      if (myGeneration === rollGeneration) renderStage(best, totalRolls);
    }, 3e3);
  } else {
    rollGeneration++;
    renderStage(best, totalRolls);
  }
  refreshLiveViews();
  if (!state.best || best.finalRng > state.best.finalRng) state.best = best;
  updateStatStrip();
  dbSaveMeta();
}

function tickActiveBuffs(clickHappened) {
  if (!state.activeBuffs) return;
  if (!clickHappened) return;
  let changed = false;
  for (const key of Object.keys(state.activeBuffs)) {
    const buff = state.activeBuffs[key];
    if (!buff) continue;
    buff.rollsLeft -= 1;
    changed = true;
    if (buff.rollsLeft <= 0) {
      delete state.activeBuffs[key];
    }
  }
  if (changed) renderConsumableCards();
}

