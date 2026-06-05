/**
 * The typed event bus connecting the Manager and Preview frames, and core ↔
 * addons within a frame. Contract: docs/specs/plugin-channel-api.md.
 *
 * One logical bus spans both frames; `connectPostMessage` relays events across
 * the iframe boundary so a message emitted on either side is observed on both.
 */
import type { NodeType } from '../types/registry'

/** The frozen channel message protocol. Payloads are plain JSON (they cross postMessage). */
export type ChannelEvents = {
  'registry:loaded': { version: string; node_count: number; edge_count: number }
  'node:select': { id: string | null }
  'node:navigate': { id: string }
  'env:change': { env: string }
  'layer:filter': { layer: NodeType | 'all' }
}

export type ChannelEvent = keyof ChannelEvents

type AnyHandler = (payload: unknown) => void

export class Channel {
  private handlers = new Map<ChannelEvent, Set<AnyHandler>>()

  on<E extends ChannelEvent>(event: E, handler: (payload: ChannelEvents[E]) => void): () => void {
    const set = this.handlers.get(event) ?? new Set<AnyHandler>()
    set.add(handler as AnyHandler)
    this.handlers.set(event, set)
    return () => {
      set.delete(handler as AnyHandler)
    }
  }

  emit<E extends ChannelEvent>(event: E, payload: ChannelEvents[E]): void {
    const set = this.handlers.get(event)
    if (!set) return
    for (const handler of set) handler(payload)
  }
}

const TRANSPORT_KEY = '__karta_channel__'
const RELAYED: ChannelEvent[] = [
  'registry:loaded',
  'node:select',
  'node:navigate',
  'env:change',
  'layer:filter',
]

type Wire = { [TRANSPORT_KEY]: true; event: ChannelEvent; payload: unknown }

function isWire(data: unknown): data is Wire {
  return typeof data === 'object' && data !== null && (data as Wire)[TRANSPORT_KEY] === true
}

/**
 * Bridge a channel to another frame over postMessage. Inbound messages are
 * re-emitted locally; locally-originated emits are forwarded to `target`. A
 * re-entrancy guard stops a relayed event from bouncing back across the bridge.
 *
 * @param target lazy accessor for the other frame's window (an iframe may not
 *   be ready at connect time).
 * @param origin pinned target origin; inbound messages from any other origin
 *   are dropped.
 */
export function connectPostMessage(
  channel: Channel,
  target: () => Window | null,
  origin: string,
): () => void {
  let dispatchingRemote = false

  const onMessage = (e: MessageEvent) => {
    if (e.origin !== origin) return
    if (!isWire(e.data)) return
    dispatchingRemote = true
    try {
      channel.emit(e.data.event, e.data.payload as never)
    } finally {
      dispatchingRemote = false
    }
  }
  window.addEventListener('message', onMessage)

  const unsubs = RELAYED.map((event) =>
    channel.on(event, (payload) => {
      if (dispatchingRemote) return
      const w = target()
      if (w) w.postMessage({ [TRANSPORT_KEY]: true, event, payload } as Wire, origin)
    }),
  )

  return () => {
    window.removeEventListener('message', onMessage)
    for (const unsub of unsubs) unsub()
  }
}
