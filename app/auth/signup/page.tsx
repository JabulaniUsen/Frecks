'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { nigerianSchools } from '@/data/nigerian-schools'
import { Check, ChevronsUpDown, Plus, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TygerAvatar } from 'tyger-avatar'
import 'tyger-avatar/lib/bundle/styles.css'

const maleAvatars = ['TrEric', 'TrTorsten', 'TrIggy', 'TrFranklin', 'TrImran', 'TrAlex', 'TrFelix', 'TrEnrique', 'TrHarry', 'TrStu', 'TrChad']
const femaleAvatars = ['TrChelsea', 'TrSamantha', 'TrMaria', 'TrRachel', 'TrShamila', 'TrSophia', 'TrHelen', 'TrNancy']
const otherAvatars = ['TrAlex', 'TrFelix', 'TrSophia', 'TrHarry', 'TrHelen']

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select your gender',
  }),
  avatar_name: z.string().min(1, 'Please select an avatar'),
  school: z.string().min(2, 'Please enter or select your school'),
  role: z.enum(['user', 'creator'], {
    required_error: 'Please select a role',
  }),
})

type SignUpFormData = z.infer<typeof signUpSchema>

export default function SignUpPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [schoolOpen, setSchoolOpen] = useState(false)
  const [customSchool, setCustomSchool] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Redirect if already authenticated (wait for profile to load)
  useEffect(() => {
    if (!authLoading && user && profile) {
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard'
      router.replace(redirectUrl)
    }
  }, [user, profile, authLoading, router])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      role: 'user',
    },
  })

  const role = watch('role')
  const school = watch('school')
  const gender = watch('gender')
  const avatarName = watch('avatar_name')

  const availableAvatars = gender === 'male' 
    ? maleAvatars 
    : gender === 'female' 
    ? femaleAvatars 
    : otherAvatars

  const onSubmit = async (data: SignUpFormData) => {
    setLoading(true)
    setError(null)

    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      // Create user profile in database
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        gender: data.gender,
        school: data.school,
        avatar_name: data.avatar_name,
      })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw new Error(profileError.message || 'Failed to create user profile')
      }

      // If creator, create creator profile
      if (data.role === 'creator') {
        await supabase.from('creator_profiles').insert({
          user_id: authData.user.id,
        })
      }

      // Send welcome email (fire and forget)
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        await fetch(`${baseUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'welcome',
            userName: data.full_name,
            email: data.email,
          }),
        }).catch((error) => {
          console.error('Failed to send welcome email:', error)
        })
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError)
        // Don't fail signup if email fails
      }

      // Show success message
      setSuccess(true)
      setUserEmail(data.email)
      setLoading(false)
      
      // AuthContext will automatically fetch profile via onAuthStateChange
      // Redirect after 3 seconds to allow user to see the message
      setTimeout(() => {
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard'
        router.replace(redirectUrl)
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col mt-10">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border shadow-card p-8">
            <h1 className="text-3xl font-bold mb-2">Create Account</h1>
            <p className="text-muted-foreground mb-6">Join Frecks today</p>

            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-primary/10 border border-primary/20 text-foreground rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-xl">📧</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">Check your email inbox!</h3>
                    <p className="text-sm text-muted-foreground">
                      We've sent a confirmation email to <span className="font-medium text-foreground">{userEmail}</span>. Please check your inbox to confirm your email address.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="John Doe"
                  {...register('full_name')}
                  className={errors.full_name ? 'border-destructive' : ''}
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className={cn(
                      'pr-10',
                      errors.password ? 'border-destructive' : ''
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <Label>Gender</Label>
                <RadioGroup
                  value={gender}
                  onValueChange={(value) => setValue('gender', value as 'male' | 'female' | 'other')}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="cursor-pointer flex-1">
                      Male
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="cursor-pointer flex-1">
                      Female
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="cursor-pointer flex-1">
                      Other
                    </Label>
                  </div>
                </RadioGroup>
                {errors.gender && (
                  <p className="text-sm text-destructive mt-1">{errors.gender.message}</p>
                )}
              </div>

              {gender && (
                <div>
                  <Label>Choose Your Avatar</Label>
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {availableAvatars.map((avatar) => (
                      <button
                        key={avatar}
                        type="button"
                        onClick={() => setValue('avatar_name', avatar, { shouldValidate: true })}
                        className={cn(
                          'p-2 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center',
                          avatarName === avatar 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <TygerAvatar name={avatar as any} size="sm" rounded />
                      </button>
                    ))}
                  </div>
                  <input
                    type="hidden"
                    {...register('avatar_name')}
                  />
                  {errors.avatar_name && (
                    <p className="text-sm text-destructive mt-1">{errors.avatar_name.message}</p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="school">School</Label>
                <Popover open={schoolOpen} onOpenChange={setSchoolOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={schoolOpen}
                      className="w-full justify-between mt-2"
                    >
                      {school || 'Select or enter your school...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search school or type to add custom..." 
                        onValueChange={(value) => {
                          setCustomSchool(value)
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="py-2 px-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                if (customSchool) {
                                  setValue('school', customSchool, { shouldValidate: true })
                                  setSchoolOpen(false)
                                  setCustomSchool('')
                                }
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add "{customSchool || 'Custom School'}"
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {nigerianSchools.map((schoolItem) => (
                            <CommandItem
                              key={schoolItem}
                              value={schoolItem}
                              onSelect={() => {
                                setValue('school', schoolItem, { shouldValidate: true })
                                setSchoolOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  school === schoolItem ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {schoolItem}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {customSchool && !nigerianSchools.some(s => s.toLowerCase().includes(customSchool.toLowerCase())) && (
                          <CommandGroup>
                            <CommandItem
                              value={`add-${customSchool}`}
                              onSelect={() => {
                                setValue('school', customSchool, { shouldValidate: true })
                                setSchoolOpen(false)
                                setCustomSchool('')
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add "{customSchool}"
                            </CommandItem>
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <input
                  type="hidden"
                  {...register('school')}
                />
                {errors.school && (
                  <p className="text-sm text-destructive mt-1">{errors.school.message}</p>
                )}
              </div>

              <div>
                <Label>I want to</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => setValue('role', value as 'user' | 'creator')}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50">
                    <RadioGroupItem value="user" id="user" />
                    <Label htmlFor="user" className="cursor-pointer flex-1">
                      Browse and buy tickets
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50">
                    <RadioGroupItem value="creator" id="creator" />
                    <Label htmlFor="creator" className="cursor-pointer flex-1">
                      Create and sell tickets
                    </Label>
                  </div>
                </RadioGroup>
                {errors.role && (
                  <p className="text-sm text-destructive mt-1">{errors.role.message}</p>
                )}
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

