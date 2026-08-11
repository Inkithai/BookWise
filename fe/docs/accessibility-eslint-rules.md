# Accessibility ESLint Rules - Future Implementation Guide

## Purpose
Convert accessibility from "developer discipline" to "compiler-enforced accessibility"

## Recommended ESLint Plugins

### 1. eslint-plugin-jsx-a11y
```bash
npm install --save-dev eslint-plugin-jsx-a11y
```

**Key rules to enable:**
```javascript
// eslint.config.mjs or .eslintrc
{
  "plugins": ["jsx-a11y"],
  "rules": {
    "jsx-a11y/label-has-associated-control": "error",
    "jsx-a11y/html-has-lang": "warn",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-role": "error",
    "jsx-a11y/role-has-required-aria-props": "error"
  }
}
```

### 2. Custom Rules for This Project

#### Rule 1: Enforce label htmlFor
```javascript
// Enforces: <label> must have htmlFor attribute
{
  "rules": {
    "no-label-without-for": "error"
  }
}
```

**What it catches:**
```tsx
// ❌ FAIL: Missing htmlFor
<label className="...">Search</label>
<Input />

// ✅ PASS: Proper association
<label htmlFor="analytics-users-search" className="...">Search</label>
<Input id="analytics-users-search" />
```

#### Rule 2: Enforce input/select IDs
```javascript
// Enforces: Form controls must have id attribute
{
  "rules": {
    "form-control-must-have-id": "error"
  }
}
```

**What it catches:**
```tsx
// ❌ FAIL: Missing id
<Input placeholder="Search..." />

// ✅ PASS: Has id
<Input id="analytics-users-search" placeholder="Search..." />
```

#### Rule 3: Enforce analytics ID pattern
```javascript
// Enforces: analytics-* prefix for analytics module IDs
{
  "rules": {
    "analytics-id-pattern": ["warn", {
      "pattern": "^analytics-[a-z]+-[a-z]+$",
      "modules": ["invoices", "clients", "users", "activity"]
    }]
  }
}
```

**What it catches:**
```tsx
// ❌ FAIL: Wrong pattern
<Input id="user-search" />

// ✅ PASS: Correct pattern
<Input id="analytics-users-search" />
```

## Implementation Priority

### Phase 1: Immediate (High Impact)
```javascript
// eslint.config.mjs
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // Critical WCAG violations
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/html-has-lang': 'warn',
    }
  }
]
```

### Phase 2: Custom Rules (Medium Priority)
Create custom ESLint rules in `eslint-rules/` directory:
- `label-has-for.js`
- `form-control-has-id.js`
- `analytics-id-pattern.js`

### Phase 3: CI/CD Enforcement
```yaml
# .github/workflows/accessibility-check.yml
name: Accessibility Lint
on: [pull_request]
jobs:
  a11y-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run lint:a11y
```

## Current Manual Checks (Until ESLint Rules Are Added)

### Code Review Checklist
- [ ] All `<label>` elements have `htmlFor` attribute
- [ ] All form inputs have matching `id` attribute
- [ ] IDs follow `{module}-{field}` or `analytics-{module}-{field}` pattern
- [ ] No duplicate IDs across components
- [ ] Select components properly forward `id` prop
- [ ] Custom form controls have `role` and `aria-*` attributes

### Testing Commands
```bash
# Manual grep checks (temporary until ESLint rules exist)

# Check for labels without htmlFor
grep -r '<label[^>]*>' src/ | grep -v 'htmlFor'

# Check for inputs without id
grep -r '<Input[^>]*>' src/ | grep -v 'id='

# Check for SelectTrigger without id
grep -r '<SelectTrigger[^>]*>' src/ | grep -v 'id='
```

## Migration Strategy

### Step 1: Warn Mode (Current Sprint)
```javascript
{
  "rules": {
    "jsx-a11y/label-has-associated-control": "warn"
  }
}
```

### Step 2: Fix Violations (Next Sprint)
- Run linter
- Fix all warnings
- Update existing forms to use FormField component

### Step 3: Error Mode (Future Sprint)
```javascript
{
  "rules": {
    "jsx-a11y/label-has-associated-control": "error"
  }
}
```

## FormField Adoption Path

### Current State (Manual Coupling)
```tsx
<label htmlFor="analytics-users-search">Search</label>
<Input id="analytics-users-search" />
```

### Future State (Compiler-Enforced)
```tsx
<FormField label="Search" id="analytics-users-search">
  <Input />
</FormField>
```

### Benefits
- ✅ Impossible to forget htmlFor
- ✅ Impossible to mismatch IDs
- ✅ Automatic ARIA attributes for errors
- ✅ Consistent styling
- ✅ Type-safe (TypeScript catches errors)

## References
- [WCAG 2.1 - Labels or Instructions](https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html)
- [Radix UI Accessibility Guide](https://www.radix-ui.com/docs/primitives/overview/accessibility)
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
