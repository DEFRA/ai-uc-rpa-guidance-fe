import * as govukFrontend from 'govuk-frontend'

import { followRebuildProgress } from './rebuild-progress/follow.js'
import { trapFindShortcut } from './search-shortcut/trap.js'

govukFrontend.initAll()

// Each is a no-op on a page without the element marked for it.
trapFindShortcut(document, document.querySelector('[data-module="search-shortcut"]'))
followRebuildProgress(document.querySelector('[data-module="rebuild-progress"]'))
