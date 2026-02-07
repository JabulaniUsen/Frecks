'use client'

import { Calendar, MapPin, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface EventData {
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

interface EventCardProps extends EventData {}

const EventCard = ({
  id,
  title,
  image,
  date,
  location,
  price,
  attendees,
  category,
  isFeatured = false,
}: EventCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fallbackImage = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop';

  return (
    <div className={cn(
      "group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-2 border border-border",
      isFeatured && "ring-2 ring-primary"
    )}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={imageError ? fallbackImage : image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={() => setImageError(true)}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 to-transparent" />
        
        {/* Category Badge */}
        <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-0">
          {category}
        </Badge>
        
        {/* Featured Badge */}
        {isFeatured && (
          <Badge className="absolute top-3 right-12 bg-accent text-accent-foreground border border-border">
            🔥 Hot
          </Badge>
        )}
        
        {/* Like Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsLiked(!isLiked);
          }}
          className={cn(
            "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all",
            isLiked 
              ? "bg-primary text-primary-foreground" 
              : "bg-card/90 backdrop-blur-sm text-muted-foreground hover:text-primary"
          )}
        >
          <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
        </button>
        
        {/* Price */}
        <div className="absolute bottom-3 right-3 bg-card border border-border rounded-lg px-3 py-1.5 font-bold text-primary">
          {price}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="truncate">{location}</span>
          </div>
        </div>

        <Link href={`/event/${id}`}>
          <Button variant="hero" className="w-full">
            Get Tickets
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
