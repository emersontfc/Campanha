import { Check } from "lucide-react";

interface VerifiedBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function VerifiedBadge({ className = "", size = "md" }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: "w-3 h-3 p-0.5",
    md: "w-5 h-5 p-1",
    lg: "w-8 h-8 p-1.5"
  };

  const iconSizes = {
    sm: 8,
    md: 12,
    lg: 20
  };

  return (
    <div className={`bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm ${sizeClasses[size]} ${className}`}>
      <Check size={iconSizes[size]} strokeWidth={4} />
    </div>
  );
}
