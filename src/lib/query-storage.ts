import { File, Paths } from 'expo-file-system';

// The cache folder: the system may empty it when space runs low, which only costs one slower start.
const file = new File(Paths.cache, 'query-cache.json');

/** Too big for the keychain the rest of the app stores its values in. */
export const queryStorage = {
  getItem: async () => (file.exists ? file.text() : null),
  setItem: async (_key: string, value: string) => {
    if (!file.exists) file.create();
    await file.write(value);
  },
  removeItem: async () => {
    if (file.exists) file.delete();
  },
};
