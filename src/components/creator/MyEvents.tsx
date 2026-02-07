'use client'

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Edit, Trash2, Plus } from "lucide-react";
import { getCreatorEvents } from "@/lib/supabase/queries";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface MyEventsProps {
  onDelete?: (eventId: string) => void;
}

const MyEvents = ({ onDelete }: MyEventsProps) => {
  const { profile } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['creator-events', profile?.id],
    queryFn: () => getCreatorEvents(profile!.id),
    enabled: !!profile?.id,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive">Error loading events: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Events</h2>
          <p className="text-muted-foreground mt-1">Manage all your events</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Event
        </Button>
      </div>

      {!events || events.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No events yet</p>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Event
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => {
            const ticketTypes = event.ticket_types || [];
            const ticketsSold = ticketTypes.reduce((sum: number, tt: any) => sum + (tt.sold_count || 0), 0);
            const totalTickets = ticketTypes.reduce((sum: number, tt: any) => sum + (tt.quantity || 0), 0);
            const revenue = ticketTypes.reduce((sum: number, tt: any) => {
              return sum + ((tt.price || 0) * (tt.sold_count || 0));
            }, 0);

            return (
              <div key={event.id} className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{event.title}</h3>
                      <Badge className={event.status === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
                        {event.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{event.location}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(event.date), 'EEE, MMM d, yyyy • h:mm a')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/event/${event.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="w-4 h-4" /> View
                      </Button>
                    </Link>
                    <Link href={`/dashboard/creator/edit/${event.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Edit className="w-4 h-4" /> Edit
                      </Button>
                    </Link>
                    {onDelete && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1 text-destructive hover:text-destructive"
                        onClick={() => {
                          setEventToDelete(event.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Tickets Sold</p>
                    <p className="text-lg font-semibold">{ticketsSold} / {totalTickets}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-lg font-semibold text-primary">₦{revenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Attendees</p>
                    <p className="text-lg font-semibold">{ticketsSold}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {onDelete && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this event? This action cannot be undone. The event will be moved to deleted events.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEventToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (eventToDelete) {
                    onDelete(eventToDelete)
                    setDeleteDialogOpen(false)
                    setEventToDelete(null)
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default MyEvents;

