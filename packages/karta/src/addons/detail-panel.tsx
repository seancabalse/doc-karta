/**
 * Built-in addon: a properties inspector for the selected node. Exercises the
 * full addon path — registerPanel + subscribeToChannel + useRegistry — so the
 * contract in docs/specs/plugin-channel-api.md is proven end to end.
 */
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { tokens } from '../styling/tokens.stylex'
import { TYPE_LABEL } from '../ui/nodeTheme'
import { registerPanel, subscribeToChannel, useRegistry } from './api'

const styles = stylex.create({
  empty: {
    fontSize: 13,
    color: tokens.muted,
    padding: 16,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 16,
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  key: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: tokens.muted,
  },
  val: {
    fontSize: 13,
    fontFamily: tokens.fontMono,
    wordBreak: 'break-all',
  },
})

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div {...stylex.props(styles.row)}>
      <span {...stylex.props(styles.key)}>{k}</span>
      <span {...stylex.props(styles.val)}>{v}</span>
    </div>
  )
}

function DetailPanel() {
  const { registry } = useRegistry()
  const [id, setId] = useState<string | null>(null)

  useEffect(() => subscribeToChannel('node:select', (p) => setId(p.id)), [])

  const node = registry?.nodes.find((n) => n.id === id)
  if (!node) return <p {...stylex.props(styles.empty)}>Select a node to inspect its properties.</p>

  return (
    <div {...stylex.props(styles.list)}>
      <Row k="id" v={node.id} />
      <Row k="type" v={TYPE_LABEL[node.type]} />
      <Row k="status" v={node.status} />
      <Row k="library" v={node.library} />
      {node.owner && <Row k="owner" v={node.owner} />}
      {node.audience && node.audience.length > 0 && (
        <Row k="audience" v={node.audience.join(', ')} />
      )}
      <Row k="source" v={node.source_path} />
    </div>
  )
}

registerPanel('detail', DetailPanel)
