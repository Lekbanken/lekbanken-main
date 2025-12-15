'use client';

import { FormEvent, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { CubeIcon } from "@heroicons/react/24/outline";
import { Capability, ProductAdminItem, ProductStatus, statusLabels } from "../types";
import { ProductCapabilitiesEditor } from "./ProductCapabilitiesEditor";

type ProductCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (product: Omit<ProductAdminItem, "id" | "createdAt" | "updatedAt">) => void;
  capabilities: Capability[];
  purposes: { value: string; label: string }[];
};

const defaultCapabilityKeys = ["browse.view", "play.run"];

export function ProductCreateDialog({ open, onOpenChange, onCreate, capabilities, purposes }: ProductCreateDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("platform");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductStatus>("active");
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(defaultCapabilityKeys);
  const [selectedPurpose, setSelectedPurpose] = useState<string>("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name) return;
    onCreate({
      name: name.trim(),
      category: category || "platform",
      description: description.trim() || null,
      status,
      purposeId: selectedPurpose || null,
      purposeName: purposes.find((p) => p.value === selectedPurpose)?.label ?? null,
      capabilities: capabilities.filter((cap) => selectedCapabilities.includes(cap.key)),
    });
    resetForm();
  };

  const groupedCapabilities = useMemo(() => capabilities, [capabilities]);

  const resetForm = () => {
    setName("");
    setCategory("platform");
    setDescription("");
    setStatus("active");
    setSelectedCapabilities(defaultCapabilityKeys);
    setSelectedPurpose("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <CubeIcon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Create product</DialogTitle>
          <DialogDescription>Define a new product with its category and capabilities.</DialogDescription>
        </DialogHeader>

        <form className="flex-1 overflow-y-auto space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="product-name">
                Product name <span className="text-destructive">*</span>
              </label>
              <Input
                id="product-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g., Lekbanken Pro"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="product-category">
                Category <span className="text-destructive">*</span>
              </label>
              <Select
                id="product-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                options={[
                  { value: "platform", label: "Platform" },
                  { value: "addon", label: "Add-on" },
                  { value: "bundle", label: "Bundle" },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Platform = core product, Add-on = extension, Bundle = package
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="product-purpose">
                Purpose <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Select
                id="product-purpose"
                value={selectedPurpose}
                onChange={(event) => setSelectedPurpose(event.target.value)}
                options={[
                  { value: "", label: "No primary purpose" },
                  ...purposes.map((p) => ({ value: p.value, label: p.label })),
                ]}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="product-description">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                id="product-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Brief description of this product..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="product-status">
                Status
              </label>
              <Select
                id="product-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as ProductStatus)}
                options={[
                  { value: "active", label: statusLabels.active },
                  { value: "inactive", label: statusLabels.inactive },
                ]}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Capabilities</p>
              <p className="text-xs text-muted-foreground">
                {selectedCapabilities.length} selected
              </p>
            </div>
            <ProductCapabilitiesEditor
              capabilities={groupedCapabilities}
              value={selectedCapabilities}
              onChange={setSelectedCapabilities}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create product</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
