/**
 * The Preview frame's content. Runs inside the sandboxed iframe — it shares no
 * memory with the Manager and communicates only over the channel (bridged by
 * postMessage). It renders the selected node's content; clicking a related node
 * asks the Manager to focus it via `node:navigate`.
 */
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { emitToChannel, subscribeToChannel, useRegistry } from '../addons/api'
import { tokens } from '../styling/tokens.stylex'
import type { RegistryEdge } from '../types/registry'
import { TYPE_COLOR, TYPE_LABEL } from '../ui/nodeTheme'

const styles = stylex.create({
  root: {
    padding: 20,
    fontFamily: tokens.fontSans,
    color: tokens.text,
    backgroundColor: tokens.bg,
    minHeight: '100vh',
  },
  empty: {
    fontSize: 13,
    color: tokens.muted,
  },
  type: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 700,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginTop: 4,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: tokens.muted,
    fontFamily: tokens.fontMono,
    marginBottom: 16,
  },
  note: {
    fontSize: 13,
    color: tokens.muted,
    lineHeight: 1.5,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: 8,
    backgroundColor: tokens.panel,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.border,
    marginBottom: 20,
  },
  section: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: tokens.muted,
    marginBottom: 8,
  },
  edges: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 18,
  },
  edge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textAlign: 'left',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.border,
    backgroundColor: { default: tokens.panel, ':hover': tokens.border },
    color: tokens.text,
  },
  kind: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: tokens.muted,
    fontFamily: tokens.fontMono,
  },
})

export function Preview() {
  const { registry } = useRegistry()
  const [id, setId] = useState<string | null>(null)

  useEffect(() => subscribeToChannel('node:select', (p) => setId(p.id)), [])

  const node = registry?.nodes.find((n) => n.id === id)
  if (!registry || !node) {
    return (
      <div {...stylex.props(styles.root)}>
        <p {...stylex.props(styles.empty)}>No node selected.</p>
      </div>
    )
  }

  const label = (ref: string) => registry.nodes.find((n) => n.id === ref)?.title ?? ref
  const outgoing = registry.edges.filter((e) => e.from === node.id)
  const incoming = registry.edges.filter((e) => e.to === node.id)

  const EdgeRow = ({ edge, dir }: { edge: RegistryEdge; dir: 'out' | 'in' }) => {
    const target = dir === 'out' ? edge.to : edge.from
    return (
      <button
        type="button"
        onClick={() => emitToChannel('node:navigate', { id: target })}
        {...stylex.props(styles.edge)}
      >
        <span {...stylex.props(styles.kind)}>{edge.kind}</span>
        <span>{label(target)}</span>
      </button>
    )
  }

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.type)} style={{ color: TYPE_COLOR[node.type] }}>
        {TYPE_LABEL[node.type]}
      </div>
      <h1 {...stylex.props(styles.title)}>{node.title}</h1>
      <div {...stylex.props(styles.meta)}>{node.id}</div>

      <p {...stylex.props(styles.note)}>
        Rendered MDX body lands here once the core emits it. P2 shows the node's resolved metadata
        and its place in the dependency graph.
      </p>

      {outgoing.length > 0 && (
        <>
          <div {...stylex.props(styles.section)}>Depends on</div>
          <div {...stylex.props(styles.edges)}>
            {outgoing.map((e) => (
              <EdgeRow key={`${e.from}->${e.to}`} edge={e} dir="out" />
            ))}
          </div>
        </>
      )}

      {incoming.length > 0 && (
        <>
          <div {...stylex.props(styles.section)}>Used by</div>
          <div {...stylex.props(styles.edges)}>
            {incoming.map((e) => (
              <EdgeRow key={`${e.from}->${e.to}`} edge={e} dir="in" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
