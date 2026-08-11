"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex w-full flex-col gap-4",
        month_caption: "relative flex h-8 items-center justify-center px-8",
        caption: "relative flex h-8 items-center justify-center px-8",
        caption_label: "text-sm font-medium",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-8 bg-background p-0 opacity-100 hover:bg-accent"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-8 bg-background p-0 opacity-100 hover:bg-accent"
        ),
        nav_button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-8 bg-background p-0 opacity-100 hover:bg-accent"
        ),
        nav_button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-8 bg-background p-0 opacity-100 hover:bg-accent"
        ),
        weekdays: "flex w-full",
        weekday: "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
        head_row: "flex w-full",
        head_cell: "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
        weeks: "flex w-full flex-col gap-2",
        week: "mt-0 flex w-full",
        row: "flex w-full",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", className)} {...chevronProps} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", className)} {...chevronProps} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
