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
complete before the next one starts.  Functions are fun in the order in which they are scheduled.

`asyncStyle` can be used to specify how `fun` implements asynchronous behavior.  By default, we
will try to infer the behavior based on the function descriptor.

A promise, resolving to the result of `fun`, will be returned.

## `complete()`

Returns a promise which will resolve when all the scheduled functions have completed.  

# Usage and Examples

## One Scheduler

### Simple, clear order

```js
var scheduler = new NaiveScheduler();;
var q = require('q');

console.log('first');

scheduler.schedule(() => {
  console.log('second');
});

scheduler.schedule(() => {
  return q.delay(100).then(() => {
    console.log('third');
  });
});

scheduler.schedule(() => {
  console.log('fourth');
});
```

### More complicated order

```js
console.log('first');

scheduler.schedule(() => {
  console.log('third');
  scheduler.schedule(() => {
    console.log('sixth');
  });
  return q.delay(100).then(() => {
    console.log('fourth');
  });
});

scheduler.schedule(() => {
  console.log('fifth');
});

console.log('second');
```

### Deadlock (don't do this!)

```js
scheduler.schedule(() => {
  return scheduler.schedule(() {
    // Deadlock.  Any remaining scheduled functions will never be executed
  });
});
```

## Mult-Level Schedules

One of the obvious problems with this scheduler is that you *can't* do something like:

```js
scheduler.schedule(() => {
  // Big task one

  scheduler.schedule(() => {
    // Sub-task one
    ...
  });

  // *** NEVER DO THIS ***
  return scheduler.schedule(() => {
    // Sub-task two
    ...
  });
});

scheduler.schedule(() => {
  // Big task two
  ...
})
```

This would cause deadlock: `Big task one` won't resolve until `Sub-task two` completes, but
`Sub-task two` won't ever get executed because `Big task one` is still on the scheduler.  You
could remove the `return` so `Big task one` doesn't block on `Sub-task two`, but then
`Big task two` will be scheduled ahead of `Sub-task one` and `Sub-task two`.

The solution is to use two schedulers:

```js

var innerSch = new NaiveScheduler();
var outerSch = new NaiveScheduler();

outerSch.schedule(() => {
  // Big task one

  innerSch.schedule(() => {
    // Sub-task one
    ...
  });

  return innerSch.schedule(() => {
    // Sub-task two
    ...
  });
});

outerSch.schedule(() => {
  // Big task two
  ...
});
```

`Big task one` still blocks on `Sub-task two`, but now `Sub-task two` is on a different scheduler,
so it's not a problem.  The key thing here is that tasks in `outerSch` can depend on taks in
`innerSch`, but not the other way around.

The drawback to this is that the promise for `Sub-task two` needs to be accessible so it can be
returned and `Big task one` can block on it.  If you're writing/using a library, this may not
always be the case.  To get around this problem use `innerSch.complete()`:

```js
outerSch.schedule(() => {
  return innerSch.complete().then(() => {
    // Big task one

    innerSch.schedule(() => {
      // Sub-task one
      ...
    });

    innerSch.schedule(() => {
      // Sub-task two
      ...
    });
  });
});

outerSch.schedule(() => {
  return innerSch.complete().then(() => {
    // Big task two
    ...
  });
});

```

Using this method, you create a many-leveled scheduler, without having to pay attention to any of
the promises returned by `schedule()`.  Sadly, there is no way to automatically do this for you,
since it is impossible to tell if one task is being scheduled from inside another task.
