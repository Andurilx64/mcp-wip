/**
 * WidgetRenderer Component
 *
 * This file defines a React component for rendering dynamic widgets by URI.
 * It queries the widget registry to fetch the corresponding widget component registered under the provided URI.
 *
 * Key features:
 * - Receives widget `uri` and an optional `parameters` array of { name, value } objects (as from server or model).
 * - Converts parameter list into standard object format expected by widget components.
 * - Automatically invokes the widget's `initWidget` lifecycle method (if present) on mount or when the `uri` changes, allowing asynchronous setup or parameter transformation.
 * - Renders the widget component with its resolved parameters, or a fallback message if the widget is unregistered.
 */

import React, { useEffect, useState } from 'react';
import { getWidget, type WidgetProps } from './registry';

/**
 * Type for an individual parameter, matching key/value payloads
 * received from backend or external system.
 */
type WParams = { name: string; value?: any };

/**
 * WidgetRenderer Props:
 * - uri: string identifier of the widget to render (maps to registry entry)
 * - parameters: optional array of WParams for widget configuration; will be normalized to an object
 */
export const WidgetRenderer: React.FC<{ uri: string; parameters?: Array<WParams> }> = ({
  uri,
  parameters,
}) => {
  // Retrieve the corresponding Widget component from the registry
  const Widget = getWidget(uri);

  /**
   * Convert the `parameters` array (key/value pairs) into an object suitable
   * for widget consumption:
   *   [{name: "foo", value: 1}, ...] -> { foo: 1, ... }
   */
  const paramObj =
    Array.isArray(parameters)
      ? Object.fromEntries(parameters.map(p => [p.name, p.value]))
      : undefined;

  // State to hold widget parameters (allowing widgets to update params via setParams)
  const [params, setParams] = useState(paramObj);

  /**
   * If the widget provides an initWidget static method, call it on mount or if the
   * widget type changes. (For async pre-load/init logic)
   */
  useEffect(() => {
    Widget?.initWidget?.(params, setParams);
  }, [uri]);

  // Fallback if widget is unknown/missing from registry
  if (!Widget) {
    return <div>❌ Unknown widget: {uri}</div>;
  }

  // Render the selected widget, passing normalized parameters as props
  return <Widget parameters={params} />;
};