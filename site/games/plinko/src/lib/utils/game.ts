import { LOCAL_STORAGE_KEY } from '$lib/constants/game';
import { balance } from '$lib/stores/game';
import { get } from 'svelte/store';

export function setBalanceFromLocalStorage() {
  const host = window as any;
  const isEmbeddedInHost =
    typeof host?.plinkoSetBalance !== 'undefined' ||
    !!document.getElementById('mePts') ||
    !!document.getElementById('topPts');

  // Always listen for host balance updates when embedded so we can sync
  // even if the host hasn't initialised `meProfile` yet.
  try {
    if (!host.__plinkoHostBalanceListenerBound) {
      host.__plinkoHostBalanceListenerBound = true;
      window.addEventListener('hostBalanceChanged', (e: any) => {
        const v = Number(e?.detail);
        if (!isNaN(v)) balance.set(v);
      });
    }
  } catch (e) {}

  // Prefer host site balance when embedded: check for global `meProfile` now.
  if (host?.meProfile && typeof host.meProfile.pts !== 'undefined') {
    const hostPts = Number(host.meProfile.pts || 0);
    if (!isNaN(hostPts)) {
      balance.set(hostPts);
      return;
    }
  }

  // If the host page has already rendered the balance DOM (top or side), prefer that
  // to avoid flashing the default balance while we wait for the host JS to initialise.
  try {
    const el = document.getElementById('mePts') || document.getElementById('topPts');
    const domVal = el?.textContent?.trim();
    const parsed = parseFloat(domVal || '');
    if (!isNaN(parsed)) {
      balance.set(parsed);
      return;
    }
  } catch (e) {}

  // In embedded mode, do not fall back to standalone local storage values,
  // otherwise the game can start from an old number instead of main site balance.
  if (isEmbeddedInHost) {
    return;
  }

  const rawValue = window.localStorage.getItem(LOCAL_STORAGE_KEY.BALANCE);
  const parsedValue = parseFloat(rawValue ?? '');
  if (!isNaN(parsedValue)) {
    balance.set(parsedValue);
  }
}

export function writeBalanceToLocalStorage() {
  const balanceVal = get(balance);
  if (!isNaN(balanceVal)) {
    const balanceValStr = balanceVal.toFixed(2);
    window.localStorage.setItem(LOCAL_STORAGE_KEY.BALANCE, balanceValStr);
  }
}
