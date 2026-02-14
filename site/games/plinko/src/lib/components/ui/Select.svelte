<script lang="ts" generics="T">
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import CaretDown from 'phosphor-svelte/lib/CaretDown';

  type Props = Omit<HTMLSelectAttributes, 'value'> & {
    value: T;
    items: { value: T; label: string }[];
  };

  let { value = $bindable(), items, ...props }: Props = $props();
</script>

<div class="relative">
  <select
    bind:value
    class="block w-full appearance-none rounded-md border-2 border-[rgba(148,163,184,.25)] bg-[rgba(10,14,28,.86)] py-2 pr-8 pl-3 text-sm text-white transition hover:cursor-pointer hover:not-disabled:border-[rgba(167,139,250,.45)] focus:border-[rgba(167,139,250,.55)] focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
    {...props}
  >
    {#each items as { value, label }}
      <option {value}>{label}</option>
    {/each}
  </select>
  <CaretDown class="absolute top-3 right-3 text-[rgba(167,139,250,.8)]" weight="bold" />
</div>
