/* ============================================================
   ENGINE & STATE (Data Models, RNG, Roll Mechanics, Offline, Anticheat)
   ============================================================ */

/* ============================================================
   INDEXEDDB PERSISTENCE WITH AUTOMATIC DEEP-SCAN RESTORATION
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
  // Only override if incoming meta has equal or greater rolls, or if current state is empty
  state.rolls = Math.max(state.rolls, meta.rolls || 0);
  if(meta.best && (!state.best || meta.best.finalRng > state.best.finalRng)){
    state.best = meta.best;
  }
  state.worldIdx = meta.worldIdx !== undefined ? meta.worldIdx : state.worldIdx;
  state.areaIdx = meta.areaIdx !== undefined ? meta.areaIdx : state.areaIdx;
  if(meta.ownedAxes && meta.ownedAxes.length > state.ownedAxes.length) state.ownedAxes = meta.ownedAxes;
  state.equippedAxe = meta.equippedAxe || state.equippedAxe;
  if(meta.ownedEquips && meta.ownedEquips.length > state.ownedEquips.length) state.ownedEquips = meta.ownedEquips;
  state.equippedItem = meta.equippedItem !== undefined ? meta.equippedItem : state.equippedItem;
  state.lastSeenAt = meta.lastSeenAt || state.lastSeenAt;
  state.pinnedRecipe = meta.pinnedRecipe || state.pinnedRecipe;
  state.consumables = { ...state.consumables, ...(meta.consumables || {}) };
  state.activeBuffs = { ...state.activeBuffs, ...(meta.activeBuffs || {}) };
  state.bombCharge = meta.bombCharge || state.bombCharge;
  state.anticheatLockUntil = meta.anticheatLockUntil || state.anticheatLockUntil;
  state.clickCount = Math.max(state.clickCount, meta.clickCount || 0);
  state.wgunStacks = meta.wgunStacks && meta.wgunStacks.length > state.wgunStacks.length ? meta.wgunStacks : state.wgunStacks;
  state.coinBagStacks = meta.coinBagStacks && meta.coinBagStacks.length > state.coinBagStacks.length ? meta.coinBagStacks : state.coinBagStacks;
  state.discoveredSecrets = { ...state.discoveredSecrets, ...(meta.discoveredSecrets || {}) };
  saveLoadedSuccessfully = true;
}

// AUTOMATIC DEEP-SCAN RESTORATION
async function dbLoadAll(){
  let bestLoadedRolls = 0;
  let candidateMeta = null;
  let candidateItems = [];

  // 1. Scan IndexedDB
  try {
    const db = await openDB();
    const metaTx = db.transaction(STORE_META, 'readonly');
    const metaReq = metaTx.objectStore(STORE_META).get('state');
    const meta = await new Promise((res,rej)=>{
      metaReq.onsuccess = ()=> res(metaReq.result);
      metaReq.onerror = (e)=> rej(e);
    });
    if(meta && (meta.rolls || 0) >= bestLoadedRolls){
      bestLoadedRolls = meta.rolls || 0;
      candidateMeta = meta;
    }

    const invTx = db.transaction(STORE_INV, 'readonly');
    const invReq = invTx.objectStore(STORE_INV).getAll();
    const items = await new Promise((res,rej)=>{
      invReq.onsuccess = ()=> res(invReq.result);
      invReq.onerror = (e)=> rej(e);
    });
    if(items && items.length > 0){
      candidateItems = items;
    }
  } catch(idbErr) {
    console.warn('IndexedDB scan warning:', idbErr);
  }

  // 2. Scan LocalStorage backups (both new and legacy keys if any)
  try {
    const lsKeys = ['junis_rng_backup_meta', 'junis_rng_meta', 'junis_rng_save'];
    for(const k of lsKeys){
      const val = localStorage.getItem(k);
      if(val){
        try {
          const parsed = JSON.parse(val);
          const rolls = parsed.rolls || 0;
          if(rolls >= bestLoadedRolls){
            bestLoadedRolls = rolls;
            candidateMeta = parsed;
          }
        } catch(e){}
      }
    }

    const invKeys = ['junis_rng_backup_inv', 'junis_rng_inv'];
    for(const k of invKeys){
      const val = localStorage.getItem(k);
      if(val){
        try {
          const parsed = JSON.parse(val);
          if(Array.isArray(parsed) && parsed.length > candidateItems.length){
            candidateItems = parsed;
          }
        } catch(e){}
      }
    }
  } catch(lsErr) {
    console.warn('LocalStorage scan warning:', lsErr);
  }

  // 3. Apply best found save data automatically
  if(candidateMeta){
    applyMetaToState(candidateMeta);
    console.info(`[Auto-Restore] Successfully restored player progress: ${candidateMeta.rolls.toLocaleString()} rolls found.`);
  }

  if(candidateItems && candidateItems.length > 0){
    state.inventory = {};
    for(const it of candidateItems){
      if(it && it.key) state.inventory[it.key] = it;
    }
  }

  // Immediately backup the recovered state to both IDB and LS to secure it
  if(candidateMeta){
    await dbSaveMeta();
  }

  try {
    await migrateMisattributedInventory();
  } catch(e){
    console.warn('Migration warning:', e);
  }
}
