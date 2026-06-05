import * as stylex from '@stylexjs/stylex'
import { getToolbarItems } from '../addons/api'
import { tokens } from '../styling/tokens.stylex'
import type { Audience, NodeType } from '../types/registry'

const styles = stylex.create({
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.border,
  },
  brand: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  spacer: {
    flexGrow: 1,
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: tokens.muted,
  },
  seg: {
    display: 'flex',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  segBtn: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    fontSize: 12,
    cursor: 'pointer',
    borderWidth: 0,
    backgroundColor: { default: 'transparent', ':hover': tokens.border },
    color: tokens.text,
  },
  segActive: {
    backgroundColor: tokens.accent,
    color: '#0e0f13',
  },
})

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<readonly [T, string]>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div {...stylex.props(styles.seg)}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          {...stylex.props(styles.segBtn, v === value && styles.segActive)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

const LAYERS: ReadonlyArray<readonly [NodeType | 'all', string]> = [
  ['all', 'All'],
  ['page', 'Page'],
  ['component', 'Component'],
  ['bff', 'BFF'],
  ['api', 'API'],
]

const AUDIENCES: ReadonlyArray<readonly [Audience | 'all', string]> = [
  ['all', 'All'],
  ['business', 'Business'],
  ['tech', 'Tech'],
]

export function Toolbar({
  layer,
  audience,
  onLayer,
  onAudience,
}: {
  layer: NodeType | 'all'
  audience: Audience | 'all'
  onLayer: (v: NodeType | 'all') => void
  onAudience: (v: Audience | 'all') => void
}) {
  return (
    <div {...stylex.props(styles.bar)}>
      <span {...stylex.props(styles.brand)}>Karta</span>
      <div {...stylex.props(styles.group)}>
        <span {...stylex.props(styles.label)}>Layer</span>
        <Segmented options={LAYERS} value={layer} onChange={onLayer} />
      </div>
      <div {...stylex.props(styles.group)}>
        <span {...stylex.props(styles.label)}>Audience</span>
        <Segmented options={AUDIENCES} value={audience} onChange={onAudience} />
      </div>
      <span {...stylex.props(styles.spacer)} />
      {getToolbarItems().map(([id, Item]) => (
        <Item key={id} />
      ))}
    </div>
  )
}
