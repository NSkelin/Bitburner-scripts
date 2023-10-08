export function createMutex() {
  let locked = false;
  const queue: ((value: (() => void) | PromiseLike<() => void>) => void)[] = [];

  function lock() {
    return new Promise<() => void>((resolve) => {
      const unlock = () => {
        if (queue.length > 0) {
          const nextResolve = queue.shift();
          nextResolve!(unlock);
        } else {
          locked = false;
        }
      };

      if (!locked) {
        locked = true;
        resolve(unlock);
      } else {
        queue.push(resolve);
      }
    });
  }

  return {
    lock,
  };
}
