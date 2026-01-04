'use client';

import { useState } from "react";
import { LanguageIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import type { OrganisationDetail } from "../../types";
import type { Database } from "@/types/supabase";

type LanguageCode = Database["public"]["Enums"]["language_code_enum"];

type OrganisationLocaleSectionProps = {
  tenantId: string;
  organisation: OrganisationDetail;
  onRefresh: () => void;
};

// Available languages (matching database enum: NO, SE, EN)
const languageOptions: { value: LanguageCode; label: string; flag: string }[] = [
  { value: 'SE', label: 'Svenska', flag: '🇸🇪' },
  { value: 'NO', label: 'Norska', flag: '🇳🇴' },
  { value: 'EN', label: 'Engelska', flag: '🇬🇧' },
];

// Theme options
const themeOptions = [
  { value: 'light', label: '☀️ Ljust tema' },
  { value: 'dark', label: '🌙 Mörkt tema' },
  { value: 'auto', label: '⚙️ Automatiskt (följer system)' },
];

export function OrganisationLocaleSection({
  tenantId,
  organisation,
  onRefresh,
}: OrganisationLocaleSectionProps) {
  const { success, error: toastError } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [mainLanguage, setMainLanguage] = useState<LanguageCode>(
    (organisation.mainLanguage as LanguageCode) || 'SE'
  );
  const [defaultLanguage, setDefaultLanguage] = useState(organisation.defaultLanguage || 'SE');
  const [defaultTheme, setDefaultTheme] = useState(organisation.defaultTheme || 'auto');
  
  // Check if there are changes
  const hasChanges = 
    mainLanguage !== organisation.mainLanguage ||
    defaultLanguage !== (organisation.defaultLanguage || 'SE') ||
    defaultTheme !== (organisation.defaultTheme || 'auto');
  
  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          main_language: mainLanguage as LanguageCode,
          default_language: defaultLanguage,
          default_theme: defaultTheme,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId);
      
      if (updateError) throw updateError;
      
      // Log audit event
      await supabase.from('tenant_audit_logs').insert({
        tenant_id: tenantId,
        event_type: 'locale_updated',
        payload: {
          mainLanguage,
          defaultLanguage,
          defaultTheme,
        },
      });
      
      success("Språkinställningar uppdaterade");
      onRefresh();
    } catch (err) {
      console.error('Locale save failed:', err);
      toastError("Kunde inte spara språkinställningar");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle reset
  const handleReset = () => {
    setMainLanguage((organisation.mainLanguage as LanguageCode) || 'SE');
    setDefaultLanguage(organisation.defaultLanguage || 'SE');
    setDefaultTheme(organisation.defaultTheme || 'auto');
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <LanguageIcon className="h-4 w-4" />
          Språk & Region
        </CardTitle>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground"
            >
              Ångra
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? "Sparar..." : "Spara"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main language (content language) */}
        <div className="space-y-1.5">
          <Label className="text-xs">Huvudspråk (innehåll)</Label>
          <Select
            value={mainLanguage}
            onChange={(e) => setMainLanguage(e.target.value as LanguageCode)}
            options={languageOptions.map((o) => ({ value: o.value, label: `${o.flag} ${o.label}` }))}
            placeholder="Välj språk"
          />
          <p className="text-xs text-muted-foreground">
            Språk för spelinnehåll och media.
          </p>
        </div>
        
        {/* Default UI language */}
        <div className="space-y-1.5">
          <Label className="text-xs">Standardspråk (gränssnitt)</Label>
          <Select
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value)}
            options={languageOptions.map((o) => ({ value: o.value, label: `${o.flag} ${o.label}` }))}
            placeholder="Välj språk"
          />
          <p className="text-xs text-muted-foreground">
            Standardspråk för användargränssnittet. Användare kan ändra själva.
          </p>
        </div>
        
        {/* Default theme */}
        <div className="space-y-1.5">
          <Label className="text-xs">Standardtema</Label>
          <Select
            value={defaultTheme}
            onChange={(e) => setDefaultTheme(e.target.value)}
            options={themeOptions}
            placeholder="Välj tema"
          />
          <p className="text-xs text-muted-foreground">
            Standardtema för nya användare. Användare kan ändra i sina inställningar.
          </p>
        </div>
        
        {/* Language info */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <LanguageIcon className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-foreground mb-1">Språkstöd</p>
            <p>
              Lekbanken stödjer flera språk. Huvudspråket avgör vilket innehåll som visas 
              för spel och aktiviteter. Användare kan alltid ändra sitt gränssnittsspråk 
              via sina personliga inställningar.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
