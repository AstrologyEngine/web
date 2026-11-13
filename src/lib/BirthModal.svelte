<script lang="ts">
  import { untrack, type ComponentProps, type Snippet } from "svelte";
  import BirthEdit from "./BirthEdit.svelte";
  import { t } from "./copy/index.svelte";
  type EditProps = ComponentProps<typeof BirthEdit>;
  let {
    birth,
    closable,
    resolve,
    onresolve,
    onstart,
    onclose,
    status,
  }: {
    birth: EditProps["birth"];
    /** A chart has rendered: Done, Escape and the backdrop may close. */
    closable: boolean;
    resolve: EditProps["resolve"];
    onresolve: EditProps["onresolve"];
    onstart?: EditProps["onstart"];
    onclose: () => void;
    status?: Snippet;
  } = $props();
  // First visit or later edit, fixed for as long as the modal stays open.
  const editing = untrack(() => closable);
  let closed = false;
  let pressedOutside = false;
  const close = () => {
    if (!closable || closed) return;
    closed = true;
    onclose();
  };
  const outside = (dialog: HTMLDialogElement, event: MouseEvent) => {
    const box = dialog.getBoundingClientRect();
    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  };
  const setup = (node: HTMLDialogElement) => {
    // Server rendering shows the dialog non-modally until hydration.
    if (node.open) node.close();
    node.showModal();
    // Safety net: if the browser closes the dialog anyway (for example a close
    // request the cancel event could not prevent), reopen it until it may close.
    const closedByBrowser = () => {
      if (node.open || closed) return;
      if (closable) close();
      else node.showModal();
    };
    node.addEventListener("close", closedByBrowser);
    return () => {
      node.removeEventListener("close", closedByBrowser);
      if (node.open) node.close();
    };
  };
</script>

<dialog
  open
  class="birth-modal"
  aria-labelledby="birth-modal-heading"
  {@attach setup}
  onkeydown={(event) => {
    // Handling Escape here, before the browser turns it into a close request,
    // keeps the dialog open: Chromium force-closes on a repeated Escape even
    // when the cancel event is prevented.
    if (event.key === "Escape" && !event.isComposing) {
      event.preventDefault();
      close();
    }
  }}
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
  onpointerdown={(event) => {
    pressedOutside =
      event.target === event.currentTarget &&
      outside(event.currentTarget, event);
  }}
  onclick={(event) => {
    // Both press and release must be on the backdrop: a text selection dragged
    // out of the field does not close the dialog.
    if (
      pressedOutside &&
      event.target === event.currentTarget &&
      outside(event.currentTarget, event)
    )
      close();
    pressedOutside = false;
  }}
>
  <h2 id="birth-modal-heading">
    {editing ? t("app.entry.edit") : t("app.entry.headingEmpty")}
  </h2>
  <p class="modal-intro">{t("birth.modal.intro")}</p>
  <BirthEdit
    {birth}
    {resolve}
    {onresolve}
    {onstart}
    {closable}
    ondone={close}
    {status}
  />
</dialog>

<style>
  dialog {
    width: min(540px, calc(100vw - 40px));
    max-height: 85dvh;
    overflow: auto;
    padding: 36px;
    border: 0;
    border-radius: 16px;
    background: var(--surface);
    color: var(--ink);
    box-shadow: 0 18px 70px #292d3830;
  }
  /* Nearly transparent, so the live preview shows through. */
  dialog::backdrop {
    background: #f5f2eb38;
  }
  h2 {
    margin: 0 0 12px;
    font: 400 30px/1.15 var(--serif);
  }
  .modal-intro {
    margin: 0 0 8px;
    color: var(--muted);
  }
  @media (max-width: 799px) {
    dialog {
      width: calc(100vw - 24px);
      max-height: calc(100dvh - 24px);
      padding: 24px 20px;
    }
    h2 {
      font-size: 26px;
    }
  }
</style>
