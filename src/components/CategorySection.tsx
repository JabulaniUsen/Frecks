'use client'

import { Music, Trophy, Palette, PartyPopper, Mic2, Film, Gamepad2, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";

const categories = [
  { icon: Music, label: "Concerts", value: "Concert" },
  { icon: Trophy, label: "Sports", value: "Sports" },
  { icon: Palette, label: "Arts", value: "Other" },
  { icon: PartyPopper, label: "Parties", value: "Party" },
  { icon: Mic2, label: "Comedy", value: "Comedy" },
  { icon: Film, label: "Movies", value: "Film" },
  { icon: Gamepad2, label: "Gaming", value: "Other" },
  { icon: GraduationCap, label: "Academic", value: "Conference" },
];

const CategorySection = () => {
  const router = useRouter();

  return (
    <section id="categories" className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4">
            Explore by <span className="text-primary">Category</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
            Find exactly what you're looking for with our curated event categories
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.map((category) => (
            <button
              key={category.label}
              onClick={() => router.push(`/events?category=${category.value}`)}
              className="group flex flex-col items-center gap-3 p-6 bg-background rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-border"
            >
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <category.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground">{category.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
