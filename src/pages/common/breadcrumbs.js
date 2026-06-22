const homeCrumb = { text: 'Home', href: '/' }

const guidanceDocumentsBreadcrumbs = () => [
  homeCrumb,
  { text: 'Guidance documents', href: '/guidance-documents' }
]

const publishingChecksBreadcrumbs = () => [
  homeCrumb,
  { text: 'Publishing checks', href: '/publishing-checks' }
]

export { homeCrumb, guidanceDocumentsBreadcrumbs, publishingChecksBreadcrumbs }
