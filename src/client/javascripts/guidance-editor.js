import { mountGuidanceEditor } from './guidance-editor/mount.js'

// Called at the top level rather than left as a bare import for its side
// effects: package.json sets "sideEffects": false, so a bundle that only
// registered listeners could be tree-shaken away.
function initGuidanceEditors () {
  const textareas = document.querySelectorAll('[data-module="guidance-editor"]')

  for (const textarea of textareas) {
    mountGuidanceEditor(textarea)
  }
}

initGuidanceEditors()
