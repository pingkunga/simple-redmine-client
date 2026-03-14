import useCommonUtil from './useCommonUtil';
import { describe, it, expect } from 'vitest'

describe('useCommonUtil', () => {
  const { isItemInListByType } = useCommonUtil();

  const sampleList = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ];

  it("should return true if the item exists in the list by key", () => {
    const result = isItemInListByType(sampleList, "id", { id: 2, name: "Item 2" });
    expect(result).toBe(true);
  });

  it("should return false if the item does not exist in the list by key", () => {
    const result = isItemInListByType(sampleList, "id", { id: 4, name: "Item 4" });
    expect(result).toBe(false);
  });

  it("should return false if the list is empty", () => {
    const result = isItemInListByType([], "id", { id: 1, name: "Item 1" });
    expect(result).toBe(false);
  });

  it("should return false if the list is undefined", () => {
    const result = isItemInListByType(undefined, "id", { id: 1, name: "Item 1" });
    expect(result).toBe(false);
  });

  it("should return false if the key does not match any item in the list", () => {
    const result = isItemInListByType(sampleList, "name", { id: 1, name: "Nonexistent Item" });
    expect(result).toBe(false);
  });

  it("should handle objects with additional properties gracefully", () => {
    const extendedList = [
      { id: 1, name: "Item 1", extra: "Extra 1" },
      { id: 2, name: "Item 2", extra: "Extra 2" },
    ];
    const result = isItemInListByType(extendedList, "id", { id: 1, name: "Item 1", extra: "Extra 1" });
    expect(result).toBe(true);
  });
});