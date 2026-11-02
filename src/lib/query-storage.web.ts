const KEY = 'meowshot.query-cache';

/** localStorage throws when it is full or blocked; a missing cache only costs one slower start. */
export const queryStorage = {
  getItem: async () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  setItem: async (_key: string, value: string) => {
    try {
      localStorage.setItem(KEY, value);
    } catch {}
  },
  removeItem: async () => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
  },
};
