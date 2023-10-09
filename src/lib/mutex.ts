/** Creates a mutex for use in locking and queueing a function, ensuring only one call to the function may proceed at a time.
 *
 * Call lock() on the created mutex to ensure only one instance of the function may continue at a time. The function MUST call unlock() before returning,
 * otherwise no other instances will be able to continue.
 *
 * @example
 * const mutex = createMutex();
 *
 * async function foo() {
 *    const unlock = await mutex.lock();
 *    // Do work...
 *    unlock();
 * }
 */
export function createMutex() {
  let locked = false;
  const queue: ((value: (() => void) | PromiseLike<() => void>) => void)[] = [];

  /** Returns a promise that resolves to the unlock() function and then locks the mutex.
   * When unlock() is called it gives the unlock() function to the next function in queue,
   * or unlocks the mutex if the queue is empty.
   */
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
