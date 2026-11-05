import { SkeletonBlock, Spinner } from '@/components/Loading'

export default function PresetsLoading() {
  return (
    <div className="presets-page">
      <Spinner label="Loading presets…" />
      <SkeletonBlock width={220} height={30} />
      <div className="panel presets-loading-bar">
        <SkeletonBlock width={120} height={32} />
        <SkeletonBlock width={120} height={32} />
        <SkeletonBlock width={180} height={32} />
      </div>
      <div className="presets-split">
        <div className="presets-loading-col">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="panel">
              <SkeletonBlock width="70%" height={18} className="mb-sm" />
              <SkeletonBlock width="90%" height={14} className="mb-sm" />
              <SkeletonBlock width="50%" height={22} />
            </div>
          ))}
        </div>
        <div className="panel presets-loading-detail">
          <SkeletonBlock width="65%" height={24} />
          <SkeletonBlock height={16} count={3} gap="0.4rem" />
          <SkeletonBlock height={44} count={4} gap="0.5rem" />
        </div>
      </div>
    </div>
  )
}
