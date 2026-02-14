<script lang="ts">
  import logo from '$lib/assets/logo.svg';
  import Balance from '$lib/components/Balance.svelte';
  import LiveStatsWindow from '$lib/components/LiveStatsWindow/LiveStatsWindow.svelte';
  import Plinko from '$lib/components/Plinko';
  import Sidebar from '$lib/components/Sidebar';
  import { setBalanceFromLocalStorage, writeBalanceToLocalStorage } from '$lib/utils/game';
  import GitHubLogo from 'phosphor-svelte/lib/GithubLogo';

  $effect(() => {
    setBalanceFromLocalStorage();
  });
</script>

<svelte:window onbeforeunload={writeBalanceToLocalStorage} />

<div class="relative flex min-h-dvh w-full flex-col">
  <!-- Nav and Balance removed for integration with main site -->
  <div class="flex-1 px-5">
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

  <footer class="px-5 pt-16 pb-4">
    <div class="mx-auto max-w-[40rem]">
      <div aria-hidden="true" class="h-[1px] bg-slate-700"></div>
      <div class="flex items-center justify-between p-2">
        <p class="text-sm text-slate-500">
          <a
            href="https://www.ansonh.com"
            target="_blank"
            rel="noreferrer"
            class=" text-cyan-600 transition hover:text-cyan-500"
          >
            Anson Heung
          </a>
          © {new Date().getFullYear()}
        </p>
        <a
          href="https://github.com/AnsonH/plinko-game"
          target="_blank"
          rel="noreferrer"
          class="flex items-center gap-1 p-1 text-sm text-slate-500 transition hover:text-cyan-500"
        >
          <GitHubLogo class="size-4" weight="bold" />
          <span>Source Code</span>
        </a>
      </div>
    </div>
  </footer>
</div>

<style lang="postcss">
  @reference "../app.css";

  :global(body) {
    background:
      radial-gradient(1200px 900px at 18% 12%, rgba(124, 58, 237, 0.18), transparent 60%),
      radial-gradient(1200px 900px at 82% 12%, rgba(239, 68, 68, 0.12), transparent 60%),
      linear-gradient(180deg, #06070f, #090b18);
  }
</style>
