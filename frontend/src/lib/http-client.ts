let isHandling401 = false;

type OnUnauthorized = () => void;

let onUnauthorized: OnUnauthorized | null = null;

export function registerUnauthorizedHandler(handler: OnUnauthorized) {
  onUnauthorized = handler;
}

export async function httpFetch(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, {
    ...init,
    credentials: 'include', // obrigatório para cookie
  });

  if (res.status === 401) {
    if (!isHandling401) {
      isHandling401 = true;
      onUnauthorized?.();

      // pequena janela para evitar flood
      setTimeout(() => {
        isHandling401 = false;
      }, 1000);
    }
  }

  return res;
}
