INDEXEDDB PERSISTENCE
   ============================================================ */
const DB_NAME = 'junis-rng-db';
const DB_VERSION = 1;
const STORE_META = 'meta';
const STORE_INV  = 'inventory';
let dbPromise = null;
let saveLoadedSuccessfully = false;

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
    req.onerror = (e)=>{ dbPromise = null; console.error('IndexedDB open failed', e); reject(e); };
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

function backupToLocalStorage(){
  try{
    const metaObj = {
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
      clickCount: state.clickCount,
      anticheatLockUntil: state.anticheatLockUntil,
      wgunStacks: state.wgunStacks,
      coinBagStacks: state.coinBagStacks,
      discoveredSecrets: state.discoveredSecrets,
    };
    localStorage.setItem('junis_rng_backup_meta', JSON.stringify(metaObj));
    localStorage.setItem('junis_rng_backup_inv', JSON.stringify(Object.values(state.inventory)));
  }catch(e){
    console.warn('LocalStorage backup failed:', e);
  }
}

async function dbSaveMeta(){
  // SAFETY GUARD: If we never loaded successfully and state is empty/default, DO NOT overwrite!
  if(!saveLoadedSuccessfully && state.rolls === 0 && Object.keys(state.inventory).length === 0){
    console.warn('Refusing to save empty state over uninitialized load to prevent permanent data loss.');
    return;
  }
  
  // Always update localStorage backup first
  backupToLocalStorage();

  try{
    await withDbRetry(async (db)=>{
      const tx = db.transaction(STORE_META, 'readwrite');
      tx.objectStore(STORE_META).put({
        id:'state',
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
        clickCount: state.clickCount,
        anticheatLockUntil: state.anticheatLockUntil,
        wgunStacks: state.wgunStacks,
        coinBagStacks: state.coinBagStacks,
        discoveredSecrets: state.discoveredSecrets,
      });
    });
  }catch(err){ 
    console.error('Failed to save meta to IndexedDB, fallback localStorage active', err); 
  }
}

async function dbSaveInvItem(item){
  backupToLocalStorage();
  try{
    await withDbRetry(async (db)=>{
      const tx = db.transaction(STORE_INV, 'readwrite');
      tx.objectStore(STORE_INV).put(item);
    });
  }catch(err){ console.error('Failed to save inventory item', err); }
}

async function dbDeleteInvItem(key){
  backupToLocalStorage();
  try{
    await withDbRetry(async (db)=>{
      const tx = db.transaction(STORE_INV, 'readwrite');
      tx.objectStore(STORE_INV).delete(key);
    });
  }catch(err){ console.error('Failed to delete inventory item', err); }
}

function applyMetaToState(meta){
  if(!meta) return;
  state.rolls = meta.rolls || 0;
  state.best = meta.best || null;
  state.worldIdx = meta.worldIdx || 0;
  state.areaIdx = meta.areaIdx || 0;
  state.ownedAxes = meta.ownedAxes && meta.ownedAxes.length ? meta.ownedAxes : ['default'];
  state.equippedAxe = meta.equippedAxe || 'default';
  state.ownedEquips = meta.ownedEquips || [];
  state.equippedItem = meta.equippedItem || null;
  state.lastSeenAt = meta.lastSeenAt || Date.now();
  state.pinnedRecipe = meta.pinnedRecipe || null;
  state.consumables = meta.consumables || {};
  state.activeBuffs = meta.activeBuffs || {};
  state.bombCharge = meta.bombCharge || null;
  state.anticheatLockUntil = meta.anticheatLockUntil || null;
  state.clickCount = meta.clickCount || 0;
  state.wgunStacks = meta.wgunStacks || [];
  state.coinBagStacks = meta.coinBagStacks || [];
  state.discoveredSecrets = meta.discoveredSecrets || {};
  saveLoadedSuccessfully = true;
}

async function dbLoadAll(){
  try{
    let loadedFromIDB = false;
    try {
      const db = await openDB();
      const metaTx = db.transaction(STORE_META, 'readonly');
      const metaReq = metaTx.objectStore(STORE_META).get('state');
      const meta = await new Promise((res,rej)=>{
        metaReq.onsuccess = ()=> res(metaReq.result);
        metaReq.onerror = (e)=> rej(e);
      });
      if(meta){
        applyMetaToState(meta);
        loadedFromIDB = true;
      }

      const invTx = db.transaction(STORE_INV, 'readonly');
      const invReq = invTx.objectStore(STORE_INV).getAll();
      const items = await new Promise((res,rej)=>{
        invReq.onsuccess = ()=> res(invReq.result);
        invReq.onerror = (e)=> rej(e);
      });
      if(items && items.length > 0){
        state.inventory = {};
        for(const it of items) state.inventory[it.key] = it;
      }
    } catch(idbErr) {
      console.warn('IndexedDB load encountered an error, attempting localStorage fallback...', idbErr);
    }

    // FALLBACK TO LOCALSTORAGE IF IDB FAILED OR RETURNED EMPTY
    if(!loadedFromIDB || state.rolls === 0){
      try {
        const lsMetaStr = localStorage.getItem('junis_rng_backup_meta');
        if(lsMetaStr){
          const lsMeta = JSON.parse(lsMetaStr);
          if(lsMeta && lsMeta.rolls > state.rolls){
            applyMetaToState(lsMeta);
            console.info('Successfully recovered save state from localStorage backup!');
          }
        }
        const lsInvStr = localStorage.getItem('junis_rng_backup_inv');
        if(lsInvStr){
          const lsItems = JSON.parse(lsInvStr);
          if(lsItems && Array.isArray(lsItems) && lsItems.length > 0){
            if(Object.keys(state.inventory).length === 0){
              state.inventory = {};
              for(const it of lsItems) state.inventory[it.key] = it;
            }
          }
        }
      } catch(lsErr) {
        console.error('LocalStorage fallback load failed:', lsErr);
      }
    }

    await migrateMisattributedInventory();
  }catch(err){
    console.error('Fatal load error, initiating safe mode (saving disabled until manual action)', err);
    saveLoadedSuccessfully = false;
  }
}

async function migrateMisattributedInventory(){
  const toDelete = [];
  const toMerge = {}; // correctKey -> extra count to add

  for(const key in state.inventory){
    const it = state.inventory[key];
    if(it.isSecret) continue; // secrets aren't tied to normal rank data, skip

    const trueRng = findRankRng(it.areaLabel, it.name);
    // If the item's name doesn't actually exist in its stored areaLabel, it was mis-filed —
    // find its real home area across all worlds instead.
    if(trueRng == null){
      let realArea = null, realRng = null;
      for(const world of WORLDS){
        for(const area of world.areas){
          for(const r of area.ranks){
            if(r.name === it.name){ realArea = area.label; realRng = r.rng; break; }
            if(r.mutations){
              const m = r.mutations.find(mm => mm.name === it.name);
              if(m){ realArea = area.label; realRng = m.rng; break; }
            }
          }
          if(realArea) break;
        }
        if(realArea) break;
      }
      if(realArea){
        const correctKey = invKey(realArea, it.name, it.variant ? it.variant.key : null);
        toMerge[correctKey] = (toMerge[correctKey] || 0) + it.count;
        toDelete.push(key);
      }
      continue;
    }

    // Item exists in its stored area, but was the rng itself corrupted by a stale debuff?
    if(it.baseRng !== trueRng){
      const correctKey = invKey(it.areaLabel, it.name, it.variant ? it.variant.key : null);
      if(correctKey !== key){
        toMerge[correctKey] = (toMerge[correctKey] || 0) + it.count;
        toDelete.push(key);
      } else {
        // Same key, just needs its rng corrected in place
        it.baseRng = trueRng;
        const fixedTier = tierFor(trueRng);
        it.tierKey = fixedTier.key; it.tierLabel = fixedTier.label; it.tierCls = fixedTier.cls;
        dbSaveInvItem(it);
      }
    }
  }

  if(toDelete.length === 0) return;

  for(const key of toDelete){
    delete state.inventory[key];
    dbDeleteInvItem(key);
  }
  for(const correctKey in toMerge){
    const existing = state.inventory[correctKey];
    if(existing){
      existing.count += toMerge[correctKey];
      dbSaveInvItem(existing);
    } else {
      // Reconstruct a minimal valid entry for the correct area/name
      const [areaLabel, name, variantKey] = correctKey.split('|');
      const rng = findRankRng(areaLabel, name);
      if(rng != null){
        const t = tierFor(rng);
        const fresh = {
          key: correctKey, name, areaLabel, baseRng: rng, lastRng: rng,
          tierKey: t.key, tierLabel: t.label, tierCls: t.cls,
          variant: null, count: toMerge[correctKey], firstAt: Date.now(), isSecret: false,
        };
        state.inventory[correctKey] = fresh;
        dbSaveInvItem(fresh);
      }
    }
  }
  console.log(`Migrated ${toDelete.length} mis-attributed inventory entries.`);
}

function invKey(areaLabel, name, variantKey){
  return `${areaLabel}|${name}|${variantKey || 'none'}`;
}

function addToInventory(result, count){
  count = count || 1;
  const key = invKey(result.areaLabel, result.name, result.variant ? result.variant.key : null);
  const existing = state.inventory[key];
  // Tier is always based on the BASE rng, not the variant-inflated finalRng — secrets use the fixed Secret tier
  const baseTier = result.isSecret ? SECRET_TIER : tierFor(result.baseRng);
  if(existing){
    existing.count += count;
    existing.lastRng = result.finalRng;
    state.inventory[key] = existing;
    dbSaveInvItem(existing);
  } else {
    const item = {
      key,
      name: result.name,
      areaLabel: result.areaLabel,
      baseRng: result.baseRng,
      lastRng: result.finalRng,
      tierKey: baseTier.key,
      tierLabel: baseTier.label,
      tierCls: baseTier.cls,
      variant: result.variant ? { key:result.variant.key, label:result.variant.label, cls:result.variant.cls, totalMult:result.variant.totalMult } : null,
      count: count,
      firstAt: Date.now(),
      isSecret: !!result.isSecret,
    };
    state.inventory[key] = item;
    dbSaveInvItem(item);
  }
}

function getOwnedCount(areaLabel, name, variantKey){
  const key = invKey(areaLabel, name, variantKey || null);
  return state.inventory[key] ? state.inventory[key].count : 0;
}

// Reads how much of a requirement the player currently has. Most requirements are caught
// ranks (req.area/req.name/req.variant, checked against the inventory); some (like nan.axe's
// err.redirector cost) are crafted CONSUMABLE items instead (req.consumable = a CONSUMABLES key),
// checked against state.consumables.
function getReqOwnedCount(req){
  if(req.consumable) return getConsumableCount(req.consumable);
  return getOwnedCount(req.area, req.name, req.variant);
}

// Checks if a rank has EVER been caught in the given area, in ANY variant (plain, weird, odd,
// rainbow, grayscale) or with any lastRng recorded — used to gate ultra-rare (1b+) Index entries
// that stay fully hidden as "???" until the player has actually found them at least once.
function hasEverFoundRank(areaLabel, name){
  const plainKey = invKey(areaLabel, name, null);
  if(state.inventory[plainKey] && state.inventory[plainKey].count > 0) return true;
  for(const v of VARIANT_CHAIN){
    const vKey = invKey(areaLabel, name, v.key);
    if(state.inventory[vKey] && state.inventory[vKey].count > 0) return true;
  }
  return false;
}

/* ============================================================
   RECIPE PINNING
   ============================================================ */

function getPinnableRecipe(kind, key){
  if(kind === 'axe') return AXES[key];
  if(kind === 'consumable') return CONSUMABLES[key];
  return null;
}

function pinnedRecipeData(){
  if(!state.pinnedRecipe) return null;
  const recipe = getPinnableRecipe(state.pinnedRecipe.kind, state.pinnedRecipe.key);
  if(!recipe || !recipe.requires) return null;
  return recipe;
}

// The rarest material in the pinned recipe that the player hasn't fully gathered yet
function rarestUnfinishedMaterial(){
  const list = allUnfinishedMaterials();
  if(!list.length) return null;
  return list.reduce((a,b)=> b.rng > a.rng ? b : a);
}

// The most common (lowest rng) material in the pinned recipe that the player hasn't fully gathered yet
function mostCommonUnfinishedMaterial(){
  const list = allUnfinishedMaterials();
  if(!list.length) return null;
  return list.reduce((a,b)=> b.rng < a.rng ? b : a);
}

// Every material in the pinned recipe that the player hasn't fully gathered yet
function allUnfinishedMaterials(){
  const recipe = pinnedRecipeData();
  if(!recipe) return [];
  const list = [];
  for(const req of recipe.requires){
    const have = getOwnedCount(req.area, req.name, req.variant);
    if(have >= req.amount) continue;
    const rng = findRankRng(req.area, req.name);
    if(rng == null) continue;
    list.push({ name:req.name, area:req.area, rng, variant:req.variant || null });
  }
  return list;
}

// Finds a rank or mutation's base rng by area label, searching across all worlds
function findRankRng(areaLabel, name){
  const r = findRankObj(areaLabel, name);
  return r ? r.rng : null;
}

function findRankObj(areaLabel, name){
  for(const world of WORLDS){
    for(const area of world.areas){
      if(area.label !== areaLabel) continue;
      for(const r of area.ranks){
        if(r.name === name) return r;
        if(r.mutations){
          for(const m of r.mutations){
            if(m.name === name) return m;
          }
        }
      }
    }
    if(world.areas.some(a => a.label === areaLabel)){
      for(const g of world.global){
        if(g.name === name) return g;
      }
    }
  }
  return null;
}

function setPinnedRecipe(kind, key){
  state.pinnedRecipe = { kind, key };
  dbSaveMeta();
}

function clearPinnedRecipe(){
  state.pinnedRecipe = null;
  dbSaveMeta();
}

/* ============================================================
   ROLLING LOGIC
   ============================================================ */

// Builds the roll pool for a given area: normally just that area's own ranks/mutations, but for
// isUniversalPool areas (like "All"), pulls from every OTHER area in the game instead. Always
// applies the area's debuffMult (if any) to rarity for odds purposes — reverted on catch by
// resolveRollWinner's use of findRankRng. Shared by rollOnceForArea, the offline worker sim, and
// the offline fallback sim so all three paths stay consistent.
function buildAreaPool(world, area, opts){
  opts = opts || {};
  const pool = [];
  const areaDebuffMult = area.debuffMult || 1;

  if(area.isUniversalPool){
    for(const w of WORLDS){
      for(const a of w.areas){
        if(a.key === area.key) continue;
        for(const r of a.ranks){
          if(r.condition && !r.condition(w, a, opts)) continue;
          pool.push({ name:r.name, rng:r.rng * areaDebuffMult, isMutation:false, injectedAreaLabel:a.label });
          if(r.mutations){
            for(const m of r.mutations){
              if(m.condition && !m.condition(w, a, opts)) continue;
              pool.push({ name:m.name, rng:m.rng * areaDebuffMult, isMutation:true, injectedAreaLabel:a.label });
            }
          }
        }
      }
    }
  } else {
    for(const r of area.ranks){
      if(r.condition && !r.condition(world, area, opts)) continue;
      pool.push({ name:r.name, rng:r.rng * areaDebuffMult, isMutation:false });
      if(r.mutations) {
        for(const m of r.mutations) {
          if(m.condition && !m.condition(world, area, opts)) continue;
          pool.push({ name:m.name, rng:m.rng * areaDebuffMult, isMutation:true });
        }
      }
    }
  }
  for(const g of world.global) pool.push({ name:g.name, rng:g.rng === Infinity ? Infinity : g.rng * areaDebuffMult, isMutation:false });

  return pool;
}

function rollOnceForArea(world, area, luckMult, opts){
  opts = opts || {};
  const mutationLuckMult = opts.mutationLuckMult || 1;
  const applyBuffs = opts.applyBuffs !== false; // default true

  const pool = buildAreaPool(world, area, opts);

  // --- Unified "Reach" mechanic ---------------------------------------------------------
  // Multiple sources can let pinned-recipe materials drop outside their home area (at some
  // rarity penalty): Universal Recipe Gloves (consumable, ×2, targets only the rarest missing
  // material) and Emblem of the Jackpot's innate [Reach] (always-on while equipped, ×5, targets
  // EVERY unfinished material). Rather than each being its own bespoke pool-injection block,
  // both funnel through the same reachSources list below so future reach effects don't need to
  // duplicate this logic again.
  const equippedAxe = currentAxe();
  const pushpinActive = applyBuffs && state.activeBuffs && state.activeBuffs.pushpin && state.activeBuffs.pushpin.rollsLeft > 0;
  const glovesActive = applyBuffs && state.activeBuffs && state.activeBuffs.gloves && state.activeBuffs.gloves.rollsLeft > 0;
  const emblemActive = applyBuffs && equippedAxe.key === 'emblem';

  const reachSources = [];
  if(glovesActive){
    // Gloves only reaches for the single rarest unfinished material
    const target = rarestUnfinishedMaterial();
    if(target) reachSources.push({ materials:[target], rarityMult:2 });
  }
  if(emblemActive){
    // Emblem's innate Reach covers every unfinished material at once
    const mats = allUnfinishedMaterials();
    if(mats.length) reachSources.push({ materials:mats, rarityMult:equippedAxe.reachRarityMult });
  }

  // Inject each reach source's materials into the current area's pool if they're not already native here.
  // If multiple sources want to reach the same material, the LOWEST rarity multiplier (most generous) wins.
  const injectedRarity = {}; // name -> best (lowest) rarityMult seen so far
  for(const source of reachSources){
    for(const mat of source.materials){
      if(mat.area === area.label) continue; // already native, no injection needed
      if(injectedRarity[mat.name] == null || source.rarityMult < injectedRarity[mat.name]){
        injectedRarity[mat.name] = source.rarityMult;
      }
    }
  }
  for(const name in injectedRarity){
    const alreadyInPool = pool.some(p => p.name === name);
    if(alreadyInPool) continue;
    // Find the material's home rng from whichever source listed it
    let mat = null;
    for(const source of reachSources){
      mat = source.materials.find(m => m.name === name);
      if(mat) break;
    }
    if(mat) pool.push({ name:mat.name, rng:mat.rng * injectedRarity[name], isMutation:false, injectedAreaLabel:mat.area });
  }

  // Pushpin's own rarity-easing effect still targets just the rarest unfinished material specifically
  const buffTarget = pushpinActive ? rarestUnfinishedMaterial() : null;

  const emblemUnfinished = emblemActive ? allUnfinishedMaterials() : [];
  const emblemCommonTarget = (emblemActive && pushpinActive) ? mostCommonUnfinishedMaterial() : null;

  // Per-item effective rng after buffs (Pushpin easing its target, Emblem's Blessing/Synergy Pushpin)
  function effectiveRng(item){
    let rng = item.rng;
    if(pushpinActive && buffTarget && buffTarget.area === area.label && buffTarget.name === item.name){
      rng = rng / 2.5;
    }
    return rng;
  }

  // Per-item effective luck after Emblem's Blessing (×1.7 to all unfinished pinned materials)
  // and Synergy Pushpin (an extra ×1.7 to the most common unfinished material, stacking with Pushpin)
  function effectiveLuckForItem(item, baseLuck){
    let l = baseLuck;
    if(emblemActive && emblemUnfinished.some(m => m.name === item.name)){
      l *= equippedAxe.blessingLuckMult;
      if(emblemCommonTarget && emblemCommonTarget.name === item.name){
        l *= equippedAxe.synergyPushpinLuckMult;
      }
    }
    return l;
  }

  // 1. Identify the highest guaranteed RNG that luck would automatically roll
  let highestGuaranteedRng = 0;
  for(const item of pool) {
    if(item.rng !== Infinity) {
      const rng = effectiveRng(item);
      const itemLuckMult = effectiveLuckForItem(item, item.isMutation ? luckMult * mutationLuckMult : luckMult);
      const effectiveChance = itemLuckMult / rng;
      if(effectiveChance >= 1) {
        if(rng > highestGuaranteedRng) {
          highestGuaranteedRng = rng;
        }
      }
    }
  }

  // 2. Perform rolling checks with 1/5 minimum fallback cap for skipped ranks
  // Track ALL items that pass their check at the best (rarest) rng seen so far, not just the
  // first one encountered — ties are broken with a genuine uniform 1/n pick at the end, rather
  // than always favoring whichever happened to iterate first.
  let normalWinners = [];   // all items tied for the best passing rng
  let bypassedWinners = [];

  // "All" area cap: no item's roll-time chance can ever EXCEED 1/3, no matter how much luck is
  // thrown at it. This stops luck from trivializing astronomically rare items down in "All" —
  // it's a CEILING on how good the odds can get, not a floor that boosts bad odds upward.
  const maxRollChance = area.isUniversalPool ? (1/3) : 1;

  for(const item of pool){
    if(item.rng === Infinity){
      if(Math.random() < 0.0005 * luckMult){
        if(normalWinners.length === 0 || item.rng > normalWinners[0].rng){
          normalWinners = [item];
        } else if(item.rng === normalWinners[0].rng){
          normalWinners.push(item);
        }
      }
      continue;
    }

    const rng = effectiveRng(item);
    const itemLuckMult = effectiveLuckForItem(item, item.isMutation ? luckMult * mutationLuckMult : luckMult);

    const isSkipped = rng < highestGuaranteedRng;
    if(isSkipped) {
      // flat 1/5 (20%) roll rate if skipped by high luck
      if(Math.random() < 0.2) {
        if(bypassedWinners.length === 0 || item.rng > bypassedWinners[0].rng){
          bypassedWinners = [item];
        } else if(item.rng === bypassedWinners[0].rng){
          bypassedWinners.push(item);
        }
      }
    } else {
      const effectiveChance = Math.min(itemLuckMult / rng, maxRollChance);
      if(Math.random() < effectiveChance){
        if(normalWinners.length === 0 || item.rng > normalWinners[0].rng){
          normalWinners = [item];
        } else if(item.rng === normalWinners[0].rng){
          normalWinners.push(item);
        }
      }
    }
  }

  // Choose bypassed item if it won, unless normal roll picked up something rarer than the skipped threshold
  let winnerPool = normalWinners;
  if (bypassedWinners.length) {
    if (winnerPool.length === 0 || winnerPool[0].rng <= highestGuaranteedRng) {
      winnerPool = bypassedWinners;
    }
  }

  let winner;
  if(winnerPool.length === 0){
    winner = pool.reduce((a,b)=> a.rng < b.rng ? a : b);
  } else if(winnerPool.length === 1){
    winner = winnerPool[0];
  } else {
    // Genuine tie: uniform 1/n pick among every item that tied for the winning rarity
    winner = winnerPool[Math.floor(Math.random() * winnerPool.length)];
  }

  const variant = rollVariant();

  // The winner's rng at this point may be a TEMPORARILY DEBUFFED value (e.g. Reach/Gloves
  // injecting a cross-area material at ×2/×5 rarity, or a global rarity debuff like the "All"
  // world's ×200). That debuff exists only to determine ODDS during the roll itself — once
  // something is actually caught, it must always revert to its true original rng and be
  // credited to its true home area, stacking onto the same inventory entry every other roll
  // of that item would produce. We look up the pool item's TRUE rng/area from the game data
  // rather than trusting whatever (possibly modified) values live on the pool object.
  const trueRng = findRankRng(winner.injectedAreaLabel || area.label, winner.name);
  const trueAreaLabel = winner.injectedAreaLabel || area.label;
  const resolvedBaseRng = trueRng != null ? trueRng : winner.rng;

  const finalRng = variant ? resolvedBaseRng * variant.totalMult : resolvedBaseRng;
  const tier = tierFor(finalRng);

  return { name:winner.name, baseRng:resolvedBaseRng, finalRng, tier, variant, areaLabel:trueAreaLabel };
}

function rollOnce(opts){
  const world = WORLDS[state.worldIdx];
  const area = world.areas[state.areaIdx];

  // Secret ranks are checked first — true rng, bypasses luck/buffs entirely, real-time clock gated
  const secretHit = rollSecretForArea(world, area);
  if(secretHit){
    markSecretDiscovered(secretHit.secretKey, secretHit.variant ? secretHit.variant.key : null);
    return secretHit;
  }

  const luckMult = effectiveLuckMult();
  return rollOnceForArea(world, area, luckMult, opts);
}

/* ============================================================
   RENDERING HELPERS
   ============================================================ */

// Renders a rank name with: tier class (for glow/structural styling) + this rank's own unique
// deterministic color/font (inline style, wins over the tier's flat color) + 50% variant overlay.
// displayText optionally overrides what's actually shown (e.g. "???" for a mystery-hidden rank)
// while the color/font are still deterministically derived from the REAL name — so once a 1b+
// rank is finally revealed, its "???" placeholder already looked/felt exactly like its true self.
function rankNameHtml(name, tierCls, variant, extraCls, tierKey, displayText){
  extraCls = extraCls || '';
  const text = escapeHtml(displayText != null ? displayText : name);
  const styleAttr = tierKey ? ` style="${rankVisualStyleAttr(name, tierKey)}"` : '';
  if(!variant) return `<span class="${tierCls} ${extraCls}"${styleAttr}>${text}</span>`;
  // vwrap carries variant class for CSS scoping; inner text has this rank's own color/font; vlayer
  // overlays the variant tint on top. The vlayer MUST share the exact same font-family/weight/
  // style/letter-spacing as the base layer — otherwise the two text layers render at different
  // glyph widths and the mismatch shows up as extra/ghosted text bleeding out from behind the
  // overlay in the wrong font. Only the color/background is variant-specific; font must match.
  const fontOnlyStyle = tierKey ? ` style="${rankVisualFontOnlyStyleAttr(name)}"` : '';
  return `<span class="vwrap ${variant.cls} ${extraCls}"><span class="${tierCls}"${styleAttr}>${text}</span><span class="vlayer"${fontOnlyStyle} aria-hidden="true">${text}</span></span>`;
}

function fmtRng(n){
  if(n === Infinity) return '∞';
  if(n < 1) return '1';
  return Math.round(n).toLocaleString();
}

// Secret ranks always display "???" for rarity, regardless of context
function fmtRngOrSecret(isSecret, n){
  return isSecret ? '???' : fmtRng(n);
}

/* ------------------------------------------------------------
   404 AREA GIMMICK — rarity truncation
   While err.redirector isn't active, any rank whose home area is "404" has its displayed
   rarity number (never its name) partially garbled with random symbols. The garbling is
   derived deterministically from the result's own name+rng, so the same catch always looks
   the same everywhere (stage/log/inventory) instead of flickering on every re-render.
   ------------------------------------------------------------ */
const GLITCH_SYMBOLS = ['#','%','&','$','?','@','*','■','░','▒','×'];

// Small deterministic PRNG seeded from a string, so the same rank+rng always garbles identically.
function seededRandFromString(str){
  let h = 0;
  for(let i=0;i<str.length;i++){ h = (h * 31 + str.charCodeAt(i)) >>> 0; }
  return function(){
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

// Garbles a rarity number's digits (leaves commas/formatting structure intact), swapping
// roughly half the digits for a random glitch symbol. Seeded by name+rng so it's stable.
function glitchRngText(name, n){
  const clean = fmtRng(n);
  const rand = seededRandFromString(name + '|' + n);
  let out = '';
  for(const ch of clean){
    if(/[0-9]/.test(ch) && rand() < 0.5){
      out += GLITCH_SYMBOLS[Math.floor(rand() * GLITCH_SYMBOLS.length)];
    } else {
      out += ch;
    }
  }
  return out;
}

// Rarity text for a result (roll result or inventory item — both have name/areaLabel and
// either .finalRng or .lastRng), applying the 404 truncation gimmick when relevant.
function fmtRngForResult(r){
  const n = r.finalRng != null ? r.finalRng : r.lastRng;
  if(r.isSecret) return '???';
  if(r.areaLabel === '404' && !isErrRedirectorActive()) return glitchRngText(r.name, n);
  return fmtRng(n);
}

function escapeHtml(s){
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function fmtDuration(seconds){
  seconds = Math.floor(seconds);
  const d = Math.floor(seconds / 86400); seconds -= d*86400;
  const h = Math.floor(seconds / 3600); seconds -= h*3600;
  const m = Math.floor(seconds / 60); seconds -= m*60;
  const parts = [];
  if(d) parts.push(d+'d');
  if(h) parts.push(h+'h');
  if(m) parts.push(m+'m');
  if(!d && !h) parts.push(seconds+'s');
  return parts.join(' ') || '0s';
}

function tierGlowColor(key){
  const map = {
    pelicular:'rgba(232,121,249,0.5)', horizon:'rgba(251,113,133,0.5)', grandiose:'rgba(245,158,11,0.5)',
    zenith:'rgba(255,215,0,0.55)', unworldly:'rgba(34,211,238,0.5)', colossal:'rgba(67,56,202,0.6)',
    infinite:'rgba(255,0,150,0.5)', insanity:'rgba(255,0,60,0.6)', impossible:'rgba(255,255,255,0.6)',
  };
  return map[key] || 'rgba(124,92,255,0.4)';
}

/* ============================================================
   RENDERING: ROLL VIEW
   ============================================================ */

