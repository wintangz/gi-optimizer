import { SkeletonBlock, Spinner } from '@/components/Loading'

export default function TeamsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Spinner label="Loading team builder…" />
      <SkeletonBlock width={280} height={30} />
      <div className="panel" style={{ display: 'flex', gap: '0.75rem' }}>
        <SkeletonBlock width={160} height={34} />
        <SkeletonBlock width={160} height={34} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr minmax(300px, 380px)',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="panel">
            <SkeletonBlock width="50%" height={20} style={{ marginBottom: '0.6rem' }} />
            <SkeletonBlock height={36} count={2} gap="0.5rem" />
          </div>
          <div className="panel">
            <SkeletonBlock width="45%" height={20} style={{ marginBottom: '0.6rem' }} />
            <SkeletonBlock height={90} count={4} gap="0.6rem" />
          </div>
        </div>
        <div className="panel">
          <SkeletonBlock width="60%" height={20} style={{ marginBottom: '0.75rem' }} />
          <SkeletonBlock height={60} style={{ marginBottom: '0.75rem' }} />
          <SkeletonBlock height={28} count={5} gap="0.45rem" />
        </div>
      </div>
    </div>
  )
}

