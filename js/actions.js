(function () {
  const { esc } = SS.ui;
  async function goMessage(userId) {
    try {
      const r = await SS.api.post("/api/conversations", { user_id: userId });
      SS.nav("#/messages/" + r.conversation_id);
    } catch (e) { SS.ui.toast(e.message, "error"); }
  }

  async function toggleFavorite(userId, btn) {
    try {
      const r = await SS.api.post(`/api/users/${userId}/favorite`);
      SS.ui.toast(r.favorited ? "Added to favorites ♥" : "Removed from favorites", "success");
      if (btn) {
        btn.innerHTML = r.favorited ? "♥ Favorited" : "♡ Favorite";
        btn.classList.toggle("btn-accent", r.favorited);
        btn.classList.toggle("btn-ghost", !r.favorited);
      }
      document.querySelectorAll(`[data-fav-btn="${userId}"]`).forEach(b => {
        b.innerHTML = r.favorited ? "♥ Favorited" : "♡ Favorite";
        b.classList.toggle("btn-accent", r.favorited);
        b.classList.toggle("btn-ghost", !r.favorited);
      });
    } catch (e) { SS.ui.toast(e.message, "error"); }
  }

  async function goSwap(userId) {
    let me, them;
    try {
      [me, them] = [SS.store.user, await SS.api.get(`/api/users/${userId}`)];
    } catch (e) { SS.ui.toast(e.message, "error"); return; }
    const m = them.match;
    const teachOpts = (me.teaching || []).map(s => `<option value="${s.skill_id}">${esc(s.emoji || "")} ${esc(s.name)} — ${esc(s.level)}</option>`).join("");
    const learnOpts = (me.learning || []).map(s => `<option value="${s.skill_id}">${esc(s.emoji || "")} ${esc(s.name)}</option>`).join("");
    if (!teachOpts || !learnOpts) {
      return SS.ui.toast("Add both teaching and learning skills to your profile first.", "warn");
    }
    const preTeach = m.you_teach && m.you_teach[0] ? m.you_teach[0].skill_id : null;
    const preLearn = m.they_teach && m.they_teach[0] ? m.they_teach[0].skill_id : null;
    const mdl = SS.ui.modal(`
      <h3>Send SkillSwap Request</h3>
      <p class="modal-sub">Offer a skill exchange to <b>${esc(them.name)}</b>${m.pct ? ` — <span style="color:var(--accent-ink);font-weight:700">${m.pct}% match</span>` : ""}.</p>
      ${m.perfect ? `<div class="perfect-banner mb-2">✨ Perfect two-way swap detected!</div>` : ""}
      ${them.blocked_me || them.is_blocked ? `<div class="notice notice-danger mb-2">You cannot send a request to this user.</div>` : ""}
      <div class="field">
        <label>🎓 You teach</label>
        <select class="input" id="sw-teach">${teachOpts}</select>
      </div>
      <div class="field">
        <label>📚 You want to learn</label>
        <select class="input" id="sw-learn">${learnOpts}</select>
      </div>
      ${me.age < 18 || them.age < 18 ? `<div class="notice notice-warn mb-1">🛡️ <span>Safety reminder: keep sessions online or in supervised/approved environments when swapping with people you don't know personally.</span></div>` : ""}
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="sw-send" ${them.blocked_me || them.is_blocked ? "disabled" : ""}>🔄 Send SkillSwap Request</button>
      </div>`, { wide: true });
    if (preTeach) mdl.el.querySelector("#sw-teach").value = preTeach;
    if (preLearn) mdl.el.querySelector("#sw-learn").value = preLearn;
    mdl.el.querySelector("#sw-send").addEventListener("click", async () => {
      const btn = mdl.el.querySelector("#sw-send");
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Sending…';
      try {
        await SS.api.post("/api/swaps", {
          recipient_id: userId,
          teach_skill_id: +mdl.el.querySelector("#sw-teach").value,
          learn_skill_id: +mdl.el.querySelector("#sw-learn").value,
        });
        mdl.close();
        SS.ui.toast("SkillSwap request sent! 🎉", "success");
        SS.nav("#/swaps");
      } catch (e) {
        SS.ui.toast(e.message, "error");
        btn.disabled = false; btn.textContent = "🔄 Send SkillSwap Request";
      }
    });
  }

  const REPORT_CATEGORIES = ["Incorrect age", "Fake information", "Fraud/scam", "Fake skill", "Harassment", "Inappropriate behavior", "Impersonation", "Safety concern", "Other"];

  async function reportUser(userId, name, refType, refId) {
    const m1 = SS.ui.modal(`
      <h3>Report ${esc(name || "user")}</h3>
      <p class="modal-sub">Reports go to the SkillSwap moderation team for review. A report does not automatically mean the person is guilty.</p>
      <div class="field"><label>Category</label>
        <select class="input" id="rp-cat">${REPORT_CATEGORIES.map(c => `<option>${c}</option>`).join("")}</select></div>
      <div class="field"><label>What happened?</label>
        <textarea class="input" id="rp-desc" placeholder="Describe the issue (at least 10 characters)…"></textarea>
        <div class="err-msg" id="rp-err"></div></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-danger" id="rp-next">Next →</button>
      </div>`);
    m1.el.querySelector("#rp-next").addEventListener("click", () => {
      const cat = m1.el.querySelector("#rp-cat").value;
      const desc = m1.el.querySelector("#rp-desc").value.trim();
      if (desc.length < 10) { m1.el.querySelector("#rp-err").textContent = "Please describe the issue (at least 10 characters)."; return; }
      m1.close();
      const m2 = SS.ui.modal(`
        <h3>Are you sure you want to submit this report?</h3>
        <p class="modal-sub">Category: <b>${esc(cat)}</b><br>${SS.ui.esc(desc)}</p>
        <div class="notice notice-info mb-1">ℹ️ Reports are reviewed before any action is taken. False reports can lead to restrictions on your own account.</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-close>Go Back</button>
          <button class="btn btn-danger" id="rp-yes">Submit Report</button>
        </div>`);
      m2.el.querySelector("#rp-yes").addEventListener("click", async () => {
        try {
          await SS.api.post("/api/reports", { reported_id: userId, category: cat, description: desc, ref_type: refType || "profile", ref_id: refId || 0 });
          m2.close();
          SS.ui.toast("Report submitted. Our team will review it. Thank you for keeping SkillSwap safe.", "success");
        } catch (e) { SS.ui.toast(e.message, "error"); }
      });
    });
  }

  async function blockUser(userId, name) {
    const ok = await SS.ui.confirmDialog(`Block ${name}?`,
      "They will be hidden from your discovery, unable to message you or send swap requests. You can unblock them anytime in Settings.",
      "Block", true);
    if (!ok) return;
    try {
      await SS.api.post(`/api/users/${userId}/block`);
      SS.ui.toast(`${name} is now blocked.`, "success");
      if (location.hash.startsWith("#/profile/")) SS.nav("#/discover");
      else SS.route ? SS.route() : location.reload();
    } catch (e) { SS.ui.toast(e.message, "error"); }
  }

  SS.goMessage = goMessage;
  SS.goSwap = goSwap;
  SS.toggleFavorite = toggleFavorite;
  SS.reportUser = reportUser;
  SS.blockUser = blockUser;
})();
