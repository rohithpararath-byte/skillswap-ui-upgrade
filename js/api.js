window.SS = window.SS || {};
(function () {
  let BASE = "port/8000";
  if (BASE.indexOf("__PORT") !== -1) BASE = "http://localhost:8000";

  async function req(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    const token = SS.store.getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    let res;
    try {
      res = await fetch(BASE + path, {
        method, headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw { message: "Cannot reach the SkillSwap server. Please try again.", network: true };
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) {
      if (res.status === 401 && SS.store.getToken()) {
        SS.store.clearSession();
        SS.nav("#/login");
        throw { message: data.message || "Please log in again." };
      }
      throw { status: res.status, message: data.message || "Something went wrong." };
    }
    return data;
  }

  SS.api = {
    base: BASE,
    get: (p) => req("GET", p),
    post: (p, b) => req("POST", p, b === undefined ? {} : b),
    put: (p, b) => req("PUT", p, b),
    patch: (p, b) => req("PATCH", p, b),
    del: (p) => req("DELETE", p),
  };
})();
