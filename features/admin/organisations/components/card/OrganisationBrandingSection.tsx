'use client';

import { useState, useRef } from "react";
import {
  PhotoIcon,
  SwatchIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import type { TenantBranding } from "../../types";

type OrganisationBrandingSectionProps = {
  tenantId: string;
  branding: TenantBranding | null;
  organisationName: string;
  onRefresh: () => void;
};

// Theme options
const themeOptions = [
  { value: 'light', label: 'Ljust' },
  { value: 'dark', label: 'Mörkt' },
  { value: 'auto', label: 'Automatiskt (system)' },
] as const;

// Color picker component
function ColorPicker({ 
  label, 
  value, 
  onChange,
  disabled = false,
}: { 
  label: string; 
  value: string | null; 
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value || '#3b82f6');
  
  const handleColorChange = (newColor: string) => {
    setLocalValue(newColor);
    onChange(newColor);
  };
  
  const handleClear = () => {
    setLocalValue('#3b82f6');
    onChange(null);
  };
  
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={localValue}
          onChange={(e) => handleColorChange(e.target.value)}
          disabled={disabled}
          className="h-9 w-9 cursor-pointer overflow-hidden rounded-md border border-input disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <Input
          type="text"
          value={value || ''}
          placeholder="#3b82f6"
          onChange={(e) => handleColorChange(e.target.value)}
          disabled={disabled}
          className="flex-1 font-mono text-xs h-9"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="h-9 px-2 text-muted-foreground hover:text-destructive"
          >
            ×
          </Button>
        )}
      </div>
    </div>
  );
}

export function OrganisationBrandingSection({
  tenantId,
  branding,
  organisationName,
  onRefresh,
}: OrganisationBrandingSectionProps) {
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Local state for form
  const [brandNameOverride, setBrandNameOverride] = useState(branding?.brandNameOverride || '');
  const [primaryColor, setPrimaryColor] = useState<string | null>(branding?.primaryColor || null);
  const [secondaryColor, setSecondaryColor] = useState<string | null>(branding?.secondaryColor || null);
  const [accentColor, setAccentColor] = useState<string | null>(branding?.accentColor || null);
  const [theme, setTheme] = useState<string>(branding?.theme || 'auto');
  
  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toastError("Endast bildfiler är tillåtna");
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toastError("Bilden får inte vara större än 2MB");
      return;
    }
    
    setIsUploading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(fileName);
      
      // Update or insert branding record
      if (branding?.id) {
        const { error: updateError } = await supabase
          .from('tenant_branding')
          .update({ 
            logo_url: urlData.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', branding.id);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('tenant_branding')
          .insert({
            tenant_id: tenantId,
            logo_url: urlData.publicUrl,
          });
        
        if (insertError) throw insertError;
      }
      
      // Log audit event
      await supabase.from('tenant_audit_logs').insert({
        tenant_id: tenantId,
        event_type: 'branding_logo_updated',
        payload: { fileName },
      });
      
      success("Logo uppladdad");
      onRefresh();
    } catch (err) {
      console.error('Logo upload failed:', err);
      toastError("Kunde inte ladda upp logotyp");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Handle save branding
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const brandingData = {
        brand_name_override: brandNameOverride || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        theme: theme as 'light' | 'dark' | 'auto',
        updated_at: new Date().toISOString(),
      };
      
      if (branding?.id) {
        const { error: updateError } = await supabase
          .from('tenant_branding')
          .update(brandingData)
          .eq('id', branding.id);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('tenant_branding')
          .insert({
            tenant_id: tenantId,
            ...brandingData,
          });
        
        if (insertError) throw insertError;
      }
      
      // Log audit event
      await supabase.from('tenant_audit_logs').insert({
        tenant_id: tenantId,
        event_type: 'branding_updated',
        payload: { 
          brandNameOverride,
          primaryColor,
          secondaryColor,
          accentColor,
          theme,
        },
      });
      
      success("Branding uppdaterad");
      onRefresh();
    } catch (err) {
      console.error('Branding save failed:', err);
      toastError("Kunde inte spara branding");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle reset to defaults
  const handleReset = () => {
    setBrandNameOverride('');
    setPrimaryColor(null);
    setSecondaryColor(null);
    setAccentColor(null);
    setTheme('auto');
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <SwatchIcon className="h-4 w-4" />
          Branding
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Återställ
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Sparar..." : "Spara"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Logotyp</Label>
          <div className="flex items-start gap-4">
            {/* Logo preview */}
            <div className="h-20 w-20 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/30 overflow-hidden">
              {branding?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={branding.logoUrl} 
                  alt="Logo" 
                  className="h-full w-full object-contain"
                />
              ) : (
                <PhotoIcon className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>
            
            {/* Upload controls */}
            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <PhotoIcon className="h-4 w-4 mr-2" />
                {isUploading ? "Laddar upp..." : "Ladda upp logo"}
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG, JPG eller SVG. Max 2MB. Rekommenderad storlek: 200x200px.
              </p>
            </div>
          </div>
        </div>
        
        {/* Brand name override */}
        <div className="space-y-1.5">
          <Label className="text-xs">Varumärkesnamn (override)</Label>
          <Input
            value={brandNameOverride}
            onChange={(e) => setBrandNameOverride(e.target.value)}
            placeholder={organisationName}
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">
            Lämna tomt för att använda organisationsnamnet.
          </p>
        </div>
        
        {/* Theme selector */}
        <div className="space-y-1.5">
          <Label className="text-xs">Tema</Label>
          <Select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            options={themeOptions.map(o => ({ value: o.value, label: o.label }))}
            placeholder="Välj tema"
          />
        </div>
        
        {/* Color pickers */}
        <div className="grid gap-4 md:grid-cols-3">
          <ColorPicker
            label="Primär färg"
            value={primaryColor}
            onChange={setPrimaryColor}
          />
          <ColorPicker
            label="Sekundär färg"
            value={secondaryColor}
            onChange={setSecondaryColor}
          />
          <ColorPicker
            label="Accentfärg"
            value={accentColor}
            onChange={setAccentColor}
          />
        </div>
        
        {/* Preview hint */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <div 
            className="h-8 w-8 rounded-full"
            style={{ backgroundColor: primaryColor || '#3b82f6' }}
          />
          <div 
            className="h-8 w-8 rounded-full"
            style={{ backgroundColor: secondaryColor || '#6366f1' }}
          />
          <div 
            className="h-8 w-8 rounded-full"
            style={{ backgroundColor: accentColor || '#f59e0b' }}
          />
          <span className="text-xs text-muted-foreground ml-2">
            Förhandsgranskning av färgpalett
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
