<script lang="ts">
  import { binColorsByRowCount, binPayouts } from '$lib/constants/game';
  import { plinkoEngine, riskLevel, rowCount, winRecords } from '$lib/stores/game';

  let binElements: Array<HTMLDivElement | null> = $state([]);
  let activeAnimations: Array<Animation | null> = $state([]);

  // NOTE: Not using $effect because it'll play animation if we toggle on animation in settings
  winRecords.subscribe((value) => {
    if (value.length) {
      const lastWinBinIndex = value[value.length - 1].binIndex;
      playAnimation(lastWinBinIndex);
    }
  });

  function playAnimation(binIndex: number) {
    const node = binElements[binIndex];
    if (!node) return;

    const prev = activeAnimations[binIndex];
    try { prev?.cancel(); } catch (e) {}

    const anim = node.animate(
      [
        { transform: 'translateY(0px)' },
        { transform: 'translateY(10px)' },
        { transform: 'translateY(-1px)' },
        { transform: 'translateY(0px)' },
      ],
      {
        duration: 280,
        easing: 'cubic-bezier(0.22, 0.9, 0.24, 1)',
      },
    );
    activeAnimations[binIndex] = anim;
  }
</script>

<!-- Height clamping in mobile: From 10px at 370px viewport width to 16px at 600px viewport width -->
<div class="flex h-[clamp(10px,0.352px+2.609vw,16px)] w-full justify-center lg:h-7">
  {#if $plinkoEngine}
    <div class="flex gap-[1%]" style:width={`${($plinkoEngine.binsWidthPercentage ?? 0) * 100}%`}>
      {#each binPayouts[$rowCount][$riskLevel] as payout, binIndex}
        <!-- Font-size clamping:
              - Mobile (< 1024px): From 6px at 370px viewport width to 8px at 600px viewport width
              - Desktop (>= 1024px): From 10px at 1024px viewport width to 12px at 1100px viewport width
         -->
        <div
          bind:this={binElements[binIndex]}
          class="flex min-w-0 flex-1 items-center justify-center rounded-xs text-[clamp(6px,2.784px+0.87vw,8px)] font-bold text-gray-950 shadow-[0_2px_var(--shadow-color)] lg:rounded-md lg:text-[clamp(10px,-16.944px+2.632vw,12px)] lg:shadow-[0_3px_var(--shadow-color)]"
          style:background-color={binColorsByRowCount[$rowCount].background[binIndex]}
          style:--shadow-color={binColorsByRowCount[$rowCount].shadow[binIndex]}
        >
          {payout}{payout < 100 ? '×' : ''}
        </div>
      {/each}
    </div>
  {/if}
</div>
