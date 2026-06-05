import * as stylex from '@stylexjs/stylex'
import { tokens } from '../styling/tokens.stylex'
import type { NodeType, Registry } from '../types/registry'
import { TYPE_COLOR, TYPE_LABEL } from './nodeTheme'

const styles = stylex.create({
  side: {
    width: 248,
    flexShrink: 0,
    overflowY: 'auto',
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: tokens.border,
    paddingTop: 8,
    paddingBottom: 8,
  },
  group: {
    marginBottom: 8,
  },
  groupLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 16,
    paddingRight: 16,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: tokens.muted,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  item: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 28,
    paddingRight: 16,
    fontSize: 13,
    cursor: 'pointer',
    borderWidth: 0,
    backgroundColor: { default: 'transparent', ':hover': tokens.panel },
    color: tokens.text,
  },
  itemActive: {
    backgroundColor: tokens.panel,
    color: tokens.accent,
    fontWeight: 600,
  },
})

const ORDER: NodeType[] = ['page', 'component', 'bff', 'api']

export function Sidebar({
  registry,
  selectedId,
  onSelect,
}: {
  registry: Registry
  selectedId: string | undefined
  onSelect: (id: string) => void
}) {
  return (
    <nav {...stylex.props(styles.side)}>
      {ORDER.map((type) => {
        const nodes = registry.nodes.filter((n) => n.type === type)
        if (nodes.length === 0) return null
        return (
          <div key={type} {...stylex.props(styles.group)}>
            <div {...stylex.props(styles.groupLabel)}>
              <span {...stylex.props(styles.dot)} style={{ backgroundColor: TYPE_COLOR[type] }} />
              {TYPE_LABEL[type]} · {nodes.length}
            </div>
            {nodes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelect(n.id)}
                {...stylex.props(styles.item, n.id === selectedId && styles.itemActive)}
              >
                {n.title}
              </button>
            ))}
          </div>
        )
      })}
    </nav>
  )
}
