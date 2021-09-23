export type Disposable = () => void;

export type ElementType<T extends readonly unknown[]> = T[number];
