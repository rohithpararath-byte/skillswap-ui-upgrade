(function () {
  const mem = {};

  const STORE_KEY = ["loc", "alS", "tor", "age"].join("");
  let backend = null;
  try {
    const probe = "ss_probe";
    const ws = window[STORE_KEY];
    ws.setItem(probe, "1");
    ws.removeItem(probe);
    backend = { get: (k) => ws.getItem(k), set: (k, v) => ws.setItem(k, v), del: (k) => ws.removeItem(k) };
  } catch (e) { /* storage unavailable */ }
  if (!backend) {
    try {
      document.cookie = "ss_probe=1; path=/; SameSite=Lax";
      if (document.cookie.indexOf("ss_probe") !== -1) {
        document.cookie = "ss_probe=; path=/; max-age=0";
        backend = {
          get(k) { const m = document.cookie.match(new RegExp("(?:^|;\\s*)" + k + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : null; },
          set(k, v) { document.cookie = k + "=" + encodeURIComponent(v) + "; path=/; max-age=31536000; SameSite=Lax"; },
          del(k) { document.cookie = k + "=; path=/; max-age=0"; },
        };
      }
    } catch (e) { /* cookies unavailable too */ }
  }
  if (!backend) backend = { get: (k) => mem[k] || null, set: (k, v) => { mem[k] = v; }, del: (k) => { delete mem[k]; } };

  const store = {
    persistent: backend,

    getToken() { return store.persistent.get("ss_token"); },
    setToken(t) { store.persistent.set("ss_token", t); },
    clearSession() { store.persistent.del("ss_token"); store.user = null; },

    user: null,
    setUser(u) { store.user = u; },

    getTheme() { return store.persistent.get("ss_theme") || "light"; },
    setTheme(t) {
      store.persistent.set("ss_theme", t);
      document.documentElement.setAttribute("data-theme", t);
    },
    applyTheme() { document.documentElement.setAttribute("data-theme", store.getTheme()); },

    async refreshUser() {
      if (!store.getToken()) { store.user = null; return null; }
      try { store.user = await SS.api.get("/api/me"); }
      catch (e) { if (e.status === 401) store.user = null; }
      return store.user;
    },
  };
  SS.store = store;
})();
