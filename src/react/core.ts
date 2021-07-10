import { useEffect, useRef, useState } from "react";
import {
  ChildArrayKeyOf,
  ChildKeyOf,
  CreateFormParams,
  ElementType,
  Field,
  FieldArray,
  FieldNode,
  Form,
  FormState,
  Snapshot,
  Validator,
  createForm,
} from "../core";

export function useForm<T>(params: CreateFormParams<T>): Form<T> {
  const handlerRef = useRef(params.handler);
  useEffect(() => {
    handlerRef.current = params.handler;
  }, [params.handler]);

  const [form] = useState(() =>
    createForm({
      defaultValue: params.defaultValue,
      value: params.value,
      handler: req => {
        const handler = handlerRef.current;
        return handler(req);
      },
    })
  );

  return form;
}

export function useChild<T, K extends ChildKeyOf<T>>(field: FieldNode<T>, key: K): FieldNode<T[K]> {
  const [child] = useState(() => field.createChild(key));

  useEffect(() => {
    const disconnect = child.connect();
    return disconnect;
  }, [child]);

  return child;
}

export function useChildArray<T, K extends ChildArrayKeyOf<T>>(
  field: FieldNode<T>,
  key: K
): FieldArray<ElementType<T[K]>> {
  const [childArray] = useState(() => field.createChildArray(key));

  useEffect(() => {
    const disconnect = childArray.connect();
    return disconnect;
  }, [childArray]);

  return childArray;
}

export function useFormState<T>(form: Form<T>): FormState {
  const [state, setState] = useState(() => form.getState());

  useEffect(() => {
    setState(form.getState());
    const unsubscribe = form.subscribe(state => {
      setState(state);
    });
    return unsubscribe;
  }, [form]);

  return state;
}

export function useSnapshot<T>(field: Field<T>): Snapshot<T> {
  const [snapshot, setSnapshot] = useState(() => field.getSnapshot());

  useEffect(() => {
    setSnapshot(field.getSnapshot());
    const unsubscribe = field.subscribe(snapshot => {
      setSnapshot(snapshot);
    });
    return unsubscribe;
  }, [field]);

  return snapshot;
}

export function useFields<T>(fieldArray: FieldArray<T>): ReadonlyArray<FieldNode<T>> {
  const [fields, setFields] = useState(() => fieldArray.getFields());

  useEffect(() => {
    setFields(fieldArray.getFields());
    const unsubscribe = fieldArray.subscribeFields(fields => {
      setFields(fields);
    });
    return unsubscribe;
  }, [fieldArray]);

  return fields;
}

export function useValidator<T>(field: Field<T>, key: string, validator: Validator<T>): void {
  const validatorRef = useRef(validator);
  useEffect(() => {
    validatorRef.current = validator;
  }, [validator]);

  useEffect(() => {
    const remove = field.addValidator(key, req => {
      const validator = validatorRef.current;
      validator(req);
    });
    return remove;
  }, [field, key]);
}

export type ValidationHook<T> = <U extends T>(
  field: Field<U>,
  enabled?: boolean,
  key?: string
) => void;

export function createValidationHook<T>(
  defaultKey: string,
  validator: Validator<T>
): ValidationHook<T> {
  const useValidation: ValidationHook<T> = (field, enabled = true, key = defaultKey): void => {
    useEffect(() => {
      if (enabled) {
        const remove = field.addValidator(key, validator);
        return remove;
      } else {
        return () => {};
      }
    }, [field, enabled, key]);
  };
  return useValidation;
}
