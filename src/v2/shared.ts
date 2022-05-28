export type Disposable = () => void;

export const generateId = (() => {
  let lastId = -1;
  return function generateId(tag: string): string {
    const id = lastId + 1;
    lastId = id;
    return `${tag}:${id}`;
  };
})();
