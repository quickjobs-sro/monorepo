"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Calendar } from "../core/calendar";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  disablePastDates?: boolean;
}

export const DatePicker = ({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  disablePastDates = false,
}: DatePickerProps) => {
  // Initialize with current date if no value provided
  const [date, setDate] = useState<Date | undefined>(value);
  const [open, setOpen] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setDate(value);
  }, [value]);

  // Create disabled function for past dates
const getDisabledDates = () => {
  if (!disablePastDates) return undefined;

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (date: Date) => {
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < tomorrow;
  };
};

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-left font-normal"
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd. MM. yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            setDate(newDate);
            onChange(newDate);
            setOpen(false);
          }}
          disabled={getDisabledDates()}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
