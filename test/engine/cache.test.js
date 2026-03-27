'use strict';

const Cache = require('../../lib/engine/Cache');

describe('Cache', () => {
  let cache;

  beforeEach(() => {
    cache = new Cache();
  });

  describe('get/set', () => {
    it('returns null for missing keys', () => {
      expect(cache.get('missing')).toBeNull();
    });

    it('stores and retrieves values', () => {
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');
    });

    it('overwrites existing values', () => {
      cache.set('key', 'first');
      cache.set('key', 'second');
      expect(cache.get('key')).toBe('second');
    });
  });

  describe('has()', () => {
    it('returns false for missing keys', () => {
      expect(cache.has('missing')).toBe(false);
    });

    it('returns true for existing keys', () => {
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
    });
  });

  describe('getOrSet()', () => {
    it('calls asyncFn and caches result on miss', async () => {
      const fn = jest.fn().mockResolvedValue('computed');
      const result = await cache.getOrSet('key', fn);
      expect(result).toBe('computed');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('returns cached value without calling asyncFn on hit', async () => {
      cache.set('key', 'cached');
      const fn = jest.fn().mockResolvedValue('new');
      const result = await cache.getOrSet('key', fn);
      expect(result).toBe('cached');
      expect(fn).not.toHaveBeenCalled();
    });
  });
});
