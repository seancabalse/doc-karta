/** Dagre layout: registry nodes/edges → positioned React Flow nodes/edges. */
import dagre from '@dagrejs/dagre'
import type { Edge, Node } from '@xyflow/react'
import type { Registry, RegistryNode } from '../../types/registry'

export type KartaNodeData = { node: RegistryNode; dimmed: boolean }
export type KartaNode = Node<KartaNodeData, 'karta'>

const NODE_W = 210
const NODE_H = 60

export function layoutGraph(registry: Registry): { nodes: KartaNode[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 36, ranksep: 96 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const n of registry.nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H })
  for (const e of registry.edges) g.setEdge(e.from, e.to)

  dagre.layout(g)

  const nodes: KartaNode[] = registry.nodes.map((node) => {
    const { x, y } = g.node(node.id)
    return {
      id: node.id,
      type: 'karta',
      position: { x: x - NODE_W / 2, y: y - NODE_H / 2 },
      data: { node, dimmed: false },
    }
  })

  const edges: Edge[] = registry.edges.map((e) => ({
    id: `${e.from}->${e.to}`,
    source: e.from,
    target: e.to,
    label: e.kind,
    animated: e.kind === 'calls',
  }))

  return { nodes, edges }
}
