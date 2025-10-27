/**
 * Widget Registry Module
 * 
 * This module provides a simple registry and interface definitions to manage custom widget components,
 * allowing widgets to be dynamically registered, discovered, and instantiated at runtime.
 *
 * - Widgets are identified using string IDs (WidgetId).
 * - Widget components follow the WidgetComponent function interface, which can optionally include
 *   lifecycle/static methods such as initWidget, setWidgetContext, etc.
 * - The registry acts as a central mapping to enable WidgetRenderer and other orchestrators to fetch and render widgets.
 */

import type { ReactNode } from 'react';

/**
 * Unique identifier for widgets in the registry.
 */
export type WidgetId = string;

/**
 * Props passed into a widget component.
 * The `parameters` prop holds a (potentially dynamic) key/value set of config/inputs for a widget.
 */
export type WidgetProps = {
  parameters?: Record<string, any>;
};

/**
 * WidgetComponent interface
 * This interface describes a React node-producing function component, with optional static methods/properties:
 * - initWidget: for initialization logic or async setup of widget state.
 * - setWidgetContext: allows the widget to set context using previous parameters when required.
 * - getWidgetContext: allows the widget to expose relevant context for orchestration or downstream use.
 * - getNextBestActions: semantic slot for widgets to suggest contextual follow-up actions.
 * - getIcon: allows the widget to provide a visual icon or preview.
 * - widgetName: human-friendly name for display/backoffice use.
 * - description: description of widget functionality or purpose.
 * - visualization: hint re: usage context ('small', 'both', 'indipendent').
 */
export type WidgetComponent = ((props: WidgetProps) => ReactNode) & {
  /**
   * Calls when the widget is initialized; can set up state or perform data fetches.
   * Optionally receives initial parameters and a setParams callback for dynamic param updates.
   */
  initWidget?: (parameters?: Record<string, any>, setParams?: (newParams:any)=>void) => void;
  /**
   * Set context (optionally) based on parameters, e.g., for shared widget state.
   */
  setWidgetContext?: (prevParameters?: Record<string, any>) => void;
  /**
   * Get context for the widget (if the widget exposes any external state).
   */
  getWidgetContext?: () => Record<string, any> | string | undefined;
  /**
   * Expose possible next actions relevant to the widget.
   */
  getNextBestActions?: () => any;
  /**
   * Returns a visual icon for the widget (SVG/JSX/URL).
   */
  getIcon?: () => any;
  /**
   * Human-readable widget name.
   */
  widgetName: string;
  /**
   * Brief description of the widget purpose.
   */
  description: string;
  /**
   * Visualization mode suggestion ('small', 'both', 'indipendent').
   */
  visualization: 'small'|'both'|'indipendent'; 
};

/**
 * The global in-memory widget registry.
 * Populated via `registerWidgets` at startup or code-split boundaries.
 */
const registry: Record<WidgetId, WidgetComponent> = {};

/**
 * Register multiple widgets into the global registry.
 * Useful for plugin/bootstrap code to register one or many widgets at once.
 *
 * @param entries - An object mapping widget IDs to their corresponding WidgetComponent definitions.
 */
export function registerWidgets(entries: Record<WidgetId, WidgetComponent>) {
  Object.assign(registry, entries);
}

/**
 * Retrieve a widget component by its unique ID from the registry.
 *
 * @param id - The widget ID to look up.
 * @returns The WidgetComponent if found, or undefined otherwise.
 */
export function getWidget(id: WidgetId): WidgetComponent | undefined {
  return registry[id];
}