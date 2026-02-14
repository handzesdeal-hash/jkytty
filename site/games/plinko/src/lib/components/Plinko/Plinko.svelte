<script lang="ts">
  import { plinkoEngine } from '$lib/stores/game';
  import CircleNotch from 'phosphor-svelte/lib/CircleNotch';
  import type { Action } from 'svelte/action';
  import BinsRow from './BinsRow.svelte';
  import LastWins from './LastWins.svelte';
  import PlinkoEngine from './PlinkoEngine';

  const { WIDTH, HEIGHT } = PlinkoEngine;

  const initPlinko: Action<HTMLCanvasElement> = (node) => {
    $plinkoEngine = new PlinkoEngine(node);
    $plinkoEngine.start();

    return {
      destroy: () => {
        $plinkoEngine?.stop();
      },
    };
  };
</script>

<div class="relative border-l border-white/10 bg-[linear-gradient(180deg,rgba(10,16,34,.94),rgba(8,12,26,.96))]">
  <div class="mx-auto flex h-full flex-col px-4 pb-4" style:max-width={`${WIDTH}px`}>
    <div class="relative w-full overflow-hidden rounded-xl border border-white/10 bg-[rgba(11,18,38,.95)] shadow-[inset_0_0_0_1px_rgba(255,255,255,.03)]" style:aspect-ratio={`${WIDTH} / ${HEIGHT}`}>
      {#if $plinkoEngine === null}
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <CircleNotch class="size-20 animate-spin text-slate-600" weight="bold" />
        </div>
      {/if}

      <canvas use:initPlinko width={WIDTH} height={HEIGHT} class="absolute inset-0 h-full w-full">
      </canvas>

      <div class="pointer-events-none absolute inset-y-0 right-2 z-10 flex items-center lg:right-3">
        <div class="pointer-events-auto">
          <LastWins />
        </div>
      </div>
    </div>
    <BinsRow />
  </div>
</div>
