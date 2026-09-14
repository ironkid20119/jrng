// Must skip interactive elements — the ROLL button relies on rapid double-taps, and blocking
// zoom document-wide silently ate the click event on every second fast tap.
function isInteractiveTarget(el) {
  return !!(el && el.closest('button, a, input, select, textarea, [role="button"], .btn, .seg-btn, .folder-row, .folder-crumb, .acc-head'));
}

document.addEventListener("dblclick", e => {
  if (isInteractiveTarget(e.target)) return;
  e.preventDefault();
}, {
  passive: false
});

let lastTouchEnd = 0;

document.addEventListener("touchend", e => {
  if (isInteractiveTarget(e.target)) return;
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, {
  passive: false
});const rollBtn = document.getElementById("rollBtn");

let holdToClickTimer = null;

let holdToClickPointerId = null;

let suppressNextRollClickUntil = 0;

function holdToClickEnabled() {
  return !!(state.ballAutoUse && state.ballAutoUse.holdToClick && ballUpgradeLevel("holdToClick") > 0);
}

function stopHoldToClick() {
  if (holdToClickTimer || holdToClickPointerId != null) suppressNextRollClickUntil = Date.now() + 500;
  if (holdToClickTimer) {
    clearInterval(holdToClickTimer);
    holdToClickTimer = null;
  }
  holdToClickPointerId = null;
}

function startHoldToClick(event) {
  if (!holdToClickEnabled() || event.button !== 0 || holdToClickTimer) return;
  event.preventDefault();
  holdToClickPointerId = event.pointerId;
  suppressNextRollClickUntil = Date.now() + 500;
  try {
    rollBtn.setPointerCapture(event.pointerId);
  } catch (_) {}
  doRoll();
  holdToClickTimer = setInterval(doRoll, holdToClickIntervalMs());
}

rollBtn.addEventListener("click", () => {
  if (Date.now() < suppressNextRollClickUntil) return;
  doRoll();
});

rollBtn.addEventListener("pointerdown", startHoldToClick);

rollBtn.addEventListener("pointerup", stopHoldToClick);

rollBtn.addEventListener("pointercancel", stopHoldToClick);

document.addEventListener("pointerup", stopHoldToClick);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") stopHoldToClick();
});

const BULK_ROLL_CHUNK_BUDGET_MS = 8;

function bulkRollChunkBudgetMs() {
  return state.superOptimize ? 16 : state.lowDetailMode ? 14 : BULK_ROLL_CHUNK_BUDGET_MS;
}

function performBulkRolls(clickCount) {
  if (clickCount <= 0) return;
  let overallBest = null;
  let grandTotalRolls = 0;
  let i = 0;
  function processChunk() {
    const chunkStart = performance.now();
    while (i < clickCount && performance.now() - chunkStart < bulkRollChunkBudgetMs()) {
      const {best: best, totalRolls: totalRolls} = performClick();
      grandTotalRolls += totalRolls;
      if (best && (!overallBest || best.finalRng > overallBest.finalRng)) overallBest = best;
      i++;
    }
    if (i < clickCount) {
      requestAnimationFrame(processChunk);
      return;
    }
    rollGeneration++;
    const avgPerClick = Math.round(grandTotalRolls / clickCount);
    const clicksNote = `${clickCount.toLocaleString()} clicks × ~${avgPerClick.toLocaleString()} rolls = ${grandTotalRolls.toLocaleString()} total`;
    renderStage(overallBest, grandTotalRolls, null, clicksNote);
    refreshLiveViews();
    if (!state.best || overallBest.finalRng > state.best.finalRng) state.best = overallBest;
    updateStatStrip();
    dbSaveMeta();
  }
  processChunk();
}

const isMobileDevice = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || navigator.maxTouchPoints > 0 && window.innerWidth < 900;

const skillcheck = {
  active: false,
  timer: null,
  el: null,
  spawnedAt: 0,
  perfectTicker: null,
  displayTicker: null
};

function computeTapAccuracy(circleEl, clientX, clientY) {
  const rect = circleEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dist = Math.hypot(clientX - cx, clientY - cy);
  const radius = rect.width / 2;
  const norm = Math.max(0, 1 - dist / radius);
  return .01 + norm * 2.49;
}

function clearSkillcheckCircle() {
  if (skillcheck.el) {
    skillcheck.el.remove();
    skillcheck.el = null;
  }
  if (skillcheck.perfectTicker) {
    clearInterval(skillcheck.perfectTicker);
    skillcheck.perfectTicker = null;
  }
  if (skillcheck.displayTicker) {
    clearInterval(skillcheck.displayTicker);
    skillcheck.displayTicker = null;
  }
}

function scheduleNextSkillcheck() {
  if (!skillcheck.active) return;
  const delay = (2 + Math.random() * 3) * 1e3 / manualAutorollMultiplier();
  skillcheck.timer = setTimeout(spawnSkillcheckCircle, delay);
}

function spawnSkillcheckCircle() {
  if (!skillcheck.active) return;
  const stage = document.getElementById("stage");
  if (!stage) return;
  clearSkillcheckCircle();
  const size = 40 + Math.random() * 50;
  const stageRect = stage.getBoundingClientRect();
  const maxX = Math.max(0, stageRect.width - size);
  const maxY = Math.max(0, stageRect.height - size);
  const x = Math.random() * maxX;
  const y = Math.random() * maxY;
  const circle = document.createElement("div");
  circle.className = "skillcheck-circle";
  circle.style.width = size + "px";
  circle.style.height = size + "px";
  circle.style.left = x + "px";
  circle.style.top = y + "px";
  stage.appendChild(circle);
  skillcheck.el = circle;
  skillcheck.spawnedAt = Date.now();
  const autorollMult = manualAutorollMultiplier();
  const LIFESPAN_MS = 3e3 * autorollMult;
  const PERFECT_WINDOW_START = 1400 * autorollMult;
  const PERFECT_WINDOW_END = 1500 * autorollMult;
  circle.style.animationDuration = `${LIFESPAN_MS}ms`;
  if (hasBallUpgrade("showAutorollTimer") || hasBallUpgrade("showPerfectTime")) {
    const timerLabel = document.createElement("div");
    timerLabel.className = "skillcheck-timer";
    circle.appendChild(timerLabel);
    const updateTimerLabel = () => {
      if (skillcheck.el !== circle) return;
      const remaining = Math.max(0, LIFESPAN_MS - (Date.now() - skillcheck.spawnedAt));
      const isPerfectNow = remaining >= PERFECT_WINDOW_START && remaining <= PERFECT_WINDOW_END;
      const timerText = hasBallUpgrade("showAutorollTimer") ? `${(remaining / 1e3).toFixed(1)}s` : "";
      const perfectText = hasBallUpgrade("showPerfectTime") ? isPerfectNow ? "Perfect: NOW" : `Perfect: ${(PERFECT_WINDOW_START / 1e3).toFixed(1)}–${(PERFECT_WINDOW_END / 1e3).toFixed(1)}s` : "";
      timerLabel.textContent = [ timerText, perfectText ].filter(Boolean).join(" · ");
      timerLabel.classList.toggle("perfect-now", isPerfectNow && hasBallUpgrade("showPerfectTime"));
    };
    updateTimerLabel();
    skillcheck.displayTicker = setInterval(updateTimerLabel, state.superOptimize ? 500 : state.lowDetailMode ? 250 : 50);
  }
  const despawnTimer = setTimeout(() => {
    if (skillcheck.el === circle) {
      clearSkillcheckCircle();
      scheduleNextSkillcheck();
    }
  }, LIFESPAN_MS);
  const onTap = (clientX, clientY) => {
    if (skillcheck.el !== circle) return;
    const elapsed = Date.now() - skillcheck.spawnedAt;
    const remaining = LIFESPAN_MS - elapsed;
    const accuracy = computeTapAccuracy(circle, clientX, clientY);
    const rect = circle.getBoundingClientRect();
    const dist = Math.hypot(clientX - (rect.left + rect.width / 2), clientY - (rect.top + rect.height / 2));
    const isMiss = dist > rect.width / 2;
    clearTimeout(despawnTimer);
    clearSkillcheckCircle();
    if (isMiss) {
      scheduleNextSkillcheck();
      return;
    }
    trySpawnBallsFromPlayerClick();
    if (remaining >= PERFECT_WINDOW_START && remaining <= PERFECT_WINDOW_END) {
      let ticksLeft = 5;
      const clicksPerTick = Math.max(1, Math.round(10 * (accuracy * 1.5) * autorollMult));
      skillcheck.perfectTicker = setInterval(() => {
        performBulkRolls(clicksPerTick);
        ticksLeft--;
        if (ticksLeft <= 0) {
          clearInterval(skillcheck.perfectTicker);
          skillcheck.perfectTicker = null;
          scheduleNextSkillcheck();
        }
      }, 1e3);
      performBulkRolls(clicksPerTick);
      ticksLeft--;
    } else {
      const clicks = Math.max(1, Math.round(10 * accuracy * autorollMult));
      performBulkRolls(clicks);
      scheduleNextSkillcheck();
    }
  };
  circle.addEventListener("pointerdown", e => {
    e.preventDefault();
    onTap(e.clientX, e.clientY);
  });
}

function startMobileAutoRoll() {
  if (skillcheck.active) return;
  skillcheck.active = true;
  const btn = document.getElementById("mobileAutoRollBtn");
  if (btn) btn.textContent = "Stop Auto-Roll";
  scheduleNextSkillcheck();
}

function stopMobileAutoRoll() {
  skillcheck.active = false;
  if (skillcheck.timer) {
    clearTimeout(skillcheck.timer);
    skillcheck.timer = null;
  }
  clearSkillcheckCircle();
  const btn = document.getElementById("mobileAutoRollBtn");
  if (btn) btn.textContent = "Start Auto-Roll";
}

function initMobileAutoRollUI() {
  if (!isMobileDevice) return;
  const controls = document.querySelector(".roll-controls");
  if (!controls || document.getElementById("mobileAutoRollBtn")) return;
  const btn = document.createElement("button");
  btn.className = "btn small secondary";
  btn.id = "mobileAutoRollBtn";
  btn.textContent = "Start Auto-Roll";
  btn.style.marginTop = "8px";
  btn.addEventListener("click", () => {
    if (skillcheck.active) stopMobileAutoRoll(); else startMobileAutoRoll();
  });
  controls.appendChild(btn);
}

initMobileAutoRollUI();

(function initCacheResetButton() {
  const btn = document.getElementById("cacheResetBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.set("_cb", Date.now().toString());
    window.location.href = url.toString();
  });
})();

function createWorkerBlob() {
  const workerCode = `\n    self.onmessage = function(e) {\n      const { rollsToRun, pool, luckMult, maxRollChance, variantChain, TIERS } = e.data;\n      const counts = {};\n      let bestFind = null;\n\n      // The main thread dispatches at most 200,000 rolls per message. A worker completes its\n      // assigned full batch, returns the exact results, then waits for the main thread to yield\n      // five frames before it can receive another batch.\n      const chanceCap = Math.min(0.5, maxRollChance);\n      const chooseUniformWinner = function(candidates) {\n        if (!candidates || candidates.length === 0) return null;\n        return candidates[Math.floor(Math.random() * candidates.length)];\n      };\n      const chooseLuckExceededWinner = function(candidates) {\n        if (!candidates || candidates.length === 0) return null;\n        if (candidates.length === 1) return candidates[0];\n        const finiteRngs = [...new Set(pool.map(item => item.rng).filter(Number.isFinite))].sort((a, b) => a - b);\n        const rankBelow = function(rng) {\n          let below = 1;\n          for (const candidateRng of finiteRngs) {\n            if (candidateRng >= rng) break;\n            below = candidateRng;\n          }\n          return below;\n        };\n        const logWeights = candidates.map(item => 2 * Math.log(Math.max(1, rankBelow(item.rng) * 5)));\n        const maxLogWeight = Math.max(...logWeights);\n        const weights = logWeights.map(logWeight => Math.exp(logWeight - maxLogWeight));\n        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);\n        let cursor = Math.random() * totalWeight;\n        for (let i = 0; i < candidates.length; i++) {\n          cursor -= weights[i];\n          if (cursor <= 0) return candidates[i];\n        }\n        return candidates[candidates.length - 1];\n      };\n\n      for (let i = 0; i < rollsToRun; i++) {\n        let normalWinners = [];\n        const luckExceededCandidates = [];\n\n        for (const item of pool) {\n          if (item.rng === Infinity) {\n            if (Math.random() < Math.min(0.0005 * luckMult, 0.5)) {\n              if (!normalWinners.length || item.rng > normalWinners[0].rng) normalWinners = [item];\n              else if (item.rng === normalWinners[0].rng) normalWinners.push(item);\n            }\n            continue;\n          }\n          if (maxRollChance >= 0.5 && luckMult >= item.rng) {\n            luckExceededCandidates.push(item);\n            continue;\n          }\n          const effectiveChance = Math.min(luckMult / item.rng, chanceCap);\n          if (Math.random() < effectiveChance) {\n            if (!normalWinners.length || item.rng > normalWinners[0].rng) normalWinners = [item];\n            else if (item.rng === normalWinners[0].rng) normalWinners.push(item);\n          }\n        }\n\n        const guaranteedWinner = chooseLuckExceededWinner(luckExceededCandidates);\n        let winner = normalWinners.length && (!guaranteedWinner || normalWinners[0].rng > guaranteedWinner.rng)\n          ? chooseUniformWinner(normalWinners)\n          : (guaranteedWinner || chooseUniformWinner(normalWinners));\n        if (!winner) winner = pool[0];\n\n        let variant = null;\n        let totalMult = 1;\n        for (const v of variantChain) {\n          if (Math.random() < 1 / v.rng) {\n            variant = v;\n            totalMult *= v.mult;\n          } else {\n            break;\n          }\n        }\n\n        const finalRng = variant ? winner.rng * totalMult : winner.rng;\n        let tier = null;\n        for (const t of TIERS) {\n          if (finalRng > t.min && finalRng <= t.max) { tier = t; break; }\n        }\n        if (!tier) tier = finalRng <= 1 ? TIERS[0] : TIERS[TIERS.length - 1];\n\n        const key = winner.name + '|' + (variant ? variant.key : 'none') + '|' + (winner.injectedAreaLabel || '');\n        if (!counts[key]) {\n          counts[key] = {\n            name: winner.name,\n            baseRng: winner.rng,\n            finalRng,\n            tier,\n            variant: variant ? { key: variant.key, label: variant.label, cls: variant.cls, totalMult } : null,\n            injectedAreaLabel: winner.injectedAreaLabel || null,\n            count: 0\n          };\n        }\n        counts[key].count++;\n        if (!bestFind || finalRng > bestFind.finalRng) bestFind = counts[key];\n      }\n\n      self.postMessage({ counts, bestFind, rollsCompleted: rollsToRun });\n    };\n  `;
  return new Blob([ workerCode ], {
    type: "application/javascript"
  });
}

function simulateOfflineBonusRules(offlineBonus, seconds, pool, variantChain, TIERS, maxRollChance = LUCK_AFFECTED_CHANCE_CAP) {
  const counts = {};
  let bestFind = null;
  let bonusRollsFired = 0;
  let bonusTriggers = 0;
  const bonusRules = offlineBonus ? Array.isArray(offlineBonus) ? offlineBonus : [ offlineBonus ] : [];
  if (!bonusRules.length || seconds <= 0) {
    return {
      counts: counts,
      bestFind: bestFind,
      bonusRollsFired: bonusRollsFired,
      bonusTriggers: bonusTriggers
    };
  }
  for (const rule of bonusRules) {
    if (rule.workerSim) continue;
    const intervalSeconds = rule.intervalSeconds || 1;
    const chancePerInterval = rule.chancePerInterval != null ? rule.chancePerInterval : rule.chancePerSecond || 0;
    const bonusLuckMult = rule.bonusLuckMult;
    const bonusMutationLuckMult = rule.bonusMutationLuckMult != null ? rule.bonusMutationLuckMult : 1;
    const minRolls = rule.minRolls != null ? rule.minRolls : rule.bonusRolls || 1;
    const maxRolls = rule.maxRolls != null ? rule.maxRolls : rule.bonusRolls || 1;
    const intervalTicks = Math.floor(seconds / intervalSeconds);
    for (let s = 0; s < intervalTicks; s++) {
      if (Math.random() < chancePerInterval) {
        bonusTriggers++;
        const rollsThisTrigger = rule.dynamicRolls ? rule.dynamicRolls(s, intervalSeconds) : minRolls === maxRolls ? minRolls : minRolls + Math.floor(Math.random() * (maxRolls - minRolls + 1));
        if (rollsThisTrigger <= 0) continue;
        for (let j = 0; j < rollsThisTrigger; j++) {
          let normalWinners = [];
          const luckExceededCandidates = [];
          for (const item of pool) {
            const itemBonusLuckMult = item.isMutation ? bonusLuckMult * bonusMutationLuckMult : bonusLuckMult;
            if (item.rng === Infinity) {
              if (Math.random() < Math.min(5e-4 * itemBonusLuckMult, LUCK_AFFECTED_CHANCE_CAP)) {
                if (!normalWinners.length || item.rng > normalWinners[0].rng) normalWinners = [ item ]; else if (item.rng === normalWinners[0].rng) normalWinners.push(item);
              }
              continue;
            }
            if (maxRollChance >= LUCK_AFFECTED_CHANCE_CAP && itemBonusLuckMult >= item.rng) {
              luckExceededCandidates.push(item);
              continue;
            }
            const effectiveChance = cappedLuckChance(itemBonusLuckMult, item.rng, maxRollChance);
            if (Math.random() < effectiveChance) {
              if (!normalWinners.length || item.rng > normalWinners[0].rng) normalWinners = [ item ]; else if (item.rng === normalWinners[0].rng) normalWinners.push(item);
            }
          }
          const guaranteedWinner = chooseLuckExceededWinner(luckExceededCandidates, pool);
          let winner = normalWinners.length && (!guaranteedWinner || normalWinners[0].rng > guaranteedWinner.rng) ? chooseUniformWinner(normalWinners) : guaranteedWinner || chooseUniformWinner(normalWinners);
          if (!winner) winner = pool[0];
          let variant = null;
          let totalMult = 1;
          for (const v of variantChain) {
            if (Math.random() < 1 / v.rng) {
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
          if (!tier) tier = finalRng <= 1 ? TIERS[0] : TIERS[TIERS.length - 1];
          const key = winner.name + "|" + (variant ? variant.key : "none") + "|" + (winner.injectedAreaLabel || "");
          if (!counts[key]) {
            counts[key] = {
              name: winner.name,
              baseRng: winner.rng,
              finalRng: finalRng,
              tier: tier,
              variant: variant ? {
                key: variant.key,
                label: variant.label,
                cls: variant.cls,
                totalMult: totalMult
              } : null,
              injectedAreaLabel: winner.injectedAreaLabel || null,
              count: 0
            };
          }
          counts[key].count++;
          bonusRollsFired++;
          if (!bestFind || finalRng > bestFind.finalRng) bestFind = counts[key];
        }
      }
    }
  }
  return {
    counts: counts,
    bestFind: bestFind,
    bonusRollsFired: bonusRollsFired,
    bonusTriggers: bonusTriggers
  };
}

function sampleBernoulliTriggers(trials, chance) {
  let remaining = Math.max(0, Math.floor(Number(trials) || 0));
  const p = Math.max(0, Math.min(1, Number(chance) || 0));
  if (!remaining || !p) return 0;
  if (p >= 1) return remaining;
  const logNoSuccess = Math.log1p(-p);
  let triggers = 0;
  while (remaining > 0) {
    const skipped = Math.floor(Math.log(1 - Math.random()) / logNoSuccess);
    if (skipped >= remaining) break;
    triggers++;
    remaining -= skipped + 1;
  }
  return triggers;
}

function highFrequencyOfflineBonusSpecs(offlineBonus, seconds) {
  const rules = offlineBonus ? Array.isArray(offlineBonus) ? offlineBonus : [ offlineBonus ] : [];
  const specs = [];
  for (const rule of rules) {
    if (!rule.workerSim) continue;
    const intervalSeconds = Math.max(Number(rule.intervalSeconds) || 1, 1e-6);
    const tickCount = Math.floor(seconds / intervalSeconds);
    const chance = rule.chancePerInterval != null ? rule.chancePerInterval : rule.chancePerSecond || 0;
    const triggers = sampleBernoulliTriggers(tickCount, chance);
    const rollsPerTrigger = rule.minRolls != null ? rule.minRolls : rule.bonusRolls || 1;
    const bonusRolls = Math.max(0, Math.floor(triggers * rollsPerTrigger));
    if (bonusRolls > 0) specs.push({
      rule: rule,
      triggers: triggers,
      bonusRolls: bonusRolls
    });
  }
  return specs;
}

function mergeOfflineSimulationResult(base, extra) {
  for (const key in extra.counts) {
    if (!base.counts[key]) base.counts[key] = {
      ...extra.counts[key],
      count: 0
    };
    base.counts[key].count += extra.counts[key].count;
  }
  if (extra.bestFind && (!base.bestFind || extra.bestFind.finalRng > base.bestFind.finalRng)) base.bestFind = extra.bestFind;
  base.bonusRollsFired = (base.bonusRollsFired || 0) + (extra.bonusRollsFired || 0);
  base.bonusTriggers = (base.bonusTriggers || 0) + (extra.bonusTriggers || 0);
  return base;
}

function scaleCountsToExactTotal(counts, targetTotal) {
  const entries = Object.values(counts);
  if (targetTotal <= 0 || entries.length === 0) return;
  const sourceTotal = entries.reduce((sum, entry) => sum + entry.count, 0);
  if (sourceTotal <= 0) return;
  const factor = targetTotal / sourceTotal;
  let allocated = 0;
  const remainders = entries.map((entry, index) => {
    const scaled = entry.count * factor;
    entry.count = Math.floor(scaled);
    allocated += entry.count;
    return {
      entry: entry,
      index: index,
      remainder: scaled - entry.count
    };
  });
  remainders.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; i < targetTotal - allocated; i++) remainders[i % remainders.length].entry.count++;
}

const OFFLINE_WORKER_COUNT = 10;

const OFFLINE_ROLL_BATCH_SIZE = 2e5;

const OFFLINE_BATCH_YIELD_FRAMES = 5;

function waitForAnimationFrames(frameCount) {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame !== "function") {
      setTimeout(resolve, frameCount * 16);
      return;
    }
    let framesLeft = frameCount;
    function nextFrame() {
      framesLeft--;
      if (framesLeft <= 0) resolve(); else requestAnimationFrame(nextFrame);
    }
    requestAnimationFrame(nextFrame);
  });
}

async function runOfflineSimulations(totalRolls, elapsedSeconds, pool, luckMult, offlineBonus) {
  return new Promise((resolve, reject) => {
    const simModal = document.getElementById("simModal");
    const progressBar = document.getElementById("simProgressBar");
    const progressText = document.getElementById("simProgressText");
    simModal.style.display = "flex";
    progressBar.style.width = "0%";
    progressText.textContent = `initializing full offline simulation...`;
    const hardwareWorkers = Math.max(2, Number(navigator.hardwareConcurrency) || OFFLINE_WORKER_COUNT);
    const configuredWorkerCount = state.superOptimize ? Math.min(16, hardwareWorkers * 2) : state.lowDetailMode ? Math.max(2, Math.min(OFFLINE_WORKER_COUNT, hardwareWorkers)) : OFFLINE_WORKER_COUNT;
    const workerCount = totalRolls > 0 ? Math.min(configuredWorkerCount, totalRolls) : 0;
    const currentArea = WORLDS[state.worldIdx].areas[state.areaIdx];
    const maxRollChance = currentArea.isUniversalPool ? 1 / 3 : LUCK_AFFECTED_CHANCE_CAP;
    let undispatchedRolls = totalRolls;
    let completedRolls = 0;
    let finishedWorkers = 0;
    let settled = false;
    const accumulatedCounts = {};
    let absoluteBest = null;
    const workerBlob = createWorkerBlob();
    const workerUrl = URL.createObjectURL(workerBlob);
    const workers = [];
    function cleanup() {
      workers.forEach(worker => worker.terminate());
      URL.revokeObjectURL(workerUrl);
      simModal.style.display = "none";
    }
    function mergeBatch(counts, bestFind) {
      for (const key in counts) {
        if (!accumulatedCounts[key]) accumulatedCounts[key] = {
          ...counts[key],
          count: 0
        };
        accumulatedCounts[key].count += counts[key].count;
      }
      if (bestFind && (!absoluteBest || bestFind.finalRng > absoluteBest.finalRng)) absoluteBest = {
        ...bestFind
      };
    }
    function updateProgress() {
      const pct = totalRolls > 0 ? Math.round(completedRolls / totalRolls * 100) : 100;
      progressBar.style.width = `${pct}%`;
      progressText.textContent = `running ${workerCount} workers: ${completedRolls.toLocaleString()} / ${totalRolls.toLocaleString()} full offline rolls completed`;
    }
    function finalize() {
      if (settled) return;
      settled = true;
      cleanup();
      const bonusResult = simulateOfflineBonusRules(offlineBonus, elapsedSeconds, pool, VARIANT_CHAIN, TIERS, maxRollChance);
      for (const key in bonusResult.counts) {
        if (!accumulatedCounts[key]) accumulatedCounts[key] = {
          ...bonusResult.counts[key],
          count: 0
        };
        accumulatedCounts[key].count += bonusResult.counts[key].count;
      }
      if (bonusResult.bestFind && (!absoluteBest || bonusResult.bestFind.finalRng > absoluteBest.finalRng)) {
        absoluteBest = {
          ...bonusResult.bestFind
        };
      }
      const resolvedCounts = {};
      for (const key in accumulatedCounts) {
        const entry = accumulatedCounts[key];
        const trueAreaLabel = entry.injectedAreaLabel || WORLDS[state.worldIdx].areas[state.areaIdx].label;
        const trueRng = findRankRng(trueAreaLabel, entry.name);
        const resolvedBaseRng = trueRng != null ? trueRng : entry.baseRng;
        const resolvedFinalRng = entry.variant ? resolvedBaseRng * entry.variant.totalMult : resolvedBaseRng;
        const resolvedKey = invKey(trueAreaLabel, entry.name, entry.variant ? entry.variant.key : null);
        if (!resolvedCounts[resolvedKey]) {
          resolvedCounts[resolvedKey] = {
            name: entry.name,
            baseRng: resolvedBaseRng,
            finalRng: resolvedFinalRng,
            tier: tierFor(resolvedFinalRng),
            variant: entry.variant,
            areaLabel: trueAreaLabel,
            count: 0
          };
        }
        resolvedCounts[resolvedKey].count += entry.count;
      }
      let resolvedBest = null;
      if (absoluteBest) {
        const bfTrueArea = absoluteBest.injectedAreaLabel || WORLDS[state.worldIdx].areas[state.areaIdx].label;
        const bfTrueRng = findRankRng(bfTrueArea, absoluteBest.name);
        const bfBaseRng = bfTrueRng != null ? bfTrueRng : absoluteBest.baseRng;
        const bfFinalRng = absoluteBest.variant ? bfBaseRng * absoluteBest.variant.totalMult : bfBaseRng;
        resolvedBest = {
          name: absoluteBest.name,
          baseRng: bfBaseRng,
          finalRng: bfFinalRng,
          tier: tierFor(bfFinalRng),
          variant: absoluteBest.variant,
          areaLabel: bfTrueArea
        };
      }
      resolve({
        counts: resolvedCounts,
        bestFind: resolvedBest,
        bonusRollsFired: bonusResult.bonusRollsFired,
        bonusTriggers: bonusResult.bonusTriggers
      });
    }
    function fail(err) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    }
    function finishWorker(worker) {
      if (worker._finished) return;
      worker._finished = true;
      finishedWorkers++;
      if (finishedWorkers === workerCount) finalize();
    }
    function dispatchNextBatch(worker) {
      if (settled || worker._finished) return;
      if (undispatchedRolls <= 0) {
        finishWorker(worker);
        return;
      }
      const workerBatchSize = state.superOptimize ? OFFLINE_ROLL_BATCH_SIZE * 4 : state.lowDetailMode ? OFFLINE_ROLL_BATCH_SIZE * 2 : OFFLINE_ROLL_BATCH_SIZE;
      const batchRolls = Math.min(workerBatchSize, undispatchedRolls);
      undispatchedRolls -= batchRolls;
      worker._batchInFlight = batchRolls;
      worker.postMessage({
        rollsToRun: batchRolls,
        pool: pool,
        luckMult: luckMult,
        maxRollChance: maxRollChance,
        variantChain: VARIANT_CHAIN,
        TIERS: TIERS
      });
    }
    if (workerCount === 0) {
      updateProgress();
      finalize();
      return;
    }
    for (let i = 0; i < workerCount; i++) {
      let worker;
      try {
        worker = new Worker(workerUrl);
      } catch (err) {
        fail(new Error("Web Workers blocked or not supported"));
        return;
      }
      workers.push(worker);
      worker._finished = false;
      worker._batchInFlight = 0;
      worker.onmessage = event => {
        const {counts: counts, bestFind: bestFind, rollsCompleted: rollsCompleted} = event.data;
        mergeBatch(counts, bestFind);
        completedRolls += rollsCompleted;
        updateProgress();
        if (undispatchedRolls <= 0) {
          finishWorker(worker);
        } else {
          waitForAnimationFrames(state.superOptimize ? 0 : state.lowDetailMode ? 1 : OFFLINE_BATCH_YIELD_FRAMES).then(() => dispatchNextBatch(worker));
        }
      };
      worker.onerror = err => {
        console.error("Offline worker error:", err);
        fail(err);
      };
      dispatchNextBatch(worker);
    }
  });
}

async function resolveOfflineProgress() {
  if (!canAwardIdleGains()) return null;
  if (isPerilousArea()) {
    state.lastSeenAt = Date.now();
    dbSaveMeta();
    return null;
  }
  if (rouletteCantIdle()) {
    state.lastSeenAt = Date.now();
    dbSaveMeta();
    return null;
  }
  const axe = currentAxe();
  const equip = currentEquip();
  const rps = effectiveRps();
  if (rps <= 0 && !axe.offlineBonus && !(equip && equip.offlineBonus)) return null;
  const now = Date.now();
  let elapsedSeconds = (now - state.lastSeenAt) / 1e3;
  if (elapsedSeconds < 5) return null;
  const capped = elapsedSeconds > MAX_OFFLINE_SECONDS;
  elapsedSeconds = Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS);
  const wholeSeconds = Math.floor(elapsedSeconds);
  const irritationMult = irritationMultiplier(axe, elapsedSeconds);
  const totalRolls = Math.floor(elapsedSeconds * rps * irritationMult);
  const world = WORLDS[state.worldIdx];
  const area = world.areas[state.areaIdx];
  const luckMult = effectiveLuckMult();
  const hasAnyOfflineBonus = axe.offlineBonus || equip && equip.offlineBonus;
  if (totalRolls <= 0 && (!hasAnyOfflineBonus || wholeSeconds <= 0)) return null;
  state.lastOfflineElapsed = elapsedSeconds;
  const pool = buildAreaPool(world, area, {
    isOffline: true
  });
  let scaledAxeBonus = axe.offlineBonus;
  if (axe.irritation && axe.offlineBonus && irritationMult > 1) {
    const rules = Array.isArray(axe.offlineBonus) ? axe.offlineBonus : [ axe.offlineBonus ];
    scaledAxeBonus = rules.map(rule => {
      if (!rule.irritationScales) return rule;
      const minRolls = rule.minRolls != null ? rule.minRolls : rule.bonusRolls || 1;
      const maxRolls = rule.maxRolls != null ? rule.maxRolls : rule.bonusRolls || 1;
      return {
        ...rule,
        minRolls: Math.round(minRolls * irritationMult),
        maxRolls: Math.round(maxRolls * irritationMult)
      };
    });
  }
  const axeRules = scaledAxeBonus ? Array.isArray(scaledAxeBonus) ? scaledAxeBonus : [ scaledAxeBonus ] : [];
  const adjustedEquipBonus = ballAdjustedAxenadesRules(equip, "offlineBonus");
  const equipRules = adjustedEquipBonus ? Array.isArray(adjustedEquipBonus) ? adjustedEquipBonus : [ adjustedEquipBonus ] : [];
  let scaledOfflineBonus = [ ...axeRules, ...equipRules ];
  const idleEffMult = equip && equip.idleEfficiencyMult ? equip.idleEfficiencyMult : 1;
  if (idleEffMult > 1) {
    scaledOfflineBonus = scaledOfflineBonus.map(rule => {
      if (rule.dynamicRolls) return rule;
      const minRolls = rule.minRolls != null ? rule.minRolls : rule.bonusRolls || 1;
      const maxRolls = rule.maxRolls != null ? rule.maxRolls : rule.bonusRolls || 1;
      return {
        ...rule,
        minRolls: Math.round(minRolls * idleEffMult),
        maxRolls: Math.round(maxRolls * idleEffMult)
      };
    });
  }
  const highFrequencySpecs = highFrequencyOfflineBonusSpecs(scaledOfflineBonus, wholeSeconds);
  const regularOfflineBonus = scaledOfflineBonus.filter(rule => !rule.workerSim);
  let simResult;
  try {
    simResult = await runOfflineSimulations(totalRolls, wholeSeconds, pool, luckMult, regularOfflineBonus);
    for (const spec of highFrequencySpecs) {
      const highResult = await runOfflineSimulations(spec.bonusRolls, 0, pool, spec.rule.bonusLuckMult, []);
      highResult.bonusRollsFired = spec.bonusRolls;
      highResult.bonusTriggers = spec.triggers;
      mergeOfflineSimulationResult(simResult, highResult);
    }
  } catch (err) {
    console.warn("Worker sim execution failed, utilizing sync main thread fallback:", err);
    const counts = {};
    let bestFind = null;
    const DIRECT_ROLL_BUDGET = 5e3;
    const directCount = Math.min(totalRolls, DIRECT_ROLL_BUDGET);
    const remaining = totalRolls - directCount;
    const fallbackMaxRollChance = area.isUniversalPool ? 1 / 3 : LUCK_AFFECTED_CHANCE_CAP;
    for (let i = 0; i < directCount; i++) {
      let normalWinners = [];
      const luckExceededCandidates = [];
      for (const item of pool) {
        if (item.rng === Infinity) {
          if (Math.random() < Math.min(5e-4 * luckMult, LUCK_AFFECTED_CHANCE_CAP)) {
            if (!normalWinners.length || item.rng > normalWinners[0].rng) normalWinners = [ item ]; else if (item.rng === normalWinners[0].rng) normalWinners.push(item);
          }
          continue;
        }
        if (fallbackMaxRollChance >= LUCK_AFFECTED_CHANCE_CAP && luckMult >= item.rng) {
          luckExceededCandidates.push(item);
          continue;
        }
        const effectiveChance = cappedLuckChance(luckMult, item.rng, fallbackMaxRollChance);
        if (Math.random() < effectiveChance) {
          if (!normalWinners.length || item.rng > normalWinners[0].rng) normalWinners = [ item ]; else if (item.rng === normalWinners[0].rng) normalWinners.push(item);
        }
      }
      const guaranteedWinner = chooseLuckExceededWinner(luckExceededCandidates, pool);
      let winner = normalWinners.length && (!guaranteedWinner || normalWinners[0].rng > guaranteedWinner.rng) ? chooseUniformWinner(normalWinners) : guaranteedWinner || chooseUniformWinner(normalWinners);
      if (!winner) winner = pool.reduce((a, b) => a.rng < b.rng ? a : b);
      const trueAreaLabel = winner.injectedAreaLabel || area.label;
      const trueRng = findRankRng(trueAreaLabel, winner.name);
      const resolvedRng = trueRng != null ? trueRng : winner.rng;
      const k = invKey(trueAreaLabel, winner.name, null);
      if (!counts[k]) {
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
      if (!bestFind || resolvedRng > bestFind.finalRng) {
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
    if (directCount > 0) scaleCountsToExactTotal(counts, totalRolls);
    const fallbackBonusChanceCap = area.isUniversalPool ? 1 / 3 : LUCK_AFFECTED_CHANCE_CAP;
    const bonusResult = simulateOfflineBonusRules(regularOfflineBonus, wholeSeconds, pool, VARIANT_CHAIN, TIERS, fallbackBonusChanceCap);
    for (const key in bonusResult.counts) {
      const bc = bonusResult.counts[key];
      const trueAreaLabel = bc.injectedAreaLabel || area.label;
      const trueRng = findRankRng(trueAreaLabel, bc.name);
      const resolvedBaseRng = trueRng != null ? trueRng : bc.baseRng;
      const resolvedFinalRng = bc.variant ? resolvedBaseRng * bc.variant.totalMult : resolvedBaseRng;
      const k = invKey(trueAreaLabel, bc.name, bc.variant ? bc.variant.key : null);
      if (!counts[k]) {
        counts[k] = {
          name: bc.name,
          baseRng: resolvedBaseRng,
          finalRng: resolvedFinalRng,
          tier: tierFor(resolvedFinalRng),
          variant: bc.variant,
          areaLabel: trueAreaLabel,
          count: 0
        };
      }
      counts[k].count += bc.count;
    }
    if (bonusResult.bestFind && (!bestFind || bonusResult.bestFind.finalRng > bestFind.finalRng)) {
      const bfTrueArea = bonusResult.bestFind.injectedAreaLabel || area.label;
      const bfTrueRng = findRankRng(bfTrueArea, bonusResult.bestFind.name);
      const bfBaseRng = bfTrueRng != null ? bfTrueRng : bonusResult.bestFind.baseRng;
      const bfFinalRng = bonusResult.bestFind.variant ? bfBaseRng * bonusResult.bestFind.variant.totalMult : bfBaseRng;
      bestFind = {
        name: bonusResult.bestFind.name,
        baseRng: bfBaseRng,
        finalRng: bfFinalRng,
        tier: tierFor(bfFinalRng),
        variant: bonusResult.bestFind.variant,
        areaLabel: bfTrueArea
      };
    }
    let highFrequencyRolls = 0;
    let highFrequencyTriggers = 0;
    for (const spec of highFrequencySpecs) {
      const sampledCounts = {};
      let sampledBest = null;
      const directHighCount = Math.min(spec.bonusRolls, DIRECT_ROLL_BUDGET);
      for (let i = 0; i < directHighCount; i++) {
        const result = rollOnceForArea(world, area, spec.rule.bonusLuckMult, {
          applyBuffs: false
        });
        const key = invKey(result.areaLabel || area.label, result.name, result.variant ? result.variant.key : null);
        if (!sampledCounts[key]) sampledCounts[key] = {
          ...result,
          count: 0,
          areaLabel: result.areaLabel || area.label
        };
        sampledCounts[key].count++;
        if (!sampledBest || result.finalRng > sampledBest.finalRng) sampledBest = result;
      }
      if (directHighCount > 0) scaleCountsToExactTotal(sampledCounts, spec.bonusRolls);
      for (const key in sampledCounts) {
        if (!counts[key]) counts[key] = {
          ...sampledCounts[key],
          count: 0
        };
        counts[key].count += sampledCounts[key].count;
      }
      if (sampledBest && (!bestFind || sampledBest.finalRng > bestFind.finalRng)) bestFind = sampledBest;
      highFrequencyRolls += spec.bonusRolls;
      highFrequencyTriggers += spec.triggers;
    }
    simResult = {
      counts: counts,
      bestFind: bestFind,
      bonusRollsFired: bonusResult.bonusRollsFired + highFrequencyRolls,
      bonusTriggers: bonusResult.bonusTriggers + highFrequencyTriggers
    };
  }
  const finalSummaryItems = [];
  for (const k in simResult.counts) {
    const simItem = simResult.counts[k];
    const r = {
      name: simItem.name,
      baseRng: simItem.baseRng,
      finalRng: simItem.finalRng,
      tier: simItem.tier,
      variant: simItem.variant,
      areaLabel: simItem.areaLabel || area.label
    };
    addToInventory(r, simItem.count);
    finalSummaryItems.push({
      result: r,
      count: simItem.count
    });
  }
  const grandTotalRolls = totalRolls + simResult.bonusRollsFired;
  state.rolls += grandTotalRolls;
  if (simResult.bestFind) {
    if (!state.best || simResult.bestFind.finalRng > state.best.finalRng) {
      state.best = simResult.bestFind;
    }
  }
  return {
    seconds: elapsedSeconds,
    totalRolls: grandTotalRolls,
    bestFind: simResult.bestFind,
    topItems: finalSummaryItems.sort((a, b) => b.count - a.count).slice(0, 6),
    capped: capped,
    bonusTriggers: simResult.bonusTriggers,
    bonusRollsFired: simResult.bonusRollsFired,
    irritationMult: axe.irritation ? irritationMult : null,
    irritationDays: axe.irritation ? Math.floor(elapsedSeconds / 86400) : 0
  };
}

function renderTimeVerificationBanner(status) {
  const el = document.getElementById("offlineBanner");
  if (!el) return;
  const detail = status && status.reason === "unavailable" ? "Idle rolling requires a trusted-time check. Reconnect to the internet and try again." : `Your device clock differs from trusted time by ${fmtDuration(Math.ceil((status && status.skewMs ? Math.abs(status.skewMs) : 0) / 1e3))}. Set it within 30 seconds to enable idle rolling.`;
  el.innerHTML = `\n    <div class="offline-banner cheat-banner time-verification-banner">\n      <h3>⚠️ Idle rolling paused</h3>\n      <p>${detail}</p>\n      <button class="btn small secondary" id="dismissTimeVerification">Got it</button>\n    </div>\n  `;
  document.getElementById("dismissTimeVerification").addEventListener("click", () => {
    el.innerHTML = "";
  });
}

function clearTimeVerificationBanner() {
  const el = document.getElementById("offlineBanner");
  if (el && el.querySelector(".time-verification-banner")) el.innerHTML = "";
}

function renderOfflineBanner(report) {
  const el = document.getElementById("offlineBanner");
  if (!report) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `\n    <div class="offline-banner">\n      <h3>Welcome back 👋</h3>\n      <p>Your ${escapeHtml(currentAxe().name)} kept swinging while you were away — ${fmtDuration(report.seconds)}${report.capped ? " (capped at 7d)" : ""}, ${report.totalRolls.toLocaleString()} rolls calculated.</p>\n      ${report.bonusTriggers > 0 ? `<p>Bonus surges triggered <b>${report.bonusTriggers.toLocaleString()}×</b>, adding ${report.bonusRollsFired.toLocaleString()} rolls.</p>` : ""}\n      ${report.irritationDays > 0 ? `<p>😤 Irritation built up over <b>${report.irritationDays} full day${report.irritationDays === 1 ? "" : "s"}</b> idle — everything else ran at <b>+${((report.irritationMult - 1) * 100).toFixed(1)}%</b> efficiency.</p>` : ""}\n      <div class="offline-summary">\n        ${report.topItems.map(t => {
    const r = t.result;
    const baseTier = tierFor(r.baseRng);
    const suffix = r.variant ? " ✦" : "";
    return `<div class="offline-row">${rankNameHtml(r.name, baseTier.cls, r.variant, "", baseTier.key)}${suffix}<span>×${t.count.toLocaleString()}</span></div>`;
  }).join("")}\n      </div>\n      ${report.bestFind ? (() => {
    const bf = report.bestFind;
    const bfTier = tierFor(bf.baseRng || bf.finalRng);
    return `<p>Best find: ${rankNameHtml(bf.name, bfTier.cls, bf.variant, "", bfTier.key)}${bf.variant ? " ✦" : ""} (1/${fmtRngForResult(bf)})</p>`;
  })() : ""}\n      <button class="btn small" id="dismissOffline">Nice</button>\n    </div>\n  `;
  document.getElementById("dismissOffline").addEventListener("click", () => {
    el.innerHTML = "";
  });
}

function applyBackgroundOfflineReport(report) {
  if (!report) return;
  dbSaveMeta();
  if (!isRouletteActive()) {
    renderAxeStrip();
    renderWorldTabs();
    renderAreaSelect();
    updateAberrationVisual();
    buildIndexAccordion();
    renderInventory();
    updateStatStrip();
  }
  renderOfflineBanner(report);
}

async function fetchCloudflareTime() {
  try {
    const res = await fetch("https://cloudflare.com/cdn-cgi/trace", {
      cache: "no-store"
    });
    const text = await res.text();
    const match = text.match(/ts=(\d+(\.\d+)?)/);
    if (match) return parseFloat(match[1]) * 1e3;
  } catch (e) {}
  return null;
}

const MAX_TRUSTED_TIME_SKEW_MS = 30 * 1e3;

let latestTimeVerification = {
  valid: false,
  reason: "unverified",
  skewMs: null,
  checkedAt: 0
};

async function runAnticheat() {
  const cfTime = await fetchCloudflareTime();
  const checkedAt = Date.now();
  if (cfTime == null) {
    latestTimeVerification = {
      valid: false,
      reason: "unavailable",
      skewMs: null,
      checkedAt: checkedAt
    };
    return latestTimeVerification;
  }
  const skewMs = checkedAt - cfTime;
  latestTimeVerification = {
    valid: Math.abs(skewMs) <= MAX_TRUSTED_TIME_SKEW_MS,
    reason: Math.abs(skewMs) <= MAX_TRUSTED_TIME_SKEW_MS ? "valid" : "skewed",
    skewMs: skewMs,
    checkedAt: checkedAt
  };
  if (latestTimeVerification.valid && state.anticheatLockUntil) {
    state.anticheatLockUntil = null;
    dbSaveMeta();
  }
  return latestTimeVerification;
}

function canAwardIdleGains() {
  return !!latestTimeVerification.valid;
}

function recordIdleBaseline() {
  state.lastSeenAt = Date.now();
}

function looksLikeVanishedSave() {
  let hasPlayedBefore = false;
  try {
    hasPlayedBefore = localStorage.getItem("junis_rng_has_played") === "1";
  } catch (e) {
    return false;
  }
  if (!hasPlayedBefore) return false;
  const stateLooksEmpty = state.rolls === 0 && Object.keys(state.inventory).length === 0 && (!state.ownedAxes || state.ownedAxes.length === 1 && state.ownedAxes[0] === "default");
  return stateLooksEmpty;
}

let dataLossGuardTimerHandle = null;

function showDataLossGuard() {
  globalCrashGuardShown = true;
  const overlay = document.getElementById("dataLossGuard");
  if (!overlay) return;
  overlay.style.display = "flex";
  let secondsLeft = 15;
  const timerEl = document.getElementById("dataLossGuardTimer");
  if (timerEl) timerEl.textContent = secondsLeft;
  dataLossGuardTimerHandle = setInterval(() => {
    secondsLeft--;
    if (timerEl) timerEl.textContent = Math.max(0, secondsLeft);
    if (secondsLeft <= 0) {
      clearInterval(dataLossGuardTimerHandle);
      location.reload();
    }
  }, 1e3);
  const refreshBtn = document.getElementById("dataLossGuardRefreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      if (dataLossGuardTimerHandle) clearInterval(dataLossGuardTimerHandle);
      location.reload();
    });
  }
  const loadLegacyBtn = document.getElementById("dataLossGuardLoadLegacyBtn");
  const loadModernBtn = document.getElementById("dataLossGuardLoadModernBtn");
  async function forceLoadEngine(engine) {
    if (dataLossGuardTimerHandle) clearInterval(dataLossGuardTimerHandle);
    const btns = [ loadLegacyBtn, loadModernBtn ].filter(Boolean);
    btns.forEach(b => b.disabled = true);
    try {
      await syncSaveIntoEngine(engine);
    } catch (err) {
      console.error("forceLoadEngine: sync failed, proceeding to load whatever the target engine has anyway", err);
    }
    setStorageEngineChoice(engine);
    setStorageEngineDontAsk(true);
    location.reload();
  }
  if (loadLegacyBtn) loadLegacyBtn.addEventListener("click", () => forceLoadEngine("legacy"));
  if (loadModernBtn) loadModernBtn.addEventListener("click", () => forceLoadEngine("modern"));
}

function showOfflineLegacyGuard() {
  const wrap = document.querySelector(".wrap");
  if (wrap) wrap.style.display = "none";
  const overlay = document.getElementById("offlineLegacyGuard");
  if (!overlay) return;
  overlay.style.display = "flex";
  const btn = document.getElementById("offlineLegacyGuardSwitchBtn");
  if (btn) {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Switching…";
      try {
        await syncSaveIntoEngine("modern");
      } catch (err) {
        console.error("Offline-legacy switch: sync failed, switching anyway", err);
      }
      setStorageEngineChoice("modern");
      location.reload();
    });
  }
}

let initCrashGuardTimerHandle = null;

function showInitCrashGuard(err) {
  const wrap = document.querySelector(".wrap");
  if (wrap) wrap.style.display = "none";
  const overlay = document.getElementById("initCrashGuard");
  if (!overlay) return;
  overlay.style.display = "flex";
  const detailEl = document.getElementById("initCrashGuardDetail");
  if (detailEl && err) detailEl.textContent = `(${err && err.message || err})`;
  let secondsLeft = 15;
  const timerEl = document.getElementById("initCrashGuardTimer");
  if (timerEl) timerEl.textContent = secondsLeft;
  initCrashGuardTimerHandle = setInterval(() => {
    secondsLeft--;
    if (timerEl) timerEl.textContent = Math.max(0, secondsLeft);
    if (secondsLeft <= 0) {
      clearInterval(initCrashGuardTimerHandle);
      location.reload();
    }
  }, 1e3);
  const refreshBtn = document.getElementById("initCrashGuardRefreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      if (initCrashGuardTimerHandle) clearInterval(initCrashGuardTimerHandle);
      location.reload();
    });
  }
}

function allRanksFlatForLoadingMessage() {
  const out = [];
  for (const w of WORLDS) {
    for (const a of w.areas) {
      for (const r of a.ranks) {
        if (r.rng !== Infinity) out.push({
          name: r.name,
          rng: r.rng
        });
        if (r.mutations) for (const m of r.mutations) {
          if (m.rng !== Infinity) out.push({
            name: m.name,
            rng: m.rng
          });
        }
      }
    }
  }
  return out;
}

function randomRolledLoadingMessage() {
  const ranks = allRanksFlatForLoadingMessage();
  const pick = ranks[Math.floor(Math.random() * ranks.length)];
  const variant = rollVariant();
  const finalRng = variant ? pick.rng * variant.totalMult : pick.rng;
  const variantLabel = variant ? `${variant.label} ` : "";
  return `you rolled a ${variantLabel}${pick.name} which is 1/${fmtRng(finalRng)} lmao`;
}

function garbledLoadingMessage() {
  const words = OFFLINE_LOADING_STATIC_MESSAGES.join(" ").split(/\s+/).filter(Boolean);
  const count = 5 + Math.floor(Math.random() * 6);
  const picked = [];
  for (let i = 0; i < count; i++) picked.push(words[Math.floor(Math.random() * words.length)]);
  return picked.join(" ");
}

function uSuckOrWinLoadingMessage() {
  return Math.random() < 1 / 100 ? "u WIN" : "u suck";
}

const OFFLINE_LOADING_STATIC_MESSAGES = [ "welcome to juni rng headquarters", "thisll take some time ok", "rarest as of september 1, 2026, 4:16 am UTC-4, the rarest legit rank is rainbow orange! (1/210t)", "accept your fate", "activate the gigglesnoy activator", "Run from Very Evil Idiot", "🐟 1", "hi juni was here" ];

function pickOfflineLoadingMessage() {
  const dynamicGenerators = [ garbledLoadingMessage, uSuckOrWinLoadingMessage, randomRolledLoadingMessage ];
  const allOptions = [ ...OFFLINE_LOADING_STATIC_MESSAGES, ...dynamicGenerators ];
  const pick = allOptions[Math.floor(Math.random() * allOptions.length)];
  return typeof pick === "function" ? pick() : pick;
}

let offlineCatchupSkipTimer = null;

function showOfflineCatchupOverlay() {
  const overlay = document.getElementById("offlineCatchupOverlay");
  const msgEl = document.getElementById("offlineCatchupMessage");
  const skipBtn = document.getElementById("offlineCatchupSkipBtn");
  if (!overlay || !msgEl || !skipBtn) return;
  msgEl.textContent = pickOfflineLoadingMessage();
  skipBtn.style.display = "none";
  overlay.style.display = "flex";
  clearTimeout(offlineCatchupSkipTimer);
  offlineCatchupSkipTimer = setTimeout(() => {
    skipBtn.style.display = "inline-block";
  }, 5e3);
  skipBtn.onclick = hideOfflineCatchupOverlay;
}

function hideOfflineCatchupOverlay() {
  const overlay = document.getElementById("offlineCatchupOverlay");
  if (overlay) overlay.style.display = "none";
  clearTimeout(offlineCatchupSkipTimer);
  offlineCatchupSkipTimer = null;
}

async function initInner() {
  await ensureStorageEngineChosen();
  if (!navigator.onLine && getStorageEngineChoice() === "legacy") {
    showOfflineLegacyGuard();
    return;
  }
  await dbLoadAll();
  applyRankVisualStyle();
  applyLowDetailMode();
  applySuperOptimize();
  setupLegacyColorFontToggle();
  setupLowDetailModeToggle();
  setupCompactInventoryVariantsToggle();
  setupShowFpsToggle();
  setupSuperOptimizeToggle();
  applyShowFps();
  if (looksLikeVanishedSave()) {
    console.error("Data-loss guard triggered: save data appears to have vanished. Halting init to avoid overwriting it. Refresh to retry the load.");
    showDataLossGuard();
    return;
  }
  if (state.bombCharge && state.bombCharge.detonating) delete state.bombCharge.detonating;
  if (state.nullBombCharge && state.nullBombCharge.detonating) {
    delete state.nullBombCharge.detonating;
    delete state.nullBombCharge.progress;
  }
  const timeVerification = await runAnticheat();
  let report = null;
  if (canAwardIdleGains()) {
    showOfflineCatchupOverlay();
    const offlinePromise = resolveOfflineProgress();
    let skipResolve;
    const skipPromise = new Promise(res => {
      skipResolve = res;
    });
    const skipBtn = document.getElementById("offlineCatchupSkipBtn");
    if (skipBtn) skipBtn.addEventListener("click", () => skipResolve("skipped"), {
      once: true
    });
    const winner = await Promise.race([ offlinePromise.then(r => ({
      kind: "done",
      report: r
    })), skipPromise.then(() => ({
      kind: "skipped"
    })) ]);
    hideOfflineCatchupOverlay();
    if (winner.kind === "done") {
      report = winner.report;
      clearTimeVerificationBanner();
    } else {
      offlinePromise.then(bgReport => applyBackgroundOfflineReport(bgReport)).catch(err => {
        console.error("Background offline catch-up simulation failed after skip:", err);
      });
    }
  } else {
    renderTimeVerificationBanner(timeVerification);
  }
  recordIdleBaseline();
  dbSaveMeta();
  renderAxeStrip();
  renderWorldTabs();
  renderAreaSelect();
  updateAberrationVisual();
  buildIndexAccordion();
  buildSecretsAccordion();
  const titleEl0 = document.getElementById("indexPanelTitle");
  if (titleEl0) titleEl0.textContent = `Rank index — ${WORLDS[state.worldIdx].label}`;
  renderInventory();
  setupInventoryFilters();
  setupInventoryModeToggles();
  renderItemCards();
  renderConsumableCards();
  renderEquipCards();
  renderBallsView();
  renderSettingsView();
  updateRouletteAvailability();
  if (isRouletteActive()) showView("roulette");
  setupConsumableBulkCraftControls();
  setupItemCategorySelect();
  updateStatStrip();
  if (report) renderOfflineBanner(report);
}

async function init() {
  try {
    await initInner();
  } catch (err) {
    console.error("init() failed — showing crash guard instead of a stuck half-rendered page.", err);
    handleGlobalCrash(err);
  }
}

(function initPhotosensitivityDisclaimer() {
  const overlay = document.getElementById("photosensitivityDisclaimer");
  const blockedOverlay = document.getElementById("disclaimerBlocked");
  const okBtn = document.getElementById("disclaimerOkBtn");
  const darkBtn = document.getElementById("disclaimerDarkBtn");
  const noBtn = document.getElementById("disclaimerNoBtn");
  function dismiss() {
    if (overlay) overlay.style.display = "none";
  }
  if (okBtn) okBtn.addEventListener("click", () => {
    dismiss();
    init();
  });
  if (darkBtn) darkBtn.addEventListener("click", () => {
    document.documentElement.classList.add("low-stim");
    dismiss();
    init();
  });
  if (noBtn) noBtn.addEventListener("click", () => {
    dismiss();
    if (blockedOverlay) blockedOverlay.style.display = "flex";
  });
})();

window.addEventListener("beforeunload", () => {
  recordIdleBaseline();
  pendingMetaSave = true;
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  flushPendingSaves();
  if (persistenceWorker) persistenceWorker.postMessage({
    type: "flush"
  });
});

let timeVerificationCheckInFlight = false;

setInterval(async () => {
  if (document.visibilityState !== "visible" || timeVerificationCheckInFlight) return;
  timeVerificationCheckInFlight = true;
  try {
    const status = await runAnticheat();
    if (!status.valid) renderTimeVerificationBanner(status); else clearTimeVerificationBanner();
  } finally {
    timeVerificationCheckInFlight = false;
  }
}, 3e4);

setInterval(tickPerilousMeter, PERILOUS_METER_TICK_MS);

setInterval(() => {
  rouletteTick();
  if (currentView === "roulette") renderRouletteView();
}, 250);

let wasErrRedirectorActive = isErrRedirectorActive();

let wasDoublinatorActive = isDoublinatorActive();

let wasStablizerActive = isStablizerActive();

setInterval(() => {
  const now = Date.now();
  const ballsExpired = pruneExpiredBalls(now);
  if (ballsExpired) {
    updateBallsNavDot();
    dbSaveMeta();
  }
  if (currentView === "balls") renderBallsView();
  if (currentView === "items") {
    if (state.bombCharge) renderConsumableCards();
    if (state.nullBombCharge) renderConsumableCards();
    if (state.wgunStacks && state.wgunStacks.length) renderConsumableCards();
    if (state.errRedirectorUntil) renderConsumableCards();
    if (state.doublinatorUntil || state.doublinatorCooldownUntil) renderConsumableCards();
    if (state.stablizerUntil) renderConsumableCards();
  }
  if (state.wgunStacks && state.wgunStacks.length) {
    const before = state.wgunStacks.length;
    wgunActiveStacks();
    if (state.wgunStacks.length !== before) {
      dbSaveMeta();
      renderAxeStrip();
      updateStatStrip();
    }
  }
  const nowErrRedirectorActive = isErrRedirectorActive();
  if (nowErrRedirectorActive !== wasErrRedirectorActive) {
    wasErrRedirectorActive = nowErrRedirectorActive;
    renderInventory();
  }
  if (state.errRedirectorUntil && state.errRedirectorUntil <= now) {
    state.errRedirectorUntil = null;
    dbSaveMeta();
  }
  const nowDoublinatorActive = isDoublinatorActive();
  if (nowDoublinatorActive !== wasDoublinatorActive) {
    wasDoublinatorActive = nowDoublinatorActive;
    renderAxeStrip();
    updateStatStrip();
  }
  let doublinatorStateChanged = false;
  if (state.doublinatorUntil && state.doublinatorUntil <= now) {
    state.doublinatorUntil = null;
    doublinatorStateChanged = true;
  }
  if (state.doublinatorCooldownUntil && state.doublinatorCooldownUntil <= now) {
    state.doublinatorCooldownUntil = null;
    doublinatorStateChanged = true;
  }
  if (doublinatorStateChanged) dbSaveMeta();
  const nowStablizerActive = isStablizerActive();
  if (nowStablizerActive !== wasStablizerActive) {
    wasStablizerActive = nowStablizerActive;
    updatePerilousPresentation();
  }
  if (state.stablizerUntil && state.stablizerUntil <= now) {
    state.stablizerUntil = null;
    dbSaveMeta();
    updatePerilousPresentation();
  }
}, 1e3);

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "hidden") {
    recordIdleBaseline();
    pendingMetaSave = true;
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = null;
    }
    flushPendingSaves();
    if (persistenceWorker) persistenceWorker.postMessage({
      type: "flush"
    });
  } else {
    const timeVerification = await runAnticheat();
    if (!canAwardIdleGains()) {
      renderTimeVerificationBanner(timeVerification);
      recordIdleBaseline();
      dbSaveMeta();
      return;
    }
    const report = await resolveOfflineProgress();
    recordIdleBaseline();
    dbSaveMeta();
    clearTimeVerificationBanner();
    if (report) {
      renderInventory();
      updateStatStrip();
      renderOfflineBanner(report);
    }
  }
});

window.addEventListener("offline", () => {
  if (getStorageEngineChoice() === "legacy") {
    showOfflineLegacyGuard();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      console.warn("Service worker registration failed (game still works online):", err);
    });
  });
}

/* ============================================================
   GAMEPAD SUPPORT — Joy-Con, Xbox, PS4/5, and anything else the browser's Gamepad API can see.
   Never announced anywhere in the UI copy — it just works the moment a controller is connected,
   with a small icon as the only acknowledgment. Standard Gamepad API only; no per-controller
   drivers or special-casing needed since Chrome/Edge/Safari all normalize button/axis layout to
   the "standard" gamepad mapping for anything that reports one (which covers all three).
   ============================================================ */
(function initGamepadSupport() {
  const STANDARD_BUTTONS = {
    0: "face-down", 1: "face-right", 2: "face-left", 3: "face-up", // A/B/X/Y, X/O/□/△, etc.
    4: "l1", 5: "r1", 6: "l2", 7: "r2",
    8: "select", 9: "start",
    12: "dpad-up", 13: "dpad-down", 14: "dpad-left", 15: "dpad-right",
  };
  const FACE_BUTTONS = ["face-down", "face-right", "face-left", "face-up"];
  const STICK_DEADZONE = 0.5;
  const REPEAT_DELAY_MS = 380; // initial hold-to-repeat delay for held D-pad/stick directions
  const REPEAT_RATE_MS = 140;

  let connectedPads = new Map(); // gamepad.index -> true, just for the indicator + "any pad connected" check
  let prevButtonStates = new Map(); // gamepad.index -> array of bool, for press-edge detection
  let focusEl = null;
  let lastDirection = null;
  let lastDirectionAt = 0;
  let rafHandle = null;
  let lastIndicatorCount = 0;

  function updateIndicator() {
    let el = document.getElementById("gamepadIndicator");
    if (connectedPads.size === 0) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement("div");
      el.id = "gamepadIndicator";
      el.textContent = "🎮";
      el.style.cssText = "position:fixed; top:8px; right:8px; z-index:99996; font-size:16px; opacity:0.55; pointer-events:none; filter:drop-shadow(0 0 3px rgba(0,0,0,0.6));";
      document.body.appendChild(el);
    }
  }

  window.addEventListener("gamepadconnected", e => {
    connectedPads.set(e.gamepad.index, true);
    updateIndicator();
  });
  window.addEventListener("gamepaddisconnected", e => {
    connectedPads.delete(e.gamepad.index);
    prevButtonStates.delete(e.gamepad.index);
    updateIndicator();
  });

  // Any element a controller could reasonably land on: nav buttons (including the scroll
  // arrows), roulette subtabs, and anything with the shared .btn family of classes, but only
  // ones that are actually visible right now (offscreen nav buttons, hidden subtabs, and
  // display:none panels are excluded) — this is re-queried fresh every navigation press, so it
  // stays correct across re-renders without needing any per-view hardcoded list.
  // Any of these being visible means the game underneath is NOT actually playable yet — state
  // may not be loaded, or the whole app is intentionally frozen. The gamepad must never be able
  // to reach anything underneath (like rollBtn, which stays in the DOM the whole time, just
  // visually covered) while one of these is up — this is what let a stray controller press
  // during the disclaimer screen call rollBtn.click() before state was ever loaded, silently
  // overwriting a real save with a blank one on the very next auto-save.
  const BLOCKING_OVERLAY_IDS = ["photosensitivityDisclaimer", "disclaimerBlocked", "dataLossGuard", "initCrashGuard", "offlineCatchupOverlay"];
  function activeBlockingOverlay() {
    for (const id of BLOCKING_OVERLAY_IDS) {
      const el = document.getElementById(id);
      if (el && window.getComputedStyle(el).display !== "none") return el;
    }
    return null;
  }

  function focusableElements() {
    const overlay = activeBlockingOverlay();
    const scope = overlay || document;
    const all = Array.from(scope.querySelectorAll(
      '.nav-btn:not(.nav-btn-offscreen), .nav-scroll-arrow, .roulette-subtab-btn, .btn, .seg-btn, .area-btn, .roulette-spin-btn, .cache-reset-btn, #settingsFooterBtn, button.folder-row, button.acc-head'
    ));
    return all.filter(el => {
      if (el.hidden || el.disabled) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      // Exclude elements inside a view that isn't the active one (irrelevant while scoped to an
      // overlay, but harmless — the overlay's own buttons aren't inside any .view anyway).
      const view = el.closest(".view");
      if (view && !view.classList.contains("active")) return false;
      // Exclude elements inside a Roulette subtab panel that's currently display:none.
      const subtabPanel = el.closest("#rouletteContent, #miningContent, #lorebookContent");
      if (subtabPanel && window.getComputedStyle(subtabPanel).display === "none") return false;
      return true;
    });
  }

  function ensureFocus() {
    const els = focusableElements();
    if (els.length === 0) { focusEl = null; return null; }
    if (focusEl && els.includes(focusEl)) return focusEl;
    // Default to the roll button if it's on screen (the most common starting point), else the
    // first focusable element in reading order.
    focusEl = els.find(el => el.id === "rollBtn") || els[0];
    return focusEl;
  }

  function setFocus(el) {
    if (focusEl) focusEl.classList.remove("gamepad-focus");
    focusEl = el;
    if (focusEl) {
      focusEl.classList.add("gamepad-focus");
      focusEl.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  // Nearest-neighbor focus movement: among all focusable elements roughly in the pressed
  // direction from the current one, pick whichever is closest by straight-line distance. This
  // works generically across every view without any hardcoded per-page layout.
  function moveFocus(direction) {
    const current = ensureFocus();
    if (!current) return;
    const currentRect = current.getBoundingClientRect();
    const cx = currentRect.left + currentRect.width / 2;
    const cy = currentRect.top + currentRect.height / 2;
    const candidates = focusableElements().filter(el => el !== current);
    let best = null, bestScore = Infinity;
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      const dx = ex - cx, dy = ey - cy;
      let inDirection = false;
      if (direction === "up") inDirection = dy < -4;
      if (direction === "down") inDirection = dy > 4;
      if (direction === "left") inDirection = dx < -4;
      if (direction === "right") inDirection = dx > 4;
      if (!inDirection) continue;
      // Penalize perpendicular drift so moving "down" prefers something roughly below, not
      // diagonally far off to the side, while still allowing some slack for staggered grids.
      const primary = direction === "up" || direction === "down" ? Math.abs(dy) : Math.abs(dx);
      const secondary = direction === "up" || direction === "down" ? Math.abs(dx) : Math.abs(dy);
      const score = primary + secondary * 2;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) setFocus(best);
  }

  function activateFocus() {
    const current = ensureFocus();
    if (current) current.click();
  }

  // L1/R1 cycle the main bottom-nav tabs directly, independent of D-pad focus — the most natural
  // controller mapping for switching tabs, matching the existing scroll-arrow behavior.
  function cycleNavTab(delta) {
    const buttons = navVisibleButtons();
    if (buttons.length === 0) return;
    const idx = buttons.findIndex(b => b.dataset.view === currentView);
    const nextIdx = ((idx === -1 ? 0 : idx) + delta + buttons.length) % buttons.length;
    showView(buttons[nextIdx].dataset.view);
  }

  function pollGamepads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = Date.now();
    let anyConnected = false;
    const seenThisFrame = new Set();

    for (const pad of pads) {
      if (!pad) continue;
      anyConnected = true;
      seenThisFrame.add(pad.index);
      if (!connectedPads.has(pad.index)) connectedPads.set(pad.index, true); // Safari doesn't always fire gamepadconnected — this is the real source of truth
      const prev = prevButtonStates.get(pad.index) || [];
      const curr = pad.buttons.map(b => b.pressed);

      for (let i = 0; i < curr.length; i++) {
        const wasPressed = !!prev[i];
        const isPressed = curr[i];
        if (isPressed && !wasPressed) {
          const name = STANDARD_BUTTONS[i];
          if (!name) continue;
          const blocked = !!activeBlockingOverlay();
          if (blocked) {
            // Only activating whatever's focused (now scoped to the overlay's own buttons by
            // focusableElements()) is allowed — no nav switching, no roll shortcut, nothing that
            // could reach past the overlay into the game underneath.
            if (FACE_BUTTONS.includes(name)) activateFocus();
            continue;
          }
          if (name === "l1") cycleNavTab(-1);
          else if (name === "r1") cycleNavTab(1);
          else if (name === "dpad-up") { moveFocus("up"); lastDirection = "up"; lastDirectionAt = now; }
          else if (name === "dpad-down") { moveFocus("down"); lastDirection = "down"; lastDirectionAt = now; }
          else if (name === "dpad-left") { moveFocus("left"); lastDirection = "left"; lastDirectionAt = now; }
          else if (name === "dpad-right") { moveFocus("right"); lastDirection = "right"; lastDirectionAt = now; }
          else if (FACE_BUTTONS.includes(name)) {
            // On the Roll view, any face button mashes Roll directly — the whole point of this.
            if (currentView === "roll" && document.getElementById("rollBtn")) {
              document.getElementById("rollBtn").click();
            } else {
              activateFocus();
            }
          }
        }
      }
      prevButtonStates.set(pad.index, curr);

      // Left stick also moves focus, treated the same as D-pad taps (press-edge + hold-repeat),
      // not continuous per-frame movement, so a full stick push doesn't fly across the screen.
      const [lx, ly] = [pad.axes[0] || 0, pad.axes[1] || 0];
      let stickDir = null;
      if (ly < -STICK_DEADZONE) stickDir = "up";
      else if (ly > STICK_DEADZONE) stickDir = "down";
      else if (lx < -STICK_DEADZONE) stickDir = "left";
      else if (lx > STICK_DEADZONE) stickDir = "right";
      if (stickDir) {
        const held = stickDir === lastDirection;
        const elapsed = now - lastDirectionAt;
        if (!held || (elapsed > REPEAT_DELAY_MS && elapsed % REPEAT_RATE_MS < 20)) {
          moveFocus(stickDir);
          lastDirection = stickDir;
          lastDirectionAt = held ? lastDirectionAt : now;
        }
      } else if (lastDirection && ["up", "down", "left", "right"].includes(lastDirection)) {
        lastDirection = null;
      }
    }

    // Catch disconnects even if gamepaddisconnected never fires (same Safari unreliability).
    for (const idx of Array.from(connectedPads.keys())) {
      if (!seenThisFrame.has(idx)) { connectedPads.delete(idx); prevButtonStates.delete(idx); }
    }
    if (connectedPads.size !== lastIndicatorCount) { updateIndicator(); lastIndicatorCount = connectedPads.size; }

    if (anyConnected) ensureFocus();
    rafHandle = requestAnimationFrame(pollGamepads);
  }

  // Always polling from page load, independent of gamepadconnected ever firing — Safari has two
  // confirmed WebKit bugs (bugs.webkit.org #270575, #284375) where that event only fires on a
  // button press (not stick movement) and can fail to fire at all until getGamepads() has already
  // been called once. Continuous polling from the start sidesteps both, and is a strict superset
  // of event-driven detection so it changes nothing for browsers where the events work fine.
  rafHandle = requestAnimationFrame(pollGamepads);
})();