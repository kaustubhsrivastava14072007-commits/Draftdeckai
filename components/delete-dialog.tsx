import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DeleteDialogProps {
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isDeleting?: boolean;
  confirmLabel?: string;
  confirmingLabel?: string;
  cancelLabel?: string;
}

export function DeleteDialog({
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  trigger,
  children,
  open: controlledOpen,
  onOpenChange,
  isDeleting = false,
  confirmLabel = 'Delete',
  confirmingLabel = 'Deleting...',
  cancelLabel = 'Cancel',
}: DeleteDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const isBusy = isDeleting || isConfirming;

  React.useEffect(() => {
    if (!open) {
      setIsConfirming(false);
    }
  }, [open]);

  const handleConfirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    try {
      setIsConfirming(true);
      await onConfirm();
      setOpen(false);
    } catch {
      return;
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isBusy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isBusy ? confirmingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
