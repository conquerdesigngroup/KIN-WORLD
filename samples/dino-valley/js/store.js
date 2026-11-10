/* Message storage.
   Today: LocalStore keeps messages (and photos, videos, voice notes) in this browser's IndexedDB.
   Next:  swap in a RemoteStore with the same four methods that talks to the Kin World API,
          so every family member's message reaches Logan's world everywhere, for life. */
(function () {
  const DB_NAME = KIN.storageKey, STORE = "posts";
  let dbp = null, memory = [];

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    });
    return dbp;
  }

  function tx(db, mode) { return db.transaction(STORE, mode).objectStore(STORE); }
  function done(req) { return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); }

  const LocalStore = {
    kind: "this device",
    async list() {
      const db = await open();
      if (!db) return memory.slice();
      return done(tx(db, "readonly").getAll());
    },
    async add(post) {
      post.id = post.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
      post.createdAt = post.createdAt || Date.now();
      const db = await open();
      if (!db) { memory.push(post); return post; }
      await done(tx(db, "readwrite").put(post));
      return post;
    },
    async remove(id) {
      const db = await open();
      if (!db) { memory = memory.filter(p => p.id !== id); return; }
      await done(tx(db, "readwrite").delete(id));
    },
    async clear() {
      const db = await open();
      if (!db) { memory = []; return; }
      await done(tx(db, "readwrite").clear());
    }
  };

  // Small key/value prefs (about page edits, birthday). Same swap-out plan as messages.
  const Prefs = {
    get(k, d) { try { const v = localStorage.getItem(KIN.storageKey + ":" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(KIN.storageKey + ":" + k, JSON.stringify(v)); } catch (e) {} }
  };

  window.Store = LocalStore;
  window.Prefs = Prefs;
})();
