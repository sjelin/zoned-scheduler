import {AsyncStyle} from './async_style';

export class Task<T> {
  private fun: Function;
  private asyncStyle: AsyncStyle;
  public promise: Promise<T>;
  private resolve: (value: any) => void;  // `T | Thenable<T>` is hard to type
  private reject: (error: any) => void;

  constructor(fun: Function, asyncStyle: AsyncStyle) {
    this.fun = fun;
    this.asyncStyle = asyncStyle != AsyncStyle.INFER ?
        asyncStyle :
        fun.length == 0 ? AsyncStyle.PROMISE : AsyncStyle.TWO_CBS;
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  run(): Promise<void> {
    setImmediate(() => {
      try {
        switch (this.asyncStyle) {
          case AsyncStyle.PROMISE:
            return this.fun().then(this.resolve, this.reject);
          case AsyncStyle.TWO_CBS:
            return this.fun(this.resolve, this.reject);
          case AsyncStyle.DOT_FAIL:
            (this.resolve as any).fail = this.reject;
            return this.fun(this.resolve);
          case AsyncStyle.NODE:
            return this.fun((error: any, value: any) => {
              if (error == null) {
                this.resolve(value);
              } else {
                this.reject(error);
              }
            });
        }
      } catch (e) {
        this.reject(e);
      }
    });
    return this.promise.then(() => {}, () => {});
  }
}
