'use client'

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getCreatorEvents } from "@/lib/supabase/queries";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

const Tickets = () => {
  // All hooks must be called unconditionally
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['creator-events', profile?.id],
    queryFn: () => getCreatorEvents(profile!.id),
    enabled: !!profile?.id,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['creator-tickets', profile?.id, selectedEvent],
    queryFn: async () => {
      // Get all tickets for creator's events
      const eventIds = events?.map(e => e.id) || [];
      if (eventIds.length === 0) return [];

      let query = supabase
        .from('tickets')
        .select('*, event:events(*), ticket_type:ticket_types(*), order:orders(*)')
        .in('event_id', eventIds);

      if (selectedEvent !== 'all') {
        query = query.eq('event_id', selectedEvent);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id && !!events,
  });

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    if (!searchQuery) return tickets;

    const query = searchQuery.toLowerCase();
    return tickets.filter((ticket: any) => {
      const order = ticket.order || {};
      return (
        order.email?.toLowerCase().includes(query) ||
        order.full_name?.toLowerCase().includes(query) ||
        ticket.qr_code?.toLowerCase().includes(query) ||
        ticket.event?.title?.toLowerCase().includes(query)
      );
    });
  }, [tickets, searchQuery]);

  if (eventsLoading || ticketsLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Loading tickets...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tickets</h2>
        <p className="text-muted-foreground mt-1">View and manage all tickets sold</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or QR code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="px-4 py-2 rounded-lg border border-border bg-background"
        >
          <option value="all">All Events</option>
          {events?.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {!tickets || filteredTickets.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <p className="text-muted-foreground">No tickets found</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Ticket ID</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Event</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Buyer</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Purchased</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTickets.map((ticket: any) => (
                  <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm">{ticket.qr_code.slice(0, 8)}...</td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{ticket.event?.title || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">{format(new Date(ticket.event?.date), 'MMM d, yyyy')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{ticket.order?.full_name || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">{ticket.order?.email || ''}</div>
                    </td>
                    <td className="px-6 py-4">{ticket.ticket_type?.name || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          ticket.status === 'valid'
                            ? 'bg-green-500/10 text-green-600'
                            : ticket.status === 'used'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {ticket.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Eye className="w-4 h-4" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;

