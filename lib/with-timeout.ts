let downUntil = 0;

export function markSupabaseUnreachable() {
  downUntil = Date.now() + 15_000;
}

export function supabaseLooksDown() {
  return Date.now() < downUntil;
}

export function withTimeout<T>(promise: PromiseLike<T>, ms = 800): Promise<T> {
  if (supabaseLooksDown()) {
    return Promise.reject(new Error("Timed out"));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      markSupabaseUnreachable();
      reject(new Error("Timed out"));
    }, ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
