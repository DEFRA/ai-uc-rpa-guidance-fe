import { describe, test, expect } from 'vitest'
import { newCheckViewModel } from '../../../../src/pages/publishing-checks/new/view-model.js'

const completeDoc = { id: 'doc-1', title: 'Guide A', filename: null }
const filenameDoc = { id: 'doc-2', title: null, filename: 'guide.docx' }

describe('#newCheckViewModel', () => {
  test('Should set pageTitle', () => {
    expect(newCheckViewModel().pageTitle).toBe('Start a publishing check')
  })

  test('Should set page for nav highlighting', () => {
    expect(newCheckViewModel().page).toBe('publishing-checks')
  })

  test('Should include placeholder as first selectItem', () => {
    expect(newCheckViewModel({ documents: [completeDoc] }).selectItems[0]).toEqual({
      value: '',
      text: 'Select a document'
    })
  })

  test('Should map documents to selectItems using title', () => {
    const vm = newCheckViewModel({ documents: [completeDoc] })
    expect(vm.selectItems[1]).toEqual({ value: 'doc-1', text: 'Guide A' })
  })

  test('Should fall back to filename when title is null', () => {
    const vm = newCheckViewModel({ documents: [filenameDoc] })
    expect(vm.selectItems[1].text).toBe('guide.docx')
  })

  test('Should set hasDocuments true when documents provided', () => {
    expect(newCheckViewModel({ documents: [completeDoc] }).hasDocuments).toBe(true)
  })

  test('Should set hasDocuments false when no documents', () => {
    expect(newCheckViewModel({ documents: [] }).hasDocuments).toBe(false)
  })

  test('Should set hasDocuments false with no argument', () => {
    expect(newCheckViewModel().hasDocuments).toBe(false)
  })

  test('Should default errorMessage to null', () => {
    expect(newCheckViewModel().errorMessage).toBeNull()
  })

  test('Should default showSelectError to false', () => {
    expect(newCheckViewModel().showSelectError).toBe(false)
  })

  test('Should pass through errorMessage and showSelectError', () => {
    const vm = newCheckViewModel({ errorMessage: 'Select a document', showSelectError: true })
    expect(vm.errorMessage).toBe('Select a document')
    expect(vm.showSelectError).toBe(true)
  })

  test('Should include publishing checks breadcrumbs', () => {
    const { breadcrumbs } = newCheckViewModel()
    expect(breadcrumbs).toContainEqual({ text: 'Home', href: '/' })
    expect(breadcrumbs).toContainEqual({ text: 'Publishing checks', href: '/publishing-checks' })
  })
})
