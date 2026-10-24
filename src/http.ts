const TIMEOUT_MS = 1000;

const timeout = function (ms: number): Promise<never> {
  return new Promise(function (_, reject) {
    setTimeout(function () {
      reject(new Error(`Request took long! Timeout after ${ms} millisecond`));
    }, ms);
  });
};

export const fetchJson = async function <T>(url: string): Promise<T> {
  try {
    const response = await Promise.race([fetch(url), timeout(TIMEOUT_MS)]);
    const data: unknown = await response.json();

    if (!response.ok) {
      const message = isErrorPayload(data) ? data.message : "Unkown error";
      throw new Error(`${message} ${response.status}`);
    }
    return data as T;
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
};

function isErrorPayload(data: unknown): data is { message: string } {
  return typeof data === "object" && data !== null && "message" in data;
}
