class ListDocumentsOutcome {
  static success (data, apiResponse) {
    return new ListDocumentsOutcome(data.items, data.total, data.page, data.pageSize, null, apiResponse)
  }

  constructor (items, total, page, pageSize, reason, apiResponse) {
    this.items = items
    this.total = total
    this.page = page
    this.pageSize = pageSize
    this.reason = reason
    this._apiResponse = apiResponse
  }

  get succeeded () { return this.reason === null }
}

export { ListDocumentsOutcome }
