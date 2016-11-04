# Naive Scheduler

This allows you to to schedule asynchronous functions to run in squence.

```js
var scheduler = new require('naive-scheduler')();
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

It's not very sophisticated about what order it chooses though.

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

Basically, it runs them in the order it sees them.  Or at least it tries to.  If
something in the front of the queue is blocked by something farther back in the
queue, it deadlocks.

```js
scheduler.schedule(() => {
  return scheduler.schedule(() {
    // Deadlock.  Any remaining scheduled functions will never be executed
  });
});
```

It's a simple scheduler.  It goes about its business as best it can.  Be kind to
it.

(See [`API.md`](./API.md) for a list of commands)
