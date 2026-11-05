import { ResultsSkeleton, SkeletonBlock, Spinner } from '@/components/Loading'

export default function OptimizeLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Spinner label="Loading optimizer…" />
      <SkeletonBlock width={320} height={30} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="panel">
            <SkeletonBlock width="60%" height={20} style={{ marginBottom: '0.75rem' }} />
            <SkeletonBlock height={36} style={{ marginBottom: '0.75rem' }} />
            <SkeletonBlock height={80} />
          </div>
          <div className="panel">
            <SkeletonBlock width="65%" height={20} style={{ marginBottom: '0.75rem' }} />
            <SkeletonBlock height={32} count={5} gap="0.6rem" />
          </div>
        </div>
        <ResultsSkeleton label="Loading optimizer engine…" />
      </div>
    </div>
  )
}

