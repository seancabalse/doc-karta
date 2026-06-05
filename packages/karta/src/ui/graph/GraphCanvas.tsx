import * as stylex from '@stylexjs/stylex'
import {
  Background,
  Controls,
  type Edge,
  Handle,
  type NodeProps,
  type NodeTypes,
  Position,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMemo } from 'react'
import { tokens } from '../../styling/tokens.stylex'
import type { Audience, NodeType, Registry } from '../../types/registry'
import { TYPE_COLOR, TYPE_LABEL } from '../nodeTheme'
import { type KartaNode, layoutGraph } from './layout'

const styles = stylex.create({
  node: {
    width: 210,
    boxSizing: 'border-box',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.border,
    borderLeftWidth: 4,
    backgroundColor: tokens.panel,
    color: tokens.text,
    fontFamily: tokens.fontSans,
  },
  nodeSelected: {
    borderColor: tokens.accent,
    boxShadow: '0 0 0 2px rgba(108,140,255,0.35)',
  },
  nodeDimmed: {
    opacity: 0.25,
  },
  type: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  canvas: {
    flexGrow: 1,
    minWidth: 0,
  },
})

function KartaNodeView({ data, selected }: NodeProps<KartaNode>) {
  const { node, dimmed } = data
  const color = TYPE_COLOR[node.type]
  return (
    <div
      {...stylex.props(styles.node, selected && styles.nodeSelected, dimmed && styles.nodeDimmed)}
      style={{ borderLeftColor: color }}
    >
      <Handle type="target" position={Position.Left} />
      <div {...stylex.props(styles.type)} style={{ color }}>
        {TYPE_LABEL[node.type]}
      </div>
      <div {...stylex.props(styles.title)}>{node.title}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const NODE_TYPES: NodeTypes = { karta: KartaNodeView }

export function GraphCanvas({
  registry,
  selectedId,
  layer,
  audience,
  onSelect,
}: {
  registry: Registry
  selectedId: string | undefined
  layer: NodeType | 'all'
  audience: Audience | 'all'
  onSelect: (id: string) => void
}) {
  const base = useMemo(() => layoutGraph(registry), [registry])

  const nodes: KartaNode[] = useMemo(
    () =>
      base.nodes.map((n) => {
        const rn = n.data.node
        const dimmed =
          (layer !== 'all' && rn.type !== layer) ||
          (audience !== 'all' && !(rn.audience ?? []).includes(audience))
        return { ...n, selected: rn.id === selectedId, data: { ...n.data, dimmed } }
      }),
    [base, selectedId, layer, audience],
  )

  const edges: Edge[] = base.edges

  return (
    <div {...stylex.props(styles.canvas)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodeClick={(_, n) => onSelect(n.id)}
        fitView
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
