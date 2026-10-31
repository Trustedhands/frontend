import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Plain apostrophes in copy are safe in React; escaping them hurts readability
      'react/no-unescaped-entities': 'off',
    },
  },
  { ignores: ['.next/**', 'next-env.d.ts'] },
];

export default config;
