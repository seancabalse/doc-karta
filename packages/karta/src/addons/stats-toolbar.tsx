/** Built-in addon: a node/edge count badge in the toolbar. Exercises registerToolbarItem. */
import * as stylex from '@stylexjs/stylex'
import { tokens } from '../styling/tokens.stylex'
import { registerToolbarItem, useRegistry } from './api'

const styles = stylex.create({
  badge: {
    fontSize: 12,
    color: tokens.muted,
    fontFamily: tokens.fontMono,
  },
})

function Stats() {
  const { registry } = useRegistry()
  if (!registry) return null
  return (
    <span {...stylex.props(styles.badge)}>
      {registry.nodes.length} nodes · {registry.edges.length} edges
    </span>
  )
}

registerToolbarItem('stats', Stats)
