"use client";

import { ReactNode } from "react";
import Button from "@/components/Button";

interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

interface AlertDialogContentProps {
  children: ReactNode;
  className?: string;
}

interface AlertDialogHeaderProps {
  children: ReactNode;
}

interface AlertDialogTitleProps {
  children: ReactNode;
  className?: string;
}

interface AlertDialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

interface AlertDialogFooterProps {
  children: ReactNode;
  className?: string;
}

interface AlertDialogActionProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

interface AlertDialogCancelProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      <div className="relative z-50">{children}</div>
    </div>
  );
}

export function AlertDialogContent({ children, className = "" }: AlertDialogContentProps) {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 ${className}`}>
      {children}
    </div>
  );
}

export function AlertDialogHeader({ children }: AlertDialogHeaderProps) {
  return <div className="mb-4">{children}</div>;
}

export function AlertDialogTitle({ children, className = "" }: AlertDialogTitleProps) {
  return <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h2>;
}

export function AlertDialogDescription({ children, className = "" }: AlertDialogDescriptionProps) {
  return <p className={`text-sm text-gray-600 mt-1 ${className}`}>{children}</p>;
}

export function AlertDialogFooter({ children, className = "" }: AlertDialogFooterProps) {
  return <div className={`flex justify-end gap-2 mt-6 ${className}`}>{children}</div>;
}

export function AlertDialogAction({ children, onClick, className = "" }: AlertDialogActionProps) {
  return (
    <Button onClick={onClick} variant="primary" className={className}>
      {children}
    </Button>
  );
}

export function AlertDialogCancel({ children, onClick, className = "" }: AlertDialogCancelProps) {
  return (
    <Button onClick={onClick} variant="outline" className={className}>
      {children}
    </Button>
  );
}
