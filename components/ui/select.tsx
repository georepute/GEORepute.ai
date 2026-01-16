"use client";

import { ReactNode, useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps {
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

interface SelectTriggerProps {
  children: ReactNode;
  className?: string;
}

interface SelectContentProps {
  children: ReactNode;
  className?: string;
}

interface SelectItemProps {
  children: ReactNode;
  value: string;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
}

export function Select({ children, value, onValueChange }: SelectProps) {
  return <div className="select-wrapper">{children}</div>;
}

export function SelectTrigger({ children, className = "" }: SelectTriggerProps) {
  return (
    <div className={cn("flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm", className)}>
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </div>
  );
}

export function SelectValue({ placeholder }: SelectValueProps) {
  return <span className="text-gray-500">{placeholder}</span>;
}

export function SelectContent({ children, className = "" }: SelectContentProps) {
  return (
    <div className={cn("absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white shadow-md", className)}>
      {children}
    </div>
  );
}

export function SelectItem({ children, value, className = "" }: SelectItemProps) {
  return (
    <div className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100", className)}>
      {children}
    </div>
  );
}
