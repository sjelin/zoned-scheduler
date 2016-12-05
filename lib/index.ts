import 'zone.js';

import {AsyncStyle} from './async_style';
import {DEPTH_KEY, INSTANCE_KEY, PASS_THROUGH_KEY} from './consts';
import {Task} from './task';

export class Scheduler {
  private tasks: Task<any>[][];  // TODO(sjelin): should be array of linked lists of tasks
  private promise: Promise<void>;
  private onComplete: () => void;

  constructor() {
    this.tasks = [];
  }

  /*
   * Get a property from the zone which scheduled the parent task.  If there is no parent task,
   * or the parent task never set the property being queried for, return null.
   *
   * @returns {*} The property
   */
  private getFromZone(key: string): any {
    let zone = Zone.current;
    while (zone) {
      zone = zone.getZoneWith(INSTANCE_KEY);
      if (zone == null) {
        return null;
      } else if (zone.get(INSTANCE_KEY) == this) {
        return zone.get(key);
      } else {
        zone = zone.parent;
      }
    }
    return null;
  }

  /**
   * Schedule a function to be run.  Functions are run one at a time, meaning that one must
   * complete before the next one starts.  Functions are run in the order in which they are
   * scheduled.
   *
   * @param {Function} fun The function to schedule
   * @param {AsyncStyle=} asyncStyle Describes how the function singals when it is complete, if it
   *     failed, and what value it'd like to return. @see AsyncStyle for details.
   * @param {boolean} noDeadlock Allow `fun` to block on a scheduled child task without deadlocking
   *
   * @returns {Promise.<T>} A promise which will resolve/reject to the function's value
   */
  schedule<T>(fun: Function, asyncStyle = AsyncStyle.INFER, noDeadlock = false): Promise<T> {
    // Check to see if we need to pass through to another scheduler
    let passThroughTo: Scheduler = this.getFromZone(PASS_THROUGH_KEY);
    if (passThroughTo != null) {
      return passThroughTo.schedule<T>(fun, asyncStyle, noDeadlock);
    }

    // Add a new task to the queue
    let task = new Task<T>(fun, asyncStyle);
    if (noDeadlock) {
      task.metadata.noDeadlock = true;
    }
    let depth = this.getFromZone(DEPTH_KEY) || 0;
    while (this.tasks.length <= depth) {
      this.tasks.push([]);
    }
    this.tasks[depth].push(task);

    // If no tasks are currently being executed, start executing
    if (this.promise == undefined) {
      this.promise = new Promise<void>((resolve) => {
        this.onComplete = resolve;
      });
      this.runNextTask();
    }

    return task.promise;
  }

  /**
   * Gets a promise which resolves once all the scheduled tasks are complete.
   *
   * @returns {Promise.<void>}
   */
  complete(): Promise<void> {
    if (this.promise != null) {
      return this.promise;
    } else {
      return new Promise<void>((resolve) => {
        setImmediate(resolve);
      });
    }
  }

  /* Runs the next task.  If all tasks have been run, calls onComplete() and re-initializes
   */
  private runNextTask(): void {
    while (this.tasks.length && (this.tasks[this.tasks.length - 1].length == 0)) {
      this.tasks.length--;
    }
    let depth = this.tasks.length;
    if (depth) {
      let task = this.tasks[depth - 1].shift();
      let properties: {[key: string]: any} = {};
      properties[INSTANCE_KEY] = this;
      properties[DEPTH_KEY] = depth;
      if (task.metadata.noDeadlock) {
        properties[PASS_THROUGH_KEY] = new Scheduler();
      }
      Zone.current.fork({name: 'Zoned Scheduler (Depth ' + depth + ')', properties: properties})
          .run(() => {
            task.run()
                .then(() => {
                  if (task.metadata.noDeadlock) {
                    return properties[PASS_THROUGH_KEY].complete();
                  }
                })
                .then(() => {
                  this.runNextTask();
                });
          });
    } else {
      let onComplete = this.onComplete;
      this.onComplete = null;
      this.promise = null;
      onComplete();
    }
  }
}

export {AsyncStyle} from './async_style';
