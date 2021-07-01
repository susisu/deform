import { FieldErrors } from "../form";

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
  setIsTouched: (isTouched: boolean) => void;
  setIsDirty: (isDirty: boolean) => void;
  setErrors: (errors: FieldErrors) => void;
  setIsPending: (isPending: boolean) => void;
}>;

export type Child<T> = Readonly<{
  setDefaultValue: (defaultValue: T) => void;
  setValue: (value: T) => void;
  reset: () => void;
  validate: () => void;
  validateOnce: (value: T, signal: AbortSignal) => Promise<FieldErrors>;
}>;

export type PendingValidation = Readonly<{ requestId: string; controller: AbortController }>;

export type MergeErrorsParams = Readonly<{
  childrenErrors: FieldErrors;
  validationErrors: FieldErrors;
  customErrors: FieldErrors;
}>;

export function mergeErrors(params: MergeErrorsParams): FieldErrors {
  return {
    ...params.childrenErrors,
    ...params.validationErrors,
    ...params.customErrors,
  };
}
