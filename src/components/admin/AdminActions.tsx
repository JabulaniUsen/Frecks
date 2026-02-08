'use client'

import { useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  adminDeleteEvent,
  adminBanUser,
  adminUpdateUserRole,
  adminUpdateEventStatus,
} from '@/lib/supabase/mutations'

interface AdminActionsProps {
  actionType: 'delete-event' | 'ban-user' | 'change-role' | 'change-status' | null
  selectedEvent: string | null
  selectedUser: string | null
  onClose: () => void
  onSuccess: () => void
}

export default function AdminActions({
  actionType,
  selectedEvent,
  selectedUser,
  onClose,
  onSuccess,
}: AdminActionsProps) {
  const [selectedRole, setSelectedRole] = useState<'user' | 'creator' | 'admin'>('user')
  const [selectedStatus, setSelectedStatus] = useState<'draft' | 'active' | 'completed' | 'cancelled'>('active')
  const [banAction, setBanAction] = useState<'ban' | 'unban'>('ban')
  const queryClient = useQueryClient()

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => adminDeleteEvent(eventId),
    onSuccess: () => {
      toast.success('Event deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete event')
    },
  })

  const banUserMutation = useMutation({
    mutationFn: ({ userId, banned }: { userId: string; banned: boolean }) =>
      adminBanUser(userId, banned),
    onSuccess: (_, variables) => {
      toast.success(variables.banned ? 'User banned successfully' : 'User unbanned successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update user status')
    },
  })

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'user' | 'creator' | 'admin' }) =>
      adminUpdateUserRole(userId, role),
    onSuccess: () => {
      toast.success('User role updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-organizers'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update user role')
    },
  })

  const changeStatusMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: 'draft' | 'active' | 'completed' | 'cancelled' }) =>
      adminUpdateEventStatus(eventId, status),
    onSuccess: () => {
      toast.success('Event status updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update event status')
    },
  })

  const handleDeleteEvent = () => {
    if (selectedEvent) {
      deleteEventMutation.mutate(selectedEvent)
    }
  }

  const handleBanUser = () => {
    if (selectedUser) {
      banUserMutation.mutate({ userId: selectedUser, banned: banAction === 'ban' })
    }
  }

  const handleChangeRole = () => {
    if (selectedUser) {
      changeRoleMutation.mutate({ userId: selectedUser, role: selectedRole })
    }
  }

  const handleChangeStatus = () => {
    if (selectedEvent) {
      changeStatusMutation.mutate({ eventId: selectedEvent, status: selectedStatus })
    }
  }

  // Delete Event Dialog
  if (actionType === 'delete-event' && selectedEvent) {
    return (
      <AlertDialog open={true} onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone. All associated tickets and orders will also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={deleteEventMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEventMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  // Ban User Dialog
  if (actionType === 'ban-user' && selectedUser) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{banAction === 'ban' ? 'Ban User' : 'Unban User'}</DialogTitle>
            <DialogDescription>
              {banAction === 'ban'
                ? 'Are you sure you want to ban this user? They will not be able to access the platform.'
                : 'Are you sure you want to unban this user? They will regain access to the platform.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 py-4">
            <Label>Action</Label>
            <Select value={banAction} onValueChange={(value: 'ban' | 'unban') => setBanAction(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ban">Ban User</SelectItem>
                <SelectItem value="unban">Unban User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleBanUser}
              disabled={banUserMutation.isPending}
              variant={banAction === 'ban' ? 'destructive' : 'default'}
            >
              {banUserMutation.isPending ? 'Processing...' : banAction === 'ban' ? 'Ban User' : 'Unban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Change Role Dialog
  if (actionType === 'change-role' && selectedUser) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Select a new role for this user. Changing to creator will create a creator profile if it doesn't exist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 py-4">
            <Label>Role</Label>
            <Select value={selectedRole} onValueChange={(value: 'user' | 'creator' | 'admin') => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={changeRoleMutation.isPending}>
              {changeRoleMutation.isPending ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Change Status Dialog
  if (actionType === 'change-status' && selectedEvent) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Event Status</DialogTitle>
            <DialogDescription>
              Select a new status for this event.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 py-4">
            <Label>Status</Label>
            <Select value={selectedStatus} onValueChange={(value: 'draft' | 'active' | 'completed' | 'cancelled') => setSelectedStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleChangeStatus} disabled={changeStatusMutation.isPending}>
              {changeStatusMutation.isPending ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return null
}

