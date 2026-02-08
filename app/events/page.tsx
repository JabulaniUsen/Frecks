'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getFilteredEvents } from '@/lib/supabase/queries'
import CompactEventCard from '@/components/CompactEventCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, Calendar, MapPin, X, Filter, Music, Trophy, PartyPopper, Mic2, Film, GraduationCap, Wrench, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { nigerianSchools } from '@/data/nigerian-schools'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'

const categories = [
  { label: 'All', value: 'all', icon: Sparkles },
  { label: 'Concert', value: 'Concert', icon: Music },
  { label: 'Sports', value: 'Sports', icon: Trophy },
  { label: 'Party', value: 'Party', icon: PartyPopper },
  { label: 'Comedy', value: 'Comedy', icon: Mic2 },
  { label: 'Film', value: 'Film', icon: Film },
  { label: 'Workshop', value: 'Workshop', icon: Wrench },
  { label: 'Conference', value: 'Conference', icon: GraduationCap },
  { label: 'Festival', value: 'Festival', icon: Sparkles },
  { label: 'Other', value: 'Other', icon: Sparkles },
]

function EventsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial values from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '')
  const [selectedSchool, setSelectedSchool] = useState(searchParams.get('school') || 'all')
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '')
  const [showFilters, setShowFilters] = useState(false)
  const [schoolOpen, setSchoolOpen] = useState(false)

  // Build filters object
  const filters = useMemo(() => ({
    search: searchQuery || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    location: locationFilter || undefined,
    school: selectedSchool !== 'all' ? selectedSchool : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [searchQuery, selectedCategory, locationFilter, selectedSchool, dateFrom, dateTo])

  // Fetch filtered events
  const { data: events, isLoading } = useQuery({
    queryKey: ['filtered-events', filters],
    queryFn: () => getFilteredEvents(filters),
  })

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (selectedCategory !== 'all') params.set('category', selectedCategory)
    if (locationFilter) params.set('location', locationFilter)
    if (selectedSchool !== 'all') params.set('school', selectedSchool)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    
    const newUrl = params.toString() ? `/events?${params.toString()}` : '/events'
    router.replace(newUrl, { scroll: false })
  }, [searchQuery, selectedCategory, locationFilter, selectedSchool, dateFrom, dateTo, router])

  // Transform events for EventCard
  const transformedEvents = useMemo(() => {
    if (!events) return []
    
    return events.map((event) => {
      const ticketTypes = event.ticket_types || []
      const minPrice = ticketTypes.length > 0 
        ? Math.min(...ticketTypes.map((tt: any) => tt.price || 0))
        : 0
      
      const attendees = ticketTypes.reduce((sum: number, tt: any) => sum + (tt.sold_count || 0), 0)

      let imageUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop'
      if (event.image_url && typeof event.image_url === 'string' && event.image_url.trim() !== '') {
        imageUrl = event.image_url
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
    })
  }, [events])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setLocationFilter('')
    setSelectedSchool('all')
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters = selectedCategory !== 'all' || locationFilter || selectedSchool !== 'all' || dateFrom || dateTo || searchQuery

  return (
    <div className="min-h-screen flex flex-col bg-background mt-20">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              All <span className="text-primary">Events</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Discover and explore all available events
            </p>
          </div>

          {/* Category Buttons */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => {
                const Icon = category.icon
                const isActive = selectedCategory === category.value
                return (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-button"
                        : "bg-card border border-border text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{category.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-card">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search events, artists, venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 sm:pl-10 h-10 sm:h-11"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // Search is already handled by state
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2 flex-1 sm:flex-initial"
                  size="default"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <Badge className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs">
                  {[selectedCategory !== 'all' ? 1 : 0, selectedSchool !== 'all' ? 1 : 0, locationFilter ? 1 : 0, dateFrom || dateTo ? 1 : 0].reduce((a, b) => a + b, 0)}
                </Badge>
              )}
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="gap-2"
                    size="default"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="border-t border-border pt-4 mt-4 space-y-4 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* School Filter */}
                  <div>
                    <Label htmlFor="school" className="mb-2 block text-sm font-medium">School</Label>
                    <Popover open={schoolOpen} onOpenChange={setSchoolOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={schoolOpen}
                          className={cn(
                            "w-full justify-between",
                            !selectedSchool || selectedSchool === 'all' && "text-muted-foreground"
                          )}
                        >
                          {selectedSchool === 'all' ? 'All Schools' : selectedSchool}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search school..." />
                          <CommandList>
                            <CommandEmpty>No school found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="all"
                                onSelect={() => {
                                  setSelectedSchool('all')
                                  setSchoolOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedSchool === 'all' ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                All Schools
                              </CommandItem>
                              {nigerianSchools.map((school) => (
                                <CommandItem
                                  key={school}
                                  value={school}
                                  onSelect={() => {
                                    setSelectedSchool(school)
                                    setSchoolOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedSchool === school ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {school}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <Label htmlFor="location" className="mb-2 block text-sm font-medium">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="location"
                        type="text"
                        placeholder="Filter by location..."
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium">Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="dateFrom" className="text-xs text-muted-foreground mb-1 block">From</Label>
                        <Input
                          id="dateFrom"
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dateTo" className="text-xs text-muted-foreground mb-1 block">To</Label>
                        <Input
                          id="dateTo"
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          min={dateFrom || new Date().toISOString().split('T')[0]}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6">
              <span className="text-xs sm:text-sm text-muted-foreground">Active filters:</span>
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="gap-1.5">
                  Category: {categories.find(c => c.value === selectedCategory)?.label}
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedSchool !== 'all' && (
                <Badge variant="secondary" className="gap-1.5">
                  School: {selectedSchool}
                  <button
                    onClick={() => setSelectedSchool('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {locationFilter && (
                <Badge variant="secondary" className="gap-1.5">
                  Location: {locationFilter}
                  <button
                    onClick={() => setLocationFilter('')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {(dateFrom || dateTo) && (
                <Badge variant="secondary" className="gap-1.5">
                  Date: {dateFrom || 'Any'} - {dateTo || 'Any'}
                  <button
                    onClick={() => {
                      setDateFrom('')
                      setDateTo('')
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Results */}
          {isLoading ? (
            <div className="text-center py-12 sm:py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading events...</p>
            </div>
          ) : transformedEvents.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <p className="text-muted-foreground mb-4">No events found matching your criteria.</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} size="sm">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 sm:mb-6 flex items-center justify-between">
                <div className="text-sm sm:text-base text-muted-foreground">
                  Found <span className="font-semibold text-foreground">{transformedEvents.length}</span> event{transformedEvents.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {transformedEvents.map((event) => (
                  <CompactEventCard key={event.id} {...event} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function EventsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-background mt-20">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <EventsContent />
    </Suspense>
  )
}

