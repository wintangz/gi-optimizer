import { SkeletonBlock, Spinner } from '@/components/Loading'

export default function HomeLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Spinner label="Loading page…" />
      <SkeletonBlock width="45%" height={32} />
      <SkeletonBlock width="70%" height={18} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel">
            <SkeletonBlock width="60%" height={20} style={{ marginBottom: '0.6rem' }} />
            <SkeletonBlock height={14} count={2} gap="0.4rem" />
          </div>
        ))}
      </div>
    </div>
  )
}

