# Zone Scheduler

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

It uses [zone.js](https://github.com/angular/zone.js) to allow you to schedule one task inside
another:

```js
console.log('first');

scheduler.schedule(() => {
  console.log('second');
  scheduler.schedule(() => {
    console.log('fourth');
  });
  return q.delay(100).then(() => {
    console.log('third');
    scheduler.schedule(() => {
      console.log('fifth');
    });
  });
});

scheduler.schedule(() => {
  console.log('sixth');
});
```

At the moment this only works for asynchronous activity done via Timers or Event Listeners.

(See [`API.md`](./API.md) for a list of commands)
