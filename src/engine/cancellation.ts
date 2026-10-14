import type { AcquisitionContext } from "./types.js";

/** Stop waiting even when a browser or provider operation ignores cancellation. */
export function cancellable<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) { void task.catch(() => undefined); return Promise.reject(signal.reason); }
  return new Promise<T>((resolve, reject) => {
    const abort = () => { signal.removeEventListener("abort", abort); reject(signal.reason); };
    signal.addEventListener("abort", abort, { once: true });
    task.then(value => { signal.removeEventListener("abort", abort); resolve(value); }, error => {
      signal.removeEventListener("abort", abort); reject(error);
    });
  });
}

const closingResources = new WeakMap<object, Promise<void>>();
function closeResource(resource: object, close: () => Promise<unknown>): Promise<void> {
  const pending = closingResources.get(resource);
  if (pending) return pending;
  const task = (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([Promise.resolve().then(close).catch(() => undefined), new Promise<void>(resolve => {
        timer = setTimeout(resolve, 2000);
      })]);
    } finally { clearTimeout(timer); }
  })();
  closingResources.set(resource, task);
  return task;
}

/** Close only resources owned by this acquisition; persistent contexts have no Browser. */
export async function closeAcquisitionContext(context?: AcquisitionContext): Promise<void> {
  if (!context) return;
  const { closePage, browserContext, browser } = context;
  await Promise.all([
    ...(closePage ? [closeResource(closePage, closePage)] : []),
    ...(browserContext ? [closeResource(browserContext, () => browserContext.close())] : []),
    ...(browser ? [closeResource(browser, () => browser.close())] : [])
  ]);
}
