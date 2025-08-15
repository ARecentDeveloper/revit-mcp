import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerResolveParameterNamesTool(server: McpServer) {
  server.tool(
    "resolve_parameter_names",
    "CRITICAL: Use this tool BEFORE requesting parameter values to resolve user-friendly parameter names to exact Revit parameter names. This prevents failed parameter requests and saves tokens by ensuring parameter names are correct on the first try. Example: User says 'phases' → resolves to ['Phase Created', 'Phase Demolished']. User says 'camber' → resolves to 'camber size'. Always use this when users mention parameter names that might not be exact Revit parameter names. WORKFLOW: 1) Extract parameter terms from user query, 2) Call resolve_parameter_names, 3) Use resolved names in element_filter requestedParameters.",
    {
      filterCategory: z
        .string()
        .describe("REQUIRED: Revit category for parameter context (e.g., OST_StructuralFraming, OST_Walls, OST_DuctCurves). Different categories have different available parameters."),
      userParameterNames: z
        .array(z.string())
        .describe("Array of user-friendly parameter names that need resolution. Examples: ['phases', 'camber', 'stud count', 'beam height', 'level']. Can include partial names, common terms, or exact parameter names."),
      elementId: z
        .string()
        .optional()
        .describe("Optional: specific element ID for additional context (reserved for future enhancements, not currently used)")
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "resolve_parameter_names",
            params
          );
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Parameter resolution failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}