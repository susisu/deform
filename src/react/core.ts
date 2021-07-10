import { useEffect, useRef, useState } from "react";
import { ChildKeyOf, Field, FieldArray, FieldNode, Form, FormState, Snapshot } from "../core/form";
import { FormParams, createForm } from "../core/utils";

export function useForm<T>(params: FormParams<T>): Form<T> {
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
  }, []);

  return child;
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
