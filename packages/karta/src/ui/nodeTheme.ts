/** Shared per-type colors + labels used by the graph, sidebar, and detail panel. */
import type { NodeType } from '../types/registry'

export const TYPE_COLOR: Record<NodeType, string> = {
  page: '#6c8cff',
  component: '#3fb950',
  bff: '#d29922',
  api: '#db61a2',
}

export const TYPE_LABEL: Record<NodeType, string> = {
  page: 'Page',
  component: 'Component',
  bff: 'BFF',
  api: 'API',
}
