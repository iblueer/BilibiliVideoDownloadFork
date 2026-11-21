import type { Page, VideoData } from '../../type'

export const highlightParts = (title: string, keyword: string): { text: string, match: boolean }[] => {
  const query = keyword.trim().toLocaleLowerCase()
  if (!query) return [{ text: title, match: false }]
  const lowerTitle = title.toLocaleLowerCase()
  const parts: { text: string, match: boolean }[] = []
  let start = 0
  let index = lowerTitle.indexOf(query, start)
  while (index !== -1) {
    if (index > start) parts.push({ text: title.slice(start, index), match: false })
    parts.push({ text: title.slice(index, index + query.length), match: true })
    start = index + query.length
    index = lowerTitle.indexOf(query, start)
  }
  if (start < title.length) parts.push({ text: title.slice(start), match: false })
  return parts
}

export const findCurrentPage = (video: VideoData): Page | undefined => {
  let url: URL
  try { url = new URL(video.url) } catch { return undefined }
  const episode = url.pathname.match(/\/ep(\d+)/)?.[1]
  if (episode) {
    const match = video.page.find(item => {
      try { return new URL(item.url).pathname.match(/\/ep(\d+)/)?.[1] === episode } catch { return false }
    })
    if (match) return match
  }
  const bvid = url.pathname.match(/\/video\/(BV[\w]+)/i)?.[1] || url.searchParams.get('bvid') || video.bvid
  const matchingVideos = video.page.filter(item => item.bvid && item.bvid.toLowerCase() === bvid?.toLowerCase())
  if (matchingVideos.length === 1) return matchingVideos[0]
  if (matchingVideos.length > 1) {
    const pageNumber = url.searchParams.get('p') || '1'
    return matchingVideos.find(item => {
      try { return (new URL(item.url).searchParams.get('p') || '1') === pageNumber } catch { return false }
    })
  }
  return video.page.find(item => item.cid === video.cid)
}
