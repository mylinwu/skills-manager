import React from 'react';
import { AlertTriangle, Check, RefreshCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  type?: 'default' | 'danger' | 'success' | 'warning';
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  type = 'default',
  footer,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={cn(
          'flex w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl animate-in zoom-in-95 duration-200',
          type === 'danger' ? 'border-destructive/20' : 'border-border'
        )}
      >
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3
              className={cn(
                'flex items-center gap-2 text-lg font-bold',
                type === 'danger' && 'text-destructive',
                type === 'success' && 'text-green-500',
                type === 'warning' && 'text-amber-500'
              )}
            >
              {type === 'danger' && <AlertTriangle className="h-5 w-5" />}
              {type === 'success' && <Check className="h-5 w-5" />}
              {type === 'warning' && <AlertTriangle className="h-5 w-5" />}
              {title}
            </h3>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="whitespace-pre-wrap text-sm text-muted-foreground">{children}</div>

          {footer && <div className="mt-8 flex justify-end gap-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'default' | 'danger' | 'success' | 'warning';
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'default',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      type={type}
      footer={
        <button
          onClick={onClose}
          className={cn(
            'rounded-xl px-6 py-2 text-sm font-medium shadow-sm transition-all active:scale-95',
            type === 'danger'
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          确定
        </button>
      }
    >
      {message}
    </Modal>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  type = 'default',
  isLoading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      type={type}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 active:scale-95 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all active:scale-95',
              type === 'danger'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
              isLoading && 'opacity-80'
            )}
          >
            {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {isLoading ? '处理中...' : confirmText}
          </button>
        </>
      }
    >
      {message}
    </Modal>
  );
};
