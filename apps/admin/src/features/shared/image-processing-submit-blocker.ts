/** Each picker owns its listener, so one finishing cannot unlock another. */
export function blockImageProcessingSubmit(form: HTMLFormElement | null, onBlocked: () => void) {
  const target = form?.ownerDocument.defaultView;
  if (!form || !target) return () => undefined;
  const listener = (event: Event) => {
    if (event.target !== form) return;
    event.preventDefault();
    // Window capture runs before React's delegated submit handlers, including
    // handlers on portal roots. Covers click, Enter and requestSubmit().
    event.stopImmediatePropagation();
    onBlocked();
  };
  target.addEventListener("submit", listener, true);
  return () => target.removeEventListener("submit", listener, true);
}
