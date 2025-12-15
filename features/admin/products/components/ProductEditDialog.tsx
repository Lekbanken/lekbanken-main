'use client';

import { FormEvent, useEffect, useState } from "react";
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
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { Capability, ProductAdminItem, ProductStatus, statusLabels } from "../types";
import { ProductCapabilitiesEditor } from "./ProductCapabilitiesEditor";

type ProductEditDialogProps = {
  open: boolean;
  product: ProductAdminItem | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (product: ProductAdminItem) => void;
  capabilities: Capability[];
  purposes: { value: string; label: string }[];
};

export function ProductEditDialog({ open, product, onOpenChange, onSubmit, capabilities, purposes }: ProductEditDialogProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "platform");
  const [description, setDescription] = useState(product?.description ?? "");
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "active");
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(
    product?.capabilities.map((c) => c.key) ?? [],
  );
  const [selectedPurpose, setSelectedPurpose] = useState<string>(product?.purposeId ?? "");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setName(product?.name ?? "");
      setCategory(product?.category ?? "platform");
      setDescription(product?.description ?? "");
      setStatus(product?.status ?? "active");
      setSelectedCapabilities(product?.capabilities.map((c) => c.key) ?? []);
      setSelectedPurpose(product?.purposeId ?? "");
    });
    return () => cancelAnimationFrame(frame);
  }, [product]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;
    onSubmit({
      ...product,
      name: name.trim() || product.name,
      category: category || product.category,
      description: description.trim() || product.description,
      status,
      purposeId: selectedPurpose || null,
      purposeName: purposes.find((p) => p.value === selectedPurpose)?.label ?? null,
      capabilities: capabilities.filter((cap) => selectedCapabilities.includes(cap.key)),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <PencilSquareIcon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            {product ? `Update details for ${product.name}` : "Update product details and capabilities."}
          </DialogDescription>
        </DialogHeader>

        {product ? (
          <form className="flex-1 overflow-y-auto space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="edit-product-name">
                  Product name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="edit-product-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Product name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="edit-product-category">
                  Category <span className="text-destructive">*</span>
                </label>
                <Select
                  id="edit-product-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  options={[
                    { value: "platform", label: "Platform" },
                    { value: "addon", label: "Add-on" },
                    { value: "bundle", label: "Bundle" },
                  ]}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="edit-product-description">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Textarea
                  id="edit-product-description"
                  value={description ?? ""}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Brief description of this product..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="edit-product-status">
                  Status
                </label>
                <Select
                  id="edit-product-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ProductStatus)}
                  options={[
                    { value: "active", label: statusLabels.active },
                    { value: "inactive", label: statusLabels.inactive },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="edit-product-purpose">
                  Purpose <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Select
                  id="edit-product-purpose"
                  value={selectedPurpose}
                  onChange={(event) => setSelectedPurpose(event.target.value)}
                  options={[
                    { value: "", label: "No primary purpose" },
                    ...purposes.map((p) => ({ value: p.value, label: p.label })),
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
                capabilities={capabilities}
                value={selectedCapabilities}
                onChange={setSelectedCapabilities}
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Select a product to edit.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
