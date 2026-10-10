/**
 * Send the browser's find shortcut, Ctrl-F (Cmd-F on a Mac), to a search box.
 *
 * On a page whose search reads every guide, the browser's own find would only
 * search the page, so the shortcut puts the reader in the search box instead,
 * with what they last searched for selected to type over.
 *
 * @param {Document} doc
 * @param {HTMLInputElement | null} input The search box, or null for none.
 * @returns {() => void} Stops trapping the shortcut.
 */
function trapFindShortcut (doc, input) {
  if (!input) {
    return () => {}
  }

  const onKeydown = (event) => {
    const modified = event.ctrlKey || event.metaKey

    if (!modified || event.altKey || event.key.toLowerCase() !== 'f') {
      return
    }

    event.preventDefault()
    input.focus()
    input.select()
  }

  doc.addEventListener('keydown', onKeydown)

  return () => doc.removeEventListener('keydown', onKeydown)
}

export {
  trapFindShortcut
}
