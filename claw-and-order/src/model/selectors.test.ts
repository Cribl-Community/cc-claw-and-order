import { describe, expect, it } from 'vitest'
import { createSeedPark } from '../data/seed'
import { applyScenario } from '../sim/scenario'
import { DEFAULT_CONFIG, EMPTY_OPERATOR } from '../state/defaults'
import {
  selectAnimalsNeedingAttention,
  selectCriticalIncidentCount,
  selectOverviewMetrics,
  selectPrioritizedIncidents,
} from './selectors'
import type { OperatorState, ParkModel } from './types'

describe('selectOverviewMetrics', () => {
  it('guests KPI equals park.guestsInPark', () => {
    const park = createSeedPark()
    park.guestsInPark = 4_321
    const metrics = selectOverviewMetrics(park, DEFAULT_CONFIG, EMPTY_OPERATOR)
    expect(metrics.guestsInPark).toBe(4_321)
    expect(metrics.guestsInPark).toBe(park.guestsInPark)
  })
})

describe('selectCriticalIncidentCount', () => {
  it('counts only active incidents with severity critical', () => {
    const park = createSeedPark()
    park.incidents = [
      {
        id: 'a',
        severity: 'critical',
        title: 'A',
        description: '',
        assetIds: [],
        affectedAttractionIds: [],
        affectedRouteIds: [],
        openedAt: 0,
        active: true,
      },
      {
        id: 'b',
        severity: 'critical',
        title: 'B',
        description: '',
        assetIds: [],
        affectedAttractionIds: [],
        affectedRouteIds: [],
        openedAt: 0,
        active: false,
      },
      {
        id: 'c',
        severity: 'warning',
        title: 'C',
        description: '',
        assetIds: [],
        affectedAttractionIds: [],
        affectedRouteIds: [],
        openedAt: 0,
        active: true,
      },
    ]
    expect(selectCriticalIncidentCount(park)).toBe(1)
  })

  it('does not reduce count when incidents are acknowledged', () => {
    const park = createSeedPark()
    const storm = applyScenario(park, 'stormOutage', DEFAULT_CONFIG)
    const baseline = selectCriticalIncidentCount(storm)
    expect(baseline).toBeGreaterThan(0)

    const operator: OperatorState = {
      acks: Object.fromEntries(
        storm.incidents
          .filter((i) => i.active && i.severity === 'critical')
          .map((i) => [i.id, { acknowledgedAt: Date.now(), by: 'test-op' }]),
      ),
      notes: {},
    }
    expect(selectCriticalIncidentCount(storm)).toBe(baseline)
    expect(selectOverviewMetrics(storm, DEFAULT_CONFIG, operator).criticalIncidents).toBe(baseline)
  })
})

describe('selectAnimalsNeedingAttention', () => {
  it('includes dinosaurs with warning or critical welfare', () => {
    const park = createSeedPark()
    park.dinosaurs = park.dinosaurs.map((d, i) =>
      i === 0 ? { ...d, welfareStatus: 'critical' } : { ...d, welfareStatus: 'normal' },
    )
    const list = selectAnimalsNeedingAttention(park)
    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe(park.dinosaurs[0]?.id)
  })
})

describe('selectPrioritizedIncidents', () => {
  it('sorts critical before warning and unacked before acked', () => {
    const park: ParkModel = {
      ...createSeedPark(),
      incidents: [
        {
          id: 'warn-acked',
          severity: 'warning',
          title: 'W ack',
          description: '',
          assetIds: [],
          affectedAttractionIds: [],
          affectedRouteIds: [],
          openedAt: 3,
          active: true,
        },
        {
          id: 'crit-unacked',
          severity: 'critical',
          title: 'C un',
          description: '',
          assetIds: [],
          affectedAttractionIds: [],
          affectedRouteIds: [],
          openedAt: 2,
          active: true,
        },
        {
          id: 'crit-acked',
          severity: 'critical',
          title: 'C ack',
          description: '',
          assetIds: [],
          affectedAttractionIds: [],
          affectedRouteIds: [],
          openedAt: 1,
          active: true,
        },
      ],
    }
    const operator: OperatorState = {
      acks: {
        'warn-acked': { acknowledgedAt: 1, by: 'op' },
        'crit-acked': { acknowledgedAt: 1, by: 'op' },
      },
      notes: {},
    }
    const ordered = selectPrioritizedIncidents(park, operator)
    expect(ordered.map((i) => i.id)).toEqual(['crit-unacked', 'crit-acked', 'warn-acked'])
  })
})
