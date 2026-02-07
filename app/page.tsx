import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CategorySection from "@/components/CategorySection";
import FeaturedEvents from "@/components/FeaturedEvents";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <CategorySection />
        <FeaturedEvents />
      </main>
      <Footer showNewsletter={true} />
    </div>
  );
}

