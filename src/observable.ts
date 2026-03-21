export type ListenerFn<T> = (data: T, unsubscribe: () => void) => void;

export class Observable<T> {
  observers = new Set<ListenerFn<T>>();

  subscribe(func: ListenerFn<T>) {
    this.observers.add(func);
    return () => {
      this.observers.delete(func);
    };
  }

  unsubscribe(func: ListenerFn<T>) {
    this.observers.delete(func);
  }

  notify(data: T) {
    this.observers.forEach((observer) => {
      observer(data, () => this.unsubscribe(observer));
    });
  }

  clear() {
    this.observers.clear();
  }
}
