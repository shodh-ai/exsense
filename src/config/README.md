# Environment Configuration

This folder contains centralized configuration for all supported imprinting environments.

## How to Add a New Environment

To add a new environment (e.g., "Postman"), follow these simple steps:

1. Open `environments.ts`
2. Add a new entry to the `ENVIRONMENTS` array:

```typescript
{
  displayName: "Postman",
  backendValue: "postman",
  description: "Postman API testing tool"
}
```

That's it! The environment will automatically appear in:
- ✅ The dropdown menu in CurriculumSection
- ✅ The teacher page URL parameters
- ✅ All API calls to backend
- ✅ TypeScript type checking

## How to Remove an Environment

1. Open `environments.ts`
2. Remove the entry from the `ENVIRONMENTS` array
3. Done! It will be removed from all places automatically

## How to Rename an Environment

1. Open `environments.ts`
2. Update either the `displayName` (shown in UI) or `backendValue` (sent to API)

**Example:**
```typescript
{
  displayName: "VS Code",  // Changed from "VS Code Editor"
  backendValue: "vscode",  // Backend value stays same
  description: "Visual Studio Code editor environment"
}
```

## Current Environments

| Display Name | Backend Value | Description |
|--------------|---------------|-------------|
| VS Code Editor | vscode | Visual Studio Code editor environment |
| Salesforce | salesforce | Salesforce CRM environment |
| n8n | n8n | n8n workflow automation |
| Jupyter | jupyter | Jupyter notebook environment |
| Google Docs | google_docs | Google Docs document editor |

## Files That Use This Config

- `src/components/CurriculumSection.tsx` - Dropdown menu
- `src/app/teacher/page.tsx` - Environment mapping
- Any file that imports `getBackendValue()` or `ENVIRONMENTS`

## Helper Functions

### `getBackendValue(displayName)`
Converts UI display name to backend value.

**Example:**
```typescript
getBackendValue("VS Code Editor")  // Returns: "vscode"
getBackendValue(null)               // Returns: "browser" (default)
```

### `getDisplayName(backendValue)`
Converts backend value to UI display name.

**Example:**
```typescript
getDisplayName("vscode")  // Returns: "VS Code Editor"
getDisplayName(null)      // Returns: null
```

## Important Notes

- **Display names** are shown to users in the UI
- **Backend values** are sent to the API (should be lowercase, snake_case)
- The default fallback environment is `"browser"` if nothing is selected
- TypeScript will automatically update types when you add/remove environments
