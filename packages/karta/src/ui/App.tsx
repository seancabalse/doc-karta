import * as stylex from '@stylexjs/stylex'
import { Outlet } from '@tanstack/react-router'
import { tokens } from '../styling/tokens.stylex'

const styles = stylex.create({
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.bg,
    color: tokens.text,
    fontFamily: tokens.fontSans,
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 24,
    paddingRight: 24,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.border,
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  tag: {
    fontSize: 13,
    color: tokens.muted,
  },
  main: {
    flexGrow: 1,
    display: 'flex',
  },
  placeholder: {
    margin: 'auto',
    textAlign: 'center',
  },
  phTitle: {
    fontSize: 16,
    fontWeight: 600,
  },
  phBody: {
    fontSize: 13,
    color: tokens.muted,
  },
})

export function AppShell() {
  return (
    <div {...stylex.props(styles.root)}>
      <header {...stylex.props(styles.header)}>
        <span {...stylex.props(styles.brand)}>Karta</span>
        <span {...stylex.props(styles.tag)}>living docs for monorepos</span>
      </header>
      <main {...stylex.props(styles.main)}>
        <Outlet />
      </main>
    </div>
  )
}

export function GraphPlaceholder() {
  return (
    <div {...stylex.props(styles.placeholder)}>
      <p {...stylex.props(styles.phTitle)}>Graph canvas</p>
      <p {...stylex.props(styles.phBody)}>Phase 2 renders the registry here.</p>
    </div>
  )
}
