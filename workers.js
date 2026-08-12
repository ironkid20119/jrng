function createWorkerBlob() {
  const workerCode = `
    self.onmessage = function(e) {
      const { rollsToRun, pool, luckMult, variantChain, TIERS } = e.data;
      const counts = {};
      let bestFind = null;

      // Find highest guaranteed item for skipped checks
      let highestGuaranteedRng = 0;
      for (const item of pool) {
        if (item.rng !== Infinity) {
          const effectiveChance = luckMult / item.rng;
          if (effectiveChance >= 1) {
            if (item.rng > highestGuaranteedRng) {
              highestGuaranteedRng = item.rng;
            }
          }
        }
      }

      // Simulation loop
      for (let i = 0; i < rollsToRun; i++) {
        let normalWinner = null;
        let bypassedWinner = null;

        for (const item of pool) {
          if (item.rng === Infinity) {
            if (Math.random() < 0.0005 * luckMult) {
              if (!normalWinner || item.rng > normalWinner.rng) normalWinner = item;
            }
            continue;
          }

          const isSkipped = item.rng < highestGuaranteedRng;
          if (isSkipped) {
            if (Math.random() < 0.2) {
              if (!bypassedWinner || item.rng > bypassedWinner.rng) {
                bypassedWinner = item;
              }
            }
          } else {
            const effectiveChance = luckMult / item.rng;
            if (Math.random() < effectiveChance) {
              if (!normalWinner || item.rng > normalWinner.rng) {
                normalWinner = item;
              }
            }
          }
        }

        let winner = normalWinner;
        if (bypassedWinner) {
          if (!winner || winner.rng <= highestGuaranteedRng) {
            winner = bypassedWinner;
          }
        }
        if (!winner) {
          winner = pool[0];
        }

        // Roll variant
        let variant = null;
        let totalMult = 1;
        for (const v of variantChain) {
          if (Math.random() < 1/v.rng) {
            variant = v;
            totalMult *= v.mult;
          } else {
            break;
          }
        }

        const finalRng = variant ? winner.rng * totalMult : winner.rng;
        
        let tier = null;
        for (const t of TIERS) {
          if (finalRng > t.min && finalRng <= t.max) {
            tier = t;
            break;
          }
        }
        if (!tier) {
          tier = finalRng <= 1 ? TIERS[0] : TIERS[TIERS.length - 1];
        }

        // Note: winner.rng here may be a temporarily debuffed/injected value (e.g. the "All"
        // area's x200 debuff, or Reach-injected cross-area items). We carry winner.injectedAreaLabel
        // through so the main thread can resolve true rng/true home area after merging, the same
        // way rollOnceForArea already does for manual rolls — never trust rng/area from inside
        // the worker as final truth.
        const key = winner.name + '|' + (variant ? variant.key : 'none') + '|' + (winner.injectedAreaLabel || '');
        if (!counts[key]) {
          counts[key] = {
            name: winner.name,
            baseRng: winner.rng,
            finalRng: finalRng,
            tier: tier,
            variant: variant ? { key: variant.key, label: variant.label, cls: variant.cls, totalMult } : null,
            injectedAreaLabel: winner.injectedAreaLabel || null,
            count: 0
          };
        }
        counts[key].count++;

        if (!bestFind || finalRng > bestFind.finalRng) {
          bestFind = counts[key];
        }
      }

      // NOTE: Offline bonus triggers (e.g. Dark Axe surges, Emblem's 7 Leaf Clover) are
      // intentionally NOT simulated here. Splitting elapsed time across N parallel workers and
      // computing Math.floor(seconds / intervalSeconds) independently per chunk silently drops
      // triggers whenever a chunk's slice is shorter than the bonus interval (e.g. a 7-minute
      // interval over 42 minutes split into 10 workers gives each worker only ~4.2 minutes,
      // which floors to zero triggers per chunk — losing all 6 real triggers). Bonus triggers are
      // computed once on the main thread against the true total elapsed time instead.
      self.postMessage({ counts, bestFind });
    };
  `;
  return new Blob([workerCode], { type: 'application/javascript' });
}

// Computes offline bonus rule triggers (Dark Axe surges, 7 Leaf Clover, etc.) against the TRUE
// total elapsed seconds, exactly once. This must never be split across parallel worker chunks —
// doing so causes Math.floor(chunkSeconds / intervalSeconds) to floor to zero whenever a chunk's
// slice is shorter than the bonus interval, silently dropping real triggers (e.g. a 7-minute
// interval axe left offline 42 minutes, split into 10 workers of ~4.2 min each, would compute
// zero triggers per chunk instead of the correct 6 triggers total).
function simulateOfflineBonusRules(offlineBonus, seconds, pool, variantChain, TIERS){
  const counts = {};
  let bestFind = null;
  let bonusRollsFired = 0;
  let bonusTriggers = 0;

  const bonusRules = offlineBonus ? (Array.isArray(offlineBonus) ? offlineBonus : [offlineBonus]) : [];
  if(!bonusRules.length || seconds <= 0){
    return { counts, bestFind, bonusRollsFired, bonusTriggers };
  }

  for(const rule of bonusRules){
    const intervalSeconds = rule.intervalSeconds || 1;
    const chancePerInterval = rule.chancePerInterval != null ? rule.chancePerInterval : (rule.chancePerSecond || 0);
    const bonusLuckMult = rule.bonusLuckMult;
    const minRolls = rule.minRolls != null ? rule.minRolls : (rule.bonusRolls || 1);
    const maxRolls = rule.maxRolls != null ? rule.maxRolls : (rule.bonusRolls || 1);

    let highestGuaranteedBonusRng = 0;
    for(const item of pool){
      if(item.rng !== Infinity){
        const effectiveChance = bonusLuckMult / item.rng;
        if(effectiveChance >= 1 && item.rng > highestGuaranteedBonusRng){
          highestGuaranteedBonusRng = item.rng;
        }
      }
    }

    const intervalTicks = Math.floor(seconds / intervalSeconds);

    for(let s = 0; s < intervalTicks; s++){
      if(Math.random() < chancePerInterval){
        bonusTriggers++;
        // Some bonuses (e.g. GeomathAxe's [Multiplication]) scale their roll count dynamically
        // with how much idle time has elapsed AT THIS TICK, rather than a fixed min/max range.
        // dynamicRolls(tickIndex, intervalSeconds) returns the roll count for that specific tick.
        const rollsThisTrigger = rule.dynamicRolls
          ? rule.dynamicRolls(s, intervalSeconds)
          : (minRolls === maxRolls ? minRolls : (minRolls + Math.floor(Math.random() * (maxRolls - minRolls + 1))));
        if(rollsThisTrigger <= 0) continue;
        for(let j = 0; j < rollsThisTrigger; j++){
          let normalWinner = null;
          let bypassedWinner = null;

          for(const item of pool){
            if(item.rng === Infinity){
              if(Math.random() < 0.0005 * bonusLuckMult){
                if(!normalWinner || item.rng > normalWinner.rng) normalWinner = item;
              }
              continue;
            }
            const isSkipped = item.rng < highestGuaranteedBonusRng;
            if(isSkipped){
              if(Math.random() < 0.2){
                if(!bypassedWinner || item.rng > bypassedWinner.rng) bypassedWinner = item;
              }
            } else {
              const effectiveChance = bonusLuckMult / item.rng;
              if(Math.random() < effectiveChance){
                if(!normalWinner || item.rng > normalWinner.rng) normalWinner = item;
              }
            }
          }

          let winner = normalWinner;
          if(bypassedWinner){
            if(!winner || winner.rng <= highestGuaranteedBonusRng) winner = bypassedWinner;
          }
          if(!winner) winner = pool[0];

          let variant = null;
          let totalMult = 1;
          for(const v of variantChain){
            if(Math.random() < 1/v.rng){
              variant = v;
              totalMult *= v.mult;
            } else {
              break;
            }
          }
          const finalRng = variant ? winner.rng * totalMult : winner.rng;

          let tier = null;
          for(const t of TIERS){
            if(finalRng > t.min && finalRng <= t.max){ tier = t; break; }
          }
          if(!tier) tier = finalRng <= 1 ? TIERS[0] : TIERS[TIERS.length - 1];

          const key = winner.name + '|' + (variant ? variant.key : 'none') + '|' + (winner.injectedAreaLabel || '');
          if(!counts[key]){
            counts[key] = {
              name: winner.name,
              baseRng: winner.rng,
              finalRng: finalRng,
              tier: tier,
              variant: variant ? { key:variant.key, label:variant.label, cls:variant.cls, totalMult } : null,
              injectedAreaLabel: winner.injectedAreaLabel || null,
              count: 0
            };
          }
          counts[key].count++;
          bonusRollsFired++;

          if(!bestFind || finalRng > bestFind.finalRng) bestFind = counts[key];
        }
      }
    }
  }

  return { counts, bestFind, bonusRollsFired, bonusTriggers };
}

async function runOfflineSimulations(totalRolls, elapsedSeconds, pool, luckMult, offlineBonus) {
  return new Promise((resolve, reject) => {
    const simModal = document.getElementById('simModal');
    const progressBar = document.getElementById('simProgressBar');
    const progressText = document.getElementById('simProgressText');

    simModal.style.display = 'flex';
    progressBar.style.width = '0%';
    progressText.textContent = `initializing simulation setup...`;

    const numWorkers = 10;
    const SIMULATION_CEILING = 2000000;
    const actualSimTotal = Math.min(totalRolls, SIMULATION_CEILING);
    const extrapolationFactor = totalRolls > actualSimTotal ? totalRolls / actualSimTotal : 1;

    const rollsPerWorker = Math.floor(actualSimTotal / numWorkers);

    let workersFinished = 0;
    const accumulatedCounts = {};
    let absoluteBest = null;

    const workerBlob = createWorkerBlob();
    const workerUrl = URL.createObjectURL(workerBlob);
    const workers = [];

    function cleanup() {
      workers.forEach(w => w.terminate());
      URL.revokeObjectURL(workerUrl);
      simModal.style.display = 'none';
    }

    for (let i = 0; i < numWorkers; i++) {
      let worker;
      try {
        worker = new Worker(workerUrl);
      } catch (e) {
        console.error('Failed to create Web Worker:', e);
        cleanup();
        reject(new Error('Web Workers blocked or not supported'));
        return;
      }

      workers.push(worker);

      worker.onmessage = function(event) {
        const { counts, bestFind } = event.data;

        // Merge item findings (raw, still possibly debuffed/injected — resolved to truth below)
        for (const key in counts) {
          if (!accumulatedCounts[key]) {
            accumulatedCounts[key] = { ...counts[key], count: 0 };
          }
          accumulatedCounts[key].count += counts[key].count;
        }

        if (bestFind && (!absoluteBest || bestFind.finalRng > absoluteBest.finalRng)) {
          absoluteBest = { ...bestFind };
        }

        workersFinished++;
        const pct = Math.round((workersFinished / numWorkers) * 100);
        progressBar.style.width = `${pct}%`;
        progressText.textContent = `running threads: ${Math.round(actualSimTotal * (workersFinished / numWorkers)).toLocaleString()} / ${actualSimTotal.toLocaleString()} rolls completed`;

        if (workersFinished === numWorkers) {
          cleanup();

          if (extrapolationFactor > 1) {
            for (const key in accumulatedCounts) {
              accumulatedCounts[key].count = Math.round(accumulatedCounts[key].count * extrapolationFactor);
            }
          }

          // Bonus triggers are computed once here, against the TRUE total elapsed time —
          // never split across workers, so no interval ever gets fragmented into zero-trigger chunks.
          const bonusResult = simulateOfflineBonusRules(offlineBonus, elapsedSeconds, pool, VARIANT_CHAIN, TIERS);
          for (const key in bonusResult.counts) {
            if (!accumulatedCounts[key]) {
              accumulatedCounts[key] = { ...bonusResult.counts[key], count: 0 };
            }
            accumulatedCounts[key].count += bonusResult.counts[key].count;
          }
          if (bonusResult.bestFind && (!absoluteBest || bonusResult.bestFind.finalRng > absoluteBest.finalRng)) {
            absoluteBest = { ...bonusResult.bestFind };
          }

          // Resolve every accumulated result back to its TRUE rng and TRUE home area, exactly
          // like rollOnceForArea does for manual rolls. Debuffs/injections (All's x200, Reach,
          // Gloves) only ever affect ODDS during simulation — never what's actually recorded.
          const resolvedCounts = {};
          for (const key in accumulatedCounts) {
            const entry = accumulatedCounts[key];
            const trueAreaLabel = entry.injectedAreaLabel || WORLDS[state.worldIdx].areas[state.areaIdx].label;
            const trueRng = findRankRng(trueAreaLabel, entry.name);
            const resolvedBaseRng = trueRng != null ? trueRng : entry.baseRng;
            const resolvedFinalRng = entry.variant ? resolvedBaseRng * entry.variant.totalMult : resolvedBaseRng;
            const resolvedTier = tierFor(resolvedFinalRng);
            const resolvedKey = invKey(trueAreaLabel, entry.name, entry.variant ? entry.variant.key : null);
            if(!resolvedCounts[resolvedKey]){
              resolvedCounts[resolvedKey] = {
                name: entry.name, baseRng: resolvedBaseRng, finalRng: resolvedFinalRng,
                tier: resolvedTier, variant: entry.variant, areaLabel: trueAreaLabel, count: 0
              };
            }
            resolvedCounts[resolvedKey].count += entry.count;
          }

          let resolvedBest = null;
          if(absoluteBest){
            const bfTrueArea = absoluteBest.injectedAreaLabel || WORLDS[state.worldIdx].areas[state.areaIdx].label;
            const bfTrueRng = findRankRng(bfTrueArea, absoluteBest.name);
            const bfBaseRng = bfTrueRng != null ? bfTrueRng : absoluteBest.baseRng;
            const bfFinalRng = absoluteBest.variant ? bfBaseRng * absoluteBest.variant.totalMult : bfBaseRng;
            resolvedBest = {
              name: absoluteBest.name, baseRng: bfBaseRng, finalRng: bfFinalRng,
              tier: tierFor(bfFinalRng), variant: absoluteBest.variant, areaLabel: bfTrueArea
            };
          }

          resolve({
            counts: resolvedCounts,
            bestFind: resolvedBest,
            bonusRollsFired: bonusResult.bonusRollsFired,
            bonusTriggers: bonusResult.bonusTriggers
          });
        }
      };

      worker.onerror = function(err) {
        console.error('Worker run error:', err);
        cleanup();
        reject(err);
      };

      worker.postMessage({
        rollsToRun: rollsPerWorker,
        pool: pool,
        luckMult: luckMult,
        variantChain: VARIANT_CHAIN,
        TIERS: TIERS
      });
    }
  });
}

async function resolveOfflineProgress(){
  const axe = currentAxe();
  const equip = currentEquip();
  const rps = effectiveRps();
  if(rps <= 0 && !axe.offlineBonus && !(equip && equip.offlineBonus)) return null;

  const now = Date.now();
  let elapsedSeconds = (now - state.lastSeenAt) / 1000;
  if(elapsedSeconds < 5) return null;

  const capped = elapsedSeconds > MAX_OFFLINE_SECONDS;
  elapsedSeconds = Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS);
  const wholeSeconds = Math.floor(elapsedSeconds);

  // [Irritation] (Rage Axe only): scales rps itself by +27.5% per full day idle, since Irritation's
  // wording explicitly covers "everything idle related" — not just the other offlineBonus rules.
  const irritationMult = irritationMultiplier(axe, elapsedSeconds);
  const totalRolls = Math.floor(elapsedSeconds * rps * irritationMult);

  const world = WORLDS[state.worldIdx];
  const area = world.areas[state.areaIdx];
  const luckMult = effectiveLuckMult();

  const hasAnyOfflineBonus = axe.offlineBonus || (equip && equip.offlineBonus);
  if(totalRolls <= 0 && (!hasAnyOfflineBonus || wholeSeconds <= 0)) return null;

  // Formulate the pool items (shared with rollOnceForArea so All's universal pool / debuffMult apply here too)
  state.lastOfflineElapsed = elapsedSeconds;
  const pool = buildAreaPool(world, area, { isOffline: true });

  // [Irritation] also scales every OTHER offline bonus rule on this axe (flagged irritationScales)
  // by the same per-day efficiency multiplier — pre-scaled here rather than threading a new param
  // through the simulation functions, so simulateOfflineBonusRules stays untouched.
  let scaledAxeBonus = axe.offlineBonus;
  if(axe.irritation && axe.offlineBonus && irritationMult > 1){
    const rules = Array.isArray(axe.offlineBonus) ? axe.offlineBonus : [axe.offlineBonus];
    scaledAxeBonus = rules.map(rule => {
      if(!rule.irritationScales) return rule;
      const minRolls = rule.minRolls != null ? rule.minRolls : (rule.bonusRolls || 1);
      const maxRolls = rule.maxRolls != null ? rule.maxRolls : (rule.bonusRolls || 1);
      return {
        ...rule,
        minRolls: Math.round(minRolls * irritationMult),
        maxRolls: Math.round(maxRolls * irritationMult),
      };
    });
  }

  // Equip offline bonuses run alongside the axe's — merged into one combined rule list so both
  // fire correctly through the same simulation pass. Irritation only ever scales axe rules;
  // idleEfficiencyMult (from an equip) scales EVERY offline bonus rule unconditionally, axe and
  // equip alike, since it's meant to boost "everything idle" the same way Irritation's wording does.
  const axeRules = scaledAxeBonus ? (Array.isArray(scaledAxeBonus) ? scaledAxeBonus : [scaledAxeBonus]) : [];
  const equipRules = (equip && equip.offlineBonus) ? (Array.isArray(equip.offlineBonus) ? equip.offlineBonus : [equip.offlineBonus]) : [];
  let scaledOfflineBonus = [...axeRules, ...equipRules];

  const idleEffMult = (equip && equip.idleEfficiencyMult) ? equip.idleEfficiencyMult : 1;
  if(idleEffMult > 1){
    scaledOfflineBonus = scaledOfflineBonus.map(rule => {
      if(rule.dynamicRolls) return rule; // dynamic-roll rules (e.g. GeomathAxe's Multiplication) compute their own count; leave untouched
      const minRolls = rule.minRolls != null ? rule.minRolls : (rule.bonusRolls || 1);
      const maxRolls = rule.maxRolls != null ? rule.maxRolls : (rule.bonusRolls || 1);
      return {
        ...rule,
        minRolls: Math.round(minRolls * idleEffMult),
        maxRolls: Math.round(maxRolls * idleEffMult),
      };
    });
  }

  let simResult;
  try {
    // Attempt fast concurrent worker simulation
    simResult = await runOfflineSimulations(totalRolls, wholeSeconds, pool, luckMult, scaledOfflineBonus);
  } catch (err) {
    console.warn('Worker sim execution failed, utilizing sync main thread fallback:', err);
    // Strict budgeted fallback calculation so gameplay doesn't halt
    const counts = {};
    let bestFind = null;
    const DIRECT_ROLL_BUDGET = 5000;
    const directCount = Math.min(totalRolls, DIRECT_ROLL_BUDGET);
    const remaining = totalRolls - directCount;

    // Highest guaranteed item fallback calculation
    let highestGuaranteedRng = 0;
    for(const item of pool) {
      if(item.rng !== Infinity) {
        const effectiveChance = luckMult / item.rng;
        if(effectiveChance >= 1) {
          if(item.rng > highestGuaranteedRng) {
            highestGuaranteedRng = item.rng;
          }
        }
      }
    }

    for(let i=0;i<directCount;i++){
      let normalWinner = null;
      let bypassedWinner = null;

      for(const item of pool){
        if(item.rng === Infinity){
          if(Math.random() < 0.0005 * luckMult){
            if(!normalWinner || item.rng > normalWinner.rng) normalWinner = item;
          }
          continue;
        }

        const isSkipped = item.rng < highestGuaranteedRng;
        if(isSkipped) {
          if(Math.random() < 0.2) {
            if(!bypassedWinner || item.rng > bypassedWinner.rng) {
              bypassedWinner = item;
            }
          }
        } else {
          const effectiveChance = luckMult / item.rng;
          if(Math.random() < effectiveChance){
            if(!normalWinner || item.rng > normalWinner.rng) {
              normalWinner = item;
            }
          }
        }
      }

      let winner = normalWinner;
      if (bypassedWinner) {
        if (!winner || winner.rng <= highestGuaranteedRng) {
          winner = bypassedWinner;
        }
      }
      if(!winner) winner = pool.reduce((a,b)=> a.rng < b.rng ? a : b);

      // Resolve the winner's TRUE rng and TRUE home area before recording — winner.rng here may
      // be a temporarily debuffed/injected value (All's x200, Reach, Gloves), same as the worker path.
      const trueAreaLabel = winner.injectedAreaLabel || area.label;
      const trueRng = findRankRng(trueAreaLabel, winner.name);
      const resolvedRng = trueRng != null ? trueRng : winner.rng;

      const k = invKey(trueAreaLabel, winner.name, null);
      if(!counts[k]) {
        counts[k] = {
          name: winner.name,
          baseRng: resolvedRng,
          finalRng: resolvedRng,
          tier: tierFor(resolvedRng),
          variant: null,
          areaLabel: trueAreaLabel,
          count: 0
        };
      }
      counts[k].count += 1;
      if(!bestFind || resolvedRng > bestFind.finalRng) {
        bestFind = {
          name: winner.name,
          baseRng: resolvedRng,
          finalRng: resolvedRng,
          tier: tierFor(resolvedRng),
          variant: null,
          areaLabel: trueAreaLabel
        };
      }
    }

    if(remaining > 0 && directCount > 0){
      const scale = remaining / directCount;
      for(const k in counts){
        counts[k].count += Math.round(counts[k].count * scale);
      }
    }

    // Bonus triggers computed once against the true total wholeSeconds — same shared function
    // used by the worker path, so both paths can never diverge or reintroduce fragmentation bugs.
    const bonusResult = simulateOfflineBonusRules(scaledOfflineBonus, wholeSeconds, pool, VARIANT_CHAIN, TIERS);
    for(const key in bonusResult.counts){
      const bc = bonusResult.counts[key];
      const trueAreaLabel = bc.injectedAreaLabel || area.label;
      const trueRng = findRankRng(trueAreaLabel, bc.name);
      const resolvedBaseRng = trueRng != null ? trueRng : bc.baseRng;
      const resolvedFinalRng = bc.variant ? resolvedBaseRng * bc.variant.totalMult : resolvedBaseRng;
      const k = invKey(trueAreaLabel, bc.name, bc.variant ? bc.variant.key : null);
      if(!counts[k]){
        counts[k] = { name:bc.name, baseRng:resolvedBaseRng, finalRng:resolvedFinalRng, tier:tierFor(resolvedFinalRng), variant:bc.variant, areaLabel:trueAreaLabel, count:0 };
      }
      counts[k].count += bc.count;
    }
    if(bonusResult.bestFind && (!bestFind || bonusResult.bestFind.finalRng > bestFind.finalRng)){
      const bfTrueArea = bonusResult.bestFind.injectedAreaLabel || area.label;
      const bfTrueRng = findRankRng(bfTrueArea, bonusResult.bestFind.name);
      const bfBaseRng = bfTrueRng != null ? bfTrueRng : bonusResult.bestFind.baseRng;
      const bfFinalRng = bonusResult.bestFind.variant ? bfBaseRng * bonusResult.bestFind.variant.totalMult : bfBaseRng;
      bestFind = {
        name: bonusResult.bestFind.name, baseRng: bfBaseRng, finalRng: bfFinalRng,
        tier: tierFor(bfFinalRng), variant: bonusResult.bestFind.variant, areaLabel: bfTrueArea
      };
    }

    simResult = {
      counts: counts,
      bestFind,
      bonusRollsFired: bonusResult.bonusRollsFired,
      bonusTriggers: bonusResult.bonusTriggers
    };
  }

  // Finalize counts into global state inventory
  const finalSummaryItems = [];
  for(const k in simResult.counts){
    const simItem = simResult.counts[k];
    const r = {
      name: simItem.name,
      baseRng: simItem.baseRng,
      finalRng: simItem.finalRng,
      tier: simItem.tier,
      variant: simItem.variant,
      areaLabel: simItem.areaLabel || area.label, // use the item's own resolved true area if present
    };
    addToInventory(r, simItem.count);
    finalSummaryItems.push({ result: r, count: simItem.count });
  }

  const grandTotalRolls = totalRolls + simResult.bonusRollsFired;
  state.rolls += grandTotalRolls;

  if(simResult.bestFind) {
    if(!state.best || simResult.bestFind.finalRng > state.best.finalRng) {
      state.best = simResult.bestFind;
    }
  }

  return {
    seconds: elapsedSeconds,
    totalRolls: grandTotalRolls,
    bestFind: simResult.bestFind,
    topItems: finalSummaryItems.sort((a,b)=> b.count - a.count).slice(0,6),
    capped,
    bonusTriggers: simResult.bonusTriggers,
    bonusRollsFired: simResult.bonusRollsFired,
    irritationMult: axe.irritation ? irritationMult : null,
    irritationDays: axe.irritation ? Math.floor(elapsedSeconds / 86400) : 0,
  };
}

function renderCheatBanner(remainMs){
  const el = document.getElementById('offlineBanner');
  if(!el) return;
  const timeStr = fmtDuration(Math.ceil(remainMs / 1000));
  el.innerHTML = `
    <div class="offline-banner cheat-banner">
      <h3>⚠️ you dirty CHEATER!</h3>
      <p>your axe has sensed a time change and you've lost access to idle rolling for <b>${timeStr}</b>!</p>
      <button class="btn small secondary" id="dismissCheat">ok fine</button>
    </div>
  `;
  document.getElementById('dismissCheat').addEventListener('click', ()=>{ el.innerHTML=''; });
}

function renderOfflineBanner(report){
  const el = document.getElementById('offlineBanner');
  if(!report){ el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="offline-banner">
      <h3>Welcome back 👋</h3>
      <p>Your ${escapeHtml(currentAxe().name)} kept swinging while you were away — ${fmtDuration(report.seconds)}${report.capped ? ' (capped at 7d)' : ''}, ${report.totalRolls.toLocaleString()} rolls calculated.</p>
      ${report.bonusTriggers > 0 ? `<p>Bonus surges triggered <b>${report.bonusTriggers.toLocaleString()}×</b>, adding ${report.bonusRollsFired.toLocaleString()} rolls.</p>` : ''}
      ${report.irritationDays > 0 ? `<p>😤 Irritation built up over <b>${report.irritationDays} full day${report.irritationDays===1?'':'s'}</b> idle — everything else ran at <b>+${((report.irritationMult-1)*100).toFixed(1)}%</b> efficiency.</p>` : ''}
      <div class="offline-summary">
        ${report.topItems.map(t=>{
          const r = t.result;
          const baseTier = tierFor(r.baseRng);
          const suffix = r.variant ? ' ✦' : '';
          return `<div class="offline-row">${rankNameHtml(r.name, baseTier.cls, r.variant, '', baseTier.key)}${suffix}<span>×${t.count.toLocaleString()}</span></div>`;
        }).join('')}
      </div>
      ${report.bestFind ? (()=>{
        const bf = report.bestFind;
        const bfTier = tierFor(bf.baseRng || bf.finalRng);
        return `<p>Best find: ${rankNameHtml(bf.name, bfTier.cls, bf.variant, '', bfTier.key)}${bf.variant?' ✦':''} (1/${fmtRngForResult(bf)})</p>`;
      })() : ''}
      <button class="btn small" id="dismissOffline">Nice</button>
    </div>
  `;
  document.getElementById('dismissOffline').addEventListener('click', ()=>{ el.innerHTML=''; });
}

/* ============================================================
   ANTICHEAT — Cloudflare time verification
   ============================================================ */

async function fetchCloudflareTime(){
  try {
    const res = await fetch('https://cloudflare.com/cdn-cgi/trace', { cache:'no-store' });
    const text = await res.text();
    // Cloudflare trace includes "ts=<unix_timestamp_ms_float>" line
    const match = text.match(/ts=(\d+(\.\d+)?)/);
    if(match) return parseFloat(match[1]) * 1000; // convert to ms
  } catch(e){ /* offline or blocked */ }
  return null;
}

async function runAnticheat(){
  const cfTime = await fetchCloudflareTime();
  if(cfTime == null) return; // can't verify, allow through

  const localTime = Date.now();
  const skewMs = localTime - cfTime; // positive = local is ahead of real time

  if(skewMs >= 60 * 1000){
    // Player skipped time forward by at least 1 minute
    const lockMs = skewMs;
    state.anticheatLockUntil = cfTime + lockMs; // lock for as long as they skipped
    dbSaveMeta();
  }
}

function isAnticheatLocked(){
  if(!state.anticheatLockUntil) return false;
  return Date.now() < state.anticheatLockUntil;
}

function anticheatLockRemaining(){
  if(!state.anticheatLockUntil) return 0;
  return Math.max(0, state.anticheatLockUntil - Date.now());
}
/* ============================================================
   INIT
   ============================================================ */
async function init(){
  await dbLoadAll();

  // Run anticheat before offline progress
  await runAnticheat();

  let report = null;
  if(isAnticheatLocked()){
    const remainMs = anticheatLockRemaining();
    renderCheatBanner(remainMs);
  } else {
    report = await resolveOfflineProgress();
  }

  state.lastSeenAt = Date.now();
  dbSaveMeta();

  renderAxeStrip();
  renderWorldTabs();
  renderAreaSelect();
  buildIndexAccordion();
  buildSecretsAccordion();
  const titleEl0 = document.getElementById('indexPanelTitle');
  if(titleEl0) titleEl0.textContent = `Rank index — ${WORLDS[state.worldIdx].label}`;
  renderLog();
  renderInventory();
  setupInventoryFilters();
  renderItemCards();
  renderConsumableCards();
  renderEquipCards();
  setupItemCategorySelect();
  updateStatStrip();
  if(report) renderOfflineBanner(report);
}
init();

window.addEventListener('beforeunload', ()=>{
  state.lastSeenAt = Date.now();
  dbSaveMeta();
});

// Live countdown for bomb charge timer
let wasErrRedirectorActive = isErrRedirectorActive();
setInterval(()=>{
  if(currentView === 'items'){
    if(state.bombCharge) renderConsumableCards();
    if(state.wgunStacks && state.wgunStacks.length) renderConsumableCards();
    if(state.errRedirectorUntil) renderConsumableCards();
  }
  // Expire old watergun stacks and update strip if changed
  if(state.wgunStacks && state.wgunStacks.length){
    const before = state.wgunStacks.length;
    wgunActiveStacks(); // prunes expired stacks in-place
    if(state.wgunStacks.length !== before){
      dbSaveMeta();
      renderAxeStrip();
      updateStatStrip();
    }
  }
  // When err.redirector's window lapses, the 404 gimmick kicks back in — refresh any views
  // showing rarity numbers so they re-garble immediately rather than on the next roll.
  const nowActive = isErrRedirectorActive();
  if(nowActive !== wasErrRedirectorActive){
    wasErrRedirectorActive = nowActive;
    renderLog();
    renderInventory();
  }
}, 1000);
document.addEventListener('visibilitychange', async ()=>{
  if(document.visibilityState === 'hidden'){
    state.lastSeenAt = Date.now();
    dbSaveMeta();
  } else {
    await runAnticheat();
    if(isAnticheatLocked()){
      renderCheatBanner(anticheatLockRemaining());
    } else {
      const report = await resolveOfflineProgress();
      state.lastSeenAt = Date.now();
      dbSaveMeta();
      if(report){
        renderInventory();
        updateStatStrip();
        renderOfflineBanner(report);
      }
    }
  }
});