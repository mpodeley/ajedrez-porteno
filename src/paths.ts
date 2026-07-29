export const normalizeBase = (base: string): string => {
  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

export const stlAssetUrl = (base: string, file: string): string =>
  `${normalizeBase(base)}stl/${encodeURIComponent(file)}`

export const zipAssetUrl = (base: string, file: string): string =>
  `${normalizeBase(base)}downloads/${encodeURIComponent(file)}`
