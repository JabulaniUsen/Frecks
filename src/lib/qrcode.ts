import QRCode from 'qrcode'
import { supabase } from './supabase'

export interface QRCodeData {
  ticketId: string
  orderId: string
  eventId: string
  timestamp: number
  validationUrl?: string
  qrCodeImage?: string // Temporary data URL before upload
  qrCodeImageUrl?: string // Public URL after upload to storage
}

/**
 * Generate QR code data URL from ticket information
 */
export const generateQRCodeDataURL = async (data: QRCodeData): Promise<string> => {
  // Use validation URL if provided, otherwise construct it
  const qrData = data.validationUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/ticket/${data.ticketId}`
  
  try {
    const dataURL = await (QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      width: 300,
    } as any) as unknown as Promise<string>)
    return dataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw error
  }
}

/**
 * Generate QR code and upload to storage bucket
 * Returns the public URL of the uploaded QR code
 */
export const generateAndUploadQRCode = async (
  data: QRCodeData,
  userId: string
): Promise<string> => {
  try {
    // Generate QR code as data URL
    const dataURL = await generateQRCodeDataURL(data)
    
    // Convert data URL to blob
    const response = await fetch(dataURL)
    const blob = await response.blob()
    
    // Create a File from the blob
    const file = new File([blob], `qr-${data.ticketId}.png`, { type: 'image/png' })
    
    // Upload to storage bucket
    const filePath = `${userId}/${data.ticketId}.png`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ticket-qr')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Allow updating if QR code already exists
      })
    
    if (uploadError) {
      if (uploadError.message?.includes('Bucket not found')) {
        throw new Error('Storage bucket "ticket-qr" not found. Please create it in your Supabase dashboard.')
      } else if (uploadError.message?.includes('new row violates row-level security')) {
        throw new Error('Permission denied. Please check storage bucket policies.')
      } else {
        throw new Error(`QR code upload failed: ${uploadError.message}`)
      }
    }
    
    if (!uploadData) {
      throw new Error('Upload succeeded but no data returned')
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('ticket-qr')
      .getPublicUrl(filePath)
    
    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded QR code')
    }
    
    return urlData.publicUrl
  } catch (error: any) {
    console.error('Error generating and uploading QR code:', error)
    throw error
  }
}

/**
 * Parse QR code data from string
 */
export const parseQRCodeData = (dataString: string): QRCodeData | null => {
  try {
    return JSON.parse(dataString) as QRCodeData
  } catch (error) {
    console.error('Error parsing QR code data:', error)
    return null
  }
}

