import { describe, test, expect } from 'vitest'
import { statusViewModel } from '../../../../src/pages/publishing-checks/status/view-model.js'

describe('#statusViewModel', () => {
  const runs = [
    { documentId: 'doc-1', title: 'Guide', status: 'completed', jobId: 'job-1', updatedAt: '2026-06-01' }
  ]

  test('Should set pageTitle to Publishing checks', () => {
    expect(statusViewModel(runs).pageTitle).toBe('Publishing checks')
  })

  test('Should set page for nav highlighting', () => {
    expect(statusViewModel(runs).page).toBe('publishing-checks')
  })

  test('Should pass runs through', () => {
    expect(statusViewModel(runs).runs).toEqual(runs)
  })

  test('Should include home breadcrumb', () => {
    expect(statusViewModel(runs).breadcrumbs).toContainEqual({ text: 'Home', href: '/' })
  })
})
