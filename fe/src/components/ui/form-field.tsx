"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  /**
   * Label text for the field
   */
  label: string
  
  /**
   * Unique ID for the field (auto-generated if not provided)
   * Format recommendation: {module}-{field} (e.g., "analytics-users-status")
   */
  id?: string
  
  /**
   * The form input/select/textarea element
   */
  children: React.ReactElement
  
  /**
   * Additional classes for the label
   */
  labelClassName?: string
  
  /**
   * Additional classes for the wrapper
   */
  className?: string
  
  /**
   * Error message (optional)
   */
  error?: string
  
  /**
   * Description text (optional)
   */
  description?: string
  
  /**
   * Whether the field is required
   */
  required?: boolean
}

/**
 * FormField - Enforces proper label-input association
 * 
 * This component eliminates WCAG label association bugs by:
 * - Auto-generating stable IDs if not provided
 * - Automatically binding label htmlFor to input id
 * - Preventing human naming errors
 * - Enforcing consistent accessibility patterns
 * 
 * Usage:
 * ```tsx
 * <FormField label="Status" id="analytics-users-status">
 *   <Select>...</Select>
 * </FormField>
 * 
 * <FormField label="Email" required>
 *   <Input type="email" />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  id: providedId,
  children,
  labelClassName,
  className,
  error,
  description,
  required,
}: FormFieldProps) {
  // Generate stable ID from label if not provided
  const autoId = React.useMemo(() => {
    if (providedId) return providedId
    
    // Convert label to kebab-case for ID
    const generated = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    return `field-${generated}-${Math.random().toString(36).substr(2, 9)}`
  }, [providedId, label])

  // Clone child to inject id and aria attributes
  const childWithProps = React.cloneElement(
    children,
    {
      id: autoId,
      'aria-describedby': error ? `${autoId}-error` : description ? `${autoId}-description` : undefined,
      'aria-invalid': error ? true : undefined,
    } as any
  )

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label 
        htmlFor={autoId} 
        className={cn(labelClassName)}
      >
        {label}
        {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
      </Label>
      
      {childWithProps}
      
      {description && (
        <p 
          id={`${autoId}-description`}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}
      
      {error && (
        <p 
          id={`${autoId}-error`}
          className="text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Hook to generate collision-safe IDs for analytics forms
 * 
 * Usage:
 * ```tsx
 * const searchId = useAnalyticsId('invoices', 'search')
 * // Returns: "analytics-invoices-search"
 * ```
 */
export function useAnalyticsId(module: string, field: string) {
  return React.useMemo(() => {
    return `analytics-${module}-${field}`
  }, [module, field])
}
