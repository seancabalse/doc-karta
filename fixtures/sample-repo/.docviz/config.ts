/**
 * Config for the synthetic fixture repo. Self-contained (the fixture has no
 * dependency on the workspace). Mirrors `DocvizConfig` in
 * `packages/karta/src/types/config.ts`.
 */
interface DocvizConfig {
  project: string
  include: string[]
  exclude?: string[]
  environments?: Record<string, string>
}

export default {
  project: 'chirp',
  include: ['libs/**/docs/**/*.mdx'],
} satisfies DocvizConfig
