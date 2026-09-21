import ExceptionQueue from './exceptions/ExceptionQueue'

/**
 * MG05 — take over and resolve care exceptions.
 * The screen itself is in ./exceptions; this keeps the sidebar's route where
 * index.tsx expects to find it.
 */
export default function Exceptions() {
  return <ExceptionQueue />
}
