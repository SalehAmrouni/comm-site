import { NextResponse } from 'next/server'

// 1. Helper to extract Google Drive File ID from shared links
function extractGoogleDriveId(urlStr: string): string | null {
  const matchPath = urlStr.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (matchPath?.[1]) return matchPath[1]

  const matchQuery = urlStr.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (matchQuery?.[1]) return matchQuery[1]

  return null
}

// 2. Recursive Crawler that follows HTML pages, Google Drive warnings, & download buttons
async function crawlForZipStream(
  targetUrl: string,
  depth = 0,
  maxDepth = 3
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  if (depth >= maxDepth) return null

  try {
    let fetchUrl = targetUrl
    const driveId = extractGoogleDriveId(targetUrl)

    // Convert standard Google Drive view link to direct download link
    if (driveId && !targetUrl.includes('confirm=')) {
      fetchUrl = `https://drive.google.com/uc?export=download&id=${driveId}`
    }

    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,application/zip,application/x-zip-compressed,*/*;q=0.8',
      },
      redirect: 'follow',
    })

    if (!res.ok) return null

    const contentType = res.headers.get('content-type') || ''
    const buffer = await res.arrayBuffer()

    // CHECK MAGIC BYTES: Is this a valid ZIP archive? (Starts with 0x50 0x4B / 'PK')
    const magicHeader = new Uint8Array(buffer.slice(0, 2))
    const isZip = magicHeader[0] === 0x50 && magicHeader[1] === 0x4b

    if (isZip) {
      return { buffer, contentType: 'application/zip' }
    }

    // IF IT'S AN HTML PAGE (Google Drive warning page or file host page)
    if (contentType.includes('text/html')) {
      const html = new TextDecoder('utf-8').decode(buffer)

      // --- CASE A: Google Drive "Large File / Download Anyway" Confirmation Page ---
      if (driveId || html.includes('drive.google.com')) {
        // Look for confirmation tokens or action links in Google Drive HTML
        const confirmMatch =
          html.match(/href="(\/uc\?export=download[^"]+confirm=[^"]+)"/) ||
          html.match(/action="(https:\/\/drive\.google\.com\/uc[^"]+)"/) ||
          html.match(/confirm=([a-zA-Z0-9_-]+)/)

        if (confirmMatch) {
          let confirmUrl = ''
          if (confirmMatch[1].startsWith('/uc')) {
            confirmUrl = `https://drive.google.com${confirmMatch[1].replace(/&amp;/g, '&')}`
          } else if (confirmMatch[1].startsWith('http')) {
            confirmUrl = confirmMatch[1].replace(/&amp;/g, '&')
          } else {
            confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${driveId}`
          }

          const driveResult = await crawlForZipStream(confirmUrl, depth + 1, maxDepth)
          if (driveResult) return driveResult
        }
      }

      // --- CASE B: Crawl HTML for direct archive file links (.zip, .7z, .rar, .jar) ---
      const archiveLinkMatches = Array.from(
        html.matchAll(/href=["'](https?:\/\/[^"']+\.(zip|7z|rar|tar\.gz|jar)(\?[^"']*)?)["']/gi)
      ).map((m) => m[1])

      for (const link of archiveLinkMatches) {
        const crawled = await crawlForZipStream(link, depth + 1, maxDepth)
        if (crawled) return crawled
      }

      // --- CASE C: Crawl HTML for Download Buttons / Export Links ---
      const downloadButtonMatches = Array.from(
        html.matchAll(
          /href=["'](https?:\/\/[^"']*(download|export=download|file_download|get_file)[^"']*)["']/gi
        )
      ).map((m) => m[1])

      for (const link of downloadButtonMatches) {
        if (link !== targetUrl && link !== fetchUrl) {
          const crawled = await crawlForZipStream(link, depth + 1, maxDepth)
          if (crawled) return crawled
        }
      }
    }
  } catch (err) {
    console.error(`Crawler error at depth ${depth}:`, err)
  }

  return null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get('url')

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing "url" parameter' }, { status: 400 })
  }

  try {
    // Start crawling starting at depth 0 (up to 3 link hops)
    const result = await crawlForZipStream(targetUrl, 0, 3)

    if (!result) {
      return NextResponse.json(
        {
          error:
            'COULD NOT AUTOMATICALLY EXTRACT ZIP FILE. The page may require manual login, CAPTCHA, or contains no valid .zip file.',
        },
        { status: 422 }
      )
    }

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: `Inspection crawler failed: ${err.message}` },
      { status: 500 }
    )
  }
}