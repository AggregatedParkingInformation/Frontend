import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
    value: number;
    onChange?: (v: number) => void;
    size?: number;
    readOnly?: boolean;
    className?: string;
};

export function StarRating({ value, onChange, size = 18, readOnly = false, className }: Props) {
    const [hover, setHover] = useState<number | null>(null);
    const display = hover ?? value;

    return (
        <div
            className={cn("inline-flex items-center gap-0.5", className)}
            onMouseLeave={() => setHover(null)}>
            {[1, 2, 3, 4, 5].map((i) => {
                const filled = i <= Math.round(display);
                return (
                    <button
                        key={i}
                        type="button"
                        disabled={readOnly}
                        onMouseEnter={() => !readOnly && setHover(i)}
                        onClick={() => !readOnly && onChange?.(i)}
                        className={cn(
                            "transition-transform",
                            !readOnly && "hover:scale-110 cursor-pointer",
                            readOnly && "cursor-default",
                        )}
                        aria-label={`${i} Sterne`}>
                        <Star
                            size={size}
                            className={cn(
                                "transition-colors",
                                filled
                                    ? "fill-[hsl(var(--rating))] text-[hsl(var(--rating))]"
                                    : "text-muted-foreground/40",
                            )}
                        />
                    </button>
                );
            })}
        </div>
    );
}
