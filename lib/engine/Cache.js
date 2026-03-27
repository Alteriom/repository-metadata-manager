'use strict';

class Cache {
  constructor() {
    this._store = new Map();
  }

  get(key) { return this._store.get(key) || null; }
  set(key, value) { this._store.set(key, value); }
  has(key) { return this._store.has(key); }

  async getOrSet(key, asyncFn) {
    if (this._store.has(key)) return this._store.get(key);
    const value = await asyncFn();
    this._store.set(key, value);
    return value;
  }
}

module.exports = Cache;
