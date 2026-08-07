'use client'

import React, { useState, useEffect } from 'react'
import JSZip from 'jszip'

interface FileItem {
  name: string
  isDir: boolean
  extension: string
  isSuspicious: boolean
}

interface ModInspectorModalProps {
  isOpen: boolean
  onClose: () => void
  fileUrl: string
  modTitle: string
}

const SUSPICIOUS_EXTENSIONS = ['exe', 'bat', 'cmd', 'vbs', 'ps1', 'scr', 'jar', 'dll', 'sys', 'iso', 'msi']

export default function ModInspectorModal({
  isOpen,
  onClose,
  fileUrl,
  modTitle,
}: ModInspectorModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState<FileItem[]>([])
  const [zipInstance, setZipInstance] = useState<JSZip | null>(null)

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    if (!isOpen || !fileUrl) return

    async function inspectArchive() {
      setLoading(true)
      setError('')
      setFiles([])
      setSelectedFileName(null)
      setFileContent(null)

      try {
        // Fetch via server-side API proxy to bypass CORS and resolve links
        const proxyUrl = `/api/inspect-mod?url=${encodeURIComponent(fileUrl)}`
        const res = await fetch(proxyUrl)

        if (!res.ok) {
          const errData = await res.json().catch(() => null)
          throw new Error(errData?.error || `Server responded with status ${res.status}`)
        }

        const arrayBuffer = await res.arrayBuffer()
        const zip = new JSZip()
        const loadedZip = await zip.loadAsync(arrayBuffer)
        setZipInstance(loadedZip)

        const fileList: FileItem[] = []

        loadedZip.forEach((relativePath, zipEntry) => {
          const ext = relativePath.split('.').pop()?.toLowerCase() || ''
          const isSuspicious = SUSPICIOUS_EXTENSIONS.includes(ext)

          fileList.push({
            name: relativePath,
            isDir: zipEntry.dir,
            extension: ext,
            isSuspicious,
          })
        })

        setFiles(fileList)
      } catch (err: any) {
        console.error('Inspector error:', err)
        setError(
          err.message || 'UNABLE TO PEEK INSIDE THIS MOD. Ensure the URL is a direct file link.'
        )
      } finally {
        setLoading(false)
      }
    }

    inspectArchive()
  }, [isOpen, fileUrl])

  const handleSelectFile = async (file: FileItem) => {
    if (file.isDir || !zipInstance) return

    setSelectedFileName(file.name)
    setLoadingContent(true)
    setFileContent(null)

    try {
      const zipFile = zipInstance.file(file.name)
      if (!zipFile) {
        setFileContent('[ Could not read file entry ]')
        return
      }

      const textExtensions = ['txt', 'json', 'lua', 'js', 'ts', 'py', 'xml', 'html', 'css', 'ini', 'cfg', 'md', 'yml', 'yaml']
      if (textExtensions.includes(file.extension)) {
        const text = await zipFile.async('string')
        setFileContent(text.slice(0, 10000) + (text.length > 10000 ? '\n\n... [ TRUNCATED: FILE TOO LARGE ]' : ''))
      } else {
        setFileContent(`[ BINARY FILE (.${file.extension.toUpperCase()}) - CANNOT BE PREVIEWED AS RAW TEXT ]`)
      }
    } catch (err: any) {
      setFileContent(`[ ERROR READING FILE: ${err.message} ]`)
    } finally {
      setLoadingContent(false)
    }
  }

  if (!isOpen) return null

  const suspiciousCount = files.filter((f) => f.isSuspicious).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-black border-4 border-white p-6 flex flex-col shadow-[12px_12px_0px_0px_#ffffff] overflow-hidden text-white">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-white pb-3 mb-4">
          <div>
            <h2 className="text-lg font-black uppercase text-yellow-400">
              🔍 MOD INSPECTOR: {modTitle}
            </h2>
            <p className="text-[10px] text-neutral-400 uppercase">
              Inspect contents before downloading
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white text-black font-bold text-xs uppercase hover:bg-neutral-300 border border-white"
          >
            [ CLOSE ✖ ]
          </button>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="py-20 text-center animate-pulse">
            <p className="text-sm font-bold uppercase">[ FETCHING ARCHIVE & UNPACKING FILES... ]</p>
          </div>
        )}

        {error && (
          <div className="p-4 border-2 border-red-500 bg-neutral-900 text-red-400 text-xs font-bold uppercase my-auto">
            ⚠️ {error}
          </div>
        )}

        {/* File Browser */}
        {!loading && !error && (
          <div className="flex flex-col flex-1 overflow-hidden gap-4">
            
            {/* Risk Indicator */}
            {suspiciousCount > 0 ? (
              <div className="p-2 border-2 border-red-500 bg-red-950/40 text-red-400 text-xs font-bold uppercase flex items-center justify-between">
                <span>⚠️ WARNING: FOUND {suspiciousCount} EXECUTABLE / POTENTIALLY RISKY FILE(S)</span>
                <span className="text-[10px] bg-red-500 text-black px-1.5 py-0.5 font-black">HIGH CAUTION</span>
              </div>
            ) : (
              <div className="p-2 border-2 border-green-500 bg-green-950/40 text-green-400 text-xs font-bold uppercase">
                ✅ NO DIRECT EXECUTABLE SCRIPTS (.EXE, .BAT) DETECTED
              </div>
            )}

            {/* Split View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
              
              {/* File List */}
              <div className="border-2 border-white bg-neutral-950 p-3 overflow-y-auto max-h-96 text-xs">
                <p className="text-neutral-500 uppercase border-b border-neutral-800 pb-1 mb-2 font-bold">
                  ARCHIVE CONTENTS ({files.length} FILES)
                </p>
                {files.length === 0 ? (
                  <p className="text-neutral-500">[ EMPTY ARCHIVE ]</p>
                ) : (
                  <ul className="space-y-1">
                    {files.map((file, idx) => (
                      <li key={idx}>
                        <button
                          onClick={() => handleSelectFile(file)}
                          disabled={file.isDir}
                          className={`w-full text-left truncate px-2 py-1 border text-[11px] font-bold uppercase flex items-center justify-between transition-colors ${
                            selectedFileName === file.name
                              ? 'bg-white text-black border-white'
                              : file.isSuspicious
                              ? 'border-red-500/50 bg-red-950/20 text-red-400 hover:bg-red-900/30'
                              : 'border-transparent text-neutral-300 hover:bg-neutral-800'
                          }`}
                        >
                          <span className="truncate">
                            {file.isDir ? '📁 ' : '📄 '}
                            {file.name}
                          </span>
                          {file.isSuspicious && (
                            <span className="ml-2 text-[9px] bg-red-500 text-black font-black px-1">
                              EXE/SCRIPT
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Code Preview */}
              <div className="border-2 border-white bg-black p-3 overflow-y-auto max-h-96 flex flex-col">
                <p className="text-neutral-500 text-xs uppercase border-b border-neutral-800 pb-1 mb-2 font-bold truncate">
                  PREVIEW: {selectedFileName || '[ SELECT A FILE TO INSPECT ]'}
                </p>

                {loadingContent ? (
                  <p className="text-xs text-yellow-400 animate-pulse my-auto text-center">
                    [ READING FILE CONTENTS... ]
                  </p>
                ) : fileContent ? (
                  <pre className="text-[11px] text-green-400 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto bg-neutral-950 p-2 border border-neutral-800 flex-1">
                    {fileContent}
                  </pre>
                ) : (
                  <div className="my-auto text-center text-neutral-600 text-xs uppercase font-bold">
                    CLICK ANY CODE OR TEXT FILE ON THE LEFT TO INSPECT SOURCE CODE
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}