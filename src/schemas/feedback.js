import Joi from 'joi'

import { FEEDBACK_VERDICTS } from '../constants/feedback.js'

const FEEDBACK_COMMENT_MAX_LENGTH = 500

/**
 * Validates the payload of a POST feedback request submitted from a finding
 * detail page. Shared between the content-review and publishing-checks
 * routers so both apply identical rules.
 */
const feedbackPayloadSchema = Joi.object({
  verdict: Joi.string()
    .valid(...FEEDBACK_VERDICTS)
    .required(),
  comment: Joi.string()
    .trim()
    .max(FEEDBACK_COMMENT_MAX_LENGTH)
    .allow('', null)
    .optional()
})

export {
  feedbackPayloadSchema,
  FEEDBACK_COMMENT_MAX_LENGTH
}
