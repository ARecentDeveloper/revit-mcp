import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerAIElementFilterTool(server: McpServer) {
  server.tool(
    "ai_element_filter",
    "An intelligent Revit element querying tool with optimized parameter extraction. Use this tool to retrieve element information with precise control over what parameters are returned, minimizing token usage while ensuring you get exactly what's needed. IMPORTANT: When users ask for specific parameters (like 'flange thickness', 'number of studs', 'web thickness'), always use the 'requestedParameters' field to explicitly request those parameters - they won't appear automatically. PARAMETER VALUES: For numeric parameters, RawValue contains precise values in Revit internal units - dimensional parameters (lengths, widths, thicknesses, heights) are in feet, areas in square feet, volumes in cubic feet, angles in radians, counts/integers as-is. Always use RawValue for accurate conversions, never parse display strings. Examples: 1) User asks 'What's the flange thickness of this beam?' → Use: {filterCategory: 'OST_StructuralFraming', requestedParameters: ['flange thickness'], parameterFilters: [{name: 'ElementId', value: 'ID', operator: 'equals'}]}. 2) User asks 'Find beams with flange thickness > 0.2' → Use: {filterCategory: 'OST_StructuralFraming', parameterFilters: [{name: 'flange thickness', operator: 'greater', value: 0.2}]} (filtered parameters are auto-included). 3) User asks 'Tell me about this element' → Use: {detailLevel: 'basic'} for minimal info.",
    {
      data: z.object({
        filterCategory: z
          .string()
          .optional()
          .describe("Enumeration of built-in element categories in Revit used for filtering and identifying specific element types (e.g., OST_Walls, OST_Floors, OST_GenericModel). Note that furniture elements may be classified as either OST_Furniture or OST_GenericModel categories, requiring flexible selection approaches"),
        filterElementType: z
          .string()
          .optional()
          .describe("The Revit element type name used for filtering specific elements by their class or type (e.g., 'Wall', 'Floor', 'Autodesk.Revit.DB.Wall'). Gets or sets the name of the Revit element type to be filtered."),
        filterFamilySymbolId: z
          .number()
          .optional()
          .describe("The ElementId of a specific FamilySymbol (type) in Revit used for filtering elements by their type (e.g., '123456', '789012'). Gets or sets the ElementId of the FamilySymbol to be used as a filter criterion. Use '-1' if no specific FamilySymbol filtering is needed."),
        includeTypes: z
          .boolean()
          .default(false)
          .describe("Determines whether to include element types (such as wall types, door types, etc.) in the selection results. When set to true, element types will be included; when false, they will be excluded."),
        includeInstances: z
          .boolean()
          .default(true)
          .describe("Determines whether to include element instances (such as placed walls, doors, etc.) in the selection results. When set to true, element instances will be included; when false, they will be excluded."),
        filterVisibleInCurrentView: z
          .boolean()
          .optional()
          .describe("Determines whether to only return elements that are visible in the current view. When set to true, only elements visible in the current view will be returned. Note: This filter only applies to element instances, not type elements."),
        boundingBoxMin: z
          .object({
            p0: z.object({
              x: z.number().describe("X coordinate of start point"),
              y: z.number().describe("Y coordinate of start point"),
              z: z.number().describe("Z coordinate of start point"),
            }),
            p1: z.object({
              x: z.number().describe("X coordinate of end point"),
              y: z.number().describe("Y coordinate of end point"),
              z: z.number().describe("Z coordinate of end point"),
            }),
          })
          .optional()
          .describe("The minimum point coordinates (in mm) for spatial bounding box filtering. When set along with boundingBoxMax, only elements that intersect with this bounding box will be returned. Set to null to disable this filter."),
        boundingBoxMax: z
          .object({
            p0: z.object({
              x: z.number().describe("X coordinate of start point"),
              y: z.number().describe("Y coordinate of start point"),
              z: z.number().describe("Z coordinate of start point"),
            }),
            p1: z.object({
              x: z.number().describe("X coordinate of end point"),
              y: z.number().describe("Y coordinate of end point"),
              z: z.number().describe("Z coordinate of end point"),
            }),
          })
          .optional()
          .describe("The maximum point coordinates (in mm) for spatial bounding box filtering. When set along with boundingBoxMin, only elements that intersect with this bounding box will be returned. Set to null to disable this filter."),
        parameterFilters: z
          .array(z.object({
            name: z.string().describe("Parameter name or alias (e.g., 'flange thickness', 'tf', 'web thickness', 'tw', 'length', 'height'). Uses the parameter mapping system to resolve aliases and find the correct Revit parameter."),
            operator: z.enum(["equals", "greater", "less", "greaterEqual", "lessEqual", "contains", "notEquals"])
              .describe("Comparison operator for filtering"),
            value: z.union([z.string(), z.number()])
              .describe("Value to compare against. For numeric parameters, use numbers. For text parameters, use strings."),
            valueType: z.enum(["String", "Double", "Integer", "Boolean"]).optional()
              .describe("Optional value type hint for proper comparison (auto-detected if not specified)")
          }))
          .optional()
          .describe("Filter elements by specific parameter values using the parameter mapping system. This leverages the category-specific parameter mappings to resolve parameter names and aliases automatically."),
        maxElements: z
          .number()
          .optional()
          .describe("The maximum number of elements to find in a single tool invocation. Default is 50. Values exceeding 50 are not recommended for performance reasons."),
        requestedParameters: z
          .array(z.string())
          .optional()
          .describe("CRITICAL: Specific parameters to include in the response. When users ask for specific parameters (like 'flange thickness', 'number of studs', 'web thickness'), you MUST list them here or they won't appear in the results. Examples: ['flange thickness', 'web thickness'], ['number of studs'], ['height', 'width']. Uses parameter mapping system to resolve aliases. NOTE: Numeric parameters return RawValue in Revit internal units (feet for dimensions, radians for angles) - use these for accurate conversions."),
        detailLevel: z
          .enum(["basic", "standard", "detailed"])
          .default("basic")
          .describe("Controls how many parameters are returned: 'basic' = minimal info (ID, name, type, basic dimensions) - use for general queries; 'standard' = common parameters; 'detailed' = all available parameters. Use 'basic' unless user specifically asks for detailed information."),
      })
        .describe("Configuration parameters for the Revit element filter tool with optimized parameter extraction. PARAMETER EXTRACTION RULES: 1) For specific parameter queries (user asks 'What is the flange thickness?'), use 'requestedParameters': ['flange thickness'] 2) For filtered searches (user asks 'Find beams with flange thickness > 0.2'), the filtered parameter is automatically included 3) For general info (user asks 'Tell me about this element'), use 'detailLevel': 'basic' 4) Multiple filters can be combined. All spatial coordinates in millimeters."),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "ai_element_filter",
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
              text: `Get element information failed: ${error instanceof Error ? error.message : String(error)
                }`,
            },
          ],
        };
      }
    }
  );
}
