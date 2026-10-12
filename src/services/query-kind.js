// Words a question to the guidance starts with: asking words, and the verbs
// a yes-or-no question starts with.
const QUESTION_WORDS = new Set([
  'how', 'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why',
  'am', 'is', 'are', 'was', 'were',
  'do', 'does', 'did', 'has', 'have', 'had',
  'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might', 'must'
])

/**
 * A guess at whether a search is a question the AI search can answer, rather
 * than words to find: it ends with a question mark, or it starts with a
 * question word and goes on past it.
 *
 * @param {string} query
 * @returns {boolean}
 */
function isQuestion (query) {
  const text = query.trim()
  const words = text.toLowerCase().split(/\s+/)

  return text.endsWith('?') || (words.length > 1 && QUESTION_WORDS.has(words[0]))
}

export {
  isQuestion
}
