<script lang="ts">
  import { Select } from '$lib/components/ui';
  import { autoBetIntervalMs, rowCountOptions } from '$lib/constants/game';
  import {
    balance,
    betAmount,
    betAmountOfExistingBalls,
    plinkoEngine,
    riskLevel,
    rowCount,
  } from '$lib/stores/game';
  import { isLiveStatsOpen } from '$lib/stores/layout';
  import { BetMode, RiskLevel } from '$lib/types';
  import { flyAndScale } from '$lib/utils/transitions';
  import { Popover, Tooltip } from 'bits-ui';
  import ChartLine from 'phosphor-svelte/lib/ChartLine';
  import Infinity from 'phosphor-svelte/lib/Infinity';
  import Question from 'phosphor-svelte/lib/Question';
  import type { FormEventHandler } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  let betMode: BetMode = $state(BetMode.MANUAL);

  /**
   * When `betMode` is `AUTO`, the number of bets to be placed. Zero means infinite bets.
   */
  let autoBetInput = $state(0);

  /**
   * Number of auto bets remaining when `betMode` is `AUTO`.
   *
   * - `number`: Finite count of how many bets left. It decrements from `autoBetInput` to 0.
   * - `null`: For infinite bets (i.e. `autoBetInput` is 0).
   */
  let autoBetsLeft: number | null = $state(null);

  let autoBetInterval: ReturnType<typeof setInterval> | null = $state(null);

  let isBetAmountNegative = $derived($betAmount < 0);
  let isBetExceedBalance = $derived($betAmount > $balance);
  let isAutoBetInputNegative = $derived(autoBetInput < 0);

  let isDropBallDisabled = $derived(
    $plinkoEngine === null || isBetAmountNegative || isBetExceedBalance || isAutoBetInputNegative,
  );

  let hasOutstandingBalls = $derived(Object.keys($betAmountOfExistingBalls).length > 0);

  const handleBetAmountFocusOut: FormEventHandler<HTMLInputElement> = (e) => {
    const parsedValue = parseFloat(e.currentTarget.value.trim());
    if (isNaN(parsedValue)) {
      $betAmount = -1; // If input field is empty, this forces re-render so its value resets to 0
      $betAmount = 0;
    } else {
      $betAmount = parsedValue;
    }
  };

  function resetAutoBetInterval() {
    if (autoBetInterval !== null) {
      clearInterval(autoBetInterval);
      autoBetInterval = null;
    }
  }

  function autoBetDropBall() {
    if (isBetExceedBalance) {
      resetAutoBetInterval();
      return;
    }

    // Infinite mode
    if (autoBetsLeft === null) {
      $plinkoEngine?.dropBall();
      return;
    }

    // Finite mode
    if (autoBetsLeft > 0) {
      $plinkoEngine?.dropBall();
      autoBetsLeft -= 1;
    }
    if (autoBetsLeft === 0 && autoBetInterval !== null) {
      resetAutoBetInterval();
      return;
    }
  }

  const handleAutoBetInputFocusOut: FormEventHandler<HTMLInputElement> = (e) => {
    const parsedValue = parseInt(e.currentTarget.value.trim());
    if (isNaN(parsedValue)) {
      autoBetInput = -1; // If input field is empty, this forces re-render so its value resets to 0
      autoBetInput = 0;
    } else {
      autoBetInput = parsedValue;
    }
  };

  function handleBetClick() {
    if (betMode === BetMode.MANUAL) {
      $plinkoEngine?.dropBall();
    } else if (autoBetInterval === null) {
      autoBetsLeft = autoBetInput === 0 ? null : autoBetInput;
      autoBetInterval = setInterval(autoBetDropBall, autoBetIntervalMs);
    } else if (autoBetInterval !== null) {
      resetAutoBetInterval();
    }
  }

  const betModes = [
    { value: BetMode.MANUAL, label: 'Manual' },
    { value: BetMode.AUTO, label: 'Auto' },
  ];
  const riskLevels = [
    { value: RiskLevel.LOW, label: 'Low' },
    { value: RiskLevel.MEDIUM, label: 'Medium' },
    { value: RiskLevel.HIGH, label: 'High' },
  ];
  const rowCounts = rowCountOptions.map((value) => ({ value, label: value.toString() }));
</script>

<div class="flex flex-col gap-5 border-r border-white/10 bg-[rgba(28,36,58,.88)] p-3 rounded-b-2xl lg:max-w-80 lg:rounded-tl-2xl lg:rounded-bl-2xl lg:rounded-tr-none lg:rounded-br-none">
  <div class="flex gap-1 rounded-full border border-white/10 bg-[rgba(10,14,28,.82)] p-1">
    {#each betModes as { value, label }}
      <button
        disabled={autoBetInterval !== null}
        onclick={() => (betMode = value)}
        class={twMerge(
          'flex-1 rounded-full py-2 text-sm font-semibold text-white transition hover:not-disabled:bg-[rgba(100,116,139,.36)] active:not-disabled:bg-[rgba(100,116,139,.5)] disabled:cursor-not-allowed disabled:opacity-50',
          betMode === value && 'bg-[rgba(124,58,237,.35)] ring-1 ring-[rgba(167,139,250,.45)]',
        )}
      >
        {label}
      </button>
    {/each}
  </div>

  <div class="relative">
    <label for="betAmount" class="text-sm font-medium text-slate-300">Bet Amount</label>
    <div class="flex">
      <div class="relative flex-1">
        <input
          id="betAmount"
          bind:value={$betAmount}
          oninput={(e) => {
            const v = parseFloat((e.target as HTMLInputElement).value);
            $betAmount = isNaN(v) ? 0 : parseFloat(v.toFixed(2));
          }}
          onfocusout={handleBetAmountFocusOut}
          disabled={autoBetInterval !== null}
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          class={twMerge(
            'w-full appearance-none rounded-l-md border-2 border-[rgba(148,163,184,.25)] bg-[rgba(10,14,28,.86)] py-2 pr-9 pl-3 text-sm text-white transition-colors hover:cursor-pointer hover:not-disabled:border-[rgba(167,139,250,.45)] focus:border-[rgba(167,139,250,.55)] focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
            (isBetAmountNegative || isBetExceedBalance) &&
              'border-red-500 hover:not-disabled:border-red-400 focus:border-red-400',
          )}
        />
        <div class="absolute inset-y-0 right-2 flex items-center select-none pointer-events-none" aria-hidden="true">
          <!-- blue diamond/gem like host, vertically centered -->
          <svg width="22" height="22" viewBox="0 0 24 24" class="block" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gBlueLocal" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#93c5fd" />
                <stop offset="1" stop-color="#2563eb" />
              </linearGradient>
            </defs>
            <path d="M12 2 4.2 9.2 12 22l7.8-12.8z" fill="url(#gBlueLocal)" />
            <path d="M12 2 9 9.2h6z" fill="rgba(255,255,255,.35)" />
          </svg>
        </div>
      </div>
      <button
        disabled={autoBetInterval !== null}
        onclick={() => {
          $betAmount = parseFloat(($betAmount / 2).toFixed(2));
        }}
        class="touch-manipulation bg-[rgba(71,85,105,.85)] px-4 font-bold text-white diagonal-fractions transition-colors hover:not-disabled:bg-[rgba(100,116,139,.9)] active:not-disabled:bg-[rgba(100,116,139,1)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        1/2
      </button>
      <button
        disabled={autoBetInterval !== null}
        onclick={() => {
          $betAmount = parseFloat(($betAmount * 2).toFixed(2));
        }}
        class="relative touch-manipulation rounded-r-md bg-[rgba(71,85,105,.85)] px-4 text-sm font-bold text-white transition-colors after:absolute after:left-0 after:inline-block after:h-1/2 after:w-[2px] after:bg-[rgba(10,14,28,.9)] after:content-[''] hover:not-disabled:bg-[rgba(100,116,139,.9)] active:not-disabled:bg-[rgba(100,116,139,1)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        2×
      </button>
    </div>
    {#if isBetAmountNegative}
      <p class="absolute text-xs leading-5 text-red-400">
        This must be greater than or equal to 0.
      </p>
    {:else if isBetExceedBalance}
      <p class="absolute text-xs leading-5 text-red-400">Can't bet more than your balance!</p>
    {/if}
  </div>

  <div>
    <label for="riskLevel" class="text-sm font-medium text-slate-300">Risk</label>
    <Select
      id="riskLevel"
      bind:value={$riskLevel}
      items={riskLevels}
      disabled={hasOutstandingBalls || autoBetInterval !== null}
    />
  </div>

  <div>
    <label for="rowCount" class="text-sm font-medium text-slate-300">Rows</label>
    <Select
      id="rowCount"
      bind:value={$rowCount}
      items={rowCounts}
      disabled={hasOutstandingBalls || autoBetInterval !== null}
    />
  </div>

  {#if betMode === BetMode.AUTO}
    <div>
      <div class="flex items-center gap-1">
        <label for="autoBetInput" class="text-sm font-medium text-slate-300">Number of Bets</label>
        <Popover.Root>
          <Popover.Trigger class="p-1">
            <Question class="text-slate-300" weight="bold" />
          </Popover.Trigger>
          <Popover.Content
            class="z-30 max-w-lg rounded-md bg-white p-3 text-sm font-medium text-gray-950 drop-shadow-xl"
          >
            <p>Enter '0' for unlimited bets.</p>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Root>
      </div>
      <div class="relative">
        <input
          id="autoBetInput"
          value={autoBetInterval === null ? autoBetInput : autoBetsLeft ?? 0}
          disabled={autoBetInterval !== null}
          onfocusout={handleAutoBetInputFocusOut}
          type="number"
          min="0"
          inputmode="numeric"
          class={twMerge(
            'w-full rounded-md border-2 border-slate-600 bg-slate-900 py-2 pr-8 pl-3 text-sm text-white transition-colors hover:cursor-pointer hover:not-disabled:border-slate-500 focus:border-slate-500 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
            isAutoBetInputNegative && 'border-red-500 hover:border-red-400 focus:border-red-400',
          )}
        />
        {#if autoBetInput === 0}
          <Infinity class="absolute top-3 right-3 size-4 text-slate-400" weight="bold" />
        {/if}
      </div>
      {#if isAutoBetInputNegative}
        <p class="text-xs leading-5 text-red-400">This must be greater than or equal to 0.</p>
      {/if}
    </div>
  {/if}

  <button
    onclick={handleBetClick}
    disabled={isDropBallDisabled}
    class={twMerge(
      'touch-manipulation rounded-md bg-[linear-gradient(135deg,rgba(34,197,94,.95),rgba(134,239,172,.78))] py-3 font-semibold text-slate-950 transition-colors hover:brightness-105 active:brightness-95 disabled:bg-neutral-600 disabled:text-neutral-400',
      autoBetInterval !== null && 'bg-[linear-gradient(135deg,rgba(245,158,11,.95),rgba(251,191,36,.78))] hover:brightness-105 active:brightness-95',
    )}
  >
    {#if betMode === BetMode.MANUAL}
      Drop Ball
    {:else if autoBetInterval === null}
      Start Autobet
    {:else}
      Stop Autobet
    {/if}
  </button>

  <div class="mt-auto pt-5">
    <div class="flex items-center gap-4 border-t border-slate-600 pt-3">
      <Tooltip.Provider delayDuration={0} disableCloseOnTriggerClick>
        <!-- Live Stats Button -->
        <Tooltip.Root>
          <Tooltip.Trigger
            onclick={() => ($isLiveStatsOpen = !$isLiveStatsOpen)}
            class={twMerge(
              'rounded-full p-2 text-slate-300 transition hover:bg-slate-600 active:bg-slate-500',
              $isLiveStatsOpen && 'text-slate-100',
            )}
          >
            <ChartLine class="size-6" weight="bold" />
          </Tooltip.Trigger>
          <Tooltip.Content
            forceMount
            sideOffset={4}
            class="z-30 max-w-lg rounded-md bg-white p-3 text-sm font-medium text-gray-950 drop-shadow-xl"
          >
            {#snippet child({ wrapperProps, props, open })}
              {#if open}
                <div {...wrapperProps}>
                  <div {...props} transition:flyAndScale>
                    <Tooltip.Arrow class="text-white" />
                    <p>{$isLiveStatsOpen ? 'Close' : 'Open'} Live Stats</p>
                  </div>
                </div>
              {/if}
            {/snippet}
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  </div>
</div>

<style>
  #betAmount::-webkit-outer-spin-button,
  #betAmount::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  #betAmount {
    -moz-appearance: textfield;
  }
</style>
