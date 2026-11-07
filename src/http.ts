import {
  HttpError,
  InvalidJsonError,
  NetworkError,
  TimeoutError,
} from "./types";

export async function fetchJson(
  url: string,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const transportError = (err: unknown) =>
    timedOut
      ? new TimeoutError(timeoutMs, { cause: err })
      : new NetworkError(`Network failure: ${url}`, { cause: err });

  try {
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (err) {
      throw transportError(err);
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new HttpError(response.status, response.statusText);
    }

    let text: string;
    try {
      text = await response.text();
    } catch (err) {
      throw transportError(err);
    }

    try {
      const parsed: unknown = JSON.parse(text);
      return parsed;
    } catch (err) {
      throw new InvalidJsonError(`Invalid JSON from ${url}`, { cause: err });
    }
  } finally {
    clearTimeout(timer);
  }
}
