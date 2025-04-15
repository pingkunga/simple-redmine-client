import useCommonUtil from './useCommonUtil';
import { describe, it, expect } from 'vitest'

describe('useCommonUtil', () => {
  const { isItemInListByType } = useCommonUtil();

  const sampleList = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ];

  it('should return true if the item exists in the list by key', () => {
    const result = isItemInListByType(sampleList, 'id', { id: 2, name: 'Item 2' });
    expect(result).toBe(true);
  });

  it('should return false if the item does not exist in the list by key', () => {
    const result = isItemInListByType(sampleList, 'id', { id: 4, name: 'Item 4' });
    expect(result).toBe(false);
  });
});