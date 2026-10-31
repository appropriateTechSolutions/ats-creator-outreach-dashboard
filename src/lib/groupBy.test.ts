import { describe, expect, it } from 'vitest';
import { groupBy } from './groupBy';

describe('groupBy', () => {
  it('groups rows under their key, keeping row order', () => {
    const rows = [
      { id: 1, owner: 'a' },
      { id: 2, owner: 'b' },
      { id: 3, owner: 'a' },
    ];
    const groups = groupBy(rows, (r) => r.owner);

    expect([...groups.keys()]).toEqual(['a', 'b']);
    expect(groups.get('a')?.map((r) => r.id)).toEqual([1, 3]);
    expect(groups.get('b')?.map((r) => r.id)).toEqual([2]);
  });

  it('leaves out rows with no key', () => {
    const rows = [{ owner: 'a' }, { owner: null }, { owner: undefined }, { owner: '' }];
    const groups = groupBy(rows, (r) => r.owner);

    expect([...groups.keys()]).toEqual(['a']);
  });

  it('returns an empty map for no rows', () => {
    expect(groupBy([], () => 'x').size).toBe(0);
  });
});
