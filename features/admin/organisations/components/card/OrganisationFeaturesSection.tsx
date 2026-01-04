'use client';

import { useState } from "react";
import {
  Cog6ToothIcon,
  BeakerIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import type { TenantFeature } from "../../types";
import { FEATURE_KEYS, featureLabels, type FeatureKey } from "../../types";

type OrganisationFeaturesSectionProps = {
  tenantId: string;
  features: TenantFeature[];
  onRefresh: () => void;
  expanded?: boolean;
};

const featureIcons: Partial<Record<FeatureKey, typeof Cog6ToothIcon>> = {
  ai_features: SparklesIcon,
  experimental: BeakerIcon,
};

const featureTags: Partial<Record<FeatureKey, { label: string; color: string }>> = {
  ai_features: { label: 'Beta', color: 'bg-blue-100 text-blue-700' },
  experimental: { label: 'Unstable', color: 'bg-amber-100 text-amber-700' },
};

export function OrganisationFeaturesSection({
  tenantId,
  features,
  onRefresh,
  expanded = false,
}: OrganisationFeaturesSectionProps) {
  const { success, error: toastError } = useToast();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Build a map of current feature states
  const featureMap = new Map(features.map(f => [f.featureKey, f]));

  const handleToggle = async (featureKey: string, enabled: boolean) => {
    setUpdatingKey(featureKey);
    
    try {
      const existing = featureMap.get(featureKey);
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('tenant_features')
          .update({ enabled, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('tenant_features')
          .insert({
            tenant_id: tenantId,
            feature_key: featureKey,
            enabled,
          });
        
        if (error) throw error;
      }
      
      // Log audit event
      await supabase.from('tenant_audit_logs').insert({
        tenant_id: tenantId,
        event_type: 'feature_toggled',
        payload: { feature_key: featureKey, enabled },
      });
      
      success(`${featureLabels[featureKey as FeatureKey] ?? featureKey} ${enabled ? 'aktiverad' : 'inaktiverad'}`);
      onRefresh();
    } catch (err) {
      toastError('Kunde inte uppdatera funktion');
      console.error(err);
    } finally {
      setUpdatingKey(null);
    }
  };

  const displayFeatures = expanded ? FEATURE_KEYS : FEATURE_KEYS.slice(0, 5);
  const enabledCount = features.filter(f => f.enabled).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Cog6ToothIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">Funktioner & Moduler</CardTitle>
        </div>
        {!expanded && (
          <span className="text-sm text-muted-foreground">
            {enabledCount} av {FEATURE_KEYS.length} aktiva
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {displayFeatures.map((featureKey) => {
            const feature = featureMap.get(featureKey);
            const enabled = feature?.enabled ?? false;
            const Icon = featureIcons[featureKey] ?? Cog6ToothIcon;
            const tag = featureTags[featureKey];
            const isUpdating = updatingKey === featureKey;

            return (
              <div
                key={featureKey}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {featureLabels[featureKey]}
                    </span>
                    {tag && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${tag.color}`}>
                        {tag.label}
                      </span>
                    )}
                  </div>
                </div>
                
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => handleToggle(featureKey, checked)}
                  disabled={isUpdating}
                  className={isUpdating ? 'opacity-50' : ''}
                />
              </div>
            );
          })}
        </div>

        {!expanded && FEATURE_KEYS.length > 5 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            +{FEATURE_KEYS.length - 5} fler funktioner
          </p>
        )}
      </CardContent>
    </Card>
  );
}
