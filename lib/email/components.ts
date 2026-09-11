export function EmailButton({ text, url }: { text: string, url: string }) {
  return `
    <div class="button-container">
      <a href="${url}" class="button">${text}</a>
    </div>
  `;
}

export function EmailCard({ children }: { children: string }) {
  return `<div class="card">${children}</div>`;
}

export function EmailCardRow({ label, value }: { label: string, value: string }) {
  // Try to detect if the value contains english text, numbers or references that should stay LTR
  // We can just forcefully wrap values in ltr if they are LTR-specific, but the easiest way is a generic LTR span for data
  return `
    <div class="card-row">
      <span class="card-label">${label}</span>
      <span class="card-value" dir="auto">${value}</span>
    </div>
  `;
}

export function EmailNotice({ type = 'info', title, text }: { type?: 'info'|'success'|'warning', title: string, text: string }) {
  return `
    <div class="notice ${type}">
      <div class="notice-title">${title}</div>
      <div class="text" style="margin-bottom: 0;">${text}</div>
    </div>
  `;
}

export function EmailText({ children }: { children: string }) {
  return `<p class="text">${children}</p>`;
}
