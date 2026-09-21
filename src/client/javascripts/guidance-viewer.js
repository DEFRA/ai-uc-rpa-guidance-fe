import { mountGuidanceViewer } from './guidance-viewer/mount.js'

// Called at the top level rather than left as a bare import for its side
// effects: package.json sets "sideEffects": false, so a bundle that only
// rendered on load could be tree-shaken away.
function initGuidanceViewers () {
  const containers = document.querySelectorAll('[data-module="guidance-viewer"]')

  for (const container of containers) {
    mountGuidanceViewer(container)
  }
}

initGuidanceViewers()
