import { NextResponse } from 'next/server'

// Resolve popular file hosting share links directly to raw file URLs
async function resolveDirectDownloadUrl(initialUrl: string): Promise<string> {
  try {
    const url = new URL(initialUrl)

    // 1. Google Drive
    if (url.hostname.includes('drive.google.com')) {
      const match = initialUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)
      if (match?.[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`
      }
    }

    // 2. Dropbox
    if (url.hostname.includes('dropbox.com')) {
      return initialUrl.replace('dl=0', 'dl=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com')
    }

    // 3. Pixeldrain
    if (url.hostname.includes('pixeldrain.com')) {
      const match = url.pathname.match(/\/u\/([a-zA-Z0-9]+)/)
      if (match?.[1]) {
        return `https://pixeldrain.com/api/file/${match[1]}`
      }
    }

    // 4. MediaFire Page Resolution
    if (url.hostname.includes('mediafire.com')) {
      const pageRes = await fetch(initialUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })
      const html = await pageRes.text()
      const mediafireMatch = html.match(/href="(https?:\/\/download\d+\.mediafire\.com\/[^"]+)"/)
      if (mediafireMatch?.[1]) {
        return mediafireMatch[1]
      }
    }

    return initialUrl
  } catch {
    return initialUrl
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get('url')

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing "url" parameter' }, { status: 400 })
  }

  try {
    let directUrl = await resolveDirectDownloadUrl(targetUrl)

    let response = await fetch(directUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Remote host returned HTTP status ${response.status}.` },
        { status: response.status }
      )
    }

    let contentType = response.headers.get('content-type') || ''

    // IF THE LINK LEADS TO AN HTML WEB PAGE (Landing page / File host page)
    if (contentType.includes('text/html')) {
      const htmlText = await response.text()

      // Automatically search the webpage HTML for direct archive file links (.zip, .7z, .rar, .jar)
      const archiveLinkMatch = htmlText.match(
        /href=["'](https?:\/\/[^"']+\.(zip|7z|rar|tar\.gz|jar|nupkg)[^"']*)["']/i
      )

      if (archiveLinkMatch?.[1]) {
        const extractedZipUrl = archiveLinkMatch[1]
        response = await fetch(extractedZipUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          redirect: 'follow',
        })
        contentType = response.headers.get('content-type') || ''
      } else {
        return NextResponse.json(
          {
            error:
              'THIS LINK LEADS TO A WEBPAGE (E.G., YOUTUBE OR PAGE WITH NO DOWNLOADS) RATHER THAN A MOD ARCHIVE FILE.',
          },
          { status: 422 }
        )
      }
    }

    const buffer = await response.arrayBuffer()

    // Validate PK Zip Magic Byte Header (0x50 0x4B)
    const header = new Uint8Array(buffer.slice(0, 2))
    const isZipArchive = header[0] === 0x50 && header[1] === 0x4b

    if (!isZipArchive && !contentType.includes('zip') && !contentType.includes('octet-stream')) {
      return NextResponse.json(
        { error: 'THE FILE AT THIS LINK IS NOT A VALID .ZIP ARCHIVE.' },
        { status: 422 }
      )
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to inspect file stream: ${err.message}` },
      { status: 500 }
    )
  }
}