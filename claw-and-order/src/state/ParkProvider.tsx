import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createSeedPark } from '../data/seed'
import { kvGet, kvPut } from '../kv/client'
import { KV_KEYS } from '../kv/keys'
import type {
  ConfigSettings,
  OperatorState,
  ParkModel,
  ScenarioId,
} from '../model/types'
import { anchorParkClock } from '../sim/clock'
import { applyScenario } from '../sim/scenario'
import { advanceTick } from '../sim/tick'
import { DEFAULT_CONFIG, EMPTY_OPERATOR } from './defaults'

export type Selection =
  | { kind: 'asset' | 'incident'; id: string }
  | null

export interface ParkContextValue {
  park: ParkModel
  config: ConfigSettings
  operator: OperatorState
  selection: Selection
  kvStatus: { settingsLoaded: boolean; error?: string }
  setSelection(sel: Selection): void
  acknowledgeIncident(id: string): Promise<void>
  saveNote(targetId: string, text: string): Promise<void>
  updateConfig(
    partial: Partial<ConfigSettings>,
    opts?: { persist?: boolean },
  ): Promise<{ ok: boolean; error?: string }>
  saveConfig(): Promise<{ ok: boolean; error?: string }>
  pause(): void
  resume(): void
  setScenario(id: ScenarioId): void
  resetSimulation(opts?: { clearOperator?: boolean }): Promise<void>
  clearOperatorState(): Promise<{ ok: boolean; error?: string }>
}

export const ParkContext = createContext<ParkContextValue | null>(null)

function mergeConfig(partial: Partial<ConfigSettings> | null | undefined): ConfigSettings {
  return { ...DEFAULT_CONFIG, ...(partial ?? {}) }
}

async function resolveAckBy(): Promise<string> {
  try {
    const user = await window.getCriblUser?.()
    return user?.username ?? user?.id ?? 'operator'
  } catch {
    return 'operator'
  }
}

export function ParkProvider({ children }: { children: ReactNode }) {
  const [park, setPark] = useState<ParkModel>(() => {
    const seed = createSeedPark()
    return anchorParkClock(
      applyScenario(
        { ...seed, scenario: DEFAULT_CONFIG.scenario, paused: DEFAULT_CONFIG.paused },
        DEFAULT_CONFIG.scenario,
        DEFAULT_CONFIG,
      ),
      Date.now(),
    )
  })
  const [config, setConfig] = useState<ConfigSettings>(DEFAULT_CONFIG)
  const [operator, setOperator] = useState<OperatorState>(EMPTY_OPERATOR)
  const [selection, setSelection] = useState<Selection>(null)
  const [kvStatus, setKvStatus] = useState<{ settingsLoaded: boolean; error?: string }>({
    settingsLoaded: false,
  })

  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  }, [config])

  const reportKvError = useCallback((error?: string) => {
    if (!error) return
    setKvStatus((s) => ({ ...s, error }))
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const [settings, acks, notes] = await Promise.all([
          kvGet<Partial<ConfigSettings>>(KV_KEYS.settings),
          kvGet<OperatorState['acks']>(KV_KEYS.acks),
          kvGet<OperatorState['notes']>(KV_KEYS.notes),
        ])
        if (cancelled) return

        const nextConfig = mergeConfig(settings)
        configRef.current = nextConfig
        setConfig(nextConfig)
        setOperator({
          acks: acks ?? {},
          notes: notes ?? {},
        })
        setPark((p) => {
          const withFlags = {
            ...p,
            scenario: nextConfig.scenario,
            paused: nextConfig.paused,
          }
          return anchorParkClock(
            applyScenario(withFlags, nextConfig.scenario, nextConfig),
            Date.now(),
          )
        })
        setKvStatus({ settingsLoaded: true })
      } catch (e) {
        if (cancelled) return
        setKvStatus({
          settingsLoaded: true,
          error: e instanceof Error ? e.message : 'KV load failed',
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handle = window.setInterval(() => {
      const cfg = configRef.current
      if (cfg.paused) return
      setPark((p) => {
        if (p.paused) return p
        return advanceTick(p, cfg, Date.now())
      })
    }, config.tickMs)
    return () => window.clearInterval(handle)
  }, [config.tickMs])

  const acknowledgeIncident = useCallback(
    async (id: string) => {
      const by = await resolveAckBy()
      const entry = { acknowledgedAt: Date.now(), by }
      let nextAcks: OperatorState['acks'] = {}
      setOperator((op) => {
        nextAcks = { ...op.acks, [id]: entry }
        return { ...op, acks: nextAcks }
      })
      const result = await kvPut(KV_KEYS.acks, nextAcks)
      reportKvError(result.error)
    },
    [reportKvError],
  )

  const saveNote = useCallback(
    async (targetId: string, text: string) => {
      const entry = { text, updatedAt: Date.now() }
      let nextNotes: OperatorState['notes'] = {}
      setOperator((op) => {
        nextNotes = { ...op.notes, [targetId]: entry }
        return { ...op, notes: nextNotes }
      })
      const result = await kvPut(KV_KEYS.notes, nextNotes)
      reportKvError(result.error)
    },
    [reportKvError],
  )

  const updateConfig = useCallback(
    async (partial: Partial<ConfigSettings>, opts?: { persist?: boolean }) => {
      let next = configRef.current
      setConfig((c) => {
        next = { ...c, ...partial }
        return next
      })
      configRef.current = next

      if (partial.scenario !== undefined) {
        const scenario = partial.scenario
        setPark((p) =>
          anchorParkClock(applyScenario({ ...p, scenario }, scenario, next), Date.now()),
        )
      }
      if (partial.paused !== undefined) {
        setPark((p) => ({ ...p, paused: partial.paused! }))
      }

      if (opts?.persist) {
        const result = await kvPut(KV_KEYS.settings, next)
        reportKvError(result.error)
        return result
      }
      return { ok: true }
    },
    [reportKvError],
  )

  const saveConfig = useCallback(async () => {
    const result = await kvPut(KV_KEYS.settings, configRef.current)
    reportKvError(result.error)
    return result
  }, [reportKvError])

  const pause = useCallback(() => {
    setConfig((c) => {
      const next = { ...c, paused: true }
      configRef.current = next
      return next
    })
    setPark((p) => ({ ...p, paused: true }))
  }, [])

  const resume = useCallback(() => {
    setConfig((c) => {
      const next = { ...c, paused: false }
      configRef.current = next
      return next
    })
    setPark((p) => ({ ...p, paused: false }))
  }, [])

  const setScenario = useCallback((id: ScenarioId) => {
    const next = { ...configRef.current, scenario: id }
    configRef.current = next
    setConfig(next)
    setPark((p) =>
      anchorParkClock(applyScenario({ ...p, scenario: id }, id, next), Date.now()),
    )
  }, [])

  const resetSimulation = useCallback(
    async (opts?: { clearOperator?: boolean }) => {
      const next: ConfigSettings = {
        ...configRef.current,
        scenario: 'normal',
        paused: false,
      }
      configRef.current = next
      setConfig(next)
      const seed = createSeedPark()
      setPark(
        anchorParkClock(
          applyScenario(
            { ...seed, scenario: 'normal', paused: false },
            'normal',
            next,
          ),
          Date.now(),
        ),
      )

      if (opts?.clearOperator) {
        setOperator(EMPTY_OPERATOR)
        const [acksRes, notesRes] = await Promise.all([
          kvPut(KV_KEYS.acks, {}),
          kvPut(KV_KEYS.notes, {}),
        ])
        reportKvError(acksRes.error ?? notesRes.error)
      }
    },
    [reportKvError],
  )

  const clearOperatorState = useCallback(async () => {
    const [acksRes, notesRes] = await Promise.all([
      kvPut(KV_KEYS.acks, {}),
      kvPut(KV_KEYS.notes, {}),
    ])
    const error = acksRes.error ?? notesRes.error
    if (error) {
      reportKvError(error)
      return { ok: false as const, error }
    }
    setOperator(EMPTY_OPERATOR)
    return { ok: true as const }
  }, [reportKvError])

  const value = useMemo<ParkContextValue>(
    () => ({
      park,
      config,
      operator,
      selection,
      kvStatus,
      setSelection,
      acknowledgeIncident,
      saveNote,
      updateConfig,
      saveConfig,
      pause,
      resume,
      setScenario,
      resetSimulation,
      clearOperatorState,
    }),
    [
      park,
      config,
      operator,
      selection,
      kvStatus,
      acknowledgeIncident,
      saveNote,
      updateConfig,
      saveConfig,
      pause,
      resume,
      setScenario,
      resetSimulation,
      clearOperatorState,
    ],
  )

  return <ParkContext.Provider value={value}>{children}</ParkContext.Provider>
}
