"use client";

import { ReactNode, useState, useRef, useEffect } from "react";

interface DropdownMenuProps {
  children: ReactNode;
}

interface DropdownMenuTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

interface DropdownMenuContentProps {
  children: ReactNode;
  align?: "start" | "end" | "center";
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

interface DropdownMenuSeparatorProps {}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <div className="relative inline-block">{children}</div>;
}

export function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
  return <div>{children}</div>;
}

export function DropdownMenuContent({ children, align = "end" }: DropdownMenuContentProps) {
  return (
    <div className={`absolute ${align === "end" ? "right-0" : align === "start" ? "left-0" : "left-1/2 -translate-x-1/2"} mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50`}>
      <div className="py-1">{children}</div>
    </div>
  );
}

export function DropdownMenuItem({ children, onClick, className = "" }: DropdownMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${className}`}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({}: DropdownMenuSeparatorProps) {
  return <div className="border-t border-gray-200 my-1" />;
}
