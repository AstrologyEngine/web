<script lang="ts">
  import type { Snippet } from "svelte";
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
      aria-label="Resize details"
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
    <button class="close" onclick={onclose} aria-label="Close details">×</button
    >
    <h2 bind:this={heading} tabindex="-1">{name}</h2>
    {@render children()}
  </div>
</aside>

<style>
  aside {
    border: 1px solid #d8cfc1;
    background: #fffdf8;
    border-radius: 1rem;
    color: #28231f;
  }
  .scroll {
    padding: 1.5rem;
    overflow-y: auto;
    min-height: 0;
  }
  h2 {
    font:
      400 2rem Georgia,
      serif;
    margin: 0 0 1rem;
  }
  h2:focus {
    outline: none;
  }
  .close {
    float: right;
    border: 0;
    background: transparent;
    font-size: 1.8rem;
    cursor: pointer;
  }
  .scroll :global(.keywords),
  .scroll :global(.context) {
    color: #765b50;
    font-size: 0.9rem;
  }
  .scroll :global(dl) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .scroll :global(dt) {
    font-size: 0.8rem;
    color: #765b50;
  }
  .scroll :global(dd) {
    margin: 0.25rem 0 0;
    text-transform: capitalize;
  }
  .handle {
    display: none;
  }
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
      border-radius: 1rem 1rem 0 0;
      box-shadow: 0 -4px 24px #0002;
    }
    .handle {
      display: flex;
      justify-content: center;
      touch-action: none;
    }
    .handle button {
      border: 0;
      background: transparent;
      padding: 9px 35px;
      cursor: pointer;
    }
    .handle span {
      display: block;
      width: 40px;
      height: 3px;
      border-radius: 3px;
      background: #9c8c7c;
      margin: 3px;
    }
  }
</style>
