class StartUploadOutcome {
  static success (uploadId, apiResponse) { return new StartUploadOutcome(uploadId, null, apiResponse) }

  constructor (uploadId, reason, apiResponse) {
    this.uploadId = uploadId
    this.reason = reason
    this._apiResponse = apiResponse
  }

  get succeeded () { return this.reason === null }
}

export { StartUploadOutcome }
