"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Globe,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Share2,
  Mail,
  MessageCircle,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { PortalManagementResponse, PortalSettings as PortalSettingsType } from "@/types";

interface PortalSettingsProps {
  projectId: string;
  projectCode: string;
}

export function PortalSettings({ projectId, projectCode }: PortalSettingsProps) {
  const [portalData, setPortalData] = useState<PortalManagementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<PortalSettingsType>({
    showTimeline: true,
    showPhotos: true,
    showDocuments: false,
    showFinancials: false,
    showContacts: false,
    clientMessage: "",
  });

  const fetchPortalData = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/portal`);
      if (response.ok) {
        const data = await response.json();
        setPortalData(data);
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to fetch portal data:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  const enablePortal = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/portal`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setPortalData(data);
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to enable portal:", error);
    } finally {
      setSaving(false);
    }
  };

  const disablePortal = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/portal`, {
        method: "DELETE",
      });
      if (response.ok) {
        const data = await response.json();
        setPortalData(data);
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to disable portal:", error);
    } finally {
      setSaving(false);
    }
  };

  const regenerateCode = async () => {
    setSaving(true);
    try {
      // First disable, then enable to get a new code
      await fetch(`/api/projects/${projectId}/portal`, {
        method: "DELETE",
      });
      const response = await fetch(`/api/projects/${projectId}/portal`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setPortalData(data);
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to regenerate code:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = async (newSettings: Partial<PortalSettingsType>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      const response = await fetch(`/api/projects/${projectId}/portal`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: newSettings }),
      });
      if (response.ok) {
        const data = await response.json();
        setPortalData(data);
      }
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  const copyToClipboard = async () => {
    if (portalData?.portalUrl) {
      await navigator.clipboard.writeText(portalData.portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareViaWhatsApp = () => {
    if (portalData?.portalUrl) {
      const text = `View project ${projectCode} updates: ${portalData.portalUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const shareViaEmail = () => {
    if (portalData?.portalUrl) {
      const subject = `Project ${projectCode} Updates`;
      const body = `You can view project updates at: ${portalData.portalUrl}`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Client Portal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Client Portal
            </CardTitle>
            <CardDescription>
              Share project updates with clients via a public URL
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="portal-enabled" className="text-sm">
              {portalData?.enabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="portal-enabled"
              checked={portalData?.enabled || false}
              onCheckedChange={(checked) => {
                if (checked) {
                  enablePortal();
                } else {
                  disablePortal();
                }
              }}
              disabled={saving}
            />
          </div>
        </div>
      </CardHeader>

      {portalData?.enabled && portalData.portalUrl && (
        <CardContent className="space-y-6">
          {/* Portal URL Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Portal URL</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate">
                {portalData.portalUrl}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                asChild
              >
                <a href={portalData.portalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* Share Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={shareViaWhatsApp}>
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button variant="outline" size="sm" onClick={shareViaEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Link
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate Portal Link?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will invalidate the current link. Anyone with the old link will no longer have access.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={regenerateCode}>
                      Regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex items-center justify-center p-4 bg-white rounded-lg">
            <QRCodeSVG
              value={portalData.portalUrl}
              size={150}
              level="M"
              includeMargin
            />
          </div>

          <Separator />

          {/* Visibility Settings */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Visibility Settings</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="showTimeline"
                  checked={settings.showTimeline}
                  onCheckedChange={(checked) =>
                    updateSettings({ showTimeline: checked === true })
                  }
                />
                <Label htmlFor="showTimeline" className="text-sm font-normal cursor-pointer">
                  Show timeline / activity feed
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="showPhotos"
                  checked={settings.showPhotos}
                  onCheckedChange={(checked) =>
                    updateSettings({ showPhotos: checked === true })
                  }
                />
                <Label htmlFor="showPhotos" className="text-sm font-normal cursor-pointer">
                  Show project photos
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="showDocuments"
                  checked={settings.showDocuments}
                  onCheckedChange={(checked) =>
                    updateSettings({ showDocuments: checked === true })
                  }
                />
                <Label htmlFor="showDocuments" className="text-sm font-normal cursor-pointer">
                  Show documents
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="showFinancials"
                  checked={settings.showFinancials}
                  onCheckedChange={(checked) =>
                    updateSettings({ showFinancials: checked === true })
                  }
                />
                <Label htmlFor="showFinancials" className="text-sm font-normal cursor-pointer text-amber-600">
                  Show financial information (invoices, bills)
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="showContacts"
                  checked={settings.showContacts}
                  onCheckedChange={(checked) =>
                    updateSettings({ showContacts: checked === true })
                  }
                />
                <Label htmlFor="showContacts" className="text-sm font-normal cursor-pointer">
                  Show contact information
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Client Message */}
          <div className="space-y-3">
            <Label htmlFor="clientMessage" className="text-sm font-medium">
              Message for Clients
            </Label>
            <Textarea
              id="clientMessage"
              placeholder="Add a custom message that will be displayed on the portal (e.g., project status update, expected completion date)"
              value={settings.clientMessage}
              onChange={(e) => setSettings({ ...settings, clientMessage: e.target.value })}
              onBlur={() => updateSettings({ clientMessage: settings.clientMessage })}
              rows={3}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
