import { useContext } from 'react'
import { ParkContext, type ParkContextValue } from './ParkProvider'

export function usePark(): ParkContextValue {
  const ctx = useContext(ParkContext)
  if (!ctx) {
    throw new Error('usePark must be used within ParkProvider')
  }
  return ctx
}
