/* eslint-disable @next/next/no-img-element */
export function EventBanner({ imageUrl, title, className = "" }: { imageUrl: string | null; title: string; className?: string }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={title} className={`w-full object-cover ${className}`} />;
  }
  return (
    <div
      aria-hidden
      className={`w-full bg-gradient-to-br from-saffron-400 via-saffron-600 to-saffron-800 flex items-center justify-center ${className}`}
    >
      <span className="text-white/25 text-7xl font-serif select-none">ॐ</span>
    </div>
  );
}
