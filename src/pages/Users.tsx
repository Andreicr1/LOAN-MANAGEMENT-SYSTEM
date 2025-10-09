import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/authStore'
import { formatDateTime } from '@/lib/utils'

interface User {
  id: number
  username: string
  fullName: string
  role: string
  email?: string
  isActive: boolean
  lastLogin?: string
  createdAt: string
}

export const Users: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'operator' as 'admin' | 'operator' | 'viewer',
  })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.users.getAll()
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.username || !formData.password || !formData.fullName) {
      setFormError('Please fill in all required fields')
      return
    }

    try {
      const result = await window.electronAPI.users.create({
        ...formData,
        createdBy: currentUser?.id,
      })

      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'USER_CREATED', {
          username: formData.username,
          role: formData.role,
        })
        
        setShowModal(false)
        resetForm()
        loadUsers()
      } else {
        setFormError(result.error || 'Failed to create user')
      }
    } catch (error: any) {
      setFormError('An error occurred')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      const result = await window.electronAPI.users.update(editingUser.id, {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
      })

      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'USER_UPDATED', {
          userId: editingUser.id,
          username: editingUser.username,
        })
        
        setShowModal(false)
        setEditingUser(null)
        resetForm()
        loadUsers()
      }
    } catch (error) {
      setFormError('Failed to update user')
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return
    }

    try {
      const result = await window.electronAPI.users.delete(user.id)
      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'USER_DELETED', {
          userId: user.id,
          username: user.username,
        })
        loadUsers()
      } else {
        alert(result.error || 'Failed to delete user')
      }
    } catch (error) {
      alert('An error occurred')
    }
  }

  const handleResetPassword = async (user: User) => {
    const newPassword = prompt(`Enter new password for ${user.username}:`)
    if (!newPassword) return

    try {
      const result = await window.electronAPI.users.resetPassword(user.id, newPassword)
      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'PASSWORD_RESET', {
          userId: user.id,
          username: user.username,
        })
        alert('Password reset successfully. User must change it on next login.')
      }
    } catch (error) {
      alert('Failed to reset password')
    }
  }

  const openCreateModal = () => {
    setEditingUser(null)
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: '',
      fullName: user.fullName,
      email: user.email || '',
      role: user.role as any,
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      fullName: '',
      email: '',
      role: 'operator',
    })
    setFormError('')
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'approved' as const
      case 'operator': return 'disbursed' as const
      case 'viewer': return 'settled' as const
      default: return 'pending' as const
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">User Management</h1>
          <p className="text-text-secondary mt-1">Manage system users and permissions</p>
        </div>
        <Button onClick={openCreateModal}>
          New User
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-text-secondary py-8">Loading users...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-green-subtle border-b-2 border-border-gray">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Full Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Last Login</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border-gray hover:bg-green-subtle">
                      <td className="px-4 py-3 text-sm font-medium">{user.username}</td>
                      <td className="px-4 py-3 text-sm">{user.fullName}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{user.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={user.isActive ? 'disbursed' : 'cancelled'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="px-2 py-1 text-xs hover:bg-blue-50 rounded text-blue-600 font-medium"
                            title="Edit user"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="px-2 py-1 text-xs hover:bg-yellow-50 rounded text-yellow-600 font-medium"
                            title="Reset password"
                          >
                            Reset PWD
                          </button>
                          {user.id !== 1 && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="px-2 py-1 text-xs hover:bg-red-50 rounded text-red-500 font-medium"
                              title="Delete user"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingUser ? 'Edit User' : 'Create New User'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingUser ? handleUpdate : handleCreate} className="space-y-4">
                <Input
                  label="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingUser}
                  required
                />

                {!editingUser && (
                  <Input
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                )}

                <Input
                  label="Full Name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />

                <Input
                  label="Email (optional)"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />

                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2.5 text-sm border border-border-gray rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                    aria-label="User role"
                  >
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="submit" variant="primary" className="flex-1">
                    {editingUser ? 'Update' : 'Create'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false)
                      setEditingUser(null)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

