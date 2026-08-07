import { NextResponse } from 'next/server'

// Transforms share links (Google Drive, Dropbox, OneDrive) into direct download streams
function getDirectDownloadUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr)

    // Google Drive conversion
    if (url.hostname.includes('drive.google.com')) {
      const match = urlStr.match(/\/d\/([a-zA-Z0-9_-]+)/)
      if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`
      }
    }

    // Dropbox conversion
    if (url.hostname.includes('dropbox.com')) {
      return urlStr
        .replace('dl=0', 'dl=1')
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
    }

    // OneDrive conversion
    if (url.hostname.includes('onedrive.live.com') || url.hostname.includes('1drv.ms')) {
      return urlStr.replace('view.aspx', 'download.aspx').replace('redir?', 'download?')
    }

    return urlStr
  } catch {
    return urlStr
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get('url')

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing "url" parameter' }, { status: 400 })
  }

  try {
    const directUrl = getDirectDownloadUrl(targetUrl)

    // Fetch server-to-server (bypasses browser CORS completely)
    const response = await fetch(directUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Remote server returned HTTP ${response.status}.` },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || ''

    // If the server returns HTML instead of binary file data (e.g., NexusMods or MediaFire landing page)
    if (contentType.includes('text/html')) {
      return NextResponse.json(
        {
          error:
            'This link leads to an external web page (like a download page) rather than a direct archive file stream.',
        },
        { status: 422 }
      )
    }

    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to retrieve file stream: ${err.message}` },
      { status: 500 }
    )
  }
}