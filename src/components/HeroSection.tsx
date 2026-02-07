'use client'

import { Button } from "@/components/ui/button";
import { Search, Sparkles, Calendar, MapPin } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import heroBg from "@/assets/hero-bg.jpg";
import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HeroSection = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={typeof heroBg === 'string' ? heroBg : heroBg.src} 
          alt="Campus event" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-10 w-20 h-20 rounded-full bg-primary opacity-20 blur-2xl" />
      <div className="absolute bottom-1/3 right-10 w-32 h-32 rounded-full bg-secondary opacity-15 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            Discover the{" "}
            <span className="text-primary">Best Events</span>
            <br />
            on Campus
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Find concerts, parties, sports games, and more. Get your tickets in seconds and never miss out on the fun! 🎉
          </p>

          {/* Search Box */}
          <div className="bg-card border border-border rounded-2xl p-3 shadow-card max-w-2xl mx-auto mb-8">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 flex items-center gap-3 bg-background rounded-xl px-4 py-3">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search events, artists, venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 bg-background rounded-xl px-4 py-3 text-muted-foreground hover:bg-muted transition-colors border border-border">
                      <Calendar className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {dateFilter ? dateFilter.split('T')[0] : 'Date'}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="date-from">From Date</Label>
                        <Input
                          id="date-from"
                          type="date"
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="mt-2"
                        />
                      </div>
                      {dateFilter && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDateFilter("")}
                          className="w-full"
                        >
                          Clear Date
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 bg-background rounded-xl px-4 py-3 text-muted-foreground hover:bg-muted transition-colors border border-border">
                      <MapPin className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {locationFilter || 'Location'}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="location-input">Location</Label>
                        <Input
                          id="location-input"
                          type="text"
                          placeholder="Enter location..."
                          value={locationFilter}
                          onChange={(e) => setLocationFilter(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      {locationFilter && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocationFilter("")}
                          className="w-full"
                        >
                          Clear Location
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Button 
                variant="hero" 
                size="lg" 
                className="md:px-8"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (searchQuery.trim()) params.set('search', searchQuery.trim());
                  if (locationFilter.trim()) params.set('location', locationFilter.trim());
                  if (dateFilter) params.set('dateFrom', dateFilter);
                  const queryString = params.toString();
                  router.push(`/events${queryString ? `?${queryString}` : ''}`);
                }}
              >
                Search
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div>
              <div className="text-2xl md:text-3xl font-bold text-primary">30+</div>
              <div className="text-sm text-muted-foreground">Events Monthly</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground">Happy Students</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-primary">20+</div>
              <div className="text-sm text-muted-foreground">Universities</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-muted-foreground/50 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-primary rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
