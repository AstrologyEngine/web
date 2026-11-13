<script lang="ts">
  import type { Snippet } from "svelte";
  import { t } from "./copy/index.svelte";
  let {
    label,
    name,
    heading = $bindable(),
    snap = $bindable(40),
    onclose,
    children,
  }: {
    label: string;
    name: string;
    heading?: HTMLHeadingElement;
    snap: 40 | 70;
    onclose: () => void;
    children: Snippet;
  } = $props();
  let startY = 0;
  const touchStart = (e: TouchEvent) => {
    startY = e.touches[0]?.clientY ?? 0;
  };
  const touchEnd = (e: TouchEvent) => {
    const delta = (e.changedTouches[0]?.clientY ?? startY) - startY;
    if (delta < -30) snap = 70;
    else if (delta > 30) {
      if (snap === 70) snap = 40;
      else onclose();
    }
  };
</script>

<aside aria-label={label} style:--sheet-height={`${snap}dvh`}>
  <div class="handle">
    <button
      ontouchstart={touchStart}
      ontouchend={touchEnd}
      aria-label={t("details.shell.resize")}
      aria-valuemin="0"
      aria-valuemax="70"
      aria-valuenow={snap}
      role="slider"
      onkeydown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") {
          e.preventDefault();
          snap = 70;
        } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
          e.preventDefault();
          if (snap === 70) snap = 40;
          else onclose();
        }
      }}
      onclick={() => (snap = snap === 40 ? 70 : 40)}
      ><span></span><span></span></button
    >
  </div>
  <div class="scroll">
    <button
      class="close"
      onclick={onclose}
      aria-label={t("details.shell.close")}>×</button
    >
    <h2 bind:this={heading} tabindex="-1">{name}</h2>
    {@render children()}
  </div>
</aside>

<style>
  /* Desktop: the reading rail presents details flat, as in variant A. */
  aside {
    color: var(--ink);
  }
  .scroll {
    min-height: 0;
  }
  h2 {
    margin: 0 0 20px;
    font: 400 38px/1.15 var(--serif);
  }
  h2:focus {
    outline: none;
  }
  .close {
    float: right;
    min-height: 0;
    width: 36px;
    height: 36px;
    margin: 2px -8px 0 12px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--muted);
    font-size: 1.6rem;
    line-height: 1;
  }
  .close:hover {
    background: var(--accent-wash);
    color: var(--ink);
  }
  .scroll :global(p) {
    margin: 0 0 14px;
  }
  .scroll :global(.keywords),
  .scroll :global(.context) {
    color: var(--muted);
    font-size: 0.9rem;
  }
  .scroll :global(dl) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin: 22px 0;
    padding-top: 18px;
    border-top: 1px solid var(--line);
  }
  .scroll :global(dt) {
    color: var(--muted);
    font-size: 12px;
  }
  .scroll :global(dd) {
    margin: 2px 0 0;
    text-transform: capitalize;
  }
  .handle {
    display: none;
  }
  /* Mobile: a resizable bottom sheet over the chart. */
  @media (max-width: 799px) {
    aside {
      position: fixed;
      z-index: 10;
      bottom: 0;
      left: 0;
      right: 0;
      height: var(--sheet-height);
      display: flex;
      flex-direction: column;
      border: 1px solid var(--line);
      border-radius: 16px 16px 0 0;
      background: var(--surface);
      box-shadow: 0 -4px 24px #292d3822;
    }
    .scroll {
      padding: 0 20px 20px;
      overflow-y: auto;
    }
    h2 {
      font-size: 30px;
      margin-bottom: 12px;
    }
    .handle {
      display: flex;
      justify-content: center;
      touch-action: none;
    }
    .handle button {
      min-height: 0;
      padding: 9px 35px;
      border: 0;
      background: transparent;
      cursor: pointer;
    }
    .handle span {
      display: block;
      width: 40px;
      height: 3px;
      margin: 3px;
      border-radius: 3px;
      background: #a79cae;
    }
  }
</style>
