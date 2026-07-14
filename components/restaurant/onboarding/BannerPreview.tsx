interface BannerPreviewProps {
  bannerUrl?: string;
  restaurantName?: string;
  category?: string;
}

export default function BannerPreview({ bannerUrl, restaurantName, category }: BannerPreviewProps) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--gray)' }}>
        How customers will see it
      </p>
      <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        <div
          className="h-[110px] w-full flex items-end p-3"
          style={{
            background: bannerUrl ? `url(${bannerUrl}) center/cover no-repeat` : 'var(--peach)',
          }}
        >
          {!bannerUrl && (
            <span className="text-[11px] mx-auto mb-2" style={{ color: 'var(--gray)' }}>
              Banner preview appears here
            </span>
          )}
        </div>
        <div className="p-3" style={{ background: 'var(--white)' }}>
          <p className="text-[13.5px] font-semibold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {restaurantName || 'Your restaurant name'}
          </p>
          <p className="text-[11.5px]" style={{ color: 'var(--gray)' }}>
            {category || 'Category'} · Delivery in 25–40 min
          </p>
        </div>
      </div>
    </div>
  );
}
