function renderAxeStrip(){
  const axe = currentAxe();
  const equip = currentEquip();
  const stacks = wgunActiveStacks();
  const rps = effectiveRps();
  const luck = effectiveLuckMult();
  const bulk = effectiveBulk();
  const rpsLabel = stacks > 0 ? `${rps.toFixed(1)} rolls/sec offline 💧×${stacks}` : `${rps} rolls/sec offline`;
  const equipLabel = equip ? ` · 🛡️ ${equip.name}` : '';
  const el = document.getElementById('axeStrip');
  el.innerHTML = `
    <span class="aname">🪓 ${axe.name}${equipLabel}</span>
    <span class="astats">luck ×${luck} · bulk ${bulk} · ${rpsLabel}</span>
  `;
}

function renderStage(result, count, trollOverride, clicksNote){
  const stage = document.getElementById('stage');
  const baseTier = result.isSecret ? SECRET_TIER : tierFor(result.baseRng);
  const glowCls = result.isSecret ? 'glow-secret' : (['epic','pelicular','horizon','grandiose','zenith','unworldly'].includes(baseTier.key) ? `glow-${baseTier.key}` : '');

  if(trollOverride){
    // Cosmetic-only fake display, styled identically to a real result so it's indistinguishable
    // for the full 3 seconds. The real result underneath is already committed in state/inventory/log.
    const fakeTier = tierFor(trollOverride.rng);
    const fakeGlow = ['epic','pelicular','horizon','grandiose','zenith','unworldly'].includes(fakeTier.key) ? `glow-${fakeTier.key}` : '';
    const fakeNameHtml = rankNameHtml(trollOverride.name, fakeTier.cls, null, fakeGlow, fakeTier.key);
    stage.innerHTML = `
      <div class="result-tier">${result.areaLabel} · ${fakeTier.label}</div>
      <div class="result-name">${fakeNameHtml}</div>
      <div class="result-rng">1 in ${fmtRng(trollOverride.rng)}</div>
      ${clicksNote ? `<div class="multi-note">${clicksNote}</div>` : (count && count > 1 ? `<div class="multi-note">shown: rarest of ${count} rolls (bulk)</div>` : '')}
    `;
    if(['pelicular','horizon','grandiose','zenith','unworldly','colossal','infinite','insanity','impossible'].includes(fakeTier.key)){
      const flash = document.getElementById('flashBg');
      flash.style.background = `radial-gradient(circle at 50% 40%, ${tierGlowColor(fakeTier.key)}, transparent 70%)`;
      flash.classList.remove('go');
      void flash.offsetWidth;
      flash.classList.add('go');
    }
    return;
  }

  const nameHtml = rankNameHtml(result.name, baseTier.cls, result.variant, glowCls, result.isSecret ? null : baseTier.key);

  stage.innerHTML = `
    <div class="result-tier">${result.areaLabel} · ${baseTier.label}</div>
    <div class="result-name">${nameHtml}</div>
    <div class="result-rng">1 in ${fmtRngForResult(result)}</div>
    ${result.variant ? `<div class="result-variant">✦ ${result.variant.label} variant (×${result.variant.totalMult})</div>` : ''}
    ${result.isSecret ? `<div class="result-variant">🔒 Secret rank discovered!</div>` : ''}
    ${clicksNote ? `<div class="multi-note">${clicksNote}</div>` : (count && count > 1 ? `<div class="multi-note">shown: rarest of ${count} rolls (bulk)</div>` : '')}
  `;

  if(result.isSecret || ['pelicular','horizon','grandiose','zenith','unworldly','colossal','infinite','insanity','impossible'].includes(baseTier.key)){
    const flash = document.getElementById('flashBg');
    flash.style.background = `radial-gradient(circle at 50% 40%, ${result.isSecret ? '#a855f7' : tierGlowColor(baseTier.key)}, transparent 70%)`;
    flash.classList.remove('go');
    void flash.offsetWidth;
    flash.classList.add('go');
  }
}

function pushLog(result){
  state.log.unshift(result);
  if(state.log.length > 40) state.log.pop();
  renderLog();
}

function renderLog(){
  const log = document.getElementById('log');
  if(state.log.length === 0){
    log.innerHTML = `<div class="log-empty">No rolls yet.</div>`;
    return;
  }
  log.innerHTML = state.log.map(r => {
    const baseTier = r.isSecret ? SECRET_TIER : tierFor(r.baseRng);
    const suffix = r.variant ? ' ✦' : (r.isSecret ? ' 🔒' : '');
    return `
    <div class="log-row">
      <span class="lname">${rankNameHtml(r.name, baseTier.cls, r.variant, '', r.isSecret ? null : baseTier.key)}${suffix}</span>
      <span class="lrng">${fmtRngForResult(r)}</span>
    </div>
  `}).join('');
}

function updateStatStrip(){
  document.getElementById('statRolls').textContent = state.rolls.toLocaleString();
  document.getElementById('statRps').textContent = effectiveRps();
  document.getElementById('statBest').textContent = state.best
    ? (state.best.isSecret ? 'Secret ✦' : tierFor(state.best.baseRng).label)
    : '—';
}

function renderWorldTabs(){
  const el = document.getElementById('worldTabs');
  el.innerHTML = WORLDS.map((w,i) => `<button class="world-tab ${i===state.worldIdx?'active':''}" data-idx="${i}">${w.label}</button>`).join('');
  el.querySelectorAll('.world-tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.worldIdx = parseInt(btn.dataset.idx);
      state.areaIdx = 0;
      renderWorldTabs();
      renderAreaSelect();
      buildIndexAccordion();
      const titleEl = document.getElementById('indexPanelTitle');
      if(titleEl) titleEl.textContent = `Rank index — ${WORLDS[state.worldIdx].label}`;
      dbSaveMeta();
    });
  });
}

function renderAreaSelect(){
  const world = WORLDS[state.worldIdx];
  const el = document.getElementById('areaSelect');
  el.innerHTML = world.areas.map((a,i) => `<button class="area-btn ${i===state.areaIdx?'active':''}" data-idx="${i}">${a.label}</button>`).join('');
  el.querySelectorAll('.area-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.areaIdx = parseInt(btn.dataset.idx);
      renderAreaSelect();
      dbSaveMeta();
    });
  });
}

/* ============================================================
   RENDERING: INVENTORY VIEW
   ============================================================ */

function renderInventory(){
  const list = document.getElementById('invList');
  const summary = document.getElementById('invSummary');
  const allItems = Object.values(state.inventory);

  // Build area→world lookup
  const areaWorldMap = {};
  for(const world of WORLDS){
    for(const area of world.areas){
      areaWorldMap[area.label] = world.label;
    }
  }

  // Populate filter dropdowns (preserve current selection)
  const fWorld = document.getElementById('filterWorld');
  const fArea = document.getElementById('filterArea');
  const fVariant = document.getElementById('filterVariant');
  const fRank = document.getElementById('filterRank');
  if(!fWorld) return;

  const selWorld = fWorld.value;
  const selArea = fArea.value;
  const selVariant = fVariant.value;
  const selRank = fRank.value;

  const worlds = [...new Set(allItems.map(i => areaWorldMap[i.areaLabel] || '?').filter(Boolean))].sort();
  const areas = [...new Set(allItems.map(i => i.areaLabel))].sort();
  const variants = [...new Set(allItems.map(i => i.variant ? i.variant.label : '').filter(Boolean))].sort();
  const ranks = [...new Set(allItems.map(i => i.name))].sort();

  function rebuildSelect(el, values, placeholder){
    const prev = el.value;
    el.innerHTML = `<option value="">${placeholder}</option>` +
      values.map(v => `<option value="${escapeHtml(v)}" ${v===prev?'selected':''}>${escapeHtml(v)}</option>`).join('');
  }
  rebuildSelect(fWorld, worlds, 'All worlds');
  rebuildSelect(fArea, areas, 'All areas');
  rebuildSelect(fVariant, variants, 'All variants');
  rebuildSelect(fRank, ranks, 'All ranks');

  // Restore selections
  fWorld.value = selWorld;
  fArea.value = selArea;
  fVariant.value = selVariant;
  fRank.value = selRank;

  // Apply filters
  let items = allItems;
  if(fWorld.value) items = items.filter(i => (areaWorldMap[i.areaLabel] || '') === fWorld.value);
  if(fArea.value) items = items.filter(i => i.areaLabel === fArea.value);
  if(fVariant.value) items = items.filter(i => (i.variant ? i.variant.label : '') === fVariant.value);
  if(fRank.value) items = items.filter(i => i.name === fRank.value);

  const totalCount = allItems.reduce((s,i)=> s + i.count, 0);
  summary.textContent = `${allItems.length} unique · ${totalCount.toLocaleString()} total`;

  if(items.length === 0){
    list.innerHTML = `<div class="inv-empty">${allItems.length === 0 ? 'Nothing collected yet. Go roll something.' : 'No items match the current filters.'}</div>`;
    return;
  }

  items.sort((a,b)=> {
    if(a.isSecret && !b.isSecret) return -1;
    if(!a.isSecret && b.isSecret) return 1;
    return b.lastRng - a.lastRng;
  });

  list.innerHTML = items.map(it => {
    const variantTxt = it.variant ? ` · ${it.variant.label}` : '';
    const suffix = it.variant ? ' ✦' : (it.isSecret ? ' 🔒' : '');
    const nameEl = rankNameHtml(it.name, it.tierCls, it.variant, '', it.isSecret ? null : it.tierKey);
    return `
      <div class="inv-row">
        <div>
          <div class="iname">${nameEl}${suffix}</div>
          <div class="imeta">${it.areaLabel} · ${fmtRngForResult(it)} · ${it.tierLabel}${variantTxt}</div>
        </div>
        <span class="icount">×${it.count.toLocaleString()}</span>
      </div>
    `;
  }).join('');
}

function setupInventoryFilters(){
  ['filterWorld','filterArea','filterVariant','filterRank'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', renderInventory);
  });
}

// Toggles which card list (Axes, Consumables, or Equippables) is visible in the Items view — a
// single shared dropdown for the whole view, rather than several always-visible stacked lists.
function setupItemCategorySelect(){
  const sel = document.getElementById('itemCategorySelect');
  if(!sel) return;
  sel.addEventListener('change', ()=>{
    const axesEl = document.getElementById('itemCards');
    const consumablesEl = document.getElementById('consumableCards');
    const equipsEl = document.getElementById('equipCards');
    axesEl.style.display = sel.value === 'axes' ? '' : 'none';
    consumablesEl.style.display = sel.value === 'consumables' ? '' : 'none';
    equipsEl.style.display = sel.value === 'equips' ? '' : 'none';
  });
}

/* ============================================================
   RENDERING: INDEX VIEW (dropdowns / accordion)
   ============================================================ */

// Checks if a GLOBAL rank (spawns in every area of its world) has ever been found in ANY of
// that world's areas — globals aren't tied to a single area's inventory key.
function hasEverFoundGlobal(world, name){
  for(const area of world.areas){
    if(hasEverFoundRank(area.label, name)) return true;
  }
  return false;
}

// Checks if a specific rank (by area + name) is currently a requirement in the player's pinned
// recipe. Pinned materials always show their real name in the Index, bypassing the 1b+ mystery
// hide — you need to see what you're chasing. Discovery still takes priority over this: an
// already-found rank shows regardless of pin state, a pinned-but-unfound rank shows because it's
// pinned, and everything else still stays hidden until found.
function isInPinnedRecipe(areaLabel, name){
  const recipe = pinnedRecipeData();
  if(!recipe) return false;
  return recipe.requires.some(req => req.area === areaLabel && req.name === name);
}

// Ranks rarer than this stay fully hidden ("???" for name AND rarity) in the Index until the
// player has actually caught one — a genuine secret-of-scale rather than a bespoke Secret Rank.
const INDEX_MYSTERY_THRESHOLD = 1000000000; // 1/1b+

// Renders a single Index row for a rank/mutation, applying the hide-until-found rule for 1b+
// items and this rank's own unique deterministic color/font once revealed. `foundCheck` is a
// zero-arg function returning whether this specific rank has been found (lets callers use
// area-specific or world-wide global discovery checks as appropriate). `areaLabel` is used to
// check pinned-recipe bypass (found status still takes discovery priority over pin status).
function indexRankRowHtml(name, rng, isMutation, sourceTag, foundCheck, areaLabel){
  const t = tierFor(rng);
  const indent = isMutation ? ' style="padding-left:16px; opacity:0.9;"' : '';
  const arrow = isMutation ? '↳ ' : '';
  const fontSize = isMutation ? ' style="font-size:13px;"' : '';
  const src = sourceTag ? ` <span class="rank-src">(${sourceTag})</span>` : '';

  let displayName = name;
  if (name === 'Specific Minute') {
      const now = new Date();
      const targetMin = (now.getHours() * 17 + 42) % 60;
      displayName = `Specific Minute (xx:${targetMin.toString().padStart(2, '0')})`;
  }

  const isMystery = rng >= INDEX_MYSTERY_THRESHOLD && !foundCheck() && !(areaLabel && isInPinnedRecipe(areaLabel, name));

  if(isMystery){
    const mysteryHtml = rankNameHtml(name, t.cls, null, '', t.key, '???');
    return `<div class="rank-row mystery-row"${indent}><span${fontSize}>${mysteryHtml}</span><span class="rrng">??? · ???${src}</span></div>`;
  }

  const rankObj = findRankObj(areaLabel, name);
  let reqHtml = '';
  if(rankObj && rankObj.requirement){
      reqHtml = `
        <div class="sub-acc-item">
          <div class="sub-acc-head"><span>Requirement</span><span class="chev">▾</span></div>
          <div class="sub-acc-body">
            <div style="font-family:var(--mono); font-size:11px; color:var(--text-dim); padding:4px 0;">
              ${rankObj.requirement}
            </div>
          </div>
        </div>
      `;
  }

  const pinnedTag = (areaLabel && isInPinnedRecipe(areaLabel, name)) ? ' <span class="pin-tag">📌</span>' : '';
  const nameHtml = rankNameHtml(name, t.cls, null, '', t.key, displayName);
  return `<div class="rank-row"${indent}><div style="flex:1;"><span${fontSize}>${arrow}${nameHtml}${pinnedTag}</span><span class="rrng">1/${fmtRng(rng)} · ${t.label}${src}</span>${reqHtml}</div></div>`;
}

// Dedicated Secrets section of the Index — independent of which world tab is selected, since
// secret ranks are scattered across multiple worlds. Shows every secret's discovery status
// (plain + all 4 variants individually), a completion count, and hides names for anything
// completely undiscovered so it stays a genuine surprise until you actually find one.
function buildSecretsAccordion(){
  const el = document.getElementById('secretsAccordion');
  if(!el) return;

  let totalSlots = 0;
  let foundSlots = 0;
  let html = '';

  for(const secret of SECRET_RANKS){
    const plainFound = isSecretDiscovered(secret.key, null);
    const variantResults = VARIANT_CHAIN.map(v => ({ v, found: isSecretDiscovered(secret.key, v.key) }));
    const foundCount = (plainFound ? 1 : 0) + variantResults.filter(r => r.found).length;
    totalSlots += 1 + VARIANT_CHAIN.length;
    foundSlots += foundCount;

    const anyFound = foundCount > 0;
    const displayName = anyFound ? secret.name : '???';
    const progressTag = `<span class="secret-progress-tag">${foundCount}/${VARIANT_CHAIN.length + 1}</span>`;

    const plainRow = `<div class="rank-row ${plainFound?'':'mystery-row'}">
      <span class="rname ${plainFound?'t-secret':''}">${plainFound ? '🔒 '+secret.name : '???'}</span>
      <span class="rrng">${plainFound ? '??? · Secret' : '??? · ???'}</span>
    </div>`;

    const variantRows = variantResults.map(({v, found}) => `
      <div class="rank-row ${found?'':'mystery-row'}" style="padding-left:16px; opacity:0.9;">
        <span class="rname ${found?'t-secret vwrap '+v.cls:''}" style="font-size:13px;">${found ? `🔒 ↳ ${secret.name} ✦` : `↳ ???`}</span>
        <span class="rrng">${found ? `??? · Secret (${v.label})` : '??? · ???'}</span>
      </div>
    `).join('');

    html += `
      <div class="acc-item" data-acc="secret-${secret.key}">
        <div class="acc-head"><span>${anyFound ? '🔒 ' : '🔒 '}${displayName} ${progressTag}</span><span class="chev">▾</span></div>
        <div class="acc-body">${plainRow}${variantRows}</div>
      </div>
    `;
  }

  const summaryHtml = `<div class="secrets-summary">Overall: <b>${foundSlots} / ${totalSlots}</b> secret forms discovered</div>`;
  el.innerHTML = summaryHtml + html;

  el.querySelectorAll('.acc-head').forEach(head=>{
    head.addEventListener('click', ()=>{
      head.parentElement.classList.toggle('open');
    });
  });
}

function buildIndexAccordion(){
  const el = document.getElementById('indexAccordion');
  const world = WORLDS[state.worldIdx];
  let html = '';

  if(world.global && world.global.length){
    html += `
      <div class="acc-item" data-acc="global">
        <div class="acc-head"><span>Global — spawns everywhere</span><span class="chev">▾</span></div>
        <div class="acc-body">
          ${world.global.map(g => indexRankRowHtml(g.name, g.rng, false, null, () => hasEverFoundGlobal(world, g.name), null)).join('')}
        </div>
      </div>
    `;
  }

  for(const area of world.areas){
    let rowsHtml = '';

    if(area.isUniversalPool){
      // "All" has no fixed rank list of its own — its contents are every rank/mutation from
      // every OTHER area in the game. Show them here at their TRUE listed rarity (not the
      // x200 roll-time debuff, which only affects odds — see buildAreaPool/rollOnceForArea).
      for(const w of WORLDS){
        for(const a of w.areas){
          if(a.key === area.key) continue;
          for(const r of a.ranks){
            rowsHtml += indexRankRowHtml(r.name, r.rng, false, a.label, () => hasEverFoundRank(a.label, r.name), a.label);
            if(r.mutations){
              for(const m of r.mutations){
                rowsHtml += indexRankRowHtml(m.name, m.rng, true, a.label, () => hasEverFoundRank(a.label, m.name), a.label);
              }
            }
          }
        }
      }
    } else {
      for(const r of area.ranks){
        rowsHtml += indexRankRowHtml(r.name, r.rng, false, null, () => hasEverFoundRank(area.label, r.name), area.label);
        if(r.mutations){
          for(const m of r.mutations){
            rowsHtml += indexRankRowHtml(m.name, m.rng, true, null, () => hasEverFoundRank(area.label, m.name), area.label);
          }
        }
      }
    }

    // Secret ranks tied to this world/area only appear once discovered — rarity always stays hidden.
    // Each variant of a secret (plain, weird, odd, rainbow, grayscale) is tracked and shown separately.
    for(const secret of SECRET_RANKS){
      if(secret.worldKey && secret.worldKey !== world.key) continue;
      if(secret.areaKey && secret.areaKey !== area.key) continue;
      if(isSecretDiscovered(secret.key, null)){
        rowsHtml += `<div class="rank-row secret-row"><span class="rname t-secret">🔒 ${secret.name}</span><span class="rrng">??? · Secret</span></div>`;
      }
      for(const v of VARIANT_CHAIN){
        if(isSecretDiscovered(secret.key, v.key)){
          rowsHtml += `<div class="rank-row secret-row" style="padding-left:16px; opacity:0.9;"><span class="rname t-secret vwrap ${v.cls}" style="font-size:13px;">🔒 ↳ ${secret.name} ✦</span><span class="rrng">??? · Secret (${v.label})</span></div>`;
        }
      }
    }
    html += `
      <div class="acc-item" data-acc="${area.key}">
        <div class="acc-head"><span>${area.label}</span><span class="chev">▾</span></div>
        <div class="acc-body">${rowsHtml}</div>
      </div>
    `;
  }

  el.innerHTML = html;
  el.querySelectorAll('.acc-head').forEach(head=>{
    head.addEventListener('click', ()=>{
      head.parentElement.classList.toggle('open');
    });
  });
  setupSubAccordions(el);
}

/* ============================================================
   RENDERING: ITEMS VIEW (crafting)
   ============================================================ */

function renderItemCards(){
  renderPinnedRecipePanel();
  const el = document.getElementById('itemCards');
  el.innerHTML = AXE_ORDER.map(key=>{
    const axe = AXES[key];
    const owned = state.ownedAxes.includes(key);
    const equipped = state.equippedAxe === key;
    const isPinned = state.pinnedRecipe && state.pinnedRecipe.kind === 'axe' && state.pinnedRecipe.key === key;

    let reqHtml = '';
    let canCraft = true;
    if(axe.free){
      reqHtml = `<div class="req-row ok">Free · auto-equipped at start</div>`;
    } else {
      reqHtml = axe.requires.map(req=>{
        const have = getReqOwnedCount(req);
        const ok = have >= req.amount;
        if(!ok) canCraft = false;
        const variantTag = req.variant ? ` (${req.variant})` : '';
        const label = req.consumable ? CONSUMABLES[req.consumable].name : req.name;
        return `<div class="req-row ${ok?'ok':'short'}">${label}${variantTag} <span>${have.toLocaleString()} / ${req.amount.toLocaleString()}</span></div>`;
      }).join('');
    }

    const statsHtml = `
      <div class="istats">
        <span class="stat">luck <b>×${axe.stats.luckMult}</b></span>
        <span class="stat">bulk <b>${axe.stats.bulk}</b></span>
        <span class="stat">rolls/sec offline <b>${axe.stats.rps}</b></span>
      </div>
    `;

    let actionHtml = '';
    if(equipped){
      actionHtml = `<span class="badge-equipped">Equipped</span>`;
    } else if(owned){
      actionHtml = `<button class="btn small" data-equip="${key}">Equip</button>`;
    } else if(axe.free){
      actionHtml = '';
    } else {
      actionHtml = `<button class="btn small ${canCraft?'':'secondary'}" data-craft="${key}" ${canCraft?'':'disabled'}>Craft</button>`;
    }

    const pinBtn = axe.free ? '' :
      `<button class="btn small ${isPinned?'pinned-btn':'secondary'}" data-pin-axe="${key}" style="margin-right:6px;">${isPinned?'📌 Pinned':'📌 Pin'}</button>`;

    const bonusSub = axe.bonus ? `
      <div class="sub-acc-item" data-sub-acc="bonus-${key}">
        <div class="sub-acc-head"><span>✦ Bonus</span><span class="chev">▾</span></div>
        <div class="sub-acc-body"><span class="stat" style="color:var(--accent-2);">${axe.bonus}</span></div>
      </div>` : '';

    const recipeSub = !axe.free ? `
      <div class="sub-acc-item" data-sub-acc="recipe-${key}">
        <div class="sub-acc-head"><span>📋 Recipe${canCraft && !owned ? ' <span class="ready-tag">ready</span>' : ''}</span><span class="chev">▾</span></div>
        <div class="sub-acc-body"><div class="req-list">${reqHtml}</div></div>
      </div>` : '';

    return `
      <div class="item-card ${equipped?'equipped':''} ${isPinned?'pinned-card':''}">
        <div class="ihead">
          <span class="iname">${axe.name}</span>
          ${owned && !equipped ? '<span class="badge-owned">Owned</span>' : ''}
          ${isPinned ? '<span class="badge-pinned">Pinned</span>' : ''}
        </div>
        <div class="idesc">${axe.desc}</div>
        ${statsHtml}
        ${bonusSub}
        ${recipeSub}
        <div style="text-align:right; margin-top:10px;">${pinBtn}${actionHtml}</div>
      </div>
    `;
  }).join('');

  setupSubAccordions(el);

  el.querySelectorAll('[data-craft]').forEach(btn=>{
    btn.addEventListener('click', ()=> craftAxe(btn.dataset.craft));
  });
  el.querySelectorAll('[data-equip]').forEach(btn=>{
    btn.addEventListener('click', ()=> equipAxe(btn.dataset.equip));
  });
  el.querySelectorAll('[data-pin-axe]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const k = btn.dataset.pinAxe;
      if(state.pinnedRecipe && state.pinnedRecipe.kind === 'axe' && state.pinnedRecipe.key === k){
        clearPinnedRecipe();
      } else {
        setPinnedRecipe('axe', k);
      }
      renderItemCards();
      renderConsumableCards();
      buildIndexAccordion();
    });
  });
}

// Sets up click-to-toggle for the nested Bonus/Recipe sub-accordions within item cards. Reuses
// the same open/closed pattern as the Index accordion, just scoped one level deeper.
function setupSubAccordions(container){
  container.querySelectorAll('.sub-acc-head').forEach(head=>{
    head.addEventListener('click', (e)=>{
      e.stopPropagation();
      head.parentElement.classList.toggle('open');
    });
  });
}

function renderPinnedRecipePanel(){
  const el = document.getElementById('pinnedRecipePanel');
  if(!el) return;
  if(!state.pinnedRecipe){
    el.innerHTML = `<div class="pinned-panel empty">📌 No recipe pinned — pin an axe or consumable to track progress and use Pushpin / Gloves.</div>`;
    return;
  }
  const recipe = pinnedRecipeData();
  if(!recipe){ el.innerHTML=''; return; }
  const kind = state.pinnedRecipe.kind;
  const label = (kind === 'axe' ? AXES[state.pinnedRecipe.key].name : CONSUMABLES[state.pinnedRecipe.key].name);
  const target = rarestUnfinishedMaterial();
  const targetHtml = target
    ? `<span class="pin-target">🎯 Rarest missing: <b>${target.name}</b> (1/${fmtRng(target.rng)}) in ${target.area}</span>`
    : `<span class="pin-target" style="color:var(--ok)">✅ All materials gathered!</span>`;

  const reqRows = recipe.requires.map(req=>{
    const have = getOwnedCount(req.area, req.name, req.variant);
    const ok = have >= req.amount;
    return `<div class="req-row ${ok?'ok':'short'}">${req.name} <span>${have.toLocaleString()} / ${req.amount.toLocaleString()}</span></div>`;
  }).join('');

  el.innerHTML = `
    <div class="pinned-panel">
      <div class="pinned-header">
        <span>📌 Pinned: <b>${escapeHtml(label)}</b></span>
        <button class="btn small secondary" id="unpinBtn">Unpin</button>
      </div>
      ${targetHtml}
      <div class="req-list" style="margin-top:6px;">${reqRows}</div>
    </div>`;
  el.querySelector('#unpinBtn').addEventListener('click', ()=>{
    clearPinnedRecipe();
    renderItemCards();
    renderConsumableCards();
    buildIndexAccordion();
  });
}

function renderEquipCards(){
  const el = document.getElementById('equipCards');
  if(!el) return;

  if(EQUIP_ORDER.length === 0){
    el.innerHTML = `<div class="inv-empty">No equippables exist yet — check back later.</div>`;
    return;
  }

  el.innerHTML = EQUIP_ORDER.map(key=>{
    const item = EQUIPS[key];
    const owned = state.ownedEquips.includes(key);
    const equipped = state.equippedItem === key;

    let reqHtml = '';
    let canCraft = true;
    reqHtml = item.requires.map(req=>{
      const have = getOwnedCount(req.area, req.name, req.variant);
      const ok = have >= req.amount;
      if(!ok) canCraft = false;
      const variantTag = req.variant ? ` (${req.variant})` : '';
      return `<div class="req-row ${ok?'ok':'short'}">${req.name}${variantTag} <span>${have.toLocaleString()} / ${req.amount.toLocaleString()}</span></div>`;
    }).join('');
    if(item.requiresConsumables){
      reqHtml += item.requiresConsumables.map(creq=>{
        const have = getConsumableCount(creq.key);
        const ok = have >= creq.amount;
        if(!ok) canCraft = false;
        const cname = CONSUMABLES[creq.key] ? CONSUMABLES[creq.key].name : creq.key;
        return `<div class="req-row ${ok?'ok':'short'}">${cname} (consumable) <span>${have.toLocaleString()} / ${creq.amount.toLocaleString()}</span></div>`;
      }).join('');
    }

    // Equips show their MODIFIERS (relative to the axe), not absolute stats
    const statParts = [];
    if(item.luckMult) statParts.push(`<span class="stat">luck <b>×${item.luckMult}</b></span>`);
    if(item.bulkAdd) statParts.push(`<span class="stat">bulk <b>+${item.bulkAdd}</b></span>`);
    if(item.rpsMult) statParts.push(`<span class="stat">rps <b>×${item.rpsMult}</b></span>`);
    if(item.idleEfficiencyMult) statParts.push(`<span class="stat">idle efficiency <b>×${item.idleEfficiencyMult}</b></span>`);
    const statsHtml = statParts.length ? `<div class="istats">${statParts.join('')}</div>` : '';

    let actionHtml = '';
    if(equipped){
      actionHtml = `<button class="btn small secondary" data-unequip="1">Unequip</button>`;
    } else if(owned){
      actionHtml = `<button class="btn small" data-equip-item="${key}">Equip</button>`;
    } else {
      actionHtml = `<button class="btn small ${canCraft?'':'secondary'}" data-craft-equip="${key}" ${canCraft?'':'disabled'}>Craft</button>`;
    }

    const bonusSub = item.bonus ? `
      <div class="sub-acc-item" data-sub-acc="ebonus-${key}">
        <div class="sub-acc-head"><span>✦ Bonus</span><span class="chev">▾</span></div>
        <div class="sub-acc-body"><span class="stat" style="color:var(--accent-2);">${item.bonus}</span></div>
      </div>` : '';

    const recipeSub = `
      <div class="sub-acc-item" data-sub-acc="erecipe-${key}">
        <div class="sub-acc-head"><span>📋 Recipe${canCraft && !owned ? ' <span class="ready-tag">ready</span>' : ''}</span><span class="chev">▾</span></div>
        <div class="sub-acc-body"><div class="req-list">${reqHtml}</div></div>
      </div>`;

    return `
      <div class="item-card ${equipped?'equipped':''}">
        <div class="ihead">
          <span class="iname">${item.name}</span>
          ${owned && !equipped ? '<span class="badge-owned">Owned</span>' : ''}
        </div>
        <div class="idesc">${item.desc}</div>
        ${statsHtml}
        ${bonusSub}
        ${recipeSub}
        <div style="text-align:right; margin-top:10px;">${actionHtml}</div>
      </div>
    `;
  }).join('');

  setupSubAccordions(el);

  el.querySelectorAll('[data-craft-equip]').forEach(btn=>{
    btn.addEventListener('click', ()=> craftEquip(btn.dataset.craftEquip));
  });
  el.querySelectorAll('[data-equip-item]').forEach(btn=>{
    btn.addEventListener('click', ()=> equipItem(btn.dataset.equipItem));
  });
  el.querySelectorAll('[data-unequip]').forEach(btn=>{
    btn.addEventListener('click', ()=> unequipItem());
  });
}

function craftAxe(key){
  const axe = AXES[key];
  if(!axe || axe.free || state.ownedAxes.includes(key)) return;
  // verify and consume
  for(const req of axe.requires){
    if(getReqOwnedCount(req) < req.amount) return;
  }
  for(const req of axe.requires){
    if(req.consumable){
      state.consumables[req.consumable] -= req.amount;
    } else {
      const k = invKey(req.area, req.name, req.variant || null);
      state.inventory[k].count -= req.amount;
      dbSaveInvItem(state.inventory[k]);
    }
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

function equipAxe(key){
  if(!state.ownedAxes.includes(key)) return;
  state.equippedAxe = key;
  dbSaveMeta();
  renderItemCards();
  renderAxeStrip();
  updateStatStrip();
}

function craftEquip(key){
  const item = EQUIPS[key];
  if(!item || state.ownedEquips.includes(key)) return;
  for(const req of item.requires){
    if(getOwnedCount(req.area, req.name, req.variant) < req.amount) return;
  }
  // Some equips also consume owned CONSUMABLES as part of their recipe (e.g. Axenades needing
  // 2 Explosive Axe Bombs), not just raw inventory ranks.
  if(item.requiresConsumables){
    for(const creq of item.requiresConsumables){
      if(getConsumableCount(creq.key) < creq.amount) return;
    }
  }
  for(const req of item.requires){
    const k = invKey(req.area, req.name, req.variant || null);
    state.inventory[k].count -= req.amount;
    dbSaveInvItem(state.inventory[k]);
  }
  if(item.requiresConsumables){
    for(const creq of item.requiresConsumables){
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

function equipItem(key){
  if(!state.ownedEquips.includes(key)) return;
  // Toggling the already-equipped item off goes back to bare-handed
  state.equippedItem = (state.equippedItem === key) ? null : key;
  dbSaveMeta();
  renderEquipCards();
  renderAxeStrip();
  updateStatStrip();
}

function unequipItem(){
  state.equippedItem = null;
  dbSaveMeta();
  renderEquipCards();
  renderAxeStrip();
  updateStatStrip();
}

function renderConsumableCards(){
  const el = document.getElementById('consumableCards');
  if(!el) return;
  const now = Date.now();

  el.innerHTML = CONSUMABLE_ORDER.map(key=>{
    const item = CONSUMABLES[key];
    const count = getConsumableCount(key);
    const isPinned = state.pinnedRecipe && state.pinnedRecipe.kind === 'consumable' && state.pinnedRecipe.key === key;

    let canCraft = true;
    const reqHtml = item.requires.map(req=>{
      const have = getOwnedCount(req.area, req.name, req.variant);
      const ok = have >= req.amount;
      if(!ok) canCraft = false;
      return `<div class="req-row ${ok?'ok':'short'}">${req.name} <span>${have.toLocaleString()} / ${req.amount.toLocaleString()}</span></div>`;
    }).join('');

    // Buff / bomb / watergun status
    let statusHtml = '';
    if(key === 'pushpin' && state.activeBuffs && state.activeBuffs.pushpin){
      statusHtml = `<div class="buff-active">⚡ Active: ${state.activeBuffs.pushpin.rollsLeft.toLocaleString()} rolls left</div>`;
    }
    if(key === 'gloves' && state.activeBuffs && state.activeBuffs.gloves){
      statusHtml = `<div class="buff-active">⚡ Active: ${state.activeBuffs.gloves.rollsLeft.toLocaleString()} rolls left</div>`;
    }
    if(key === 'bomb'){
      if(state.bombCharge){
        const msLeft = state.bombCharge.chargingUntil - now;
        if(msLeft > 0){
          statusHtml = `<div class="buff-active">⏳ Charging: ${fmtDuration(Math.ceil(msLeft/1000))} left</div>`;
        } else {
          statusHtml = `<div class="buff-active ready">💥 READY — trigger to fire!</div>`;
        }
      }
    }
    if(key === 'watergun'){
      const activeStacks = wgunActiveStacks();
      if(activeStacks > 0){
        const stackLines = state.wgunStacks.map((s,i)=>{
          const msLeft = s.expiresAt - now;
          return `<div>Stack ${i+1}: ${fmtDuration(Math.ceil(msLeft/1000))} left</div>`;
        }).join('');
        const curMult = Math.min(1 + activeStacks * 0.5, 2.5);
        statusHtml = `<div class="buff-active">💧 ${activeStacks}/3 stacks active · ×${curMult.toFixed(1)} rps<br>${stackLines}</div>`;
      }
    }
    if(key === 'errredirector' && isErrRedirectorActive()){
      const msLeft = state.errRedirectorUntil - now;
      statusHtml = `<div class="buff-active">📡 404 static cleared — ${fmtDuration(Math.ceil(msLeft/1000))} left</div>`;
    }

    // Action buttons
    let actionHtml = '';
    if(key === 'bomb' && state.bombCharge){
      const msLeft = state.bombCharge.chargingUntil - now;
      if(msLeft <= 0){
        actionHtml = `<button class="btn small" data-trigger-bomb="1">💥 Trigger</button>`;
      } else {
        actionHtml = `<button class="btn small secondary" disabled>Charging…</button>`;
      }
    } else if(key === 'watergun'){
      const activeStacks = wgunActiveStacks();
      const atCap = activeStacks >= CONSUMABLES.watergun.maxStacks;
      const useDisabled = count <= 0 || atCap;
      const useTitle = count <= 0 ? 'None owned' : atCap ? 'Already at max stacks' : '';
      actionHtml = `
        <button class="btn small secondary" data-craft-consumable="${key}" ${canCraft?'':'disabled'}>Craft</button>
        <button class="btn small ${useDisabled?'secondary':''}" data-use-consumable="${key}" ${useDisabled?'disabled':''} title="${useTitle}">Use${count > 0 ? ` (${count})` : ''}</button>
      `;
    } else if(key === 'errredirector'){
      const useDisabled = count <= 0;
      const useTitle = count <= 0 ? 'None owned' : (isErrRedirectorActive() ? 'Extends the current 12h window' : '');
      actionHtml = `
        <button class="btn small secondary" data-craft-consumable="${key}" ${canCraft?'':'disabled'}>Craft</button>
        <button class="btn small ${useDisabled?'secondary':''}" data-use-consumable="${key}" ${useDisabled?'disabled':''} title="${useTitle}">Use${count > 0 ? ` (${count})` : ''}</button>
      `;
    } else {
      const useDisabled = count <= 0 || !state.pinnedRecipe;
      const useTitle = !state.pinnedRecipe ? 'Pin a recipe first' : (count <= 0 ? 'None owned' : '');
      actionHtml = `
        <button class="btn small secondary" data-craft-consumable="${key}" ${canCraft?'':'disabled'}>Craft</button>
        ${key !== 'bomb' || !state.bombCharge
          ? `<button class="btn small ${useDisabled?'secondary':''}" data-use-consumable="${key}" ${useDisabled?'disabled':''} title="${useTitle}">Use${count > 0 ? ` (${count})` : ''}</button>`
          : ''}
      `;
    }

    const pinBtn = `<button class="btn small ${isPinned?'pinned-btn':'secondary'}" data-pin-consumable="${key}" style="margin-right:6px;">${isPinned?'📌 Pinned':'📌 Pin'}</button>`;

    const effectSub = `
      <div class="sub-acc-item" data-sub-acc="effect-${key}">
        <div class="sub-acc-head"><span>✦ Effect</span><span class="chev">▾</span></div>
        <div class="sub-acc-body"><span class="stat" style="color:var(--accent-2);">${item.effect}</span></div>
      </div>`;

    const recipeSub = `
      <div class="sub-acc-item" data-sub-acc="recipe-${key}">
        <div class="sub-acc-head"><span>📋 Recipe${canCraft ? ' <span class="ready-tag">ready</span>' : ''}</span><span class="chev">▾</span></div>
        <div class="sub-acc-body"><div class="req-list">${reqHtml}</div></div>
      </div>`;

    return `
      <div class="item-card ${isPinned?'pinned-card':''}">
        <div class="ihead">
          <span class="iname">${item.name}</span>
          ${count > 0 ? `<span class="badge-owned">×${count}</span>` : ''}
          ${isPinned ? '<span class="badge-pinned">Pinned</span>' : ''}
        </div>
        <div class="idesc">${item.desc}</div>
        ${statusHtml}
        ${effectSub}
        ${recipeSub}
        <div style="text-align:right; margin-top:10px;">${pinBtn}${actionHtml}</div>
      </div>
    `;
  }).join('');

  setupSubAccordions(el);

  el.querySelectorAll('[data-craft-consumable]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{ e.stopPropagation(); craftConsumable(btn.dataset.craftConsumable); });
  });
  el.querySelectorAll('[data-use-consumable]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{ e.stopPropagation(); useConsumable(btn.dataset.useConsumable); });
  });
  el.querySelectorAll('[data-trigger-bomb]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{ e.stopPropagation(); triggerBomb(); });
  });
  el.querySelectorAll('[data-pin-consumable]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const k = btn.dataset.pinConsumable;
      if(state.pinnedRecipe && state.pinnedRecipe.kind === 'consumable' && state.pinnedRecipe.key === k){
        clearPinnedRecipe();
      } else {
        setPinnedRecipe('consumable', k);
      }
      renderItemCards();
      renderConsumableCards();
      buildIndexAccordion();
    });
  });
}

function getConsumableCount(key){
  return (state.consumables && state.consumables[key]) || 0;
}

function wgunActiveStacks(){
  if(!state.wgunStacks) return 0;
  const now = Date.now();
  state.wgunStacks = state.wgunStacks.filter(s => s.expiresAt > now);
  return state.wgunStacks.length;
}

// [Coin Bag] (equip): every click has a 1/5 chance to add a 15-second stack. Each active stack
// contributes +5% of your CURRENT luck additively (capped at +125% total) and +0.1x mutation luck
// (capped at +1.5x total). Stacks are purely time-decayed (15s each), same pattern as the
// Watergun's stacks, just on its own independent timer/state so the two systems never collide.
function coinBagActiveStacks(){
  if(!state.coinBagStacks) return 0;
  const now = Date.now();
  state.coinBagStacks = state.coinBagStacks.filter(s => s.expiresAt > now);
  return state.coinBagStacks.length;
}

// Returns { luckAddPct, mutationLuckAdd } — the current additive luck% bonus (capped at 125) and
// additive mutation luck bonus (capped at 1.5) from active Coin Bag stacks. Each stack is worth
// +5% luck / +0.1x mutation luck; the CURRENT-luck-% part is applied by the caller since "current
// luck" needs to be evaluated at the point of use (it changes as other buffs stack/decay).
function coinBagBonus(){
  const stacks = coinBagActiveStacks();
  if(stacks === 0) return { luckAddPct: 0, mutationLuckAdd: 0 };
  return {
    luckAddPct: Math.min(stacks * 5, 125),
    mutationLuckAdd: Math.min(stacks * 0.1, 1.5),
  };
}

// Effective RPS including watergun stacks: base * (1 + stacks * 0.5), capped at base * 2.5
function effectiveRps(){
  const base = currentAxe().stats.rps;
  const stacks = wgunActiveStacks();
  const wgunMult = stacks === 0 ? 1 : Math.min(1 + stacks * CONSUMABLES.watergun.stackMult, CONSUMABLES.watergun.capMult);
  const equip = currentEquip();
  const equipMult = (equip && equip.rpsMult) ? equip.rpsMult : 1;
  const idleEffMult = (equip && equip.idleEfficiencyMult) ? equip.idleEfficiencyMult : 1;
  return base * wgunMult * equipMult * idleEffMult;
}

// [Irritation] (Rage Axe only): for every FULL day the player has been continuously idle, every
// OTHER idle-related bonus on this axe (rps included) gets +27.5% efficiency. This is purely a
// function of elapsed idle seconds, so "resets when active" needs no stored state at all — the
// instant the player is active again, elapsed idle time is ~0 and the multiplier is naturally 1x.
function irritationMultiplier(axe, idleSeconds){
  if(!axe.irritation) return 1;
  const fullDaysIdle = Math.floor(idleSeconds / 86400);
  if(fullDaysIdle <= 0) return 1;
  return 1 + (axe.irritation.perDayPct / 100) * fullDaysIdle;
}

function craftConsumable(key){
  const item = CONSUMABLES[key];
  if(!item) return;
  for(const req of item.requires){
    if(getOwnedCount(req.area, req.name, req.variant) < req.amount) return;
  }
  for(const req of item.requires){
    const k = invKey(req.area, req.name, req.variant || null);
    state.inventory[k].count -= req.amount;
    dbSaveInvItem(state.inventory[k]);
  }
  if(!state.consumables) state.consumables = {};
  state.consumables[key] = (state.consumables[key] || 0) + 1;
  dbSaveMeta();
  renderConsumableCards();
  renderInventory();
}

function useConsumable(key){
  if(getConsumableCount(key) <= 0) return;

  if(key === 'watergun'){
    if(!state.wgunStacks) state.wgunStacks = [];
    const now = Date.now();
    state.wgunStacks = state.wgunStacks.filter(s => s.expiresAt > now);
    if(state.wgunStacks.length >= CONSUMABLES.watergun.maxStacks){
      alertUser('Already at max watergun stacks (×3)! Wait for one to expire first.');
      return;
    }
    state.consumables.watergun--;
    state.wgunStacks.push({ expiresAt: now + CONSUMABLES.watergun.durationSeconds * 1000 });
    dbSaveMeta();
    renderConsumableCards();
    renderAxeStrip();
    updateStatStrip();
    return;
  }

  if(key === 'errredirector'){
    state.consumables.errredirector--;
    const now = Date.now();
    const base = isErrRedirectorActive() ? state.errRedirectorUntil : now;
    state.errRedirectorUntil = base + CONSUMABLES.errredirector.durationSeconds * 1000;
    dbSaveMeta();
    renderConsumableCards();
    renderLog();
    renderInventory();
    return;
  }

  if(!state.pinnedRecipe){
    alertUser('Pin a recipe first — this only works on your pinned axe or consumable.');
    return;
  }

  if(key === 'pushpin' || key === 'gloves'){
    const target = rarestUnfinishedMaterial();
    if(!target){
      alertUser('Your pinned recipe has nothing left to gather — no target to boost.');
      return;
    }
    state.consumables[key]--;
    if(!state.activeBuffs) state.activeBuffs = {};
    state.activeBuffs[key] = { rollsLeft: CONSUMABLES[key].duration };
    dbSaveMeta();
    renderConsumableCards();
  } else if(key === 'bomb'){
    if(state.bombCharge){
      alertUser('The bomb is already armed — only one can charge at a time.');
      return;
    }
    state.consumables.bomb--;
    // [Axenades] (equip): if worn, the bomb's charge time is halved (x2 faster).
    const equip = currentEquip();
    const chargeSpeedMult = (equip && equip.bombChargeSpeedMult) ? equip.bombChargeSpeedMult : 1;
    const chargeMs = (CONSUMABLES.bomb.chargeSeconds * 1000) / chargeSpeedMult;
    state.bombCharge = { chargingUntil: Date.now() + chargeMs };
    dbSaveMeta();
    renderConsumableCards();
  }
}

function alertUser(msg){
  // Lightweight non-blocking notice using the offline banner slot
  const el = document.getElementById('offlineBanner');
  if(!el) { console.log(msg); return; }
  el.innerHTML = `<div class="offline-banner"><p>${escapeHtml(msg)}</p><button class="btn small" id="dismissOffline">Got it</button></div>`;
  document.getElementById('dismissOffline').addEventListener('click', ()=>{ el.innerHTML=''; });
}

function triggerBomb(){
  if(!state.bombCharge) return;
  if(Date.now() < state.bombCharge.chargingUntil) return;

  const world = WORLDS[state.worldIdx];
  const area = world.areas[state.areaIdx];
  const axe = currentAxe();
  const cfg = CONSUMABLES.bomb;
  const equip = currentEquip();

  // [Axenades] (equip): if worn, the bomb itself is x1.5 more efficient — more rolls per trigger.
  const bombEffMult = (equip && equip.bombEfficiencyMult) ? equip.bombEfficiencyMult : 1;
  const bombRollCount = Math.round(cfg.rollCount * bombEffMult);

  let best = null;
  const counts = {};
  let totalRollsFired = 0;
  for(let i=0;i<bombRollCount;i++){
    const r = rollOnceForArea(world, area, cfg.luckMult, { mutationLuckMult: cfg.mutationLuckMult, isBomb: true });
    const k = invKey(r.areaLabel, r.name, r.variant ? r.variant.key : null);
    if(!counts[k]) counts[k] = { result:r, count:0 };
    counts[k].count++;
    totalRollsFired++;
    if(!best || r.finalRng > best.finalRng) best = r;
  }

  // [Axenades] (equip): also fires an EXTRA bonus batch when the bomb goes off, on top of the
  // bomb's own (possibly efficiency-boosted) roll batch above.
  if(equip && equip.bombTriggerBonus){
    const bb = equip.bombTriggerBonus;
    for(let i=0;i<bb.rolls;i++){
      const r = rollOnceForArea(world, area, bb.luckMult, { mutationLuckMult: bb.mutationLuckMult || 1, isBomb: true });
      const k = invKey(r.areaLabel, r.name, r.variant ? r.variant.key : null);
      if(!counts[k]) counts[k] = { result:r, count:0 };
      counts[k].count++;
      totalRollsFired++;
      if(!best || r.finalRng > best.finalRng) best = r;
    }
  }

  for(const k in counts){
    addToInventory(counts[k].result, counts[k].count);
  }
  state.rolls += totalRollsFired;
  state.bombCharge = null;
  if(best){
    pushLog(best);
    renderStage(best, totalRollsFired);
    if(!state.best || best.finalRng > state.best.finalRng) state.best = best;
  }
  renderInventory();
  refreshLiveViews();
  updateStatStrip();
  renderConsumableCards();
  dbSaveMeta();
}

/* ============================================================
   NAV / VIEW SWITCHING
   ============================================================ */

let currentView = 'roll';

function showView(name){
  currentView = name;
  document.querySelectorAll('.view').forEach(v=> v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=> b.classList.toggle('active', b.dataset.view === name));
  refreshLiveViews();
}

document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> showView(btn.dataset.view));
});

function refreshLiveViews(){
  if(currentView === 'items'){ renderItemCards(); renderConsumableCards(); renderEquipCards(); }
  if(currentView === 'inventory') renderInventory();
}

/* ============================================================
   ROLLING (manual, with bulk from axe)
   ============================================================ */

// Processes a click-bonus rule set (from an axe OR an equip) against the current click count,
// Processes a "fires on every roll, not every click" bonus rule (e.g. Magic Wand's Glitter
// Spread). Unlike processClickBonusRules (which checks the rule once per click against
// state.clickCount), this rolls the dice once per INDIVIDUAL roll passed to it — including
// its own freshly-spawned bonus rolls, which is what lets it chain. chainCapPerClick bounds
// the total extra rolls this can produce in a single click so a lucky chain can't run away.
// Only called from live doRoll() clicks — never from offline simulation.
function processPerRollBonus(rule, world, area, results, updateBest, baseRollCount){
  if(!rule) return 0;
  const chance = rule.chance != null ? rule.chance : (1 / (rule.oneIn || 1));
  let fired = 0;
  let toCheck = baseRollCount; // how many "roll events" still need to be checked against the chance
  while(toCheck > 0 && fired < rule.chainCapPerClick){
    toCheck--;
    if(Math.random() < chance){
      const remainingBudget = rule.chainCapPerClick - fired;
      const rollCount = Math.min(rule.rolls, remainingBudget);
      const pool = buildAreaPool(world, area, { mutationLuckMult: rule.mutationLuckMult || 1 });
      for(let i=0;i<rollCount;i++){
        const r = rollOnceForArea(world, area, rule.luckMult, { mutationLuckMult: rule.mutationLuckMult || 1 }, pool);
        results.push(r);
        fired++;
        updateBest(r);
      }
      // Each newly-spawned bonus roll is itself a roll event that can trigger Glitter Spread again — this is the chain.
      toCheck += rollCount;
    }
  }
  return fired;
}

// pushing any triggered rolls into `results` and returning how many extra rolls fired. Shared so
// axes and equips don't need two separate copies of this logic.
// Processes a click-bonus rule set (from an axe OR an equip) against the current click count,
// pushing any triggered rolls into `results` and returning how many extra rolls fired. Shared so
// axes and equips don't need two separate copies of this logic.
//
// Supports optional dynamic functions for rules whose roll count/luck depend on the player's
// LIVE stats at the moment of firing rather than a fixed value (e.g. Puny Thingy's click bonus:
// rolls = currentBulk/2, luckMult = 2x currentLuck, mutationLuckMult = clamp(currentLuck*0.2, 0.2, 5)):
//   dynamicRollsFn()          -> returns the roll count for this trigger
//   dynamicLuckMultFn()       -> returns the luckMult for this trigger
//   dynamicMutationLuckFn()   -> returns the mutationLuckMult for this trigger
function processClickBonusRules(rules, world, area, results, updateBest){
  if(!rules) return 0;
  const ruleList = Array.isArray(rules) ? rules : [rules];
  let fired = 0;
  for(const rule of ruleList){
    if(rule.everyNClicks && state.clickCount % rule.everyNClicks !== 0) continue;
    const chance = rule.chance != null ? rule.chance : (1 / (rule.oneIn || 1));
    if(Math.random() < chance){
      const rollCount = rule.dynamicRollsFn ? Math.max(0, Math.round(rule.dynamicRollsFn())) : (rule.rolls || 1);
      const luckMult = rule.dynamicLuckMultFn ? rule.dynamicLuckMultFn() : rule.luckMult;
      const mutationLuckMult = rule.dynamicMutationLuckFn ? rule.dynamicMutationLuckFn() : (rule.mutationLuckMult || 1);
      
      const pool = buildAreaPool(world, area, { mutationLuckMult });
      
      for(let i=0;i<rollCount;i++){
        const r = rollOnceForArea(world, area, luckMult, { mutationLuckMult }, pool);
        results.push(r);
        fired++;
        updateBest(r);
      }
    }
  }
  return fired;
}

// Performs ONE full "click" worth of rolling: base bulk rolls, Glitter Spread-style per-roll
// bonuses, axe/equip click bonuses, sunrays, Coin Bag stacking, inventory commit, and log push.
// Shared by the real ROLL button (doRoll) and the mobile skillcheck payout, so both behave
// identically using the current axe/equip stats — the skillcheck is not a separate, weaker path.
// Returns { best, totalRolls } — does NOT touch the stage/troll-roll display, callers do that.
function performClick(){
  state.trollstoneEligible = !!state.lastRollWasTroll;
  state.lastRollWasTroll = false;
  const axe = currentAxe();
  const equip = currentEquip();
  const bulk = effectiveBulk();
  let best = null;
  const results = [];
  // [Coin Bag] (equip): active stacks add +mutation luck to EVERY roll, not just click-bonus ones.
  const coinBagMutBonus = (equip && equip.key === 'coinbag') ? coinBagBonus().mutationLuckAdd : 0;
  const rollOpts = coinBagMutBonus > 0 ? { mutationLuckMult: 1 + coinBagMutBonus } : undefined;
  for(let i=0;i<bulk;i++){
    const r = rollOnce(rollOpts);
    results.push(r);
    if(!best || r.finalRng > best.finalRng) best = r;
  }
  state.rolls += bulk;
  state.clickCount = (state.clickCount || 0) + 1;
  tickActiveBuffs(bulk);

  const world = WORLDS[state.worldIdx];
  const area = world.areas[state.areaIdx];
  const updateBest = (r) => { if(!best || r.finalRng > best.finalRng) best = r; };

  // [Magic Wand] Glitter Spread: a perRollBonus fires independently on EVERY roll in this click
  // (base rolls AND its own chained bonus rolls), not once per click like normal click bonuses.
  // Capped per-click via chainCapPerClick so a lucky chain can't run away indefinitely.
  let perRollBonusFired = 0;
  if(axe.perRollBonus){
    perRollBonusFired = processPerRollBonus(axe.perRollBonus, world, area, results, updateBest, bulk);
  }
  if(equip && equip.perRollBonus){
    perRollBonusFired += processPerRollBonus(equip.perRollBonus, world, area, results, updateBest, bulk);
  }

  // Click-triggered bonus rolls from the axe (e.g. Food Eater, Dreamers Prism, GlowAxe Guidance)
  let clickBonusFired = processClickBonusRules(axe.clickBonus, world, area, results, updateBest) + perRollBonusFired;

  // Click-triggered bonus rolls from the equipped item, if any (same rule shape as axes)
  if(equip){
    clickBonusFired += processClickBonusRules(equip.clickBonus, world, area, results, updateBest);
  }

  // [Coin Bag] (equip): on click, 1/5 chance to add a 15-second luck/mutation-luck stack.
  if(equip && equip.key === 'coinbag' && equip.coinBagStackChance){
    if(Math.random() < equip.coinBagStackChance){
      if(!state.coinBagStacks) state.coinBagStacks = [];
      state.coinBagStacks.push({ expiresAt: Date.now() + equip.coinBagStackDurationMs });
    }
  }

  // Sunrays: every N clicks, add bonus rolls (e.g. GlowAxe every 75th click)
  if(axe.sunrays && state.clickCount % axe.sunrays.everyNClicks === 0){
    for(let i=0;i<axe.sunrays.rolls;i++){
      const r = rollOnceForArea(world, area, axe.sunrays.luckMult);
      results.push(r);
      clickBonusFired++;
      updateBest(r);
    }
  }
  state.rolls += clickBonusFired;
  if(clickBonusFired > 0) tickActiveBuffs(clickBonusFired);

  for(const r of results){
    addToInventory(r, 1);
  }
  pushLog(best);

  return { best, totalRolls: bulk + clickBonusFired };
}

function doRoll(){
  const { best, totalRolls } = performClick();

  // Troll roll: 1/5,000 chance PER CLICK, no requirement on the real result. When it fires, shows
  // a genuinely Unworldly+ rank from the current area for 3 seconds before revealing the truth.
  // Inventory, log, and stats above are already committed to the REAL result — this is display-only.
  const trollArea = WORLDS[state.worldIdx].areas[state.areaIdx];
  const fake = Math.random() < TROLL_CHANCE ? rollTrollFake(trollArea, best.name) : null;
  if(fake){
    state.lastRollWasTroll = true;
    rollGeneration++;
    const myGeneration = rollGeneration;
    renderStage(best, totalRolls, fake);
    setTimeout(()=>{
      if(myGeneration === rollGeneration) renderStage(best, totalRolls);
    }, 3000);
  } else {
    rollGeneration++;
    renderStage(best, totalRolls);
  }

  refreshLiveViews();

  if(!state.best || best.finalRng > state.best.finalRng) state.best = best;
  updateStatStrip();
  dbSaveMeta();
}

// Counts down rolls remaining on Pushpin / Universal Recipe Gloves buffs, clearing them at zero
function tickActiveBuffs(rollCount){
  if(!state.activeBuffs) return;
  let changed = false;
  for(const key of Object.keys(state.activeBuffs)){
    const buff = state.activeBuffs[key];
    if(!buff) continue;
    buff.rollsLeft -= rollCount;
    changed = true;
    if(buff.rollsLeft <= 0){
      delete state.activeBuffs[key];
    }
  }
  if(changed) renderConsumableCards();
}


document.getElementById('rollBtn').addEventListener('click', doRoll);

/* ============================================================
   MOBILE AUTO-ROLL SKILLCHECK
   A mobile-only alternative to spamming the ROLL button (which can drop taps in installed
   PWA mode). While active, small timed circles spawn on the stage; tapping one fires a batch
   of CLICKS (full bulk + axe/equip click bonuses, same as pressing ROLL) sized by tap accuracy.
   Tapping in the circle's final 1.4-1.5s "perfect window" grants a stronger 5-second sustained
   payout instead of a one-time batch. This uses the player's current axe/equipment stats, not
   a separate flat-roll path — a skillcheck hit is a real stand-in for N presses of ROLL.
   ============================================================ */

// Performs `clickCount` full CLICKS (each one running the exact same logic as pressing ROLL:
// base bulk, axe/equip click bonuses, Glitter Spread-style per-roll bonuses, sunrays, etc.) —
// used by the mobile skillcheck payout so a skillcheck hit is a real stand-in for N clicks,
// not a separate weaker flat-roll path. Renders only the final click's result on the stage,
// alongside a "X clicks × ~N rolls = total" summary so the payout is actually visible.
function performBulkRolls(clickCount){
  if(clickCount <= 0) return;
  let overallBest = null;
  let grandTotalRolls = 0;
  for(let i=0;i<clickCount;i++){
    const { best, totalRolls } = performClick();
    grandTotalRolls += totalRolls;
    if(best && (!overallBest || best.finalRng > overallBest.finalRng)) overallBest = best;
  }
  rollGeneration++;
  const avgPerClick = Math.round(grandTotalRolls / clickCount);
  const clicksNote = `${clickCount.toLocaleString()} clicks × ~${avgPerClick.toLocaleString()} rolls = ${grandTotalRolls.toLocaleString()} total`;
  renderStage(overallBest, grandTotalRolls, null, clicksNote);
  refreshLiveViews();
  if(!state.best || overallBest.finalRng > state.best.finalRng) state.best = overallBest;
  updateStatStrip();
  dbSaveMeta();
}

const isMobileDevice = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && window.innerWidth < 900);

const skillcheck = {
  active: false,
  timer: null,       // setTimeout handle for the next spawn
  el: null,           // the circle DOM element, while spawned
  spawnedAt: 0,
  perfectTicker: null, // interval handle while a perfect-window sustain is running
};

// accuracy: how centered the tap was on the circle, scaled 0.01-2.5 (0.01 = just grazed the
// edge, 2.5 = dead center). Distance-from-center is normalized against the circle's own radius.
function computeTapAccuracy(circleEl, clientX, clientY){
  const rect = circleEl.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const dist = Math.hypot(clientX - cx, clientY - cy);
  const radius = rect.width/2;
  const norm = Math.max(0, 1 - dist/radius); // 1 at dead center, 0 at/beyond edge
  return 0.01 + norm * 2.49; // scale into 0.01-2.5
}

function clearSkillcheckCircle(){
  if(skillcheck.el){ skillcheck.el.remove(); skillcheck.el = null; }
  if(skillcheck.perfectTicker){ clearInterval(skillcheck.perfectTicker); skillcheck.perfectTicker = null; }
}

function scheduleNextSkillcheck(){
  if(!skillcheck.active) return;
  const delay = (2 + Math.random()*3) * 1000; // every 2-5 seconds
  skillcheck.timer = setTimeout(spawnSkillcheckCircle, delay);
}

function spawnSkillcheckCircle(){
  if(!skillcheck.active) return;
  const stage = document.getElementById('stage');
  if(!stage) return;
  clearSkillcheckCircle();

  const size = 40 + Math.random()*50; // 40-90px, "appropriately sized"
  const stageRect = stage.getBoundingClientRect();
  const maxX = Math.max(0, stageRect.width - size);
  const maxY = Math.max(0, stageRect.height - size);
  const x = Math.random()*maxX;
  const y = Math.random()*maxY;

  const circle = document.createElement('div');
  circle.className = 'skillcheck-circle';
  circle.style.width = size+'px';
  circle.style.height = size+'px';
  circle.style.left = x+'px';
  circle.style.top = y+'px';
  stage.appendChild(circle);
  skillcheck.el = circle;
  skillcheck.spawnedAt = Date.now();

  const LIFESPAN_MS = 3000;
  const PERFECT_WINDOW_START = 1400; // ms remaining
  const PERFECT_WINDOW_END = 1500;   // ms remaining

  const despawnTimer = setTimeout(()=>{
    if(skillcheck.el === circle){
      clearSkillcheckCircle();
      scheduleNextSkillcheck();
    }
  }, LIFESPAN_MS);

  const onTap = (clientX, clientY) => {
    if(skillcheck.el !== circle) return; // already resolved
    const elapsed = Date.now() - skillcheck.spawnedAt;
    const remaining = LIFESPAN_MS - elapsed;
    const accuracy = computeTapAccuracy(circle, clientX, clientY);

    const rect = circle.getBoundingClientRect();
    const dist = Math.hypot(clientX - (rect.left+rect.width/2), clientY - (rect.top+rect.height/2));
    const isMiss = dist > rect.width/2;

    clearTimeout(despawnTimer);
    clearSkillcheckCircle();

    if(isMiss){
      // Miss entirely — no rolls, auto-roll pauses until the next circle spawns
      scheduleNextSkillcheck();
      return;
    }

    if(remaining >= PERFECT_WINDOW_START && remaining <= PERFECT_WINDOW_END){
      // Perfect timing window: sustained 5-second payout, ticking once per second.
      // Each "click" here is a FULL click — full bulk, axe/equip click bonuses, everything.
      let ticksLeft = 5;
      const clicksPerTick = Math.max(1, Math.round(10 * (accuracy * 1.5)));
      skillcheck.perfectTicker = setInterval(()=>{
        performBulkRolls(clicksPerTick);
        ticksLeft--;
        if(ticksLeft <= 0){
          clearInterval(skillcheck.perfectTicker);
          skillcheck.perfectTicker = null;
          scheduleNextSkillcheck();
        }
      }, 1000);
      performBulkRolls(clicksPerTick); // first tick fires immediately
      ticksLeft--;
    } else {
      // Normal hit, anywhere/anytime within the circle's life — grants this many full clicks.
      const clicks = Math.max(1, Math.round(10 * accuracy));
      performBulkRolls(clicks);
      scheduleNextSkillcheck();
    }
  };

  circle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    onTap(e.clientX, e.clientY);
  });
}

function startMobileAutoRoll(){
  if(skillcheck.active) return;
  skillcheck.active = true;
  const btn = document.getElementById('mobileAutoRollBtn');
  if(btn) btn.textContent = 'Stop Auto-Roll';
  scheduleNextSkillcheck();
}

function stopMobileAutoRoll(){
  skillcheck.active = false;
  if(skillcheck.timer){ clearTimeout(skillcheck.timer); skillcheck.timer = null; }
  clearSkillcheckCircle();
  const btn = document.getElementById('mobileAutoRollBtn');
  if(btn) btn.textContent = 'Start Auto-Roll';
}

function initMobileAutoRollUI(){
  if(!isMobileDevice) return;
  const controls = document.querySelector('.roll-controls');
  if(!controls || document.getElementById('mobileAutoRollBtn')) return;
  const btn = document.createElement('button');
  btn.className = 'btn small secondary';
  btn.id = 'mobileAutoRollBtn';
  btn.textContent = 'Start Auto-Roll';
  btn.style.marginTop = '8px';
  btn.addEventListener('click', ()=>{
    if(skillcheck.active) stopMobileAutoRoll();
    else startMobileAutoRoll();
  });
  controls.appendChild(btn);
}
initMobileAutoRollUI();

/* ============================================================
   HIDDEN CACHE-RESET BUTTON
   Tap the logo 5 times within 3 seconds to reveal a button that force-reloads the page with a
   cache-busting query param. This only forces the browser/PWA to re-fetch fresh HTML/JS/CSS —
   your save data lives in IndexedDB, entirely separate from the page cache, so it's untouched.
   ============================================================ */
(function initCacheResetButton(){
  const logo = document.getElementById('logoTitle');
  const btn = document.getElementById('cacheResetBtn');
  if(!logo || !btn) return;

  let tapTimes = [];
  logo.addEventListener('click', () => {
    const now = Date.now();
    tapTimes.push(now);
    tapTimes = tapTimes.filter(t => now - t < 3000); // only count taps within the last 3s
    if(tapTimes.length >= 5){
      btn.classList.add('show');
      tapTimes = [];
    }
  });

  btn.addEventListener('click', () => {
    // Cache-bust by appending/refreshing a version query param, stripping any existing one first.
    const url = new URL(window.location.href);
    url.searchParams.set('_cb', Date.now().toString());
    window.location.href = url.toString();
  });
})();

document.getElementById('clearLog').addEventListener('click', ()=>{
  state.log = [];
  renderLog();
});

/* ============================================================
   PARALLEL WEB WORKER ENGINE FOR OFFLINE PROGRESS
   ============================================================ */

