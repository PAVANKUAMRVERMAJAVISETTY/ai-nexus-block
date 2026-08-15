'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export interface AdminFormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'url' | 'select' | 'switch' | 'tags' | 'file';
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  required?: boolean;
  full?: boolean;
  uploadEndpoint?: string;
  accept?: string;
}

interface AdminFormProps {
  title: string;
  description: string;
  fields: AdminFormField[];
  onSubmit?: (data: Record<string, unknown>) => void;
}

export function AdminForm({ title, description, fields, onSubmit }: AdminFormProps) {
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    fields.forEach((f) => {
      initial[f.name] = f.defaultValue ?? (f.type === 'switch' ? false : f.type === 'number' ? 0 : '');
    });
    return initial;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  const updateField = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (fieldName: string, endpoint: string, file: File) => {
    setUploadingField(fieldName);
    try {
      const data = new FormData();
      data.append('file', file);

      const res = await fetch(endpoint, {
        method: 'POST',
        body: data,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Upload failed');

      if (result.url) {
        updateField(fieldName, result.url);
      }
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className={field.full ? 'sm:col-span-2' : ''}>
                {field.type === 'switch' ? (
                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Switch
                      id={field.name}
                      checked={formData[field.name] as boolean}
                      onCheckedChange={(v) => updateField(field.name, v)}
                    />
                  </div>
                ) : (
                  <>
                    <Label htmlFor={field.name} className="mb-1.5 block">
                      {field.label}
                      {field.required && <span className="ml-1 text-destructive">*</span>}
                    </Label>
                    {field.type === 'textarea' ? (
                      <Textarea
                        id={field.name}
                        value={formData[field.name] as string}
                        onChange={(e) => updateField(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        rows={4}
                      />
                    ) : field.type === 'select' ? (
                      <Select
                        value={formData[field.name] as string}
                        onValueChange={(v) => updateField(field.name, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'file' ? (
                      <div className="space-y-2">
                        <Input
                          id={field.name}
                          type="file"
                          accept={field.accept || '.zip'}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && field.uploadEndpoint) {
                              handleFileUpload(field.name, field.uploadEndpoint, file);
                            }
                          }}
                        />
                        {uploadingField === field.name && (
                          <p className="text-xs text-muted-foreground animate-pulse">Uploading file to storage bucket...</p>
                        )}
                        {formData[field.name] ? (
                          <p className="text-xs text-emerald-500 font-medium truncate">
                            Uploaded URL: {String(formData[field.name])}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <Input
                        id={field.name}
                        type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
                        value={formData[field.name] as string | number}
                        onChange={(e) => updateField(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit">Save</Button>
            <Button type="button" variant="outline">Cancel</Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
