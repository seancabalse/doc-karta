import stylex from '@stylexjs/postcss-plugin'

export default {
  plugins: [
    stylex({
      include: ['src/**/*.{ts,tsx}'],
      // The plugin re-parses source files to extract StyleX rules. Give it a
      // self-contained babel config (TS + .tsx JSX parsing + the StyleX plugin)
      // rather than relying on an ambient babel.config.js.
      babelConfig: {
        babelrc: false,
        configFile: false,
        presets: ['@babel/preset-typescript'],
        plugins: [
          [
            '@stylexjs/babel-plugin',
            {
              dev: true,
              unstable_moduleResolution: { type: 'commonJS' },
            },
          ],
        ],
      },
    }),
  ],
}
