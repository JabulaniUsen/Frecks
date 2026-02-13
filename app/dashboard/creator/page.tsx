'use client'

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
import { toast } from "sonner";
import {
  Ticket,
  Plus,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
  BarChart3,
  Settings,
  LogOut,
  TicketCheck,
  MapPin,
  Download,
  Loader2,
  Menu,
  X,
  Wallet,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { getCreatorEvents, getCreatorPastEvents, getUserTickets } from "@/lib/supabase/queries";
import { format } from "date-fns";
import { deleteEvent } from "@/lib/supabase/mutations";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import MyEvents from "@/components/creator/MyEvents";
import Tickets from "@/components/creator/Tickets";
import SettingsPage from "@/components/creator/Settings";
import Withdraw from "@/components/creator/Withdraw";

function CreatorDashboardContent() {
  // All hooks must be called unconditionally and in the same order every render
  const { profile, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<'dashboard' | 'events' | 'past-events' | 'tickets' | 'my-tickets' | 'withdraw' | 'settings'>('dashboard');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  // Always call useQuery - enabled option controls execution, not hook call
  const { data: events, isLoading, error: eventsError } = useQuery({
    queryKey: ['creator-events', profile?.id],
    queryFn: () => getCreatorEvents(profile!.id),
    enabled: !!profile?.id,
  });

  const { data: pastEvents, isLoading: pastEventsLoading } = useQuery({
    queryKey: ['creator-past-events', profile?.id],
    queryFn: () => getCreatorPastEvents(profile!.id),
    enabled: !!profile?.id,
  });

  // Get user's purchased tickets
  const { data: myPurchasedTickets, isLoading: myTicketsLoading } = useQuery({
    queryKey: ['user-tickets', user?.id],
    queryFn: () => getUserTickets(user!.id),
    enabled: !!user?.id && !authLoading,
  });

  const queryClient = useQueryClient();
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId, user!.id),
    onSuccess: () => {
      toast.success('Event deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['creator-events'] });
      queryClient.invalidateQueries({ queryKey: ['creator-past-events'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete event');
    },
  });

  // Show success message when event is created
  useEffect(() => {
    const created = searchParams.get('created');
    if (created) {
      toast.success('Event created successfully!', {
        description: 'Your event has been created and is now live.',
      });
      // Clean up URL
      router.replace('/dashboard/creator');
    }
    
    // Check for tab parameter to switch views
    const tab = searchParams.get('tab');
    if (tab === 'withdraw') {
      setActiveView('withdraw');
    }
  }, [searchParams, router]);

  // Always call useMemo hooks - they depend on events which may be undefined
  const stats = useMemo(() => {
    if (!events) {
      return [
        { label: "Total Events", value: "0", icon: Calendar, change: "" },
        { label: "Tickets Sold", value: "0", icon: Ticket, change: "" },
        { label: "Total Revenue", value: "₦0", icon: DollarSign, change: "" },
        { label: "Total Attendees", value: "0", icon: Users, change: "" },
      ];
    }

    const totalEvents = events.length;
    const ticketsSold = events.reduce((sum, event) => {
      const ticketTypes = event.ticket_types || [];
      return sum + ticketTypes.reduce((s: number, tt: any) => s + (tt.sold_count || 0), 0);
    }, 0);
    const totalRevenue = events.reduce((sum, event) => {
      const ticketTypes = event.ticket_types || [];
      return sum + ticketTypes.reduce((s: number, tt: any) => {
        return s + ((tt.price || 0) * (tt.sold_count || 0));
      }, 0);
    }, 0);

    return [
      { label: "Total Events", value: totalEvents.toString(), icon: Calendar, change: "" },
      { label: "Tickets Sold", value: ticketsSold.toLocaleString(), icon: Ticket, change: "" },
      { label: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}`, icon: DollarSign, change: "" },
      { label: "Total Attendees", value: ticketsSold.toLocaleString(), icon: Users, change: "" },
    ];
  }, [events]);

  const transformedEvents = useMemo(() => {
    if (!events) return [];
    return events.map((event) => {
      const ticketTypes = event.ticket_types || [];
      const ticketsSold = ticketTypes.reduce((sum: number, tt: any) => sum + (tt.sold_count || 0), 0);
      const totalTickets = ticketTypes.reduce((sum: number, tt: any) => sum + (tt.quantity || 0), 0);
      const revenue = ticketTypes.reduce((sum: number, tt: any) => {
        return sum + ((tt.price || 0) * (tt.sold_count || 0));
      }, 0);

      return {
        id: event.id,
        title: event.title,
        date: format(new Date(event.date), 'MMM d, yyyy'),
        ticketsSold,
        totalTickets,
        revenue,
        status: event.status || 'active',
      };
    });
  }, [events]);

  // Early returns after all hooks
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-lg font-semibold">Authentication Required</p>
          <p className="text-sm text-muted-foreground mb-4">Please sign in to access your dashboard.</p>
          <Link href="/auth/signin?redirect=/dashboard/creator">
            <Button variant="hero">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (profile.role !== 'creator') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-lg font-semibold">Access Denied</p>
          <p className="text-sm text-muted-foreground mb-4">This page is only accessible to creators.</p>
          <Link href="/dashboard/user">
            <Button variant="outline">Go to User Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:hidden ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
            <Image src="/logo.png" alt="Frecks" width={120} height={40} className="h-8 w-auto" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => {
              setActiveView('dashboard')
              setMobileMenuOpen(false)
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'dashboard'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => {
              setActiveView('events')
              setMobileMenuOpen(false)
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'events'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Calendar className="w-4 h-4" />
            My Events
          </button>
          <button
            onClick={() => {
              setActiveView('tickets')
              setMobileMenuOpen(false)
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'tickets'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Ticket className="w-4 h-4" />
            Tickets
          </button>
          <button
            onClick={() => {
              setActiveView('my-tickets')
              setMobileMenuOpen(false)
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'my-tickets'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <TicketCheck className="w-4 h-4" />
            My Tickets
          </button>
          <button
            onClick={() => {
              setActiveView('withdraw')
              setMobileMenuOpen(false)
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'withdraw'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Withdraw
          </button>
          <button
            onClick={() => {
              setActiveView('settings')
              setMobileMenuOpen(false)
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'settings'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center justify-between px-3">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <Link href="/">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
              <LogOut className="w-4 h-4" />
              Back to Site
            </button>
          </Link>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border">
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Frecks" width={140} height={48} className="h-10 w-auto" />
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeView === 'dashboard'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('events')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeView === 'events'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Calendar className="w-5 h-5" />
            My Events
          </button>
          <button
            onClick={() => setActiveView('past-events')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeView === 'past-events'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Past Events
          </button>
          <button
            onClick={() => setActiveView('tickets')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeView === 'tickets'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Ticket className="w-5 h-5" />
            Tickets
          </button>
          <button
            onClick={() => setActiveView('my-tickets')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeView === 'my-tickets'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <TicketCheck className="w-5 h-5" />
            My Tickets
          </button>
          <button
            onClick={() => setActiveView('withdraw')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeView === 'withdraw'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Wallet className="w-5 h-5" />
            Withdraw
          </button>
          <button
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeView === 'settings'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center justify-between px-4">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <Link href="/">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
              <LogOut className="w-5 h-5" />
              Back to Site
            </button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-muted rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg md:text-2xl font-bold">Organizer Dashboard</h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Manage your events and track sales</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="lg:hidden">
                <ThemeToggle />
              </div>
              <Link href="/dashboard/creator/create">
                <Button size="sm" className="gap-1 md:gap-2 text-xs md:text-base">
                  <Plus className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Create Event</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {activeView === 'dashboard' && (
          <div className="p-3 md:p-6 space-y-4 md:space-y-8">
            {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card rounded-lg md:rounded-2xl border border-border p-3 md:p-6 shadow-card">
                <div className="flex items-start justify-between mb-2 md:mb-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                  </div>
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary hidden sm:block" />
                </div>
                <div className="text-lg md:text-2xl font-bold mb-0.5 md:mb-1">{stat.value}</div>
                <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
                <div className="text-xs text-primary mt-1 md:mt-2">{stat.change}</div>
              </div>
            ))}
          </div>

          {/* Events Table */}
          <div className="bg-card rounded-lg md:rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="p-3 md:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
              <h2 className="text-base md:text-xl font-bold">Your Events</h2>
              <div className="flex gap-1 md:gap-2">
                <Button variant="outline" size="sm" className="text-xs">All</Button>
                <Button variant="ghost" size="sm" className="text-xs">Active</Button>
                <Button variant="ghost" size="sm" className="text-xs">Done</Button>
              </div>
            </div>
            
            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-border">
              {!profile?.id ? (
                <div className="p-3 text-center text-xs text-muted-foreground">Loading...</div>
              ) : isLoading ? (
                <div className="p-3 text-center text-xs text-muted-foreground">Loading events...</div>
              ) : eventsError ? (
                <div className="p-3 text-center text-xs text-destructive">Error: {eventsError.message}</div>
              ) : transformedEvents.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">No events yet. Create your first event!</div>
              ) : (
                transformedEvents.map((event) => (
                <div key={event.id} className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate">{event.title}</h3>
                      <p className="text-xs text-muted-foreground">{event.date}</p>
                    </div>
                    <Badge className={`text-xs shrink-0 ${event.status === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {event.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-muted-foreground">Sold:</span>{" "}
                      <span className="font-medium">{event.ticketsSold}/{event.totalTickets}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Revenue:</span>{" "}
                      <span className="font-medium text-primary">₦{event.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <Link href={`/dashboard/creator/analytics/${event.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1 text-xs h-8">
                        <Eye className="w-3 h-3" /> View
                      </Button>
                    </Link>
                    <Link href={`/dashboard/creator/edit/${event.id}`} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full gap-1 text-xs h-8">
                        <Edit className="w-3 h-3" /> Edit
                      </Button>
                    </Link>
                  </div>
                </div>
                ))
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs md:text-sm font-medium text-muted-foreground">Event</th>
                    <th className="text-left px-4 py-3 text-xs md:text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 text-xs md:text-sm font-medium text-muted-foreground">Tickets Sold</th>
                    <th className="text-left px-4 py-3 text-xs md:text-sm font-medium text-muted-foreground">Revenue</th>
                    <th className="text-left px-4 py-3 text-xs md:text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 text-xs md:text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!profile?.id ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-center text-xs text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-center text-xs text-muted-foreground">
                        Loading events...
                      </td>
                    </tr>
                  ) : eventsError ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-center text-xs text-destructive">
                        Error loading events: {eventsError.message}
                      </td>
                    </tr>
                  ) : transformedEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-center text-xs text-muted-foreground">
                        No events yet. Create your first event!
                      </td>
                    </tr>
                  ) : (
                    transformedEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">{event.title}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${(event.ticketsSold / event.totalTickets) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {event.ticketsSold}/{event.totalTickets}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-primary">₦{event.revenue.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${event.status === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {event.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/creator/analytics/${event.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="View Analytics">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/creator/edit/${event.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Event">
                              <Edit className="w-3 h-3" />
                            </Button>
                          </Link>
                          <div className="relative">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setActiveMenu(activeMenu === event.id ? null : event.id)}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                            {activeMenu === event.id && (
                              <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-lg py-1 z-10">
                                <Link href={`/dashboard/creator/analytics/${event.id}`}>
                                  <button 
                                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors flex items-center gap-2"
                                    onClick={() => setActiveMenu(null)}
                                  >
                                    <Eye className="w-3 h-3" /> View Analytics
                                  </button>
                                </Link>
                                <Link href={`/dashboard/creator/edit/${event.id}`}>
                                  <button 
                                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors flex items-center gap-2"
                                    onClick={() => setActiveMenu(null)}
                                  >
                                    <Edit className="w-3 h-3" /> Edit Event
                                  </button>
                                </Link>
                                <button 
                                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors flex items-center gap-2 text-destructive"
                                  onClick={() => {
                                    setActiveMenu(null)
                                    setEventToDelete(event.id)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-2 md:gap-4">
            <Link href="/dashboard/creator/create">
              <button className="p-3 md:p-6 bg-primary text-primary-foreground rounded-lg md:rounded-2xl text-left hover:brightness-110 transition-all w-full">
                <Plus className="w-5 h-5 md:w-8 md:h-8 mb-2 md:mb-4" />
                <h3 className="font-bold text-sm md:text-lg mb-0.5 md:mb-1">Create New Event</h3>
                <p className="text-xs md:text-sm opacity-80">Start organizing your next event</p>
              </button>
            </Link>
          </div>
        </div>
        )}
        {/* Always render child components to maintain consistent hook order */}
        <div style={{ display: activeView === 'events' ? 'block' : 'none' }}>
          <MyEvents onDelete={(eventId) => deleteEventMutation.mutate(eventId)} />
        </div>
        {activeView === 'past-events' && (
          <div className="p-3 md:p-6">
            <div className="mb-4 md:mb-6">
              <h2 className="text-lg md:text-2xl font-bold mb-1 md:mb-2">Past Events</h2>
              <p className="text-xs md:text-sm text-muted-foreground">Events that have already occurred</p>
            </div>

            {pastEventsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading past events...</p>
              </div>
            ) : !pastEvents || pastEvents.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No past events</h3>
                <p className="text-muted-foreground">You don't have any past events yet.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:gap-4">
                {pastEvents.map((event: any) => {
                  const ticketTypes = event.ticket_types || []
                  const ticketsSold = ticketTypes.reduce((sum: number, tt: any) => sum + (tt.sold_count || 0), 0)
                  const totalTickets = ticketTypes.reduce((sum: number, tt: any) => sum + (tt.quantity || 0), 0)
                  const revenue = ticketTypes.reduce((sum: number, tt: any) => {
                    return sum + ((tt.price || 0) * (tt.sold_count || 0))
                  }, 0)

                  return (
                    <div key={event.id} className="bg-card rounded-xl border border-border p-4 md:p-6 hover:shadow-lg transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
                        {event.image_url && (
                          <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden bg-muted shrink-0">
                            <img
                              src={event.image_url}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base md:text-xl font-bold mb-1 truncate">{event.title}</h3>
                              <Badge className="text-xs mb-1">{event.category}</Badge>
                            </div>
                            <Badge variant="secondary" className="shrink-0 text-xs">Past</Badge>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground mb-2">{event.location}</p>
                          <p className="text-xs md:text-sm text-muted-foreground mb-3">
                            {format(new Date(event.date), 'EEE, MMM d, yyyy • h:mm a')}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 pt-3 border-t border-border">
                            <div>
                              <p className="text-xs text-muted-foreground">Tickets Sold</p>
                              <p className="text-sm md:text-base font-semibold">{ticketsSold} / {totalTickets}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Revenue</p>
                              <p className="text-sm md:text-base font-semibold text-primary">₦{revenue.toLocaleString()}</p>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                              <p className="text-xs text-muted-foreground">Attendees</p>
                              <p className="text-sm md:text-base font-semibold">{ticketsSold}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Link href={`/event/${event.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full text-xs">
                                <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                View Event
                              </Button>
                            </Link>
                            <Link href={`/dashboard/creator/analytics/${event.id}`} className="flex-1">
                              <Button variant="hero" size="sm" className="w-full text-xs">
                                <BarChart3 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                Analytics
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        <div style={{ display: activeView === 'tickets' ? 'block' : 'none' }}>
          <Tickets />
        </div>
        {activeView === 'my-tickets' && (
          <div className="p-3 md:p-6">
            <div className="mb-4 md:mb-6">
              <h2 className="text-lg md:text-2xl font-bold mb-1 md:mb-2">My Purchased Tickets</h2>
              <p className="text-xs md:text-sm text-muted-foreground">Tickets you've purchased for events</p>
            </div>

            {myTicketsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading your tickets...</p>
              </div>
            ) : !myPurchasedTickets || myPurchasedTickets.length === 0 ? (
              <div className="text-center py-12">
                <TicketCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No tickets yet</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't purchased any tickets yet. Start exploring events!
                </p>
                <Link href="/">
                  <Button variant="hero">Browse Events</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {myPurchasedTickets.map((ticket: any) => {
                  const event = ticket.event
                  const ticketType = ticket.ticket_type
                  const qrCodeImage = ticket.qr_code_data?.qrCodeImageUrl || ticket.qr_code_data?.qrCodeImage

                  return (
                    <div key={ticket.id} className="bg-card rounded-xl border border-border p-4 md:p-6 hover:shadow-lg transition-shadow">
                      <div className="flex gap-3 md:gap-4">
                        {event?.image_url && (
                          <div className="w-20 h-20 md:w-32 md:h-32 rounded-lg overflow-hidden bg-muted shrink-0">
                            <img
                              src={event.image_url}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base md:text-xl font-bold mb-1 truncate">{event?.title || 'Event'}</h3>
                              <Badge className="text-xs">{event?.category || 'Event'}</Badge>
                            </div>
                            <Badge variant={ticket.status === 'valid' ? 'default' : ticket.status === 'used' ? 'secondary' : 'destructive'} className="shrink-0 text-xs">
                              {ticket.status === 'valid' ? 'Valid' : ticket.status === 'used' ? 'Used' : 'Cancelled'}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1.5 mb-3">
                            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                              <span className="truncate">{event?.date ? format(new Date(event.date), 'MMM d, yyyy • h:mm a') : 'Date TBD'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                              <span className="truncate">{event?.location || 'Location TBD'}</span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border">
                            <div>
                              <p className="text-xs text-muted-foreground">Ticket Type</p>
                              <p className="text-sm md:text-base font-semibold">{ticketType?.name || 'General Admission'}</p>
                              {ticketType?.price !== undefined && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {ticketType.is_free ? 'Free' : `₦${ticketType.price}`}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/invoice/${ticket.order_id}`} className="flex-1 sm:flex-initial">
                                <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
                                  See Ticket
                                </Button>
                              </Link>
                              {qrCodeImage && (
                                <Link href={`/invoice/${ticket.order_id}`} className="flex-1 sm:flex-initial">
                                  <Button variant="hero" size="sm" className="w-full sm:w-auto gap-2 text-xs">
                                    <Download className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="hidden sm:inline">Download</span>
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        <div style={{ display: activeView === 'withdraw' ? 'block' : 'none' }}>
          <Withdraw />
        </div>
        <div style={{ display: activeView === 'settings' ? 'block' : 'none' }}>
          <SettingsPage />
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
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
                  deleteEventMutation.mutate(eventToDelete)
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
    </div>
  );
}

export default function CreatorDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <CreatorDashboardContent />
    </Suspense>
  )
}

