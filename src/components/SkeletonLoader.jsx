export function SkeletonKPI({ count = 4 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-24" />
              <div className="h-6 bg-gray-200 rounded w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
      <div className="bg-gray-50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-4 border-t border-gray-100 flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-gray-100 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <SkeletonKPI />
      <SkeletonTable />
    </div>
  );
}

export function SkeletonTodayBar() {
  return (
    <div className="bg-indigo-100 rounded-xl px-5 py-3 flex items-center gap-6 animate-pulse">
      <div className="h-3 bg-indigo-200 rounded w-10" />
      <div className="h-4 bg-indigo-200 rounded w-24" />
      <div className="h-4 bg-indigo-200 rounded w-24" />
      <div className="h-4 bg-indigo-200 rounded w-28" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-200 rounded w-48" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
      <div className="flex items-end gap-3 justify-center h-24">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded w-7"
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="h-3 bg-gray-100 rounded w-24" />
        <div className="h-3 bg-gray-100 rounded w-16" />
      </div>
    </div>
  );
}

export function SkeletonCollectionRate() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-20" />
        <div className="h-6 bg-gray-200 rounded w-16" />
        <div className="h-3 bg-gray-100 rounded w-14" />
      </div>
    </div>
  );
}

export function SkeletonOccupancy({ count = 4 }) {
  return (
    <div>
      <div className="h-5 bg-gray-200 rounded w-40 mb-3 animate-pulse" />
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${count} gap-4`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
            <div className="flex justify-between items-center mb-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-3 bg-gray-200 rounded w-12" />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="h-3 rounded-full bg-gray-300" style={{ width: '40%' }} />
            </div>
            <div className="flex justify-between mt-1">
              <div className="h-2 bg-gray-100 rounded w-16" />
              <div className="h-2 bg-gray-100 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="flex gap-2">
          <div className="h-9 bg-gray-200 rounded-lg w-32" />
          <div className="h-9 bg-gray-200 rounded-lg w-36" />
        </div>
      </div>
      {/* Today Bar */}
      <SkeletonTodayBar />
      {/* KPI Cards */}
      <SkeletonKPI count={4} />
      {/* Revenue Chart */}
      <SkeletonChart />
      {/* Collection Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCollectionRate />
      </div>
      {/* Occupancy */}
      <SkeletonOccupancy count={4} />
      {/* Active Sessions Table */}
      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}
