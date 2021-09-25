# @susisu/deform

[![CI](https://github.com/susisu/deform/workflows/CI/badge.svg)](https://github.com/susisu/deform/actions?query=workflow%3ACI)

A form management library for React

``` shell
npm i @susisu/deform
# or
yarn add @susisu/deform
```

## Roadmap

- [x] Provide core functionality (PoC)
- [ ] Test core functionality in the real world
- [ ] Find frequent patterns
- [ ] Provide easy-to-use utilities

## Motivation and Concepts

### Divide and conquer

As a form component gets larger, you may want to divide it into smaller sections or sub-forms.
However, there often are difficulties with the existing libraries:

- A child component is usually allowed to access, or even requires the parent form, which can ruin separation of concerns.
- Such child components are hard to test, because you need to set up the entire form after all.
- A parent component tends to assume too much on how child components work, which makes understanding and refactoring harder.
- Because of the nested field syntax like `"foo.bar.baz"`, TypeScript support becomes weaker (or difficult to implment).

deform has a top-level support of this type of decomposition:

- A child component is given only a limited access to the form.
- For testing, you are required to set up only necessary data for the component.
- A parent component also has a limited access to the child components.
- No complex syntax nor type-level magic for nested fields.

### Concepts

#### `Form`

- A `Form` is created for each (root) form.
- It has one root `FieldNode`, and supervises it.
- It has a `FormState` containing `isSubmitting`, etc.

#### `Field`

- A common interface of `FieldNode` and `FieldArray`.
- It has `value`, `errors` and other states, and one can manipulate them via the methods.
- Its state can be obtained as a `Snapshot`.

#### `FieldNode`

- A `FieldNode` can have multiple child `FieldNode`s and `FieldArray`s.

#### `FieldArray`

- A `FieldArray` has an array of `FieldNode`s.

## Usage

See [an example](https://codesandbox.io/s/deform-example-fs65y?file=/src/App.tsx).

## License

[MIT License](http://opensource.org/licenses/mit-license.php)

## Author

Susisu ([GitHub](https://github.com/susisu), [Twitter](https://twitter.com/susisu2413))
