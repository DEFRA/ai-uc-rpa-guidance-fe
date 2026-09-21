// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest'

const { mockMountEditor, mockMountViewer } = vi.hoisted(() => ({
  mockMountEditor: vi.fn(),
  mockMountViewer: vi.fn()
}))

vi.mock('../../../src/client/javascripts/guidance-editor/mount.js', () => ({
  mountGuidanceEditor: mockMountEditor
}))

vi.mock('../../../src/client/javascripts/guidance-viewer/mount.js', () => ({
  mountGuidanceViewer: mockMountViewer
}))

// The entry points run their work on import, which is the behaviour under
// test: package.json declares the package side-effect free, so a bundle that
// only rendered on load would be tree-shaken away.
async function importFresh (path) {
  vi.resetModules()
  await import(path)
}

describe('#guidanceEditor entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Should mount an editor on each marked element', async () => {
    document.body.innerHTML = `
      <div data-module="guidance-editor" id="one"></div>
      <div data-module="guidance-editor" id="two"></div>
    `

    await importFresh('../../../src/client/javascripts/guidance-editor.js')

    expect(mockMountEditor).toHaveBeenCalledTimes(2)
    expect(mockMountEditor.mock.calls.map(([el]) => el.id)).toEqual(['one', 'two'])
  })

  test('Should mount nothing on a page that has no editor', async () => {
    document.body.innerHTML = '<div id="unrelated"></div>'

    await importFresh('../../../src/client/javascripts/guidance-editor.js')

    expect(mockMountEditor).not.toHaveBeenCalled()
  })
})

describe('#guidanceViewer entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Should mount a viewer on each marked element', async () => {
    document.body.innerHTML = `
      <div data-module="guidance-viewer" id="one"></div>
      <div data-module="guidance-viewer" id="two"></div>
    `

    await importFresh('../../../src/client/javascripts/guidance-viewer.js')

    expect(mockMountViewer).toHaveBeenCalledTimes(2)
    expect(mockMountViewer.mock.calls.map(([el]) => el.id)).toEqual(['one', 'two'])
  })

  test('Should mount nothing on a page that has no viewer', async () => {
    document.body.innerHTML = '<div id="unrelated"></div>'

    await importFresh('../../../src/client/javascripts/guidance-viewer.js')

    expect(mockMountViewer).not.toHaveBeenCalled()
  })
})
