import { describe, test, expect } from 'vitest'
import { listViewModel } from '../../../../src/pages/guidance-documents/list/view-model.js'

const baseResult = { items: [], total: 0, page: 1, pageSize: 10 }

describe('#listViewModel', () => {
  test('Should set pageTitle to Guidance documents', () => {
    expect(listViewModel(baseResult).pageTitle).toBe('Guidance documents')
  })

  test('Should pass documents through', () => {
    const doc = { id: 'doc-1', title: 'Test' }
    expect(listViewModel({ ...baseResult, items: [doc] }).documents).toEqual([doc])
  })

  test('Should compute totalPages', () => {
    const result = { items: [], total: 25, page: 1, pageSize: 10 }
    expect(listViewModel(result).pagination.totalPages).toBe(3)
  })

  test('Should compute totalPages of 1 for fewer items than pageSize', () => {
    const result = { items: [], total: 5, page: 1, pageSize: 10 }
    expect(listViewModel(result).pagination.totalPages).toBe(1)
  })

  test('Should include pagination properties', () => {
    const result = { items: [], total: 50, page: 2, pageSize: 10 }
    expect(listViewModel(result).pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 50,
      totalPages: 5
    })
  })

  test('Should include home breadcrumb', () => {
    expect(listViewModel(baseResult).breadcrumbs).toContainEqual({ text: 'Home', href: '/' })
  })
})
