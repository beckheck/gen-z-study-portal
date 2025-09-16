import { Button } from '@/components/ui/button';
import { ItemType } from '@/items/models';
import { Plus } from 'lucide-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ItemDialogTriggerProps {
  onOpenDialog: () => void;
  itemType: ItemType;
  children?: ReactNode;
}

export function ItemDialogTrigger({ onOpenDialog, itemType, children }: ItemDialogTriggerProps) {
  const { t } = useTranslation('items');

  if (children) {
    return <div onClick={onOpenDialog}>{children}</div>;
  }

  const getButtonText = () => {
    return t(`${itemType}.actions.add`);
  };

  return (
    <Button className="rounded-xl" onClick={onOpenDialog}>
      <Plus className="w-4 h-4 mr-2" />
      {getButtonText()}
    </Button>
  );
}
