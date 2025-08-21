import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface EventDialogTriggerProps {
  onOpenDialog: () => void;
  children?: ReactNode;
  namespace?: string;
}

export function EventDialogTrigger({ onOpenDialog, children, namespace = 'planner' }: EventDialogTriggerProps) {
  const { t } = useTranslation(namespace);

  if (children) {
    return <div onClick={onOpenDialog}>{children}</div>;
  }

  return (
    <Button className="rounded-xl" onClick={onOpenDialog}>
      <Plus className="w-4 h-4 mr-2" />
      {t('events.addEvent')}
    </Button>
  );
}
