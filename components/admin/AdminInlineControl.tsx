'use client';

import { useState, createContext, useContext } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Plus, Edit } from 'lucide-react';
import { InlineEntityEditorDrawer } from './InlineEntityEditorDrawer';
import type { EntityType } from './EntryEditModal';

interface AdminContextType {
  isSuperAdmin: boolean;
  openEditModal: (entityType: EntityType, item?: Record<string, any>) => void;
}

const AdminContext = createContext<AdminContextType>({
  isSuperAdmin: false,
  openEditModal: () => {},
});

export function useAdmin() {
  return useContext(AdminContext);
}

interface AdminWrapperProps {
  entityType?: EntityType;
  children: React.ReactNode;
  onRefresh?: () => void;
}

export function AdminWrapper({ entityType, children, onRefresh }: AdminWrapperProps) {
  const { isSuperAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeEntityType, setActiveEntityType] = useState<EntityType>(entityType || 'projects');
  const [editingItem, setEditingItem] = useState<Record<string, any> | null>(null);

  const openEditModal = (type: EntityType, item?: Record<string, any>) => {
    setActiveEntityType(type);
    setEditingItem(item || null);
    setDrawerOpen(true);
  };

  const handleSuccess = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <AdminContext.Provider value={{ isSuperAdmin, openEditModal }}>
      <div className="relative">
        {/* Floating + Add Entry Button for Super Admin */}
        {isSuperAdmin && entityType && (
          <div className="mb-6 flex justify-end">
            <Button
              onClick={() => openEditModal(entityType)}
              size="sm"
              className="gap-2 bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg hover:shadow-primary/25 font-semibold transition-all hover:scale-105"
            >
              <Plus className="h-4 w-4" />
              [+ Add New {entityType.slice(0, -1)}]
            </Button>
          </div>
        )}

        {children}

        {/* Notion / Word-style Drawer CMS for adding/editing */}
        {isSuperAdmin && (
          <InlineEntityEditorDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            entityType={activeEntityType}
            initialData={editingItem}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </AdminContext.Provider>
  );
}

interface AdminEditButtonProps {
  entityType: EntityType;
  item: Record<string, any>;
  className?: string;
  variant?: 'outline' | 'ghost' | 'default' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function AdminEditButton({ entityType, item, className = '', variant = 'outline', size = 'sm' }: AdminEditButtonProps) {
  const { isSuperAdmin, openEditModal } = useAdmin();

  if (!isSuperAdmin) return null;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openEditModal(entityType, item);
      }}
      className={`gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary font-medium ${className}`}
      title="Edit item as Super Admin"
    >
      <Edit className="h-3.5 w-3.5" />
      [✏️ Edit]
    </Button>
  );
}
