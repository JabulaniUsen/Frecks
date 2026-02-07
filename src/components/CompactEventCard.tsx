'use client'

import { Calendar, MapPin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface CompactEventData {
  id: string;
  title: string;
  image: string;
  date: string;
  location: string;
  price: string;
  attendees: number;
  category: string;
  isFeatured?: boolean;
}

interface CompactEventCardProps extends CompactEventData {}

const CompactEventCard = ({
  id,
  title,
  image,
  date,
  location,
  price,
  attendees,
  category,
  isFeatured = false,
}: CompactEventCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fallbackImage = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop';

  return (
    <div className={cn(
      "group bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-border",
      isFeatured && "ring-2 ring-primary"
    )}>
      <div className="flex flex-row">
        {/* Image - Compact */}
        <div className="relative w-28 sm:w-40 md:w-48 h-28 sm:h-40 md:h-auto flex-shrink-0 overflow-hidden bg-muted">
          <img
            src={imageError ? fallbackImage : image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImageError(true)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Category Badge */}
          <Badge className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-primary text-primary-foreground border-0 text-[10px] sm:text-xs px-1 sm:px-2">
            {category}
          </Badge>
          
          {/* Featured Badge */}
          {isFeatured && (
            <Badge className="absolute top-1 right-8 sm:top-2 sm:right-10 bg-accent text-accent-foreground border border-border text-[10px] sm:text-xs px-1 sm:px-2">
              🔥
            </Badge>
          )}
          
          {/* Like Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsLiked(!isLiked);
            }}
            className={cn(
              "absolute top-1 right-1 sm:top-2 sm:right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all z-10",
              isLiked 
                ? "bg-primary text-primary-foreground" 
                : "bg-card/90 backdrop-blur-sm text-muted-foreground hover:text-primary"
            )}
          >
            <Heart className={cn("w-3 h-3 sm:w-4 sm:h-4", isLiked && "fill-current")} />
          </button>
        </div>

        {/* Content - Compact */}
        <div className="flex-1 p-3 sm:p-4 md:p-5 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base md:text-lg mb-1.5 sm:mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>
            
            <div className="flex flex-col gap-1 sm:gap-1.5 mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs md:text-sm text-muted-foreground">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
                <span className="truncate">{date}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs md:text-sm text-muted-foreground">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-border">
            <div className="font-bold text-primary text-xs sm:text-sm md:text-base">
              {price}
            </div>
            <Link href={`/event/${id}`} className="flex-1 sm:flex-initial min-w-0">
              <Button variant="hero" size="sm" className="w-full sm:w-auto text-[10px] sm:text-xs md:text-sm px-3 sm:px-4 h-7 sm:h-9">
                Get Tickets
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactEventCard;

