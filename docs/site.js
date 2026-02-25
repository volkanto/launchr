const buttons = Array.from(document.querySelectorAll("[data-copy-target]"));

function setButtonState(button, message) {
  const original = button.dataset.originalLabel || button.textContent;
  if (!button.dataset.originalLabel) {
    button.dataset.originalLabel = original;
  }
  button.textContent = message;
  window.setTimeout(() => {
    button.textContent = original;
  }, 1300);
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

buttons.forEach((button) => {
  button.addEventListener("click", async () => {
    const targetId = button.getAttribute("data-copy-target");
    const source = targetId ? document.getElementById(targetId) : null;
    const text = source ? source.textContent : "";
    if (!text) {
      setButtonState(button, "Unavailable");
      return;
    }

    try {
      await copyText(text.trim());
      setButtonState(button, "Copied");
    } catch {
      setButtonState(button, "Failed");
    }
  });
});

const year = document.getElementById("year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}
