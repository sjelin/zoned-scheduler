import {Scheduler, AsyncStyle} from '../lib';
import * as q from 'q';

describe('Naive Scheduler', () => {

  describe('Smoke tests', () => {
    let scheduler = new Scheduler();

    it('should call a scheduled function', (done) => {
      scheduler.schedule(done);
    });

    it('should run commands in order', (done) => {
      let scheduler = new Scheduler();
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
      let scheduler = new Scheduler();
      let count = 0;
      let assertOrder = (index: number) => {
        expect(count++).toBe(index);
      }

      assertOrder(0);

      scheduler.schedule(() => {
        assertOrder(2);
        scheduler.schedule(() => {
          assertOrder(4);
        });
        return q.delay(100).then(() => {
          assertOrder(3);
        });
      });

      scheduler.schedule(() => {
        assertOrder(5);
      });

      assertOrder(1);

      scheduler.complete().then(() => {
        assertOrder(6);
        done();
      });
    });
  });

  describe('noDeadlock', () => {
    it('should handle the basic case for noDeadlock', (done) => {
      let scheduler = new Scheduler();
      scheduler.schedule(() => {
        return scheduler.schedule(() => {
          done();
        });
      }, AsyncStyle.INFER, true);
    });
  });

  it('should ensure there are no pending errors', (done) => {
    setTimeout(done, 200);
  });
});
