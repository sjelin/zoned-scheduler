import * as NaiveScheduler from '../lib';
import * as q from 'q';

describe('Naive Scheduler', () => {

  describe('Smoke tests', () => {
    let scheduler = new NaiveScheduler();

    it('should call a scheduled function', (done) => {
      scheduler.schedule(done);
    });

    it('should run commands in order', (done) => {
      let scheduler = new NaiveScheduler();
      let outOfOrder = false;
      scheduler.schedule(() => {
        return q.delay(500).then(() => {
          expect(outOfOrder).toBe(false);
          done();
        });
      });
      scheduler.schedule(() => {
        outOfOrder = true;
      });
    });

    it('should have complete() working without anything scheduled', (done) => {
      scheduler.complete().then(done);
    });

    it('should have complete() resolve after scheduled tacks', (done) => {
      let ranTask = false;
      scheduler.schedule(() => {
        ranTask = true;
      });
      scheduler.complete().then(() => {
        expect(ranTask).toBe(true);
        done();
      });
    });

    // TODO(sjelin): test the rest of the API, including all asyncStyles and failures
  });


  describe('complex ordering tests', () => {
    it('should handle the second example from the README', (done) => {
      let scheduler = new NaiveScheduler();
      let count = 0;
      let assertOrder = (index: number) => {
        expect(count++).toBe(index);
      }

      assertOrder(0);

      scheduler.schedule(() => {
        assertOrder(2);
        scheduler.schedule(() => {
          assertOrder(5);
        });
        return q.delay(100).then(() => {
          assertOrder(3);
        });
      });

      scheduler.schedule(() => {
        assertOrder(4);
      });

      assertOrder(1);

      scheduler.complete().then(() => {
        assertOrder(6);
        done();
      });
    });

    it('should handle a multi-level scheduler', (done) => {
      let inner = new NaiveScheduler();
      let outer = new NaiveScheduler();

      let runInner = (fun: Function) => {
        return inner.schedule(fun);
      };
      let runOuter = (fun: Function) => {
        return outer.schedule(() => {
          return inner.complete().then(() => {
            return fun();
          });
        });
      }

      let count = 0;
      let assertOrder = (index: number) => {
        expect(count++).toBe(index);
      }

      assertOrder(0);

      runInner(() => {
        assertOrder(2);
      });

      runOuter(() => {
        assertOrder(4);
        runInner(() => {
          assertOrder(5);
        });
        runInner(() => {
          return q.delay(100).then(() => {
            assertOrder(6);
          });
        });
      });

      runOuter(() => {
        assertOrder(7);
      });

      assertOrder(1);

      runInner(() => {
        assertOrder(3);
      });

      outer.complete().then(() => {
        return inner.complete();
      }).then(() => {
        assertOrder(8);
        done();
      });
    });
  });
});
