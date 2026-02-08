'use client'

import EventCard from "./EventCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getEvents } from "@/lib/supabase/queries";
import { format } from "date-fns";
import Link from "next/link";

const FeaturedEvents = () => {
  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: getEvents,
  })

  // Transform Supabase data to EventCard format
  const transformedEvents = events?.map((event) => {
    const ticketTypes = event.ticket_types || []
    const minPrice = ticketTypes.length > 0 
      ? Math.min(...ticketTypes.map((tt: any) => tt.price || 0))
      : 0
    
    // Calculate attendees from tickets sold
    const attendees = ticketTypes.reduce((sum: number, tt: any) => sum + (tt.sold_count || 0), 0)

    // Handle image URL - ensure it's a valid URL string
    let imageUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop'
    if (event.image_url) {
      // Check if it's already a full URL or needs to be constructed
      if (typeof event.image_url === 'string' && event.image_url.trim() !== '') {
        imageUrl = event.image_url
      }
    }

    return {
      id: event.id,
      title: event.title,
      image: imageUrl,
      date: format(new Date(event.date), 'EEE, MMM d • h:mm a'),
      location: event.location,
      price: minPrice === 0 ? 'Free' : `₦${minPrice}`,
      attendees: attendees,
      category: event.category || 'Event',
      isFeatured: event.is_featured || false,
    }
  }) || []

  if (isLoading) {
    return (
      <section id="events" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">Loading events...</div>
        </div>
      </section>
    )
  }

  return (
    <section id="events" className="py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4">
              Trending <span className="text-primary">Events</span> 🔥
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-md">
              Don't miss out! These are the hottest events happening on campus this month.
            </p>
          </div>
          <Link href="/events">
            <Button variant="outline" className="gap-2 self-start md:self-auto">
              View All Events
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {transformedEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No events available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {transformedEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedEvents;
