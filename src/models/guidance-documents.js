class FetchDocumentOutcome {
  static success (document) { return new FetchDocumentOutcome(document, null) }
  static notFound () { return new FetchDocumentOutcome(null, 'not_found') }

  constructor (document, reason) {
    this.document = document
    this.reason = reason
  }

  get succeeded () { return this.reason === null }
}

/**
 * Result of saving an edit to a guidance section.
 *
 * `invalid` means the backend rejected the body that this app's own validation
 * accepted, so the two disagree — surfaced rather than thrown so the edit page
 * can put the user back in front of their work.
 */
class UpdateSectionOutcome {
  static success () { return new UpdateSectionOutcome(null) }
  static notFound () { return new UpdateSectionOutcome('not_found') }
  static invalid () { return new UpdateSectionOutcome('invalid') }

  constructor (reason) {
    this.reason = reason
  }

  get succeeded () { return this.reason === null }
}

export { FetchDocumentOutcome, UpdateSectionOutcome }
