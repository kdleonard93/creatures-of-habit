import { writable } from 'svelte/store';
import type { Notifications } from '$lib/types';

export const notifications = writable<Notifications[]>([]);