export const ExtensionType = {
  MUSIC: 'MUSIC',
  VIDEO: 'VIDEO',
  GITHUBPROJ: 'GITHUBPROJ',
  WEBSITE: 'WEBSITE',
} as const

export type ExtensionType = (typeof ExtensionType)[keyof typeof ExtensionType]
