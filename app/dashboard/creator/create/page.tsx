'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { createEvent } from '@/lib/supabase/mutations'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, ArrowRight, Upload, X, Check, Loader2, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// LocalStorage keys
const STORAGE_KEYS = {
  EVENT_FORM: 'frecks_event_form_draft',
  TICKET_FORM: 'frecks_ticket_form_draft',
  BENEFITS_FORM: 'frecks_benefits_form_draft',
  IMAGE_PREVIEW: 'frecks_image_preview_draft',
  CURRENT_STEP: 'frecks_create_event_step',
}

// Event categories
const categories = [
  'Concert',
  'Sports',
  'Party',
  'Comedy',
  'Film',
  'Workshop',
  'Conference',
  'Festival',
  'Other'
]

// Form schemas
const eventDetailsSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Please select a category'),
  image: z.any().optional(),
  is_online: z.boolean().default(false),
  location: z.string().min(3, 'Location is required'),
  start_date: z.string().min(1, 'Start date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_date: z.string().optional(),
  end_time: z.string().optional(),
})

const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Ticket name is required'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
})

const ticketBenefitsSchema = z.object({
  ticket_types: z.array(z.object({
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
    description: z.string().optional(),
  }))
})

type EventDetailsForm = z.infer<typeof eventDetailsSchema>
type TicketTypeForm = z.infer<typeof ticketTypeSchema>
type TicketBenefitsForm = z.infer<typeof ticketBenefitsSchema>

export default function CreateEventPage() {
  const router = useRouter()
  const { profile, user } = useAuth()
  
  // Load saved data from localStorage on mount
  const loadSavedData = () => {
    if (typeof window === 'undefined') return null
    
    try {
      const savedStep = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP)
      const savedEventForm = localStorage.getItem(STORAGE_KEYS.EVENT_FORM)
      const savedTicketForm = localStorage.getItem(STORAGE_KEYS.TICKET_FORM)
      const savedBenefitsForm = localStorage.getItem(STORAGE_KEYS.BENEFITS_FORM)
      const savedImagePreview = localStorage.getItem(STORAGE_KEYS.IMAGE_PREVIEW)
      
      return {
        step: savedStep ? parseInt(savedStep) : 1,
        eventForm: savedEventForm ? JSON.parse(savedEventForm) : null,
        ticketForm: savedTicketForm ? JSON.parse(savedTicketForm) : null,
        benefitsForm: savedBenefitsForm ? JSON.parse(savedBenefitsForm) : null,
        imagePreview: savedImagePreview,
      }
    } catch (error) {
      console.error('Error loading saved data:', error)
      return null
    }
  }

  const savedData = loadSavedData()
  
  const [currentStep, setCurrentStep] = useState(savedData?.step || 1)
  const [imagePreview, setImagePreview] = useState<string | null>(savedData?.imagePreview || null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  
  // Dialog states
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false)
  const [showClearSuccessDialog, setShowClearSuccessDialog] = useState(false)

  // Step 1: Event Details
  const eventForm = useForm<EventDetailsForm>({
    resolver: zodResolver(eventDetailsSchema),
    defaultValues: savedData?.eventForm || {
      is_online: false,
      end_date: '',
      end_time: '',
    },
  })

  // Step 2: Ticket Types
  const ticketForm = useForm<{ ticket_types: TicketTypeForm[] }>({
    defaultValues: savedData?.ticketForm || {
      ticket_types: [{ name: '', price: 0, quantity: 100 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: ticketForm.control,
    name: 'ticket_types',
  })

  // Step 3: Ticket Benefits
  const benefitsForm = useForm<TicketBenefitsForm>({
    defaultValues: savedData?.benefitsForm || {
      ticket_types: [],
    },
  })

  // Combine all form data for preview
  const eventDetails = eventForm.watch()
  const ticketTypes = ticketForm.watch('ticket_types')
  const ticketBenefits = benefitsForm.watch('ticket_types')

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const eventFormData = eventForm.getValues()
      const ticketFormData = ticketForm.getValues()
      const benefitsFormData = benefitsForm.getValues()
      
      // Only save if there's actual data
      if (eventFormData.title || eventFormData.description || eventFormData.category) {
        localStorage.setItem(STORAGE_KEYS.EVENT_FORM, JSON.stringify(eventFormData))
      }
      
      if (ticketFormData.ticket_types && ticketFormData.ticket_types.length > 0) {
        localStorage.setItem(STORAGE_KEYS.TICKET_FORM, JSON.stringify(ticketFormData))
      }
      
      if (benefitsFormData.ticket_types && benefitsFormData.ticket_types.length > 0) {
        localStorage.setItem(STORAGE_KEYS.BENEFITS_FORM, JSON.stringify(benefitsFormData))
      }
      
      // Save or remove image preview
      if (imagePreview) {
        localStorage.setItem(STORAGE_KEYS.IMAGE_PREVIEW, imagePreview)
      } else {
        localStorage.removeItem(STORAGE_KEYS.IMAGE_PREVIEW)
      }
      
      localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, currentStep.toString())
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }, [eventDetails, ticketTypes, ticketBenefits, imagePreview, currentStep, eventForm, ticketForm, benefitsForm])

  // Clear saved data function
  const clearSavedData = () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(STORAGE_KEYS.EVENT_FORM)
      localStorage.removeItem(STORAGE_KEYS.TICKET_FORM)
      localStorage.removeItem(STORAGE_KEYS.BENEFITS_FORM)
      localStorage.removeItem(STORAGE_KEYS.IMAGE_PREVIEW)
      localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP)
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  }

  // Show restore prompt if saved data exists (only once on mount)
  useEffect(() => {
    if (savedData && (savedData.eventForm || savedData.ticketForm || savedData.benefitsForm)) {
      setShowRestoreDialog(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const handleRestoreDraft = () => {
    setShowRestoreDialog(false)
    // Restore image preview if available
    if (savedData?.imagePreview) {
      setImagePreview(savedData.imagePreview)
    }
    // Note: Image file cannot be restored (File objects aren't serializable)
    // User will need to re-select the image, but preview is shown
  }

  const handleDiscardDraft = () => {
    setShowRestoreDialog(false)
    clearSavedData()
    // Reset forms to defaults
    eventForm.reset({
      is_online: false,
      end_date: '',
      end_time: '',
    })
    ticketForm.reset({
      ticket_types: [{ name: '', price: 0, quantity: 100 }],
    })
    benefitsForm.reset({
      ticket_types: [],
    })
    setImagePreview(null)
    setCurrentStep(1)
  }

  // Image upload handler - just store file and show preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        eventForm.setError('image', { message: 'Please upload an image file' })
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        eventForm.setError('image', { message: 'Image must be less than 5MB' })
        return
      }

      eventForm.setValue('image', file)
      eventForm.clearErrors('image')
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Compress and optimize image before upload
  const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.85): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions maintaining aspect ratio
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }
              // Create a new File object with compressed data
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            },
            'image/jpeg',
            quality
          )
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })
  }

  // Upload image to Supabase Storage
  const uploadImage = async (file: File): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file)
      const fileExt = 'jpg'
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const filePath = fileName

      console.log('Uploading image to storage bucket:', filePath)
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        // Provide more helpful error messages
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error('Storage bucket "event-images" not found. Please create it in your Supabase dashboard.')
        } else if (uploadError.message?.includes('new row violates row-level security')) {
          throw new Error('Permission denied. Please check storage bucket policies.')
        } else {
          throw new Error(`Image upload failed: ${uploadError.message}`)
        }
      }

      if (!uploadData) {
        throw new Error('Upload succeeded but no data returned')
      }

      console.log('Upload successful, getting public URL...')
      const { data: urlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath)

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image')
      }

      console.log('Image URL generated:', urlData.publicUrl)
      return urlData.publicUrl
    } catch (error: any) {
      console.error('Upload image error:', error)
      throw error
    }
  }

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!user || !profile) throw new Error('User not authenticated')

      // Upload image if provided
      let imageUrl: string | undefined = undefined
      const imageFile = eventForm.getValues('image')
      
      if (imageFile) {
        setIsUploadingImage(true)
        try {
          imageUrl = await uploadImage(imageFile)
          console.log('Image uploaded successfully:', imageUrl)
        } catch (error: any) {
          console.error('Image upload error:', error)
          setIsUploadingImage(false)
          throw new Error(`Failed to upload image: ${error.message || 'Unknown error'}. Please try again or create the event without an image.`)
        } finally {
          setIsUploadingImage(false)
        }
      }

      // Combine start date and time
      const startDateTime = new Date(`${eventDetails.start_date}T${eventDetails.start_time}`)
      
      // Format location
      const location = eventDetails.is_online 
        ? `Online - ${eventDetails.location}` 
        : eventDetails.location

      // Combine ticket types with benefits
      const ticketTypesWithBenefits = ticketTypes.map((tt, index) => ({
        name: tt.name,
        price: tt.price,
        quantity: tt.quantity,
        description: ticketBenefits[index]?.description || '',
        is_free: tt.price === 0,
      }))

      // Create event
      const event = await createEvent({
        creator_id: user.id,
        title: eventDetails.title,
        description: eventDetails.description,
        category: eventDetails.category,
        image_url: imageUrl,
        date: startDateTime.toISOString(),
        location,
        ticket_types: ticketTypesWithBenefits,
      })

      if (!event) {
        throw new Error('Event creation returned no data')
      }

      return event
    },
    onSuccess: (event) => {
      clearSavedData()
      router.push(`/dashboard/creator?created=${event.id}`)
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error?.message || 'Failed to create event. Please try again.'
      toast.error('Failed to create event', {
        description: errorMessage,
      })
      setIsUploadingImage(false)
    },
  })

  // Step navigation
  const nextStep = async () => {
    if (currentStep === 1) {
      const isValid = await eventForm.trigger()
      if (!isValid) {
        const firstError = Object.keys(eventForm.formState.errors)[0]
        if (firstError) {
          document.querySelector(`[name="${firstError}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        return
      }
      setCurrentStep(prev => Math.min(prev + 1, 4))
      return
    }
    
    if (currentStep === 2) {
      const isValid = await ticketForm.trigger()
      if (!isValid) {
        const firstErrorField = ticketForm.formState.errors.ticket_types
        if (firstErrorField) {
          const firstIndex = Object.keys(firstErrorField)[0]
          document.querySelector(`[name="ticket_types.${firstIndex}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        return
      }

      // Update benefits form with current ticket types
      const currentTicketTypes = ticketForm.getValues('ticket_types')
      benefitsForm.reset({
        ticket_types: currentTicketTypes.map(tt => ({
          name: tt.name,
          price: tt.price,
          quantity: tt.quantity,
          description: '',
        })),
      })
      setCurrentStep(prev => Math.min(prev + 1, 4))
      return
    }
    
    if (currentStep === 3) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
      return
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    const eventValid = await eventForm.trigger()
    const ticketValid = await ticketForm.trigger()
    
    if (!eventValid || !ticketValid) {
      setShowErrorDialog(true)
      return
    }

    await createEventMutation.mutateAsync()
  }

  if (!user || !profile || profile.role !== 'creator') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-2">Access Denied</p>
          <p className="text-sm text-muted-foreground">Only creators can create events.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/creator">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Create New Event</h1>
                <p className="text-sm text-muted-foreground">Step {currentStep} of 4</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowClearConfirmDialog(true)
              }}
            >
              Clear Draft
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Step 1: Event Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Event Details</h2>
              <p className="text-sm text-muted-foreground">
                Tell us about your event. You can edit this later.
              </p>
            </div>

            <div className="space-y-6">
              {/* Event Image */}
              <div>
                <Label>Event Image</Label>
                <div className="mt-2">
                  {imagePreview ? (
                    <div className="relative w-full h-64 rounded-lg overflow-hidden border border-border">
                      <img
                        src={imagePreview}
                        alt="Event preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          eventForm.setValue('image', undefined)
                        }}
                        className="absolute top-2 right-2 p-2 bg-background/80 rounded-full hover:bg-background"
                        disabled={isUploadingImage}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {isUploadingImage && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Uploading image...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
                {eventForm.formState.errors.image && (
                  <p className="text-sm text-destructive mt-1">
                    {String(eventForm.formState.errors.image.message)}
                  </p>
                )}
              </div>

              {/* Event Title */}
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  {...eventForm.register('title')}
                  placeholder="e.g., Spring Fest 2026"
                  className="mt-2"
                />
                {eventForm.formState.errors.title && (
                  <p className="text-sm text-destructive mt-1">
                    {String(eventForm.formState.errors.title.message)}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  {...eventForm.register('description')}
                  placeholder="Describe your event in detail..."
                  rows={6}
                  className="mt-2"
                />
                {eventForm.formState.errors.description && (
                  <p className="text-sm text-destructive mt-1">
                    {String(eventForm.formState.errors.description.message)}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  {...eventForm.register('category')}
                  className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-background"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {eventForm.formState.errors.category && (
                  <p className="text-sm text-destructive mt-1">
                    {String(eventForm.formState.errors.category.message)}
                  </p>
                )}
              </div>

              {/* Online/Offline Toggle */}
              <div className="flex items-center gap-4">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...eventForm.register('is_online')}
                    className="w-4 h-4"
                  />
                  <span>This is an online event</span>
                </Label>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">
                  {eventDetails.is_online ? 'Online Event Link/Platform *' : 'Location *'}
                </Label>
                <Input
                  id="location"
                  {...eventForm.register('location')}
                  placeholder={eventDetails.is_online ? 'e.g., Zoom, Google Meet, or event link' : 'e.g., Main Campus Amphitheater'}
                  className="mt-2"
                />
                {eventForm.formState.errors.location && (
                  <p className="text-sm text-destructive mt-1">
                    {String(eventForm.formState.errors.location.message)}
                  </p>
                )}
              </div>

              {/* Start Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    {...eventForm.register('start_date')}
                    className="mt-2"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {eventForm.formState.errors.start_date && (
                    <p className="text-sm text-destructive mt-1">
                      {String(eventForm.formState.errors.start_date.message)}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    {...eventForm.register('start_time')}
                    className="mt-2"
                  />
                  {eventForm.formState.errors.start_time && (
                    <p className="text-sm text-destructive mt-1">
                      {String(eventForm.formState.errors.start_time.message)}
                    </p>
                  )}
                </div>
              </div>

              {/* End Date & Time (Optional) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="end_date">End Date (Optional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    {...eventForm.register('end_date')}
                    className="mt-2"
                    min={eventDetails.start_date || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time (Optional)</Label>
                  <Input
                    id="end_time"
                    type="time"
                    {...eventForm.register('end_time')}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Ticket Types */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Ticket Types</h2>
              <p className="text-sm text-muted-foreground">
                Set up your ticket types and pricing. You can add multiple ticket types.
              </p>
              {Object.keys(ticketForm.formState.errors).length > 0 && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  Please fix the errors below before proceeding.
                </div>
              )}
            </div>

            <div className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="p-6 border border-border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Ticket Type {index + 1}</h3>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label>Ticket Name *</Label>
                    <Input
                      {...ticketForm.register(`ticket_types.${index}.name`)}
                      placeholder="e.g., General Admission, VIP, Early Bird"
                      className="mt-2"
                    />
                    {ticketForm.formState.errors.ticket_types?.[index]?.name && (
                      <p className="text-sm text-destructive mt-1">
                        {String(ticketForm.formState.errors.ticket_types[index]?.name?.message)}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Price (₦) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...ticketForm.register(`ticket_types.${index}.price`, {
                          valueAsNumber: true,
                        })}
                        placeholder="0.00"
                        className="mt-2"
                      />
                      {ticketForm.formState.errors.ticket_types?.[index]?.price && (
                        <p className="text-sm text-destructive mt-1">
                          {String(ticketForm.formState.errors.ticket_types[index]?.price?.message)}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        {...ticketForm.register(`ticket_types.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        placeholder="100"
                        className="mt-2"
                      />
                      {ticketForm.formState.errors.ticket_types?.[index]?.quantity && (
                        <p className="text-sm text-destructive mt-1">
                          {String(ticketForm.formState.errors.ticket_types[index]?.quantity?.message)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ name: '', price: 0, quantity: 100 })}
                className="w-full"
              >
                + Add Another Ticket Type
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Ticket Benefits */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Ticket Benefits (Optional)</h2>
              <p className="text-sm text-muted-foreground">
                Add benefits or details for each ticket type. This is optional.
              </p>
            </div>

            <div className="space-y-6">
              {benefitsForm.watch('ticket_types').length > 0 ? (
                benefitsForm.watch('ticket_types').map((ticket, index) => (
                  <div key={index} className="p-6 border border-border rounded-lg">
                    <h3 className="font-semibold mb-4">{ticket.name || `Ticket Type ${index + 1}`}</h3>
                    <div>
                      <Label>Benefits/Description (Optional)</Label>
                      <Textarea
                        {...benefitsForm.register(`ticket_types.${index}.description`)}
                        placeholder="e.g., Access to VIP area, Free drinks, Early entry..."
                        rows={4}
                        className="mt-2"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No ticket types found. Please go back to Step 2 and add ticket types.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Preview Event</h2>
              <p className="text-sm text-muted-foreground">
                Review your event details before publishing.
              </p>
            </div>

            <div className="space-y-6">
              {/* Event Image */}
              {imagePreview && (
                <div className="w-full h-64 rounded-lg overflow-hidden border border-border">
                  <img
                    src={imagePreview}
                    alt={eventDetails.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Event Details */}
              <div className="p-6 border border-border rounded-lg space-y-4">
                <div>
                  <h3 className="text-2xl font-bold">{eventDetails.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{eventDetails.category}</p>
                </div>

                <div>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {eventDetails.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{eventDetails.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date & Time</p>
                    <p className="font-medium">
                      {eventDetails.start_date && eventDetails.start_time
                        ? format(
                            new Date(`${eventDetails.start_date}T${eventDetails.start_time}`),
                            'MMM d, yyyy • h:mm a'
                          )
                        : 'Not set'}
                    </p>
                  </div>
                  {eventDetails.end_date && eventDetails.end_time && (
                    <div>
                      <p className="text-sm text-muted-foreground">End Date & Time</p>
                      <p className="font-medium">
                        {format(
                          new Date(`${eventDetails.end_date}T${eventDetails.end_time}`),
                          'MMM d, yyyy • h:mm a'
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Types */}
              <div className="p-6 border border-border rounded-lg space-y-4">
                <h3 className="font-semibold">Ticket Types</h3>
                {ticketTypes.map((ticket, index) => (
                  <div key={index} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{ticket.name}</p>
                        {ticketBenefits[index]?.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {ticketBenefits[index].description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {ticket.price === 0 ? 'Free' : `₦${ticket.price.toLocaleString()}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {ticket.quantity} tickets
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button 
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                nextStep()
              }} 
              variant="hero"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSubmit()
              }}
              variant="hero"
              disabled={createEventMutation.isPending || isUploadingImage}
            >
              {createEventMutation.isPending || isUploadingImage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isUploadingImage ? 'Uploading image...' : 'Creating event...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Event
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Restore Draft Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have a saved draft. Would you like to restore it?
              <br /><br />
              <strong>Note:</strong> If you had an image selected, you'll need to select it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft}>Discard Draft</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreDraft}>Restore Draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Form Validation Error</AlertDialogTitle>
            <AlertDialogDescription>
              Please fix all errors before creating the event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorDialog(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Draft Confirmation Dialog */}
      <AlertDialog open={showClearConfirmDialog} onOpenChange={setShowClearConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all saved draft data? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearSavedData()
                eventForm.reset({
                  is_online: false,
                  end_date: '',
                  end_time: '',
                })
                ticketForm.reset({
                  ticket_types: [{ name: '', price: 0, quantity: 100 }],
                })
                benefitsForm.reset({
                  ticket_types: [],
                })
                setImagePreview(null)
                setCurrentStep(1)
                setShowClearConfirmDialog(false)
                setShowClearSuccessDialog(true)
              }}
            >
              Clear Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Success Dialog */}
      <AlertDialog open={showClearSuccessDialog} onOpenChange={setShowClearSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Draft Cleared</AlertDialogTitle>
            <AlertDialogDescription>
              Draft cleared successfully
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowClearSuccessDialog(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

