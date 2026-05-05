"use client";

import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Calendar } from "../core/calendar";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

interface BirthDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minAge?: number;
}

const today = new Date();
const maxDate = new Date();

const months = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
];

export const BirthDatePicker = ({
  value,
  onChange,
  placeholder = "Vyber datum",
  disabled = false,
  minAge = 15,
}: BirthDatePickerProps) => {
  const [date, setDate] = useState<Date | undefined>(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(value || new Date());

  useEffect(() => {
    setDate(value);
    if (value) {
      setMonth(value);
    }
  }, [value]);


  maxDate.setFullYear(today.getFullYear() - minAge);
  maxDate.setHours(23, 59, 59, 999);

  const maxYear = maxDate.getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => maxYear - i);


  const handleYearChange = (year: string) => {
    const newDate = new Date(month);
    newDate.setFullYear(parseInt(year));
    setMonth(newDate);
  };

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(month);
    newDate.setMonth(parseInt(monthIndex));
    setMonth(newDate);
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
          {date ? format(date, "dd. MM. yyyy", { locale: cs }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex gap-2">
            <Select
              value={month.getMonth().toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue>
                  {months[month.getMonth()]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {months.map((monthName, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {monthName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={month.getFullYear().toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Calendar
          mode="single"
          selected={date}
          month={month}
          onMonthChange={setMonth}
          onSelect={(newDate) => {
            setDate(newDate);
            onChange(newDate);
            setOpen(false);
          }}
          disabled={(date) => {
            return date > maxDate;
          }}
          locale={cs}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

