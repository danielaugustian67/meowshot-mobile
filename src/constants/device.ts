import * as Device from 'expo-device';

/**
 * Phones with 3 GB of RAM or less, where the OS kills background apps early and every view counts.
 * Decoration that costs many native views is left out there. Unknown (web) counts as plenty.
 */
export const LOW_MEMORY = (Device.totalMemory ?? Infinity) <= 3 * 1024 ** 3;
