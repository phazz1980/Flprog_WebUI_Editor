/**
 * Очередь запросов к МК: у Flprog WebServer на WiFi один активный клиент.
 * Параллельные fetch из браузера создают несколько TCP-соединений и мешают друг другу.
 */

let queue: Promise<unknown> = Promise.resolve();

export function deviceRequest<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work);
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/** GET/POST к устройству: по одному запросу за раз, Connection: close. */
export function deviceFetch(url: string, init?: RequestInit): Promise<Response> {
  return deviceRequest(() =>
    fetch(url, {
      cache: 'no-store',
      ...init,
      headers: { Connection: 'close', ...(init?.headers as Record<string, string> | undefined) },
    }),
  );
}
