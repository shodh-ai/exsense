/**
 * Central configuration for all supported environments
 *
 * To add a new environment:
 * 1. Add a new entry to ENVIRONMENTS array
 * 2. That's it! The rest will work automatically
 *
 * To remove an environment:
 * 1. Remove the entry from ENVIRONMENTS array
 */

export interface EnvironmentConfig {
  /** Display name shown in UI dropdown */
  displayName: string;
  /** Backend value sent to API */
  backendValue: string;
  /** Optional description */
  description?: string;
}

export const ENVIRONMENTS: EnvironmentConfig[] = [
  {
    displayName: "VS Code Editor",
    backendValue: "vscode",
    description: "Visual Studio Code editor environment"
  },
  {
    displayName: "Salesforce",
    backendValue: "salesforce",
    description: "Salesforce CRM environment"
  },
  {
    displayName: "n8n",
    backendValue: "n8n",
    description: "n8n workflow automation"
  },
  {
    displayName: "Jupyter",
    backendValue: "jupyter",
    description: "Jupyter notebook environment"
  },
  {
    displayName: "Google Docs",
    backendValue: "google_docs",
    description: "Google Docs document editor"
  }
];

// Helper function to get all display names as const array (for TypeScript type safety)
export const ENVIRONMENT_DISPLAY_NAMES = ENVIRONMENTS.map(env => env.displayName) as readonly string[];

// Helper function to map display name to backend value
export function getBackendValue(displayName: string | null | undefined): string {
  if (!displayName) return 'browser';

  const env = ENVIRONMENTS.find(e => e.displayName === displayName);
  return env?.backendValue || 'browser';
}

// Helper function to map backend value to display name
export function getDisplayName(backendValue: string | null | undefined): string | null {
  if (!backendValue) return null;

  const env = ENVIRONMENTS.find(e => e.backendValue === backendValue);
  return env?.displayName || null;
}

// Type for environment display names (for TypeScript)
export type EnvironmentDisplayName = typeof ENVIRONMENT_DISPLAY_NAMES[number];
