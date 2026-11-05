import { SkeletonBlock, Spinner } from '@/components/Loading'

export default function PresetsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Spinner label="Loading presets…" />
      <SkeletonBlock width={220} height={30} />
      <div className="panel" style={{ display: 'flex', gap: '0.75rem' }}>
        <SkeletonBlock width={120} height={32} />
        <SkeletonBlock width={120} height={32} />
        <SkeletonBlock width={180} height={32} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 380px) 1fr',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="panel">
              <SkeletonBlock width="70%" height={18} style={{ marginBottom: '0.5rem' }} />
              <SkeletonBlock width="90%" height={14} style={{ marginBottom: '0.5rem' }} />
              <SkeletonBlock width="50%" height={22} />
            </div>
          ))}
        </div>
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SkeletonBlock width="65%" height={24} />
          <SkeletonBlock height={16} count={3} gap="0.4rem" />
          <SkeletonBlock height={44} count={4} gap="0.5rem" />
        </div>
      </div>
    </div>
  )
}

