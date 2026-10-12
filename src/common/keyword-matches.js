// How a keyword search matches, shared by the search of every guide (which
// counts the matches in each section) and a guide page's own search (which
// highlights them), so a result opens on the matches it counted.
//
// One word matches as a whole word; several words match as that whole
// phrase, with any space or line break between them. Neither minds case.

/**
 * A search as the term to find: its words in lower case, one space between.
 *
 * @param {string} text
 * @returns {string}
 */
function searchTermOf (text) {
  return text.toLowerCase().split(/\s+/).filter(Boolean).join(' ')
}

// Letters (of any alphabet) and digits make up words; anything else ends one.
function isWordCharacter (character) {
  return character !== undefined &&
    (character.toLowerCase() !== character.toUpperCase() || (character >= '0' && character <= '9'))
}

function isSpace (character) {
  return character !== undefined && character.trim() === ''
}

/**
 * Where the term's words come in order from a place in the text, with space
 * between them: the end of the last word, or -1 if they don't.
 *
 * @param {string} lower The text, in lower case.
 * @param {number} at
 * @param {string[]} words
 * @returns {number}
 */
function phraseEnd (lower, at, words) {
  let position = at

  for (const [index, word] of words.entries()) {
    if (index > 0) {
      if (!isSpace(lower[position])) {
        return -1
      }
      while (isSpace(lower[position])) {
        position += 1
      }
    }

    if (!lower.startsWith(word, position)) {
      return -1
    }
    position += word.length
  }

  return position
}

/**
 * Every match of a search term in a text, as [start, end) ranges in order.
 *
 * @param {string} text
 * @param {string} term As searchTermOf gives it.
 * @returns {Array<[number, number]>}
 */
function matchesIn (text, term) {
  const words = term.split(' ').filter(Boolean)
  const lower = text.toLowerCase()
  const matches = []

  if (!words.length) {
    return matches
  }

  let at = lower.indexOf(words[0])

  while (at !== -1) {
    const end = isWordCharacter(lower[at - 1]) ? -1 : phraseEnd(lower, at, words)
    const matched = end !== -1 && !isWordCharacter(lower[end])

    if (matched) {
      matches.push([at, end])
    }
    at = lower.indexOf(words[0], matched ? end : at + 1)
  }

  return matches
}

export {
  matchesIn,
  searchTermOf
}
