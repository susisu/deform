import { useEffect, useRef, useState } from "react";
import { Field, FieldArray, FieldNode, Form, FormState, Snapshot } from "../core/form";
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

export function useFormState<T>(form: Form<T>): FormState {
  const [state, setState] = useState(() => form.getState());
  useEffect(() => {
    setState(form.getState());
    return form.subscribe(state => {
      setState(state);
    });
  }, [form]);

  return state;
}

export function useSnapshot<T>(field: Field<T>): Snapshot<T> {
  const [snapshot, setSnapshot] = useState(() => field.getSnapshot());
  useEffect(() => {
    setSnapshot(field.getSnapshot());
    return field.subscribe(snapshot => {
      setSnapshot(snapshot);
    });
  }, [field]);

  return snapshot;
}

export function useFields<T>(fieldArray: FieldArray<T>): ReadonlyArray<FieldNode<T>> {
  const [fields, setFields] = useState(() => fieldArray.getFields());
  useEffect(() => {
    setFields(fieldArray.getFields());
    return fieldArray.subscribeFields(fields => {
      setFields(fields);
    });
  }, [fieldArray]);

  return fields;
}
