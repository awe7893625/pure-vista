import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { StarRating } from '@/components/ui/StarRating'
import { formatCurrency } from '@/lib/utils'

export interface CleanerCardProps {
  id: string
  displayName: string
  avatarUrl?: string | null
  serviceCategories: string[]
  rating: number
  reviewCount: number
  startingPrice: number
  location: string
}

export function CleanerCard({
  id,
  displayName,
  avatarUrl,
  serviceCategories,
  rating,
  reviewCount,
  startingPrice,
  location,
}: CleanerCardProps) {
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <Link
      href={`/cleaners/${id}`}
      className="group block bg-white rounded-2xl border border-[#E8EDE6] hover:shadow-md transition-shadow duration-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:ring-offset-2"
      aria-label={`查看 ${displayName} 的清潔師資料`}
    >
      <div className="p-6">
        {/* Avatar + Name row */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={`${displayName} 的頭像`}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#E8EDE6]"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full bg-[#8FAD82]/15 border-2 border-[#8FAD82]/20 flex items-center justify-center"
                aria-hidden="true"
              >
                <span className="text-xl font-semibold text-[#8FAD82]">
                  {initial}
                </span>
              </div>
            )}
          </div>

          {/* Name + location */}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-[#1A1A1A] truncate leading-snug">
              {displayName}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <svg
                className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-xs text-[#9CA3AF] truncate">{location}</span>
            </div>
          </div>
        </div>

        {/* Service category badges */}
        {serviceCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {serviceCategories.slice(0, 3).map((cat) => (
              <Badge key={cat} variant="default">
                {cat}
              </Badge>
            ))}
            {serviceCategories.length > 3 && (
              <Badge variant="default">+{serviceCategories.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Rating + review count */}
        <div className="flex items-center gap-2 mb-4">
          <StarRating rating={rating} size="sm" />
          <span className="text-xs font-medium text-[#1A1A1A]">
            {rating.toFixed(1)}
          </span>
          <span className="text-xs text-[#9CA3AF]">
            ({reviewCount.toLocaleString('zh-TW')} 則評論)
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-[#E8EDE6] my-4" />

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-[#9CA3AF]">服務起價</span>
            <p className="text-base font-bold text-[#1A1A1A]">
              {formatCurrency(startingPrice)}
              <span className="text-xs font-normal text-[#9CA3AF] ml-1">起</span>
            </p>
          </div>
          <span
            className="text-sm font-medium text-[#8FAD82] group-hover:text-[#6B8F5E] transition-colors flex items-center gap-1"
            aria-hidden="true"
          >
            查看詳情
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}
