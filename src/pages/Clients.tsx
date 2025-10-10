import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/authStore'
import { formatMoney, formatDateTime } from '@/lib/utils'

interface Client {
  id: number
  name: string
  taxId: string
  address: string
  jurisdiction: string
  contactEmail?: string
  contactPhone?: string
  signatories?: string
  status: 'Active' | 'Inactive'
  notes?: string
  createdBy: number
  creatorName?: string
  createdAt: string
  updatedAt: string
}

interface Signatory {
  name: string
  email: string
  role: string
}

export const Clients: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    taxId: '',
    address: '',
    jurisdiction: '',
    contactEmail: '',
    contactPhone: '',
    status: 'Active',
    notes: ''
  })
  const [signatories, setSignatories] = useState<Signatory[]>([])
  const [newSignatory, setNewSignatory] = useState<Signatory>({ name: '', email: '', role: '' })

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.clients.getAll()
      setClients(data)
    } catch (error) {
      console.error('Failed to load clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingClient(null)
    setFormData({
      name: '',
      taxId: '',
      address: '',
      jurisdiction: '',
      contactEmail: '',
      contactPhone: '',
      status: 'Active',
      notes: ''
    })
    setSignatories([])
    setShowForm(true)
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      taxId: client.taxId,
      address: client.address,
      jurisdiction: client.jurisdiction,
      contactEmail: client.contactEmail || '',
      contactPhone: client.contactPhone || '',
      status: client.status,
      notes: client.notes || ''
    })
    
    if (client.signatories) {
      try {
        setSignatories(JSON.parse(client.signatories))
      } catch {
        setSignatories([])
      }
    } else {
      setSignatories([])
    }
    
    setShowForm(true)
  }

  const handleAddSignatory = () => {
    if (!newSignatory.name || !newSignatory.email) {
      alert('Please fill in signatory name and email')
      return
    }
    
    setSignatories([...signatories, newSignatory])
    setNewSignatory({ name: '', email: '', role: '' })
  }

  const handleRemoveSignatory = (index: number) => {
    setSignatories(signatories.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.taxId || !formData.address || !formData.jurisdiction) {
      alert('Please fill in all required fields')
      return
    }

    const dataToSave = {
      ...formData,
      signatories: signatories.length > 0 ? JSON.stringify(signatories) : null,
      createdBy: currentUser!.id
    }

    try {
      let result
      if (editingClient) {
        result = await window.electronAPI.clients.update(editingClient.id, dataToSave)
      } else {
        result = await window.electronAPI.clients.create(dataToSave)
      }

      if (result.success) {
        alert(editingClient ? 'Client updated successfully!' : 'Client created successfully!')
        setShowForm(false)
        loadClients()
        
        await window.electronAPI.audit.log(currentUser!.id, editingClient ? 'CLIENT_UPDATED' : 'CLIENT_CREATED', {
          clientId: editingClient?.id || (result as any).clientId || 'new',
          clientName: formData.name
        })
      } else {
        alert(result.error || 'Failed to save client')
      }
    } catch (error) {
      console.error('Error saving client:', error)
      alert('Failed to save client')
    }
  }

  const handleDelete = async (client: Client) => {
    if (!confirm(`Are you sure you want to delete client "${client.name}"?`)) return

    try {
      const result = await window.electronAPI.clients.delete(client.id)
      
      if (result.success) {
        alert('Client deleted successfully!')
        loadClients()
        
        await window.electronAPI.audit.log(currentUser!.id, 'CLIENT_DELETED', {
          clientId: client.id,
          clientName: client.name
        })
      } else {
        alert(result.error || 'Failed to delete client')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Failed to delete client')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-text-primary">Loading...</h1>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-text-primary">
            {editingClient ? 'Edit Client' : 'New Client'}
          </h1>
          <Button variant="ghost" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Client Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                
                <Input
                  label="Tax ID / EIN *"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  required
                />
                
                <div className="md:col-span-2">
                  <Input
                    label="Address *"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                
                <Input
                  label="Jurisdiction *"
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                  placeholder="e.g., Florida, USA"
                  required
                />
                
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full px-3 py-2.5 text-sm border border-border-gray rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                    aria-label="Client status"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Contact Email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="contact@company.com"
                />
                
                <Input
                  label="Contact Phone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </CardContent>
          </Card>

          {/* Authorized Signatories */}
          <Card>
            <CardHeader>
              <CardTitle>Authorized Signatories for DocuSign</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {signatories.length > 0 && (
                  <div className="space-y-2">
                    {signatories.map((sig, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-border-gray">
                        <div>
                          <p className="font-semibold text-sm text-text-primary">{sig.name}</p>
                          <p className="text-xs text-text-secondary">{sig.email} {sig.role && `• ${sig.role}`}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSignatory(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <Input
                    label="Signatory Name"
                    value={newSignatory.name}
                    onChange={(e) => setNewSignatory({ ...newSignatory, name: e.target.value })}
                    placeholder="John Doe"
                  />
                  
                  <Input
                    label="Email"
                    type="email"
                    value={newSignatory.email}
                    onChange={(e) => setNewSignatory({ ...newSignatory, email: e.target.value })}
                    placeholder="john@company.com"
                  />
                  
                  <Input
                    label="Role (Optional)"
                    value={newSignatory.role}
                    onChange={(e) => setNewSignatory({ ...newSignatory, role: e.target.value })}
                    placeholder="CEO, CFO, etc."
                  />
                  
                  <Button type="button" variant="secondary" onClick={handleAddSignatory}>
                    Add Signatory
                  </Button>
                </div>

                <p className="text-xs text-text-secondary">
                  These signatories will be used for automatic DocuSign signature requests
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border-gray rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary min-h-[100px]"
                placeholder="Additional notes about this client..."
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit">
              {editingClient ? 'Update Client' : 'Create Client'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Clients</h1>
          <p className="text-text-secondary mt-1">Manage client information and authorized signatories</p>
        </div>
        <Button onClick={handleCreateNew}>
          New Client
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {clients.map((client) => (
          <Card key={client.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-text-primary">{client.name}</h3>
                    <Badge variant={client.status.toLowerCase() as any}>
                      {client.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-text-secondary"><span className="font-semibold">Tax ID:</span> {client.taxId}</p>
                      <p className="text-text-secondary"><span className="font-semibold">Jurisdiction:</span> {client.jurisdiction}</p>
                      {client.contactEmail && (
                        <p className="text-text-secondary"><span className="font-semibold">Email:</span> {client.contactEmail}</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-text-secondary"><span className="font-semibold">Address:</span> {client.address}</p>
                      {client.contactPhone && (
                        <p className="text-text-secondary"><span className="font-semibold">Phone:</span> {client.contactPhone}</p>
                      )}
                    </div>
                  </div>

                  {client.signatories && (
                    <div className="mt-3 pt-3 border-t border-border-gray">
                      <p className="text-xs font-semibold text-text-primary mb-2">Authorized Signatories:</p>
                      <div className="flex flex-wrap gap-2">
                        {JSON.parse(client.signatories).map((sig: Signatory, idx: number) => (
                          <span key={idx} className="text-xs bg-green-subtle text-green-primary px-2 py-1 rounded border border-green-primary">
                            {sig.name} ({sig.email})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-text-secondary mt-3">
                    Created {formatDateTime(client.createdAt)} by {client.creatorName}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(client)}>
                    Edit
                  </Button>
                  {client.id !== 1 && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(client)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {clients.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-text-secondary">No clients found. Create your first client!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

