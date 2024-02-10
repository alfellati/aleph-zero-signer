import { z } from 'zod';

// use namespaces to add typization for your storage data
const namespaces = { 'password-cache': z.record(z.string(), z.object({ password: z.string(), expiresAt: z.number() })) } as const satisfies Record<string, z.ZodSchema>;

export const setItem = async <N extends keyof typeof namespaces>(namespace: N, updater: (currData?: z.TypeOf<typeof namespaces[N]>) => z.TypeOf<typeof namespaces[N]>) => {
  const currentData = await getItem(namespace);

  await chrome.storage.session.set({ [namespace]: updater(currentData) });
};

export const getItem = async <N extends keyof typeof namespaces>(namespace: N): Promise<z.infer<typeof namespaces[N]> | undefined> => {
  const { [namespace]: cachedData } = await chrome.storage.session.get(namespace);

  try {
    return namespaces[namespace].parse(cachedData);
  } catch {
    return undefined;
  }
};

export const removeItem = async <N extends keyof typeof namespaces>(namespace: N) => {
  await chrome.storage.session.remove(namespace);
};

const chromeStorage = {
  getItem,
  setItem,
  removeItem
};

export default chromeStorage;
