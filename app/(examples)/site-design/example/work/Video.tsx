'use client'

export default function Video({ asset }) {
  return (
    <div className='w-full aspect-square p-4' key={asset._id}>
      {asset.mimeType?.startsWith('video') ? (
        <video
          className='w-full h-full'
          muted
          loop
          src={asset.url}
          onMouseEnter={ev => {
            document.querySelectorAll('video').forEach(el => el.pause())
            // @ts-ignore
            ev.target.play()
          }}
        />
      ) : (
        <img className='w-full h-full' src={asset.url} />
      )}
    </div>
  )
}
