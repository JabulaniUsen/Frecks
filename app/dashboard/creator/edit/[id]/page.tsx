'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { updateEvent } from '@/lib/supabase/mutations'
import { getEventById } from '@/lib/supabase/queries'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, ArrowRight, X, Check, Loader2, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'

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
  id: z.string().optional(),
  name: z.string().min(1, 'Ticket name is required'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
})

type EventDetailsForm = z.infer<typeof eventDetailsSchema>
type TicketTypeForm = z.infer<typeof ticketTypeSchema>

export default function EditEventPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string
  const { profile, user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Fetch event data
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEventById(eventId),
    enabled: !!eventId,
  })

  // Initialize forms with event data
  const eventForm = useForm<EventDetailsForm>({
    resolver: zodResolver(eventDetailsSchema),
    defaultValues: {
      is_online: false,
      end_date: '',
      end_time: '',
    },
  })

  const ticketForm = useForm<{ ticket_types: TicketTypeForm[] }>({
    defaultValues: {
      ticket_types: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: ticketForm.control,
    name: 'ticket_types',
  })

  const benefitsForm = useForm<{ ticket_types: Array<{ description?: string }> }>({
    defaultValues: {
      ticket_types: [],
    },
  })

  // Populate forms when event data loads
  useEffect(() => {
    if (eventData) {
      const eventDate = new Date(eventData.date)
      const isOnline = eventData.location?.startsWith('Online -') || false
      const location = isOnline ? eventData.location.replace('Online - ', '') : eventData.location

      eventForm.reset({
        title: eventData.title || '',
        description: eventData.description || '',
        category: eventData.category || '',
        is_online: isOnline,
        location: location || '',
        start_date: format(eventDate, 'yyyy-MM-dd'),
        start_time: format(eventDate, 'HH:mm'),
        end_date: '',
        end_time: '',
      })

      if (eventData.image_url) {
        setImagePreview(eventData.image_url)
      }

      if (eventData.ticket_types && eventData.ticket_types.length > 0) {
        ticketForm.reset({
          ticket_types: eventData.ticket_types.map((tt: any) => ({
            id: tt.id,
            name: tt.name || '',
            price: tt.price || 0,
            quantity: tt.quantity || 0,
          })),
        })

        benefitsForm.reset({
          ticket_types: eventData.ticket_types.map((tt: any) => ({
            description: tt.description || '',
          })),
        })
      }
    }
  }, [eventData, eventForm, ticketForm, benefitsForm])

  const eventDetails = eventForm.watch()
  const ticketTypes = ticketForm.watch('ticket_types')
  const ticketBenefits = benefitsForm.watch('ticket_types')

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

          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }
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

  const uploadImage = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated')

    const compressedFile = await compressImage(file)
    const fileExt = 'jpg'
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const filePath = fileName

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(filePath, compressedFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`)
    }

    const { data: urlData } = supabase.storage
      .from('event-images')
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image')
    }

    return urlData.publicUrl
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        eventForm.setError('image', { message: 'Please upload an image file' })
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        eventForm.setError('image', { message: 'Image must be less than 5MB' })
        return
      }

      eventForm.setValue('image', file)
      eventForm.clearErrors('image')
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const updateEventMutation = useMutation({
    mutationFn: async () => {
      if (!user || !profile) throw new Error('User not authenticated')

      let imageUrl: string | undefined = eventData?.image_url
      const imageFile = eventForm.getValues('image')
      
      if (imageFile) {
        setIsUploadingImage(true)
        try {
          imageUrl = await uploadImage(imageFile)
        } catch (error: any) {
          console.warn('Image upload failed, keeping existing image:', error.message)
        } finally {
          setIsUploadingImage(false)
        }
      }

      const startDateTime = new Date(`${eventDetails.start_date}T${eventDetails.start_time}`)
      const location = eventDetails.is_online 
        ? `Online - ${eventDetails.location}` 
        : eventDetails.location

      const ticketTypesWithBenefits = ticketTypes.map((tt, index) => ({
        id: tt.id,
        name: tt.name,
        price: tt.price,
        quantity: tt.quantity,
        description: ticketBenefits[index]?.description || '',
        is_free: tt.price === 0,
      }))

      await updateEvent(eventId, {
        title: eventDetails.title,
        description: eventDetails.description,
        category: eventDetails.category,
        image_url: imageUrl,
        date: startDateTime.toISOString(),
        location,
        ticket_types: ticketTypesWithBenefits,
      })
    },
    onSuccess: () => {
      toast.success('Event updated successfully!')
      router.push('/dashboard/creator')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update event')
      setIsUploadingImage(false)
    },
  })

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

      const currentTicketTypes = ticketForm.getValues('ticket_types')
      benefitsForm.reset({
        ticket_types: currentTicketTypes.map(tt => ({
          description: ticketBenefits.find((tb, i) => i === ticketTypes.indexOf(tt))?.description || '',
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
      toast.error('Please fix all errors before updating the event.')
      return
    }

    await updateEventMutation.mutateAsync()
  }

  if (!user || !profile || profile.role !== 'creator') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-2">Access Denied</p>
          <p className="text-sm text-muted-foreground">Only creators can edit events.</p>
        </div>
      </div>
    )
  }

  if (isLoadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-2">Event not found</p>
          <Link href="/dashboard/creator">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
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
                <h1 className="text-2xl font-bold">Edit Event</h1>
                <p className="text-sm text-muted-foreground">Step {currentStep} of 4</p>
              </div>
            </div>
          </div>

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
                Update your event information.
              </p>
            </div>

            <div className="space-y-6">
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
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    {...eventForm.register('start_date')}
                    className="mt-2"
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
            </div>
          </div>
        )}

        {/* Step 2: Ticket Types */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Ticket Types</h2>
              <p className="text-sm text-muted-foreground">
                Update your ticket types and pricing.
              </p>
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
                Update benefits or details for each ticket type.
              </p>
            </div>

            <div className="space-y-6">
              {benefitsForm.watch('ticket_types').length > 0 ? (
                benefitsForm.watch('ticket_types').map((ticket, index) => (
                  <div key={index} className="p-6 border border-border rounded-lg">
                    <h3 className="font-semibold mb-4">{ticketTypes[index]?.name || `Ticket Type ${index + 1}`}</h3>
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
                Review your event details before updating.
              </p>
            </div>

            <div className="space-y-6">
              {imagePreview && (
                <div className="w-full h-64 rounded-lg overflow-hidden border border-border">
                  <img
                    src={imagePreview}
                    alt={eventDetails.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

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
                </div>
              </div>

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
              disabled={updateEventMutation.isPending || isUploadingImage}
            >
              {updateEventMutation.isPending || isUploadingImage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isUploadingImage ? 'Uploading image...' : 'Updating event...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Update Event
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

