<script lang="ts">
  import LiveStatsWindow from '$lib/components/LiveStatsWindow/LiveStatsWindow.svelte';
  import Plinko from '$lib/components/Plinko';
  import Sidebar from '$lib/components/Sidebar';
  import { setBalanceFromLocalStorage, writeBalanceToLocalStorage } from '$lib/utils/game';

  $effect(() => {
    setBalanceFromLocalStorage();
  });
</script>

<svelte:window onbeforeunload={writeBalanceToLocalStorage} />

<div class="relative flex min-h-dvh w-full flex-col overflow-x-hidden overflow-y-auto md:h-dvh md:overflow-y-hidden">
  <!-- Nav and Balance removed for integration with main site -->
  <div class="min-h-0 flex-1 px-5">
    <div class="mx-auto mt-5 max-w-xl min-w-[300px] drop-shadow-xl md:mt-8 lg:max-w-7xl">
      <div class="flex flex-col-reverse overflow-visible rounded-2xl border border-white/10 bg-[rgba(8,10,24,.84)] shadow-[0_20px_64px_rgba(0,0,0,.58)] backdrop-blur-sm lg:w-full lg:flex-row">
        <Sidebar />
        <div class="flex-1">
          <Plinko />
        </div>
      </div>
    </div>
  </div>

  <LiveStatsWindow />
</div>

<style lang="postcss">
  @reference "../app.css";

  :global(body) {
    background:
      radial-gradient(1200px 900px at 18% 12%, rgba(124, 58, 237, 0.18), transparent 60%),
      radial-gradient(1200px 900px at 82% 12%, rgba(239, 68, 68, 0.12), transparent 60%),
      linear-gradient(180deg, #06070f, #090b18);
    overflow: hidden;
  }

  :global(html) {
    overflow: hidden;
  }

  @media (max-width: 767px) {
    :global(html),
    :global(body) {
      overflow-y: auto;
      overflow-x: hidden;
    }
  }
</style>
