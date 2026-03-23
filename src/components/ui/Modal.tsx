import React from 'react';
import { AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
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
  footer 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={cn(
        "bg-card w-full max-w-md rounded-2xl border shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden",
        type === 'danger' ? "border-destructive/20" : "border-border"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={cn(
              "text-lg font-bold flex items-center gap-2",
              type === 'danger' && "text-destructive",
              type === 'success' && "text-green-500",
              type === 'warning' && "text-amber-500"
            )}>
              {type === 'danger' && <AlertTriangle className="w-5 h-5" />}
              {type === 'success' && <Check className="w-5 h-5" />}
              {type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {title}
            </h3>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {children}
          </div>

          {footer && (
            <div className="mt-8 flex justify-end gap-3">
              {footer}
            </div>
          )}
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
  type = 'default' 
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
            "px-6 py-2 font-medium rounded-xl text-sm transition-all shadow-sm active:scale-95",
            type === 'danger' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
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
  confirmText = "确定",
  cancelText = "取消",
  type = 'default',
  isLoading = false
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
            className="px-4 py-2 bg-muted text-muted-foreground font-medium rounded-xl text-sm hover:bg-muted/80 transition-colors active:scale-95 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "px-4 py-2 font-medium rounded-xl text-sm transition-all shadow-sm active:scale-95 flex items-center gap-2",
              type === 'danger' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90",
              isLoading && "opacity-80"
            )}
          >
            {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {isLoading ? "处理中..." : confirmText}
          </button>
        </>
      }
    >
      {message}
    </Modal>
  );
};
