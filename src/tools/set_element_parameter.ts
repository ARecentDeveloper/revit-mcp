import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerSetElementParameterTool(server: McpServer) {
  server.tool(
    "set_element_parameter",
    "Set parameter values for Revit elements. This tool allows you to modify parameter values for specific elements by their IDs. You can set string, numeric, or boolean parameters. IMPORTANT: Only use this tool when users explicitly request to modify element properties, not for reading/querying parameters. CURTAIN WALLS: System automatically detects curtain walls within OST_Walls category and applies appropriate parameter mappings (supports curtain-specific parameters like 'vertical spacing', 'horizontal angle', etc.).",
    {
      data: z.object({
        elementIds: z
          .array(z.number())
          .describe("Array of Revit element IDs to modify"),
        parameterName: z
          .string()
          .describe("Name or alias of the parameter to modify (e.g., 'Mark', 'Comments', 'Area', 'Volume'). Uses the parameter mapping system to resolve aliases and find the correct Revit parameter."),
        parameterValue: z
          .union([
            z.string(), 
            z.number(), 
            z.boolean(), 
            z.null(),
            z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
          ])
          .describe("New value(s) for the parameter. Can be a single value (applied to all elements) or an array of values (parallel to elementIds array). Type should match the parameter type (string for text parameters, number for numeric parameters, boolean for yes/no parameters). Use null to clear string parameters. Examples: Single value: 'F1' (applied to all elements), Array values: ['F1', 'F2', 'F3'] (matched by index to elementIds)."),
        parameterValueType: z
          .enum(["String", "Double", "Integer", "Boolean"])
          .optional()
          .describe("Optional hint for the parameter value type. If not specified, the system will try to determine the type automatically based on the value provided.")
      })
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "set_element_parameter",
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
              text: `Set element parameter failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}