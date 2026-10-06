import SpotChecks from './quality/SpotChecks'

/**
 * MG08 — carry out on-site service spot checks.
 * The screen is in ./quality; this keeps the sidebar's route where index.tsx
 * expects to find it.
 */
export default function Quality() {
  return <SpotChecks />
}
