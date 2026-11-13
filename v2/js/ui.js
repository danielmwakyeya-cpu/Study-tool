import { esc } from "./util.js";

const ALLOWED = new Set(["A", "B", "BLOCKQUOTE", "BR", "DIV", "EM", "H2", "H3", "H4", "I", "LI", "MARK", "OL", "P", "SPAN", "STRONG", "SUB", "SUP", "U", "UL"]);

export function sanitizeHtml(input) {
  const html = String(input ?? "");
  if (!html) return "";
  const root = document.createElement("div");
  root.innerHTML = html;
  clean(root);
  return root.innerHTML;
}

function clean(node) {
  const children = [...node.childNodes];
  for (const child of children) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    if (!ALLOWED.has(child.tagName)) {
      const parent = child.parentNode;
      while (child.firstChild) parent.insertBefore(child.firstChild, child);
      parent.removeChild(child);
      clean(parent);
      return clean(node);
    }
    for (const attr of [...child.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "srcdoc") {
        child.removeAttribute(attr.name);
        continue;
      }
      if (name === "href") {
        const href = attr.value.trim();
        if (!/^(https?:|mailto:|#)/i.test(href)) child.removeAttribute(attr.name);
        continue;
      }
      if (name === "style") {
        const match = attr.value.match(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/i);
        if (match && (child.tagName === "SPAN" || child.tagName === "MARK")) {
          child.setAttribute("style", `background-color:${match[1]}`);
        } else child.removeAttribute("style");
        continue;
      }
      if (!["class", "data-obj-id", "data-fn-id", "data-comment-id"].includes(name)) {
        child.removeAttribute(attr.name);
      }
    }
    if (child.tagName === "A") {
      child.setAttribute("rel", "noopener noreferrer");
      child.setAttribute("target", "_blank");
    }
    clean(child);
  }
}

export function toast(message) {
  const host = document.getElementById("toaster");
  if (!host) return;
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  host.appendChild(node);
  setTimeout(() => node.remove(), 4600);
}

function settleModal(dialog, resolve) {
  let settled = false;
  return (value) => {
    if (settled) return;
    settled = true;
    dialog.close();
    dialog.remove();
    resolve(value);
  };
}

export function confirmModal({ title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "modal";
    dialog.innerHTML = `<form method="dialog">
      <h2>${esc(title)}</h2>
      <p>${esc(body)}</p>
      <div class="modal-actions">
        <button type="button" class="btn" data-cancel>${cancelLabel}</button>
        <button type="submit" class="btn ${danger ? "danger" : "primary"}">${confirmLabel}</button>
      </div>
    </form>`;
    document.body.appendChild(dialog);
    const finish = settleModal(dialog, resolve);
    dialog.querySelector("[data-cancel]").addEventListener("click", () => finish(false));
    dialog.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      finish(true);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(false);
    });
    dialog.showModal();
  });
}

export function actionSheet({ title, actions }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "sheet";
    dialog.innerHTML = `<form method="dialog">
      <div class="sheet-grab" aria-hidden="true"></div>
      <h2>${esc(title)}</h2>
      <div class="sheet-actions">
        ${actions.map((action) => `<button type="button" class="sheet-btn ${action.danger ? "danger" : ""}" data-value="${esc(action.value)}" ${action.disabled ? "disabled" : ""}>${esc(action.label)}</button>`).join("")}
      </div>
      <button type="button" class="sheet-btn cancel" data-cancel>Cancel</button>
    </form>`;
    document.body.appendChild(dialog);
    const finish = settleModal(dialog, resolve);
    dialog.querySelectorAll("[data-value]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.disabled) return;
        finish(button.getAttribute("data-value"));
      });
    });
    dialog.querySelector("[data-cancel]").addEventListener("click", () => finish(null));
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(null);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) finish(null);
    });
    dialog.showModal();
  });
}

export function choiceModal({ title, body, choices }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "modal";
    dialog.innerHTML = `<form method="dialog">
      <h2>${esc(title)}</h2>
      <div class="modal-body">${esc(body)}</div>
      <div class="modal-actions">${choices.map((choice) => `<button type="button" class="btn ${choice.primary ? "primary" : ""} ${choice.danger ? "danger" : ""}" data-value="${choice.value}">${choice.label}</button>`).join("")}</div>
    </form>`;
    document.body.appendChild(dialog);
    const finish = settleModal(dialog, resolve);
    dialog.querySelectorAll("[data-value]").forEach((button) => {
      button.addEventListener("click", () => finish(button.getAttribute("data-value")));
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(null);
    });
    dialog.showModal();
  });
}

export function formModal({ title, intro = "", fields, confirmLabel = "Save" }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "modal";
    dialog.innerHTML = `<form>
      <h2>${esc(title)}</h2>
      ${intro ? `<p>${esc(intro)}</p>` : ""}
      ${fields.map((field) => `<label class="field"><span>${esc(field.label)}</span>${fieldControl(field)}</label>`).join("")}
      <div class="modal-actions">
        <button type="button" class="btn" data-cancel>Cancel</button>
        <button type="submit" class="btn primary">${confirmLabel}</button>
      </div>
    </form>`;
    document.body.appendChild(dialog);
    const finish = settleModal(dialog, resolve);
    dialog.querySelector("[data-cancel]").addEventListener("click", () => finish(null));
    dialog.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = {};
      for (const field of fields) {
        const input = dialog.querySelector(`[name="${field.name}"]`);
        data[field.name] = input?.value ?? "";
      }
      finish(data);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(null);
    });
    dialog.showModal();
    dialog.querySelector("input, select, textarea")?.focus();
  });
}

function fieldControl(field) {
  if (field.type === "select") {
    return `<select name="${esc(field.name)}">${(field.options || []).map((opt) => `<option value="${esc(opt.value)}" ${opt.value === field.value ? "selected" : ""}>${esc(opt.label)}</option>`).join("")}</select>`;
  }
  if (field.type === "textarea") {
    return `<textarea name="${esc(field.name)}" rows="${field.rows || 4}">${esc(field.value || "")}</textarea>`;
  }
  return `<input name="${esc(field.name)}" type="${esc(field.type || "text")}" value="${esc(field.value || "")}" ${field.required ? "required" : ""}>`;
}
