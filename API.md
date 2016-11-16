# Static Properties

## `AsyncStyle`

`AsyncStyle` is an `enum` used to indicate how a function implement asynchronous behavior.  Its
properties are:

* `PROMISE` Indicates that a function returns a promise
* `TWO_CBS` Indicates that a function takes two callbacks.  The first is for success and the second
  is for failure.
* `DOT_FAIL` Indicates that a function takes one callback, which is used for success.  This
  callback has a property `fail`, which is the callback function for failure.
* `NODE` Indicates that a function takes one callback, which can be used for success or failure
  depending on that arguments it receives.  If the first argument is `null` or `undefined`, then
  that indicates success, with the second argument being the return value.  If the first argument
  is something else, that indicates failure, and the value of the first argument is the error to
  resolve to.
* `INFER` Indicates that we should infer how the function implements asynchronous behavior by
  looking at its descriptor.  If the function takes one or more arguments, we will assume it
  behaves like a `TWO_CBS` function.  If it takes no arguments, we will assume it behaves like a
  `PROMISE` function.

# Instance Properties

## constructor

The constructor takes no arguments and has no side effects

## `schedule(fun [, asyncStyle])`

Schedules the function `fun` to be run.  Functions are run one at a time, meaning that one must
complete before the next one starts.  Functions are run in the order in which they are scheduled.

`asyncStyle` can be used to specify how `fun` implements asynchronous behavior.  By default, we
will try to infer the behavior based on the function descriptor.

A promise, resolving to the result of `fun`, will be returned.

## `complete()`

Returns a promise which will resolve when all the scheduled functions have completed.  
