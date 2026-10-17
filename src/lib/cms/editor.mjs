export function createEditorModel(initial) {
  const value = structuredClone(initial);
  return {
    value,
    set(path, next) {
      if (!Array.isArray(path) || path.length === 0) throw new Error('Unknown field');
      let target = value;
      for (const key of path.slice(0, -1)) {
        if (target === null || typeof target !== 'object' || !Object.hasOwn(target, key)) throw new Error('Unknown field');
        target = target[key];
      }
      const key = path.at(-1);
      if (target === null || typeof target !== 'object' || !Object.hasOwn(target, key)) throw new Error('Unknown field');
      target[key] = next;
    },
  };
}
