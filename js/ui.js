(function () {
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;").replace(/'/g, "&#39;");

  const LOGO = `<svg class="logo-mark" width="34" height="34" viewBox="0 0 32 32" aria-label="SkillSwap logo" role="img">
    <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".25"/>
    <path d="M9 12a7 7 0 0 1 12-2" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M21 10v3.5h-3.5" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M23 20a7 7 0 0 1-12 2" fill="none" stroke="var(--mint)" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M11 22v-3.5h3.5" fill="none" stroke="var(--mint)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  function toast(msg, type) {
    const box = document.getElementById("toasts");
    const el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.innerHTML = `<span>${esc(msg)}</span>`;
    box.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 220); }, 3600);
  }

  function modal(html, opts) {
    opts = opts || {};
    const wrap = document.getElementById("modals");
    const back = document.createElement("div");
    back.className = "modal-backdrop";
    back.innerHTML = `<div class="modal ${opts.wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div>`;
    wrap.appendChild(back);
    const close = () => back.remove();
    back.addEventListener("mousedown", (e) => { if (e.target === back && !opts.sticky) close(); });
    document.addEventListener("keydown", function esc2(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc2); }
    });
    back.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", close));
    return { el: back, close };
  }

  function confirmDialog(title, text, confirmLabel, danger) {
    return new Promise((resolve) => {
      const m = modal(`
        <h3>${esc(title)}</h3>
        <p class="modal-sub">${text}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-close>Cancel</button>
          <button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="cf-yes">${esc(confirmLabel || "Confirm")}</button>
        </div>`);
      m.el.querySelector("#cf-yes").addEventListener("click", () => { m.close(); resolve(true); });
      m.el.addEventListener("mousedown", (e) => { if (e.target === m.el) resolve(false); });
      m.el.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => resolve(false)));
    });
  }

  function avatar(user, size, cls) {
    const initials = (user.name || "?").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const online = user.online ? '<span class="online-dot"></span>' : "";
    return `<span class="avatar ${size || ""} ${cls || ""}" style="background:${esc(user.avatar_color || "#2DD4BF")}22;color:${esc(user.avatar_color || "#2DD4BF")};border:2px solid ${esc(user.avatar_color || "#2DD4BF")}55" title="${esc(user.name)}">${esc(initials)}${online}</span>`;
  }

  function trustBadge(level) {
    const map = { New: "🟡", Established: "🔵", Trusted: "🛡️" };
    return `<span class="badge badge-trust-${(level || "new").toLowerCase()}" title="Trust level: ${esc(level)}">${map[level] || "🟡"} ${esc(level || "New")}</span>`;
  }

  function matchBadge(match) {
    if (!match) return "";
    const perfect = match.perfect;
    return `<span class="match-badge ${perfect ? "perfect" : ""}" title="${perfect ? "Perfect two-way skill swap" : "Compatibility score"}">${perfect ? "⭐ " : ""}${match.pct}% Match</span>`;
  }

  function skillChips(skills, opts) {
    opts = opts || {};
    return (skills || []).map(s => `
      <span class="chip ${opts.accent ? "accent" : ""}" title="${esc(s.category || "")}">
        ${esc(s.emoji || "")} ${esc(s.name)}${opts.showLevel ? ` <span class="lvl">· ${esc(s.level)}</span>` : ""}
        ${opts.showVerification && s.type === "teach" && s.verification && s.verification !== "none" ? `<span class="verification-chip v-${s.verification}">${s.verification === "verified" ? "✓ Verified" : "Claimed"}</span>` : ""}
      </span>`).join("");
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const d = new Date(iso), now = new Date();
    const s = Math.max(0, (now - d) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 604800) return Math.floor(s / 86400) + "d ago";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function fmtTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function emptyState(icon, title, text, actionHtml) {
    return `<div class="empty"><div class="big">${icon}</div><h3>${esc(title)}</h3><p class="small">${text || ""}</p>${actionHtml || ""}</div>`;
  }

  function skeletons(n, h) {
    let out = "";
    for (let i = 0; i < n; i++) out += `<div class="skeleton" style="height:${h || 140}px;margin-bottom:14px"></div>`;
    return out;
  }

  function errorBox(msg, retry) {
    return `<div class="empty"><div class="big">⚠️</div><h3>Something went wrong</h3><p class="small">${esc(msg || "Please try again.")}</p>
      ${retry ? `<button class="btn btn-soft" onclick="location.reload()">Reload</button>` : ""}</div>`;
  }

  function stars(avg) {
    const full = Math.round(avg);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  SS.ui = { esc, toast, modal, confirmDialog, avatar, trustBadge, matchBadge, skillChips, timeAgo, fmtTime, emptyState, skeletons, errorBox, stars, LOGO };
})();
