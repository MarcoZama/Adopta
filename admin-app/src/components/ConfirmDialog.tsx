import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
} from "@fluentui/react-components";
import { useI18n } from "../i18n";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  running: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, running, onConfirm, onDismiss }: ConfirmDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog open={open} modalType="alert" onOpenChange={(_, data) => !data.open && !running && onDismiss()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>{message}</DialogContent>
          <DialogActions>
            <Button appearance="secondary" disabled={running} onClick={onDismiss}>
              {t.common.back}
            </Button>
            <Button appearance="primary" disabled={running} onClick={onConfirm}>
              {running ? t.common.wait : (confirmLabel ?? t.common.confirm)}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
