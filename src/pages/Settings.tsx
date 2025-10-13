import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { formatMoney, formatPercentage, formatDateTime } from "@/lib/utils";

interface Config {
  pnNumberFormat: string;
  lender: {
    name: string;
    taxId: string;
    address: string;
    jurisdiction: string;
  };
  lenderSignatories: Array<{ name: string; email: string; role: string }>;
  signwell?: {
    apiKey: string | null;
    testMode: boolean;
    hasApiKey: boolean;
  };
  email?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string | null;
    bankEmail: string | null;
    hasPassword: boolean;
  };
  requiresMasterSecret: boolean;
  signwellConfigured: boolean;
  emailConfigured: boolean;
}

type SettingsSection =
  | "organization"
  | "appearance"
  | "esignature"
  | "email"
  | "maintenance";

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const { t } = useLanguage();
  const theme = useTheme();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [showBackups, setShowBackups] = useState(false);
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("organization");

  const sections: { id: SettingsSection; label: string; description: string }[] =
    [
      {
        id: "organization",
        label: "Organization",
        description: "Lender profile, client info, and signatories",
      },
      {
        id: "appearance",
        label: "Brand & Appearance",
        description: "Theme colors and interface accents",
      },
      {
        id: "esignature",
        label: "E-Signature",
        description: "SignWell integration for electronic signatures",
      },
      {
        id: "email",
        label: "Email Delivery",
        description: "SMTP and bank notification settings",
      },
      {
        id: "maintenance",
        label: "Maintenance",
        description: "Backups and system maintenance",
      },
    ];

  const renderSectionContent = () => {
    if (!config) {
      return null;
    }

    switch (activeSection) {
      case "organization":
        return (
          <>
            {/* Lender Information */}
            <Card>
              <CardHeader>
                <CardTitle>Lender Information (WMF Corp)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Legal Name"
                    value={config.lender.name}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lender: { ...config.lender, name: e.target.value },
                      })
                    }
                  />

                  <Input
                    label="Tax ID / Registration Number"
                    value={config.lender.taxId}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lender: { ...config.lender, taxId: e.target.value },
                      })
                    }
                  />

                  <div className="md:col-span-2">
                    <Input
                      label="Address"
                      value={config.lender.address}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          lender: { ...config.lender, address: e.target.value },
                        })
                      }
                    />
                  </div>

                  <Input
                    label="Country / Region"
                    value={config.lender.jurisdiction}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lender: {
                          ...config.lender,
                          jurisdiction: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Client Information Note */}
            <Card className="border-2 border-green-primary bg-green-subtle">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-primary rounded-full flex items-center justify-center text-white font-bold">
                    i
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary mb-2">
                      Client Information & Credit Lines
                    </p>
                    <p className="text-sm text-text-secondary mb-3">
                      Credit limits, interest rates, and borrower information
                      are managed individually for each client. This allows you
                      to tailor terms to each relationship.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate("/clients")}
                    >
                      Manage Clients
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Authorized Signatories */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Authorized Signatories for DocuSign</CardTitle>
                  {config.requiresMasterSecret && (
                    <span className="text-xs font-medium text-red-600">
                      Master secret required para visualizar
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-3">
                      WMF Corp Signatories (Lender)
                    </h4>
                    <div className="space-y-2 text-sm">
                      {config.lenderSignatories &&
                      config.lenderSignatories.length > 0 ? (
                        config.lenderSignatories.map((sig, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded border border-border-gray"
                          >
                            <div>
                              <p className="font-semibold text-text-primary">
                                {sig.name}
                              </p>
                              <p className="text-xs text-text-secondary">
                                {sig.email} — {sig.role}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-text-secondary">
                          No signatories configured. Add them in Clients page.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border-gray">
                    <p className="text-xs text-text-secondary">
                      These signatories are used for DocuSign envelopes. You can
                      also manage client-specific signatories from the Clients
                      page.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        );
      case "appearance":
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.customization}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-6">
                  {t.settings.customizationDesc}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">
                      {t.settings.primaryColor}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={theme.colors.primary}
                        onChange={(e) =>
                          theme.updateColors({ primary: e.target.value })
                        }
                        className="w-16 h-10 rounded border border-border-gray cursor-pointer"
                        title="Select primary color"
                        aria-label="Primary color picker"
                      />
                      <span className="text-sm text-text-secondary font-mono">
                        {theme.colors.primary}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">
                      {t.settings.lightColor}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={theme.colors.primaryLight}
                        onChange={(e) =>
                          theme.updateColors({ primaryLight: e.target.value })
                        }
                        className="w-16 h-10 rounded border border-border-gray cursor-pointer"
                        title="Select light accent color"
                        aria-label="Light accent color picker"
                      />
                      <span className="text-sm text-text-secondary font-mono">
                        {theme.colors.primaryLight}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="mt-6"
                  onClick={() => {
                    theme.resetColors();
                    setMessage({
                      type: "success",
                      text: t.settings.success.colorsReset,
                    });
                    setTimeout(() => setMessage(null), 3000);
                  }}
                >
                  {t.settings.resetColors}
                </Button>

                <div className="mt-8 p-6 border border-border-gray rounded-lg bg-green-subtle/30">
                  <p className="text-sm font-semibold text-text-primary mb-4">
                    {t.settings.previewTheme}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary" size="sm">
                      Primary Button
                    </Button>
                    <Button variant="secondary" size="sm">
                      Secondary Button
                    </Button>
                    <div className="px-4 py-2 bg-green-primary text-white rounded-lg text-sm font-medium">
                      Primary Badge
                    </div>
                    <div className="px-4 py-2 bg-green-subtle text-green-primary rounded-lg text-sm font-medium border border-green-primary">
                      Subtle Badge
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        );
      case "esignature":
        return (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>SignWell Integration</CardTitle>
                  {config.signwellConfigured && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                      ✓ Configured
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      i
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-2">
                        About SignWell
                      </p>
                      <p className="text-sm text-blue-800 mb-3">
                        SignWell is an electronic signature platform that allows you to send documents for signature directly from the application. It features embedded requesting, allowing you to prepare documents in an iframe before sending.
                      </p>
                      <a
                        href="https://www.signwell.com/api/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        Get your API token from SignWell →
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <Input
                    label="API Token"
                    type="password"
                    value={
                      config.signwell?.hasApiKey && config.requiresMasterSecret
                        ? "********"
                        : config.signwell?.apiKey || ""
                    }
                    onChange={(e) => updateSignWell("apiKey", e.target.value)}
                    placeholder="Enter your SignWell API token"
                    disabled={config.requiresMasterSecret}
                  />

                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.signwell?.testMode || false}
                        onChange={(e) => updateSignWell("testMode", e.target.checked)}
                        className="mr-3 w-5 h-5 text-green-primary border-border-gray rounded focus:ring-2 focus:ring-green-primary"
                        disabled={config.requiresMasterSecret}
                      />
                      <div>
                        <span className="text-sm font-semibold text-text-primary">
                          Test Mode
                        </span>
                        <p className="text-xs text-text-secondary mt-1">
                          Enable test mode for development and testing. Documents created in test mode won't be charged.
                        </p>
                      </div>
                    </label>
                  </div>

                  {config.signwellConfigured && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-semibold text-green-800 mb-2">
                        ✓ SignWell is configured and ready to use
                      </p>
                      <p className="text-xs text-green-700">
                        You can now send Promissory Notes and Wire Transfer Orders for electronic signature.
                        {config.signwell?.testMode && " (Currently in TEST MODE)"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        );
      case "email":
        return (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Email Configuration</CardTitle>
                  {config.requiresMasterSecret && (
                    <span className="text-xs font-medium text-red-600">
                      Master secret required para editar
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="SMTP Host"
                    value={config.email?.host || "smtp.gmail.com"}
                    onChange={(e) => updateEmail("host", e.target.value)}
                    disabled={config.requiresMasterSecret}
                  />

                  <Input
                    label="SMTP Port"
                    numeric
                    value={String(config.email?.port || 587)}
                    onChange={(e) => updateEmail("port", parseInt(e.target.value))}
                    disabled={config.requiresMasterSecret}
                  />

                  <Input
                    label="Email User"
                    value={config.email?.user || "operations@wmf-corp.com"}
                    onChange={(e) => updateEmail("user", e.target.value)}
                    disabled={config.requiresMasterSecret}
                  />

                  <Input
                    label="Email Password"
                    type="password"
                    value={
                      config.email?.hasPassword && config.requiresMasterSecret
                        ? "********"
                        : config.email?.pass || ""
                    }
                    onChange={(e) => updateEmail("pass", e.target.value)}
                    placeholder="Enter email password"
                    disabled={config.requiresMasterSecret}
                  />

                  <Input
                    label="Bank Email Address"
                    value={config.email?.bankEmail || ""}
                    onChange={(e) => updateEmail("bankEmail", e.target.value)}
                    placeholder="bank@example.com"
                    disabled={config.requiresMasterSecret}
                  />

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.email?.secure || false}
                        onChange={(e) => updateEmail("secure", e.target.checked)}
                        className="mr-2"
                        disabled={config.requiresMasterSecret}
                      />
                      <span className="text-sm font-medium">Use SSL/TLS</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        );
      case "maintenance":
        return (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t.settings.database}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowBackups(!showBackups)}
                    >
                      {showBackups
                        ? "Hide Backups"
                        : `View Backups (${backups.length})`}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleBackup}>
                      Create Backup
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">
                  Automatic backups are created daily. You can also create manual
                  backups at any time.
                </p>

                {showBackups && backups.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-semibold text-text-primary mb-2">
                      Available Backups:
                    </p>
                    {backups.slice(0, 5).map((backup) => (
                      <div
                        key={backup.name}
                        className="flex items-center justify-between p-2 border border-border-gray rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{backup.name}</p>
                          <p className="text-xs text-text-secondary">
                            {formatDateTime(backup.created)} |{" "}
                            {(backup.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(backup.name)}
                        >
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        );
      default:
        return null;
    }
  };

  // Helper functions to safely update nested config properties
  const updateSignWell = (
    field: keyof NonNullable<Config["signwell"]>,
    value: any,
  ) => {
    if (!config || config.requiresMasterSecret) return;

    setConfig({
      ...config,
      signwell: {
        apiKey: config.signwell?.apiKey ?? null,
        testMode: config.signwell?.testMode ?? false,
        hasApiKey: config.signwell?.hasApiKey ?? false,
        [field]: value,
      },
    });
  };

  const updateEmail = (
    field: keyof NonNullable<Config["email"]>,
    value: any,
  ) => {
    if (!config || config.requiresMasterSecret) return;

    setConfig({
      ...config,
      email: {
        host: config.email?.host || "smtp.gmail.com",
        port: config.email?.port || 587,
        secure: config.email?.secure || false,
        user: config.email?.user || "operations@wmf-corp.com",
        pass: config.email?.pass ?? null,
        bankEmail: config.email?.bankEmail ?? null,
        hasPassword: config.email?.hasPassword ?? false,
        [field]: value,
      },
    });
  };

  useEffect(() => {
    loadConfig();
    loadBackups();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.config.get();
      if (data?.error === "MASTER_SECRET_REQUIRED") {
        setConfig({
          pnNumberFormat: "",
          lender: {
            name: "",
            taxId: "",
            address: "",
            jurisdiction: "",
          },
          lenderSignatories: [],
          signwell: {
            apiKey: null,
            testMode: true,
            hasApiKey: false,
          },
          email: {
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            user: "operations@wmf-corp.com",
            pass: null,
            bankEmail: null,
            hasPassword: false,
          },
          requiresMasterSecret: true,
          signwellConfigured: false,
          emailConfigured: false,
        });
        return;
      }
      setConfig(data);
    } catch (error) {
      console.error("Failed to load config:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBackups = async () => {
    try {
      const data = await window.electronAPI.backup.list();
      setBackups(data);
    } catch (error) {
      console.error("Failed to load backups:", error);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    if (config.requiresMasterSecret) {
      alert("Desbloqueie a master secret antes de salvar as configurações.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Transform the config to match backend format
      const configToSave = {
        pnNumberFormat: config.pnNumberFormat,
        lender: config.lender,
        lenderSignatories: config.lenderSignatories,
        signwell: {
          apiKey: config.signwell?.apiKey || null,
          testMode: config.signwell?.testMode ?? true,
        },
        email: {
          host: config.email?.host || "smtp.gmail.com",
          port: config.email?.port || 587,
          secure: config.email?.secure || false,
          user: config.email?.user || "operations@wmf-corp.com",
          pass: config.email?.pass || null,
          bankEmail: config.email?.bankEmail || null,
        },
      };

      const result = await window.electronAPI.config.update(configToSave);

      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, "CONFIG_UPDATED", {
          signwellConfigured: !!config.signwell?.apiKey,
          emailConfigured: !!config.email?.pass,
        });

        setMessage({ type: "success", text: "Settings saved successfully" });
        
        // Reload config to confirm it was saved
        await loadConfig();
        
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to save settings",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      const result = await window.electronAPI.backup.create();

      if (result.success) {
        await window.electronAPI.audit.log(
          currentUser!.id,
          "DATABASE_BACKUP_CREATED",
          {
            backupFile: result.backupFile,
          },
        );

        setMessage({ type: "success", text: "Backup created successfully" });
        loadBackups();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to create backup",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    }
  };

  const handleRestore = async (backupFile: string) => {
    if (
      !confirm(
        `Restore database from ${backupFile}? This will overwrite current data.`,
      )
    ) {
      return;
    }

    try {
      const result = await window.electronAPI.backup.restore(backupFile);

      if (result.success) {
        await window.electronAPI.audit.log(
          currentUser!.id,
          "DATABASE_RESTORED",
          {
            backupFile,
          },
        );

        alert(
          "Database restored successfully. The application will now restart.",
        );
        window.location.reload();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to restore backup",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    }
  };

  const handleUnlock = async () => {
    const secret = prompt("Informe a master secret para desbloquear credenciais:");
    if (secret) {
      const configApi = window.electronAPI.config as unknown as {
        unlock: (secret: string) => Promise<{ success: boolean; error?: string }>
      };
      const result = await configApi.unlock(secret);
      if (!result.success) {
        alert(result.error || "Falha ao desbloquear credenciais");
        return;
      }

      loadConfig();
    }
  };

  if (loading && !config) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Settings</h1>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-text-secondary">
              Loading settings...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Settings</h1>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-text-secondary">
              Unable to load settings. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Settings</h1>
          <p className="text-sm text-text-secondary mt-1">
            Configure system preferences and integrations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {config.requiresMasterSecret && (
            <Button variant="secondary" onClick={handleUnlock}>
              Unlock Sensitive Fields
            </Button>
          )}
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="md:w-72">
          <nav className="bg-white border border-border-gray rounded-lg divide-y divide-border-gray">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    isActive
                      ? "bg-green-subtle/60 border-l-4 border-green-primary text-text-primary"
                      : "hover:bg-green-subtle/40 text-text-secondary"
                  }`}
                >
                  <p className="text-sm font-semibold">{section.label}</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {section.description}
                  </p>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="flex-1 space-y-6">
          {renderSectionContent()}
        </section>
      </div>
    </div>
  );
};

