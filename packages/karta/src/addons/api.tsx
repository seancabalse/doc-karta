/**
 * The addon API surface (frozen — docs/specs/plugin-channel-api.md). Built-in
 * and third-party addons depend only on these five entry points.
 */
import { useQuery } from '@tanstack/react-query'
import type { ComponentType } from 'react'
import { Channel, type ChannelEvent, type ChannelEvents } from '../channel/channel'
import type { Registry } from '../types/registry'

/** The singleton bus for this frame. Bridged to the other frame by the transport. */
export const channel = new Channel()

// --- panel + toolbar registries ---------------------------------------------
// Addons self-register at import time, before first render (Storybook-style).

const panels = new Map<string, ComponentType>()
const toolbarItems = new Map<string, ComponentType>()

export function registerPanel(id: string, component: ComponentType): void {
  panels.set(id, component)
}

export function registerToolbarItem(id: string, component: ComponentType): void {
  toolbarItems.set(id, component)
}

export function getPanels(): ReadonlyArray<readonly [string, ComponentType]> {
  return [...panels]
}

export function getToolbarItems(): ReadonlyArray<readonly [string, ComponentType]> {
  return [...toolbarItems]
}

// --- channel wrappers --------------------------------------------------------

export function subscribeToChannel<E extends ChannelEvent>(
  event: E,
  handler: (payload: ChannelEvents[E]) => void,
): () => void {
  return channel.on(event, handler)
}

export function emitToChannel<E extends ChannelEvent>(event: E, payload: ChannelEvents[E]): void {
  channel.emit(event, payload)
}

// --- registry data -----------------------------------------------------------

/** Where the static registry is served. Replace the file in `public/` to view your own. */
export const REGISTRY_URL = '/registry.json'

async function fetchRegistry(): Promise<Registry> {
  const res = await fetch(REGISTRY_URL)
  if (!res.ok) throw new Error(`failed to load ${REGISTRY_URL}: ${res.status}`)
  return res.json() as Promise<Registry>
}

/** Read the loaded registry.json from the TanStack Query cache. Read-only in P2. */
export function useRegistry(): {
  registry: Registry | undefined
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({ queryKey: ['registry'], queryFn: fetchRegistry })
  return { registry: data, isLoading, error }
}
