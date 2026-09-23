import { businessConfig } from "@/config/business";

interface BrandMarkProps {
  className?: string;
  inverse?: boolean;
}

export function BrandMark({ className = "h-11 w-11", inverse = false }: BrandMarkProps) {
  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[14px] shadow-[0_8px_24px_rgba(9,39,29,0.18)] ${
        inverse ? "bg-white" : "bg-forest-900"
      } ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
        <path
          d="M12 13.5v10.25c0 7.1 4.9 11.75 12 11.75s12-4.65 12-11.75V13.5"
          stroke={inverse ? "#12372a" : "#f8fafc"}
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <path
          d="M17 22.5 24 14l7 8.5"
          stroke="#e5ad3d"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="29.5" r="2.7" fill="#e5ad3d" />
      </svg>
    </div>
  );
}

interface BrandLogoProps {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
}

export function BrandLogo({
  compact = false,
  inverse = false,
  className = "",
}: BrandLogoProps) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <BrandMark
        className={compact ? "h-10 w-10 rounded-xl" : "h-12 w-12"}
        inverse={inverse}
      />
      {!compact && (
        <div className="min-w-0 leading-none">
          <p
            className={`truncate text-[15px] font-extrabold tracking-[-0.02em] sm:text-base ${
              inverse ? "text-white" : "text-forest-950"
            }`}
          >
            {businessConfig.shortName}
          </p>
          <p
            className={`mt-1.5 truncate text-[9px] font-bold uppercase tracking-[0.22em] ${
              inverse ? "text-white/55" : "text-forest-700/55"
            }`}
          >
            Bar &amp; Guest House
          </p>
        </div>
      )}
    </div>
  );
}
