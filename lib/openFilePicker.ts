export function openFilePicker(input: HTMLInputElement | null | undefined) {
  if (!input) return;

  const trigger = () => {
    try {
      input.value = "";
    } catch {}

    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {}

    input.click();
  };

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(trigger);
    return;
  }

  trigger();
}
