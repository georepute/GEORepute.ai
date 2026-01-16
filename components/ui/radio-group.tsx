"use client";

import { ReactNode } from "react";

interface RadioGroupProps {
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

interface RadioGroupItemProps {
  value: string;
  id?: string;
  className?: string;
}

export function RadioGroup({ children, value, onValueChange, className = "" }: RadioGroupProps) {
  return <div className={className}>{children}</div>;
}

export function RadioGroupItem({ value, id, className = "" }: RadioGroupItemProps) {
  return (
    <input
      type="radio"
      id={id}
      value={value}
      className={className}
    />
  );
}
