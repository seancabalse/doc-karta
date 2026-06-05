import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { channel } from '../addons/api'
import { connectPostMessage } from '../channel/channel'
import { connectLiveRegistry } from '../ui/live'
import '../ui/styles.css'
import { Preview } from './Preview'

const queryClient = new QueryClient()
connectLiveRegistry(queryClient)

function PreviewRoot() {
  // Bridge this frame's channel to the Manager (our parent).
  useEffect(() => connectPostMessage(channel, () => window.parent, window.location.origin), [])
  return <Preview />
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root not found')

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PreviewRoot />
    </QueryClientProvider>
  </StrictMode>,
)
