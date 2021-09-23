import { Errors } from "../field";

export const uniqueId = (() => {
  let uniqueIdCounter = 0;
  return (): string => {
    uniqueIdCounter += 1;
    return uniqueIdCounter.toString();
  };
})();

export type Getter<A, B> = (a: A) => B;
export type Setter<A, B> = (a: A, b: B) => A;

export type Parent<T> = Readonly<{
  attach: () => void;
  detach: () => void;
  setDefaultValue: (defaultValue: T) => void;
  setValue: (value: T) => void;
  setIsDirty: (isDirty: boolean) => void;
  setIsTouched: (isTouched: boolean) => void;
  setErrors: (errors: Errors) => void;
  setIsPending: (isPending: boolean) => void;
}>;

export type Child<T> = Readonly<{
  setDefaultValue: (defaultValue: T) => void;
  setValue: (value: T) => void;
  reset: () => void;
  validate: () => void;
  emit: (event: string, data: unknown) => void;
}>;

export type KeyMapper = (key: PropertyKey) => PropertyKey;
