import * as stylex from '@stylexjs/stylex'
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { tokens } from '../styling/tokens.stylex'
import type { Audience, NodeType } from '../types/registry'
import { GraphView } from './GraphView'

const styles = stylex.create({
  frame: {
    minHeight: '100vh',
    backgroundColor: tokens.bg,
    color: tokens.text,
    fontFamily: tokens.fontSans,
  },
})

function AppFrame() {
  return (
    <div {...stylex.props(styles.frame)}>
      <Outlet />
    </div>
  )
}

/**
 * URL-state schema — docs/specs/url-state.md. validateSearch is the only
 * validator. `layer`/`audience` defaults ("all") are represented by *absence* of
 * the param, so a clean `/` is the canonical "everything" view.
 */
type GraphSearch = {
  node?: string
  focus?: string
  env?: string
  layer?: NodeType
  audience?: Audience
  panel?: string
}

const LAYERS = ['page', 'component', 'bff', 'api'] as const
const AUDIENCES = ['business', 'tech'] as const

const inList = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v)

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined

const rootRoute = createRootRoute({ component: AppFrame })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: GraphView,
  validateSearch: (raw: Record<string, unknown>): GraphSearch => ({
    node: str(raw.node),
    focus: str(raw.focus),
    env: str(raw.env),
    layer: inList(LAYERS, raw.layer) ? raw.layer : undefined,
    audience: inList(AUDIENCES, raw.audience) ? raw.audience : undefined,
    panel: str(raw.panel),
  }),
})

const routeTree = rootRoute.addChildren([indexRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
