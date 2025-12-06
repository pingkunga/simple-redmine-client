export default () => {
  const isItemInListByType = <T>(
    list: T[] | undefined,
    key: keyof T,
    value: T
  ): boolean => {
    if (!list || list.length === 0) {
      console.error("List is empty or undefined.");
      return false;
    }

    const itemIndex = list.findIndex((item) => item[key] === value[key]);
    if (itemIndex === -1) {
      console.error(`Item with ${String(key)}=${value} not found in the list.`);
      return false;
    }

    return true;
  };

  return {
    isItemInListByType,
  };
};
