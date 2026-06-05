import * as stylex from '@stylexjs/stylex'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { channel, emitToChannel, getPanels, subscribeToChannel, useRegistry } from '../addons/api'
import { connectPostMessage } from '../channel/channel'
import { tokens } from '../styling/tokens.stylex'
import type { Audience, NodeType } from '../types/registry'
import { GraphCanvas } from './graph/GraphCanvas'
import { subscribeLiveStatus } from './live'
import { Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'

const styles = stylex.create({
  view: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  body: {
    display: 'flex',
    flexGrow: 1,
    minHeight: 0,
  },
  aside: {
    width: 320,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderLeftWidth: 1,
    borderLeftStyle: 'solid',
    borderLeftColor: tokens.border,
  },
  paneLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: tokens.muted,
    paddingTop: 10,
    paddingBottom: 6,
    paddingLeft: 16,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.border,
  },
  panels: {
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.border,
  },
  previewWrap: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  iframe: {
    flexGrow: 1,
    width: '100%',
    borderWidth: 0,
  },
  center: {
    margin: 'auto',
    textAlign: 'center',
    fontSize: 13,
    color: tokens.muted,
  },
  banner: {
    flexShrink: 0,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 20,
    paddingRight: 20,
    backgroundColor: 'rgba(248,81,73,0.12)',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#f85149',
    color: '#ff9d96',
    fontSize: 12,
    fontFamily: tokens.fontMono,
    whiteSpace: 'pre-wrap',
  },
})

export function GraphView() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const { registry, isLoading, error } = useRegistry()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [liveError, setLiveError] = useState<string | null>(null)

  // Dev live-reload: a failed re-crawl surfaces here while the last good graph stays.
  useEffect(() => subscribeLiveStatus(setLiveError), [])

  const select = useCallback(
    (node: string) => navigate({ search: (s) => ({ ...s, node }) }),
    [navigate],
  )
  const setLayer = useCallback(
    (v: NodeType | 'all') =>
      navigate({ search: (s) => ({ ...s, layer: v === 'all' ? undefined : v }) }),
    [navigate],
  )
  const setAudience = useCallback(
    (v: Audience | 'all') =>
      navigate({ search: (s) => ({ ...s, audience: v === 'all' ? undefined : v }) }),
    [navigate],
  )

  // "all" is the absence of the param (docs/specs/url-state.md).
  const layer = search.layer ?? 'all'
  const audience = search.audience ?? 'all'

  // Bridge the Manager channel to the sandboxed Preview iframe (set up once).
  useEffect(
    () =>
      connectPostMessage(
        channel,
        () => iframeRef.current?.contentWindow ?? null,
        window.location.origin,
      ),
    [],
  )

  // Selection is one-way (Manager → Preview): re-emit whenever it changes.
  useEffect(() => {
    emitToChannel('node:select', { id: search.node ?? null })
  }, [search.node])

  // Core → everyone, once the registry loads.
  useEffect(() => {
    if (registry) {
      emitToChannel('registry:loaded', {
        version: registry.version,
        node_count: registry.nodes.length,
        edge_count: registry.edges.length,
      })
    }
  }, [registry])

  // Preview asks to focus a node → honour it by updating the URL.
  useEffect(() => subscribeToChannel('node:navigate', (p) => select(p.id)), [select])

  const onPreviewLoad = () => {
    // The iframe missed events emitted before it finished loading; replay state.
    emitToChannel('node:select', { id: search.node ?? null })
    if (registry) {
      emitToChannel('registry:loaded', {
        version: registry.version,
        node_count: registry.nodes.length,
        edge_count: registry.edges.length,
      })
    }
  }

  let content: React.ReactNode
  if (isLoading) content = <p {...stylex.props(styles.center)}>Loading registry…</p>
  else if (error) content = <p {...stylex.props(styles.center)}>Failed to load registry.json</p>
  else if (!registry || registry.nodes.length === 0)
    content = <p {...stylex.props(styles.center)}>Registry is empty.</p>
  else
    content = (
      <>
        <Sidebar registry={registry} selectedId={search.node} onSelect={select} />
        <GraphCanvas
          registry={registry}
          selectedId={search.node}
          layer={layer}
          audience={audience}
          onSelect={select}
        />
      </>
    )

  return (
    <div {...stylex.props(styles.view)}>
      <Toolbar layer={layer} audience={audience} onLayer={setLayer} onAudience={setAudience} />
      {liveError && (
        <div role="alert" {...stylex.props(styles.banner)}>
          crawl failed — showing last good graph:{'\n'}
          {liveError}
        </div>
      )}
      <div {...stylex.props(styles.body)}>
        {content}
        <aside {...stylex.props(styles.aside)}>
          <div {...stylex.props(styles.panels)}>
            <div {...stylex.props(styles.paneLabel)}>Details</div>
            {getPanels().map(([id, Panel]) => (
              <Panel key={id} />
            ))}
          </div>
          <div {...stylex.props(styles.previewWrap)}>
            <div {...stylex.props(styles.paneLabel)}>Preview</div>
            <iframe
              ref={iframeRef}
              title="preview"
              src="/preview.html"
              onLoad={onPreviewLoad}
              sandbox="allow-scripts allow-same-origin"
              {...stylex.props(styles.iframe)}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
