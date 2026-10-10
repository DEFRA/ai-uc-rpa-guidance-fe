import * as govukFrontend from 'govuk-frontend'

import { fitOutlineToWindow, highlightSectionInView, revealCurrentStep } from './guide-outline/highlight.js'
import { followRebuildProgress } from './rebuild-progress/follow.js'
import { trapFindShortcut } from './search-shortcut/trap.js'

govukFrontend.initAll()

// Each is a no-op on a page without the element marked for it.
trapFindShortcut(document, document.querySelector('[data-module="search-shortcut"]'))
followRebuildProgress(document.querySelector('[data-module="rebuild-progress"]'))

// A guide's outline: fitted to the window first, so the rest see the panel at
// the height it will show.
const guideOutline = document.querySelector('[data-module="guide-outline"]')
const guideStepOutline = document.querySelector('[data-module="guide-step-outline"]')
fitOutlineToWindow(guideOutline ?? guideStepOutline)
highlightSectionInView(guideOutline)
revealCurrentStep(guideStepOutline)
