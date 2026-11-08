<svelte:head><title>Your chart | Astrology Engine</title></svelte:head>
<main>
  <p class="brand">✳ &nbsp; Astrology Engine <span>BETA</span></p>
  <section>
    <p class="eyebrow">YOUR NATAL CHART</p>
    <h1>Start with your birth details</h1>
    <p>Tell us when and where you were born.</p>
    <label for="birth-details">Birth details</label>
    <textarea
      id="birth-details"
      rows="3"
      placeholder="For example, May 12, 1990 at 8:30 am in Chicago"></textarea>
    <p class="hint">Chart creation is coming soon.</p>
  </section>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    background: #f8f6f0;
    color: #1f1f1f;
    font-family: system-ui, sans-serif;
  }
  main {
    max-width: 1100px;
    margin: auto;
    padding: 2rem clamp(1.4rem, 6vw, 5rem);
  }
  .brand {
    font:
      1.25rem Georgia,
      serif;
    margin: 0 0 4rem;
  }
  .brand span {
    font:
      600 0.65rem system-ui,
      sans-serif;
    letter-spacing: 0.15em;
    border: 1px solid #c8c3b8;
    border-radius: 20px;
    padding: 0.25rem 0.5rem;
  }
  section {
    max-width: 720px;
  }
  .eyebrow {
    color: #a04938;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.15em;
  }
  h1 {
    font:
      400 clamp(2.5rem, 5vw, 4rem)/1.05 Georgia,
      serif;
    letter-spacing: -0.04em;
    margin: 1rem 0;
  }
  p {
    color: #555850;
    line-height: 1.6;
  }
  label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    margin: 2rem 0 0.5rem;
  }
  textarea {
    display: block;
    width: 100%;
    padding: 1rem;
    border: 1px solid #aaa99f;
    border-radius: 3px;
    font: inherit;
    resize: vertical;
  }
  textarea:focus-visible {
    outline: 3px solid #a04938;
    outline-offset: 3px;
  }
  .hint {
    font-size: 0.8rem;
  }
</style>
