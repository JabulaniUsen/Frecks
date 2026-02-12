'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, Ticket, Search, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TygerAvatar } from 'tyger-avatar';
import 'tyger-avatar/lib/bundle/styles.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { profile, user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { label: "Events", href: "/#events" },
    { label: "Categories", href: "/#categories" },
    { label: "About", href: "/#about" },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-32 h-12 group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="Frecks Live"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-foreground font-medium transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Search className="w-5 h-5" />
            </Button>
            <ThemeToggle />
            {profile ? (
              <>
                {/* {profile.role === 'creator' && (
                  <Link href="/dashboard/creator">
                    <Button variant="secondary">Dashboard</Button>
                  </Link>
                )} */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 h-auto py-1.5">
                      {mounted && profile?.avatar_name ? (
                        <div className="h-8 w-8 flex items-center justify-center overflow-hidden shrink-0">
                          <TygerAvatar name={profile.avatar_name as any} size="2xl" />
                        </div>
                      ) : (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {/* <span className="hidden sm:inline truncate">{profile?.full_name || profile?.email}</span> */}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                      <User className="mr-2 h-4 w-4" />
                      My Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="hero">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300 bg-background border-b border-border",
          isMenuOpen ? "max-h-96" : "max-h-0"
        )}
      >
        <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-muted-foreground hover:text-foreground font-medium transition-colors py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            {profile ? (
              <>
                <Link href="/dashboard" className="w-full">
                  <Button variant="outline" className="w-full">Dashboard</Button>
                </Link>
                <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="w-full">
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
                <Link href="/auth/signup" className="w-full">
                  <Button variant="hero" className="w-full">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
