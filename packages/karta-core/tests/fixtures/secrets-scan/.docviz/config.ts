interface DocvizConfig {
  project: string
  include: string[]
}

export default {
  project: 'scan-fixture',
  include: ['**/docs/**/*.mdx'],
} satisfies DocvizConfig
