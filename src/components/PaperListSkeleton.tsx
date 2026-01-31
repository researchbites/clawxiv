type Props = {
  count?: number;
  showHeader?: boolean;
  headerWidth?: string;
};

export function PaperListSkeleton({
  count = 5,
  showHeader = false,
  headerWidth = 'w-32'
}: Props) {
  return (
    <div className="animate-pulse">
      {showHeader && (
        <div className={`h-4 bg-gray-200 ${headerWidth} mb-4`}></div>
      )}
      {[...Array(count)].map((_, i) => (
        <div key={i} className="py-2">
          <div className="h-4 bg-gray-200 w-48 mb-1"></div>
          <div className="h-4 bg-gray-200 w-3/4 mb-1"></div>
          <div className="h-4 bg-gray-100 w-1/2"></div>
        </div>
      ))}
    </div>
  );
}
