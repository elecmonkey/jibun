export const trimUrl = (value: string): string => {
  if (!value) {
    return ''
  }

  let url = value.trim()
  url = url.replace(/^\/+/, '')
  url = url.replace(/\/+$/, '')
  return url
}
