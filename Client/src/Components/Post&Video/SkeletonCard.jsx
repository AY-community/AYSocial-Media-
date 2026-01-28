import "../Components.css";

export const SkeletonCard = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-shimmer" />

      <div className="skeleton-content">
        <div className="skeleton-header">
          <div className="skeleton-avatar" />
          <div className="skeleton-header-text">
            <div className="skeleton-name" />
            <div className="skeleton-username" />
          </div>
        </div>

        <div className="skeleton-text-line skeleton-text-line-1" />
        <div className="skeleton-text-line skeleton-text-line-2" />

        <div className="skeleton-image" />

        <div className="skeleton-actions">
          <div className="skeleton-action" />
          <div className="skeleton-action" />
          <div className="skeleton-action" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonGrid = ({ count = 6 }) => {
  return (
    <div className="content-grid">
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <SkeletonCard key={`skeleton-${index}`} />
        ))}
    </div>
  );
};
