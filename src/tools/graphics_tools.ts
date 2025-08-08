import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

// Parameter filter schema
const ParameterFilterSchema = z.object({
  name: z.string().describe("Parameter name (e.g., 'Width', 'Height', 'Area')"),
  operator: z.enum([">", "<", ">=", "<=", "=", "=="]).describe("Comparison operator"),
  value: z.number().describe("Value to compare against")
});

// Main request schema
const ClearOverridesSchema = z.object({
  scope: z.enum(["all", "category", "parameter", "selected"])
    .default("all")
    .describe("Scope of elements to clear overrides for"),
  
  category: z.string()
    .optional()
    .describe("Element category (required for 'category' and 'parameter' scopes). Options: 'Walls', 'Doors', 'Windows', 'Floors', 'Ceilings', 'Roofs', 'Columns', 'Beams', 'Pipes', 'Ducts'"),
  
  parameter: ParameterFilterSchema
    .optional()
    .describe("Parameter filter criteria (required for 'parameter' scope)"),
  
  elementIds: z.array(z.number())
    .optional()
    .describe("Specific element IDs to process (required for 'selected' scope)")
});

export function registerGraphicsTools(server: McpServer) {
  server.tool(
    "clear_graphics_overrides",
    "Clear graphics overrides (colors, line weights, etc.) from elements in the current Revit view",
    {
      data: ClearOverridesSchema,
    },
    async (args, extra) => {
      const params = args;
      
      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("clear_graphics_overrides", params);
        });

        // Format the response for better AI understanding
        const result = response as any;
        
        if (result.Success) {
          let message = `Successfully cleared graphics overrides in the current view.\n`;
          message += `• Processed: ${result.ProcessedCount} elements\n`;
          
          if (result.ErrorCount > 0) {
            message += `• Errors: ${result.ErrorCount} elements\n`;
          }
          
          message += `• View: ${result.ViewName}`;
          
          return {
            content: [
              {
                type: "text",
                text: message
              }
            ]
          };
        } else {
          return {
            content: [
              {
                type: "text", 
                text: `Failed to clear graphics overrides: ${result.Message}`
              }
            ]
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error clearing graphics overrides: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}