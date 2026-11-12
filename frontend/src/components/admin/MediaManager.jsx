import { useRef, useState } from 'react'
import { adminApi } from '../../api/admin'
import { inputClass } from '../ui/Field'
import { readError } from '../../lib/authHelpers'

// Cloudinary free-plan upload limits
const MAX_IMAGE_MB = 10
const MAX_VIDEO_MB = 100

/**
 * Photos & videos for a product. Files go straight from the browser to Cloudinary using a
 * short-lived signature from our server; the first photo is the cover on the shop.
 */
export default function MediaManager({ media, onChange, error }) {
  const inputRef = useRef(null)
  const [uploads, setUploads] = useState([]) // [{ name, progress, error }]
  const [notice, setNotice] = useState(null)

  async function uploadFiles(files) {
    setNotice(null)
    let signature
    try {
      signature = await adminApi.mediaSignature()
    } catch (err) {
      setNotice(readError(err).message)
      return
    }
    const added = []
    for (const file of files) {
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')
      const limit = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB
      if (!isVideo && !isImage) {
        setUploads((u) => [...u, { name: file.name, error: 'Not a photo or video' }])
        continue
      }
      if (file.size > limit * 1024 * 1024) {
        setUploads((u) => [...u, { name: file.name, error: `Larger than ${limit} MB` }])
        continue
      }
      setUploads((u) => [...u, { name: file.name, progress: 0 }])
      try {
        const result = await send(file, signature, (progress) =>
          setUploads((u) => u.map((x) => (x.name === file.name ? { ...x, progress } : x)))
        )
        added.push({
          type: result.resource_type === 'video' ? 'video' : 'image',
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          alt: '',
        })
        setUploads((u) => u.filter((x) => x.name !== file.name))
      } catch (err) {
        setUploads((u) => u.map((x) => (x.name === file.name ? { ...x, error: err.message } : x)))
      }
    }
    if (added.length) onChange([...media, ...added])
  }

  const move = (i, by) => {
    const next = [...media]
    const [item] = next.splice(i, 1)
    next.splice(i + by, 0, item)
    onChange(next)
  }
  const remove = (i) => onChange(media.filter((_, j) => j !== i))
  const setAlt = (i, alt) => onChange(media.map((m, j) => (j === i ? { ...m, alt } : m)))

  return (
    <div>
      {media.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m, i) => (
            <li key={m.publicId || m.url} className="overflow-hidden rounded-none border border-line bg-field">
              <div className="relative aspect-square bg-ink/10">
                {m.type === 'video' ? (
                  <video src={m.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                ) : (
                  <img src={m.url} alt={m.alt || ''} className="h-full w-full object-cover" loading="lazy" />
                )}
                {i === media.findIndex((x) => x.type === 'image') && (
                  <span className="absolute left-2 top-2 rounded-none bg-brand-forest-950/80 px-2.5 py-1 text-xs text-brand-linen-100">Cover</span>
                )}
                {m.type === 'video' && <span className="absolute right-2 top-2 rounded-none bg-brand-forest-950/80 px-2.5 py-1 text-xs text-brand-linen-100">Video</span>}
              </div>
              <div className="space-y-2 p-2.5">
                <label className="sr-only" htmlFor={`alt-${i}`}>
                  Description for screen readers
                </label>
                <input id={`alt-${i}`} value={m.alt || ''} onChange={(e) => setAlt(i, e.target.value)} placeholder="Describe the photo" maxLength={200} className="h-9 w-full rounded-none border border-line px-2.5 text-[13px]" />
                <div className="flex justify-between text-[13px]">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier" className="rounded-none px-2 py-1 hover:bg-ink/5 disabled:opacity-30">
                      Earlier
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === media.length - 1} aria-label="Move later" className="rounded-none px-2 py-1 hover:bg-ink/5 disabled:opacity-30">
                      Later
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(i)} className="rounded-none px-2 py-1 text-danger hover:bg-danger/10">
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div
        className="mt-4 rounded-none border border-dashed border-line px-4 py-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          uploadFiles([...e.dataTransfer.files])
        }}
      >
        <p className="text-sm text-muted">Drag photos or videos here, or</p>
        <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 rounded-none border border-line px-5 py-2.5 text-sm font-medium hover:border-ink">
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => {
            uploadFiles([...e.target.files])
            e.target.value = ''
          }}
        />
        <p className="mt-3 text-[13px] text-muted">
          Photos up to {MAX_IMAGE_MB} MB, videos up to {MAX_VIDEO_MB} MB. The first photo is the cover.
        </p>
      </div>

      {uploads.length > 0 && (
        <ul className="mt-3 space-y-1 text-[13px]" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.name} className={u.error ? 'text-danger' : 'text-muted'}>
              {u.name}: {u.error || `uploading ${u.progress}%`}
            </li>
          ))}
        </ul>
      )}
      {(notice || error) && <p className="mt-3 text-[13px] text-danger">{notice || error}</p>}
      <DevUrlFallback onAdd={(item) => onChange([...media, item])} show={Boolean(notice)} />
    </div>
  )
}

/** Upload with progress (fetch has no upload progress, so XHR). */
function send(file, sig, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('api_key', sig.apiKey)
    form.append('timestamp', sig.timestamp)
    form.append('signature', sig.signature)
    form.append('folder', sig.folder)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', sig.uploadUrl)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) resolve(body)
        else reject(new Error(body.error?.message || 'Upload failed'))
      } catch {
        reject(new Error('Upload failed'))
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(form)
  })
}

/** Local development without Cloudinary: add an image by path (e.g. /media/stones/yellow-last.webp). */
function DevUrlFallback({ onAdd, show }) {
  const [url, setUrl] = useState('')
  if (!show || !import.meta.env.DEV) return null
  return (
    <div className="mt-3 flex gap-2">
      <label htmlFor="dev-media-url" className="sr-only">
        Image path
      </label>
      <input id="dev-media-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Dev only: /media/... or https://..." className={inputClass} />
      <button
        type="button"
        onClick={() => {
          if (url.trim()) onAdd({ type: /\.(mp4|webm)$/i.test(url) ? 'video' : 'image', url: url.trim(), alt: '' })
          setUrl('')
        }}
        className="shrink-0 rounded-none border border-line px-5 text-sm font-medium"
      >
        Add
      </button>
    </div>
  )
}
