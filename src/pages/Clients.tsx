import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/stores/authStore";
import { formatMoney, formatDateTime } from "@/lib/utils";

interface Client {
  id: number;
  name: string;
  taxId: string;
  address: string;
  jurisdiction: string;
  contactEmail?: string;
  contactPhone?: string;
  representativeName?: string;
  representativePassport?: string;
  representativeAddress?: string;
  creditLimit?: number;
  interestRateAnnual?: number;
  dayBasis?: 360 | 365;
  defaultDueDays?: number;
  signatories?: string;
  status: "Active" | "Inactive";
  notes?: string;
  createdBy: number;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClientFormData {
  name: string;
  taxId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  contactEmail: string;
  contactPhone: string;
  representativeName: string;
  representativePassport: string;
  representativeAddress: string;
  creditLimit: string;
  interestRateAnnual: string;
  dayBasis: 360 | 365;
  defaultDueDays: string;
  status: "Active" | "Inactive";
  notes: string;
}

const combineAddress = (line1: string, line2: string) =>
  [line1.trim(), line2.trim()].filter((part) => part.length > 0).join(", ");

const combineLocation = (
  city: string,
  state: string,
  zipCode: string,
  country: string,
) =>
  [city.trim(), state.trim(), zipCode.trim(), country.trim()]
    .filter((part) => part.length > 0)
    .join(", ");

const parseAddress = (address?: string): {
  addressLine1: string;
  addressLine2: string;
} => {
  if (!address) {
    return { addressLine1: "", addressLine2: "" };
  }

  const parts = address.split(",").map((part) => part.trim());
  if (parts.length <= 1) {
    return { addressLine1: address.trim(), addressLine2: "" };
  }

  const [line1, ...rest] = parts;
  return {
    addressLine1: line1,
    addressLine2: rest.join(", "),
  };
};

const parseLocation = (location?: string): {
  city: string;
  state: string;
  zipCode: string;
  country: string;
} => {
  if (!location) {
    return { city: "", state: "", zipCode: "", country: "" };
  }

  const parts = location.split(",").map((part) => part.trim());
  return {
    city: parts[0] || "",
    state: parts[1] || "",
    zipCode: parts[2] || "",
    country: parts.slice(3).join(", ") || "",
  };
};

const createEmptyForm = (): ClientFormData => ({
  name: "",
  taxId: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  contactEmail: "",
  contactPhone: "",
  representativeName: "",
  representativePassport: "",
  representativeAddress: "",
  creditLimit: "",
  interestRateAnnual: "",
  dayBasis: 360,
  defaultDueDays: "",
  status: "Active",
  notes: "",
});

const normalizeClientRecord = (record: any): Client => {
  const creditLimitRaw =
    record.creditLimit !== undefined ? record.creditLimit : record.credit_limit
  const interestRateRaw =
    record.interestRateAnnual !== undefined
      ? record.interestRateAnnual
      : record.interest_rate_annual
  const dayBasisRaw =
    record.dayBasis !== undefined ? record.dayBasis : record.day_basis
  const defaultDueRaw =
    record.defaultDueDays !== undefined
      ? record.defaultDueDays
      : record.default_due_days

  const creditLimit =
    creditLimitRaw === null || creditLimitRaw === undefined
      ? undefined
      : Number(creditLimitRaw)
  const interestRate =
    interestRateRaw === null || interestRateRaw === undefined
      ? undefined
      : Number(interestRateRaw)
  const dayBasis =
    dayBasisRaw === 360 || dayBasisRaw === 365
      ? (dayBasisRaw as 360 | 365)
      : undefined
  const defaultDue =
    defaultDueRaw === null || defaultDueRaw === undefined
      ? undefined
      : Number(defaultDueRaw)

  return {
    id: record.id,
    name: record.name,
    taxId: record.taxId ?? record.tax_id,
    address: record.address,
    jurisdiction: record.jurisdiction,
    contactEmail: record.contactEmail ?? record.contact_email ?? undefined,
    contactPhone: record.contactPhone ?? record.contact_phone ?? undefined,
    representativeName:
      record.representativeName ?? record.representative_name ?? undefined,
    representativePassport:
      record.representativePassport ??
      record.representative_passport ??
      undefined,
    representativeAddress:
      record.representativeAddress ??
      record.representative_address ??
      undefined,
    creditLimit,
    interestRateAnnual: interestRate,
    dayBasis,
    defaultDueDays: defaultDue,
    signatories: record.signatories ?? undefined,
    status: record.status,
    notes: record.notes ?? undefined,
    createdBy: Number(record.createdBy ?? record.created_by ?? 0),
    creatorName: record.creatorName ?? record.creator_name ?? undefined,
    createdAt: record.createdAt ?? record.created_at ?? '',
    updatedAt: record.updatedAt ?? record.updated_at ?? '',
  }
}

export const Clients: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(createEmptyForm());
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI?.clients?.getAll?.();
      const normalized = Array.isArray(data)
        ? data.map((item) => normalizeClientRecord(item))
        : [];
      setClients(normalized);
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingClient(null);
    setFormData(createEmptyForm());
    setShowForm(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    const addressParts = parseAddress(client.address);
    const locationParts = parseLocation(client.jurisdiction);

    setFormData({
      name: client.name,
      taxId: client.taxId,
      addressLine1: addressParts.addressLine1,
      addressLine2: addressParts.addressLine2,
      city: locationParts.city,
      state: locationParts.state,
      zipCode: locationParts.zipCode,
      country: locationParts.country,
      contactEmail: client.contactEmail || "",
      contactPhone: client.contactPhone || "",
      representativeName: client.representativeName || "",
      representativePassport: client.representativePassport || "",
      representativeAddress: client.representativeAddress || "",
      creditLimit:
        typeof client.creditLimit === "number"
          ? String(client.creditLimit)
          : "",
      interestRateAnnual:
        typeof client.interestRateAnnual === "number"
          ? String(client.interestRateAnnual)
          : "",
      dayBasis: client.dayBasis || 360,
      defaultDueDays:
        typeof client.defaultDueDays === "number"
          ? String(client.defaultDueDays)
          : "",
      status: client.status,
      notes: client.notes || "",
    });

    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.taxId.trim()) {
      alert("Please fill in the company name and tax ID.");
      return;
    }

    if (!formData.addressLine1.trim() || !formData.city.trim()) {
      alert("Please provide the street address and city.");
      return;
    }

    if (!formData.country.trim()) {
      alert("Please provide the country.");
      return;
    }

    if (!formData.representativeName.trim()) {
      alert("Please provide the representative's full name.");
      return;
    }

    if (!formData.representativePassport.trim()) {
      alert("Please provide the representative's passport number.");
      return;
    }

    if (!formData.representativeAddress.trim()) {
      alert("Please provide the representative's address.");
      return;
    }

    const representativeName = formData.representativeName.trim();
    const representativePassport = formData.representativePassport.trim();
    const representativeAddress = formData.representativeAddress.trim();

    if (!formData.creditLimit.trim() || Number(formData.creditLimit) <= 0) {
      alert("Please provide a valid credit limit.");
      return;
    }

    if (!formData.interestRateAnnual.trim()) {
      alert("Please provide a valid annual interest rate.");
      return;
    }

    if (!formData.defaultDueDays.trim()) {
      alert("Please provide default due days.");
      return;
    }

    const sanitizeNumericInput = (value: string) =>
      value.replace(/[,\\s]/g, "");

    const creditLimitNumber = Number(sanitizeNumericInput(formData.creditLimit));
    const interestRateNumber = Number(
      sanitizeNumericInput(formData.interestRateAnnual),
    );
    const defaultDueDaysNumber = Number(
      sanitizeNumericInput(formData.defaultDueDays),
    );

    if (!Number.isFinite(creditLimitNumber) || creditLimitNumber <= 0) {
      alert("Credit limit must be a positive number.");
      return;
    }

    if (!Number.isFinite(interestRateNumber)) {
      alert("Annual interest rate must be a valid number.");
      return;
    }

    if (
      !Number.isFinite(defaultDueDaysNumber) ||
      defaultDueDaysNumber < 0 ||
      !Number.isInteger(defaultDueDaysNumber)
    ) {
      alert("Default due days must be a whole number.");
      return;
    }

    const normalizedContactEmail = formData.contactEmail.trim();
    const autoSignatories =
      normalizedContactEmail && normalizedContactEmail.length > 0
        ? JSON.stringify([
            {
              name: representativeName || "Authorized Representative",
              email: normalizedContactEmail,
              role: "Primary Contact",
            },
          ])
        : undefined;

    const address = combineAddress(
      formData.addressLine1,
      formData.addressLine2,
    );
    const jurisdiction = combineLocation(
      formData.city,
      formData.state,
      formData.zipCode,
      formData.country,
    );

    const dataToSave = {
      name: formData.name.trim(),
      taxId: formData.taxId.trim(),
      address,
      jurisdiction,
      contactEmail: normalizedContactEmail || undefined,
      contactPhone: formData.contactPhone.trim() || undefined,
      representativeName,
      representativePassport,
      representativeAddress,
      creditLimit: creditLimitNumber,
      interestRateAnnual: interestRateNumber,
      dayBasis: formData.dayBasis,
      defaultDueDays: defaultDueDaysNumber,
      status: formData.status,
      notes: formData.notes.trim(),
      signatories: autoSignatories,
      createdBy: currentUser!.id,
    };

    try {
      let result;
      if (editingClient) {
        result = await window.electronAPI?.clients?.update?.(
          editingClient.id,
          dataToSave,
        );
      } else {
        result = await window.electronAPI?.clients?.create?.(dataToSave);
      }

      if (result.success) {
        alert(
          editingClient
            ? "Client updated successfully!"
            : "Client created successfully!",
        );
        setShowForm(false);
        loadClients();

        await window.electronAPI?.audit?.log?.(
          currentUser!.id,
          editingClient ? "CLIENT_UPDATED" : "CLIENT_CREATED",
          {
            clientId: editingClient?.id || (result as any).clientId || "new",
            clientName: formData.name,
          },
        );
      } else {
        alert(result.error || "Failed to save client");
      }
    } catch (error) {
      console.error("Error saving client:", error);
      alert("Failed to save client");
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Are you sure you want to delete client "${client.name}"?`))
      return;

    try {
      const result = await window.electronAPI?.clients?.delete?.(client.id);

      if (result?.success) {
        alert("Client deleted successfully!");
        loadClients();

        await window.electronAPI?.audit?.log?.(currentUser!.id, "CLIENT_DELETED", {
          clientId: client.id,
          clientName: client.name,
        });
      } else {
        alert(result?.error || "Failed to delete client");
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Failed to delete client");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Loading...</h1>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            {editingClient ? "Edit Client" : "New Client"}
          </h1>
          <Button variant="ghost" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Details */}
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Company Name *"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />

                <Input
                  label="Tax ID / EIN *"
                  value={formData.taxId}
                  onChange={(e) =>
                    setFormData({ ...formData, taxId: e.target.value })
                  }
                  required
                />

                <div className="md:col-span-2">
                  <Input
                    label="Street Address *"
                    value={formData.addressLine1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        addressLine1: e.target.value,
                      })
                    }
                    placeholder="123 Commerce Blvd"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Input
                    label="Suite / Address Line 2"
                    value={formData.addressLine2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        addressLine2: e.target.value,
                      })
                    }
                    placeholder="Suite 200"
                  />
                </div>

                <Input
                  label="City *"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  required
                />

                <Input
                  label="State / Province"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                />

                <Input
                  label="Postal Code"
                  value={formData.zipCode}
                  onChange={(e) =>
                    setFormData({ ...formData, zipCode: e.target.value })
                  }
                />

                <Input
                  label="Country *"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  required
                />

                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "Active" | "Inactive",
                      })
                    }
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

          {/* Credit Line Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Line Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                <Input
                  label="Credit Limit (USD)"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      creditLimit: e.target.value,
                    })
                  }
                  required
                />
                  <p className="text-xs text-text-secondary mt-1">
                    Maximum credit available for this client
                  </p>
                </div>

                <div>
                <Input
                  label="Annual Interest Rate (%)"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={formData.interestRateAnnual}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interestRateAnnual: e.target.value,
                    })
                  }
                  required
                />
                  <p className="text-xs text-text-secondary mt-1">
                    Interest rate for this client's promissory notes
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">
                    Day Basis for Interest Calculation
                  </label>
                  <select
                    value={formData.dayBasis}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dayBasis: parseInt(e.target.value) as 360 | 365,
                      })
                    }
                    className="w-full px-3 py-2.5 text-sm border border-border-gray rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                    aria-label="Day basis for interest calculation"
                  >
                    <option value="360">360 days (Standard)</option>
                    <option value="365">365 days (Actual)</option>
                  </select>
                </div>

                <div>
                <Input
                  label="Default Due Days"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={formData.defaultDueDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultDueDays: e.target.value,
                    })
                  }
                  required
                />
                  <p className="text-xs text-text-secondary mt-1">
                    Days after disbursement until payment due
                  </p>
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
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                  placeholder="contact@company.com"
                />

                <Input
                  label="Contact Phone"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </CardContent>
          </Card>

          {/* Authorized Representative */}
          <Card>
            <CardHeader>
              <CardTitle>Authorized Representative</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Representative Full Name *"
                    value={formData.representativeName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        representativeName: e.target.value,
                      })
                    }
                    placeholder="Full legal name"
                    required
                  />
                  <Input
                    label="Passport Number *"
                    value={formData.representativePassport}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        representativePassport: e.target.value,
                      })
                    }
                    placeholder="Passport / ID number"
                    required
                  />
                </div>

                <Input
                  label="Representative Address *"
                  value={formData.representativeAddress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      representativeAddress: e.target.value,
                    })
                  }
                  placeholder="Street, number, city, country"
                  required
                />

                <p className="text-xs text-text-secondary">
                  Documents will be delivered to the contact email defined above.
                  Update the contact email to change the recipient.
                </p>

                {formData.contactEmail ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-border-gray">
                    <div>
                      <p className="font-semibold text-sm text-text-primary">
                        {formData.representativeName || "Authorized Representative"}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formData.contactEmail}
                      </p>
                      {formData.representativePassport && (
                        <p className="text-xs text-text-secondary mt-1">
                          Passport: {formData.representativePassport}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-medium text-green-primary">
                      Signing Contact
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Add a contact email above to enable document delivery for this client.
                  </div>
                )}
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
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-border-gray rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary min-h-[100px]"
                placeholder="Additional notes about this client..."
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit">
              {editingClient ? "Update Client" : "Create Client"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Clients</h1>
          <p className="text-text-secondary mt-1">
            Manage client information and authorized signatories
          </p>
        </div>
        <Button onClick={handleCreateNew}>New Client</Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {clients.map((client) => {
          const locationParts = parseLocation(client.jurisdiction);
          const locationDisplay = combineLocation(
            locationParts.city,
            locationParts.state,
            locationParts.zipCode,
            locationParts.country,
          );
          const creditLimitDisplay =
            typeof client.creditLimit === "number"
              ? formatMoney(client.creditLimit)
              : "N/A";
          const interestRateDisplay =
            typeof client.interestRateAnnual === "number"
              ? `${client.interestRateAnnual}%`
              : "N/A";
          const defaultDueDisplay =
            typeof client.defaultDueDays === "number"
              ? `${client.defaultDueDays} days`
              : "N/A";
          const representativeNameDisplay =
            (client.representativeName &&
              client.representativeName.trim().length > 0 &&
              client.representativeName.trim()) ||
            client.name;
          const representativePassportDisplay =
            client.representativePassport &&
            client.representativePassport.trim().length > 0
              ? client.representativePassport.trim()
              : undefined;
          const representativeAddressDisplay =
            client.representativeAddress &&
            client.representativeAddress.trim().length > 0
              ? client.representativeAddress.trim()
              : undefined;

          return (
            <Card key={client.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-text-primary">
                        {client.name}
                      </h3>
                      <Badge variant={client.status.toLowerCase() as any}>
                        {client.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-text-secondary">
                          <span className="font-semibold">Tax ID:</span>{" "}
                          {client.taxId}
                        </p>
                        <p className="text-text-secondary">
                          <span className="font-semibold">Location:</span>{" "}
                          {locationDisplay || "Not provided"}
                        </p>
                        {client.contactEmail && (
                          <p className="text-text-secondary">
                            <span className="font-semibold">Email:</span>{" "}
                            {client.contactEmail}
                          </p>
                        )}
                        {client.contactPhone && (
                          <p className="text-text-secondary">
                            <span className="font-semibold">Phone:</span>{" "}
                            {client.contactPhone}
                          </p>
                        )}
                        <p className="text-text-secondary">
                          <span className="font-semibold">
                            Representative:
                          </span>{" "}
                          {representativeNameDisplay}
                        </p>
                        {representativePassportDisplay && (
                          <p className="text-text-secondary">
                            <span className="font-semibold">Passport:</span>{" "}
                            {representativePassportDisplay}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-text-secondary">
                          <span className="font-semibold">Address:</span>{" "}
                          {client.address || "Not provided"}
                        </p>
                        <p className="text-text-secondary">
                          <span className="font-semibold">Credit Limit:</span>{" "}
                          {creditLimitDisplay}
                        </p>
                        <p className="text-text-secondary">
                          <span className="font-semibold">Interest Rate:</span>{" "}
                          {interestRateDisplay}
                        </p>
                        <p className="text-text-secondary">
                          <span className="font-semibold">Default Due:</span>{" "}
                          {defaultDueDisplay}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border-gray">
                      <p className="text-xs font-semibold text-text-primary mb-2">
                        Document Recipient:
                      </p>
                      {client.contactEmail ? (
                        <span className="text-xs bg-green-subtle text-green-primary px-2 py-1 rounded border border-green-primary">
                          {representativeNameDisplay} ({client.contactEmail})
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          No contact email configured
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-text-secondary mt-3">
                      Created {formatDateTime(client.createdAt)} by{" "}
                      {client.creatorName || "System"}
                    </p>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(client)}
                    >
                      Edit
                    </Button>
                    {client.id !== 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(client)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {clients.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-text-secondary">
                No clients found. Create your first client!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};


