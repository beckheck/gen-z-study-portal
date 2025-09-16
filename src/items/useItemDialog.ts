import {
  convertItemFormToModel,
  convertItemModelToForm,
  defaultItemDisabledMap,
  defaultItemHiddenMap,
  getDefaultItemFormForType,
  ItemForm,
} from '@/items/forms';
import { ITEM_TYPES, ItemType, Item } from '@/items/models';
import { useItems } from '@/hooks/useStore';
import { useState } from 'react';
import { ItemEventForm } from './event/formSchema';
import { ItemExamForm } from './exam/formSchema';
import { DEFAULT_ITEM_TASK_FORM, ItemTaskForm } from './task/formSchema';
import { ItemTimetableForm } from './timetable/formSchema';

type AllFormFields = 'type' | keyof ItemTaskForm | keyof ItemExamForm | keyof ItemEventForm | keyof ItemTimetableForm;

export type ItemFormFieldFlags = Partial<Record<AllFormFields, boolean>>;

export interface ItemDialogOptions {
  hidden?: ItemFormFieldFlags;
  disabled?: ItemFormFieldFlags;
  availableItemTypes?: ItemType[];
}

export function useItemDialog() {
  const [open, setOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemType, setItemType] = useState<ItemType>('task');
  const [form, setForm] = useState<ItemForm>(DEFAULT_ITEM_TASK_FORM);
  const [hidden, setHidden] = useState<ItemFormFieldFlags>({});
  const [disabled, setDisabled] = useState<ItemFormFieldFlags>({});
  const [availableItemTypes, setAvailableItemTypes] = useState<ItemType[]>(ITEM_TYPES);
  const { addItem, updateItem, deleteItem } = useItems();

  const openAddDialog = (type: ItemType, initialData?: Partial<ItemForm>, options?: ItemDialogOptions) => {
    const defaultForm = getDefaultItemFormForType(type);
    setItemType(type);
    setForm({
      ...defaultForm,
      ...initialData,
    });
    setEditingItem(null);

    // Set available types (default to all types if not specified)
    const typesToSet = options?.availableItemTypes || ITEM_TYPES;
    setAvailableItemTypes(typesToSet);

    // Set hidden and disabled states
    setHidden({ ...defaultItemHiddenMap[type], ...{ type: true, isCompleted: true }, ...options?.hidden });
    setDisabled({ ...defaultItemDisabledMap[type], ...options?.disabled });

    setOpen(true);
  };

  const openEditDialog = (item: Item, options?: ItemDialogOptions) => {
    setEditingItem(item);
    setItemType(item.type);
    setForm(convertItemModelToForm(item));

    // Set available types (default to all types if not specified)
    const typesToSet = options?.availableItemTypes || ITEM_TYPES;
    setAvailableItemTypes(typesToSet);

    // Set hidden and disabled states
    setHidden({ ...defaultItemHiddenMap[item.type], ...{ type: true }, ...options?.hidden });
    setDisabled({ ...defaultItemDisabledMap[item.type], ...options?.disabled });

    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
  };

  const handleSave = (validatedData?: ItemForm) => {
    const dataToSave = validatedData || form;
    handleSaveItem(dataToSave, editingItem);
    closeDialog();
  };

  const handleDelete = () => {
    if (editingItem) {
      handleDeleteItem(editingItem);
      closeDialog();
    }
  };

  const handleSaveItem = (formData: ItemForm, editingItem: Item | null) => {
    const item = convertItemFormToModel(itemType, formData, editingItem);
    if (editingItem) {
      updateItem(editingItem.id, item);
    } else {
      addItem(item);
    }
  };

  const handleDeleteItem = (item: Item) => {
    deleteItem(item.id);
  };

  const handleChangeItemType = (newType: ItemType, currentFormData?: ItemForm) => {
    if (disabled.type || newType === itemType || !availableItemTypes.includes(newType)) return;

    const newDefaultForm = getDefaultItemFormForType(newType);

    // Use currentFormData if provided (from dialog), otherwise fall back to form state
    const sourceForm = currentFormData || form;

    // Create a flexible object for compatible fields
    const compatibleFields: Record<string, any> = {};

    for (const field of Object.keys(newDefaultForm)) {
      if (field in sourceForm) {
        compatibleFields[field] = sourceForm[field];
      }
    }

    for (const fields of [['startsAt', 'dueAt']]) {
      const [fieldA, fieldB] = fields;
      if (fieldA in sourceForm && fieldB in newDefaultForm) {
        compatibleFields[fieldB] = sourceForm[fieldA];
      }
      if (fieldB in sourceForm && fieldA in newDefaultForm) {
        compatibleFields[fieldA] = sourceForm[fieldB];
      }
    }

    // Set the new form with preserved common fields and compatible fields
    setItemType(newType);
    setForm({
      ...newDefaultForm,
      ...compatibleFields,
    } as ItemForm);
  };

  return {
    // State
    open,
    editingItem,
    itemType,
    form,
    setForm,
    hidden,
    disabled,
    availableItemTypes,

    // Actions
    openAddDialog,
    openEditDialog,
    closeDialog,
    handleSave,
    handleDelete,
    handleSaveItem,
    handleDeleteItem,
    handleChangeItemType,

    // Utilities
    getDefaultItemFormForType,
    convertItemModelToForm,

    // Dialog handlers
    onOpenChange: (open: boolean) => {
      if (!open) {
        closeDialog();
      } else {
        setOpen(open);
      }
    },
  };
}
