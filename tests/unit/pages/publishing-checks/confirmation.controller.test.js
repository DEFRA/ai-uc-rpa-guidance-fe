import { vi, describe, test, expect, beforeEach } from 'vitest'
import { constants as statusCodes } from 'node:http2'

const mockView = vi.fn()
const mockCode = vi.fn()

const mockToolkit = {
  view: mockView.mockReturnThis(),
  code: mockCode.mockReturnThis()
}

const buildRequest = (jobId = 'job-abc') => ({
  query: { jobId },
  logger: { error: vi.fn() }
})

describe('#getConfirmation', () => {
  let getConfirmation

  beforeEach(async () => {
    vi.clearAllMocks()
    mockView.mockReturnThis()
    mockCode.mockReturnThis()
    const module = await import(
      '../../../../src/pages/publishing-checks/confirmation/controller.js'
    )
    getConfirmation = module.getConfirmation
  })

  test('Should render confirmation page with 200', async () => {
    await getConfirmation(buildRequest(), mockToolkit)

    expect(mockView).toHaveBeenCalledWith(
      'publishing-checks/confirmation/page.njk',
      expect.objectContaining({ pageTitle: 'Publishing check started' })
    )
    expect(mockCode).toHaveBeenCalledWith(statusCodes.HTTP_STATUS_OK)
  })

  test('Should pass jobId to the view', async () => {
    await getConfirmation(buildRequest('job-xyz'), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.jobId).toBe('job-xyz')
  })

  test('Should set page to publishing-checks for nav highlighting', async () => {
    await getConfirmation(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.page).toBe('publishing-checks')
  })

  test('Should include breadcrumbs', async () => {
    await getConfirmation(buildRequest(), mockToolkit)

    const [, viewData] = mockView.mock.calls[0]
    expect(viewData.breadcrumbs).toContainEqual({
      text: 'Publishing checks',
      href: '/publishing-checks'
    })
  })
})
