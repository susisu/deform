export type Disposable = () => void;

export type ElementType<T extends readonly unknown[]> = T[number];

export type AsArray<T> = T extends readonly unknown[] ? T : never;
