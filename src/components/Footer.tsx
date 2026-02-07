import { Ticket, Instagram, Twitter, Facebook, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FooterProps {
  showNewsletter?: boolean;
}

const Footer = ({ showNewsletter = false }: FooterProps) => {
  const links = {
    company: ["About Us", "Careers", "Blog", "Press"],
    support: ["Help Center", "Safety", "Terms", "Privacy"],
    venues: ["Partner With Us", "List Your Event", "Pricing", "Resources"],
  };

  return (
    <footer id="about" className="bg-card border-t border-border">
      {/* Newsletter Section */}
      {showNewsletter && (
        <div className="container mx-auto px-4 py-12">
          <div className="bg-primary rounded-3xl p-8 md:p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
              Never Miss an Event! 🎫
            </h3>
            <p className="text-primary-foreground/80 mb-6 max-w-md mx-auto">
              Subscribe to get notified about new events, exclusive deals, and early bird tickets.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 rounded-full bg-primary-foreground/20 border border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/60 outline-none focus:ring-2 focus:ring-primary-foreground/50"
              />
              <Button variant="secondary" size="lg">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-primary">Frecks</span>
            </a>
            <p className="text-muted-foreground mb-6 max-w-xs">
              Your go-to platform for discovering and booking campus events. Made by students, for students.
            </p>
            <div className="flex gap-3">
              {[Instagram, Twitter, Facebook, Youtube].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {links.company.map((link) => (
                <li key={link}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              {links.support.map((link) => (
                <li key={link}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">For Venues</h4>
            <ul className="space-y-2">
              {links.venues.map((link) => (
                <li key={link}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2026 Frecks. All rights reserved.</p>
            <p>Made with 🧡 for students everywhere</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
