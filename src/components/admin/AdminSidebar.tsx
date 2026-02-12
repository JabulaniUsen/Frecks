'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  ShoppingCart,
  Ticket,
  Megaphone,
  Settings,
  Search,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'

interface SidebarItem {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}

const sidebarItems: SidebarItem[] = [
  { title: 'Dashboard', value: 'dashboard', icon: LayoutDashboard },
  { title: 'Events', value: 'events', icon: Calendar },
  { title: 'Users', value: 'users', icon: Users },
  { title: 'Organizers', value: 'organizers', icon: UserCheck },
  { title: 'Orders', value: 'orders', icon: ShoppingCart },
  { title: 'Tickets', value: 'tickets', icon: Ticket },
  { title: 'Ads', value: 'ads', icon: Megaphone },
]

interface AdminSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { profile } = useAuth()

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-card"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card transition-transform lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Branding */}
          <div className="flex h-16 items-center border-b border-border px-6">
            <div className="relative w-40 h-12">
              <Image
                src="/logo.png"
                alt="Frecks Live Admin"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </div>

          {/* Search Bar */}
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-9 bg-background"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.value
              return (
                <button
                  key={item.value}
                  onClick={() => {
                    onTabChange(item.value)
                    setMobileMenuOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </button>
              )
            })}
          </nav>

          {/* Settings Section */}
          <div className="border-t border-border p-4">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </button>
          </div>

          {/* User Profile */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {profile?.full_name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email || ''}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  )
}

