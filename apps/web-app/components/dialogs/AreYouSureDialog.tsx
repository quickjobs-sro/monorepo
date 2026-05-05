import { Button, ButtonProps } from "@ui/components/core/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/components/core/dialog";
import { Loader2 } from "lucide-react";

interface AreYouSureDialogProps {
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  loading?: boolean;
  confirmButtonProps?: ButtonProps;
  cancelButtonProps?: ButtonProps;
}

const confirmText = "Potvrdit";
const cancelText = "Zrušit";

export const AreYouSureDialog = ({
  title,
  description,
  onConfirm,

  open,
  setOpen,
  loading,
  confirmButtonProps,
  cancelButtonProps,
}: AreYouSureDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          <DialogDescription className="text-md py-4">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex !justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="uppercase"
            disabled={loading}
          >
            {cancelButtonProps?.children || cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="uppercase"
            disabled={loading}
            {...confirmButtonProps}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Načítání...
              </>
            ) : (
              confirmButtonProps?.children || confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
