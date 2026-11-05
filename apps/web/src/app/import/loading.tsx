import { SkeletonBlock, Spinner } from '@/components/Loading'

export default function ImportLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Spinner label="Loading GOOD importer…" />
      <SkeletonBlock width={260} height={30} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="panel">
          <SkeletonBlock width={180} height={20} style={{ marginBottom: '0.75rem' }} />
          <SkeletonBlock height={90} />
        </div>
        <div className="panel">
          <SkeletonBlock width={180} height={20} style={{ marginBottom: '0.75rem' }} />
          <SkeletonBlock height={120} />
        </div>
      </div>
      <div className="panel">
        <SkeletonBlock width={220} height={22} style={{ marginBottom: '0.75rem' }} />
        <SkeletonBlock height={36} count={6} gap="0.45rem" />
      </div>
    </div>
  )
}

