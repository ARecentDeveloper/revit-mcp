import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerTransformElementTool(server: McpServer) {
  server.tool(
    "transform_element",
    "Transform Revit elements (copy, move, rotate, mirror, array, offset). UNITS: All distances in FEET (Revit's native unit). Formats: Numbers as feet (10 = 10 feet), feet with quotes (\"10'\" = 10 feet), inches (\"6\\\"\" = 0.5 feet), feet-inches (\"10'-6\\\"\" = 10.5 feet). Examples: [10, 0, 0] or [\"10'\", \"0\", \"0\"] to move 10 feet right.",
    {
      data: z
        .object({
          elementIds: z
            .array(z.number())
            .describe("Array of Revit element IDs to transform"),
          action: z
            .enum(["Copy", "Move", "Rotate", "Mirror", "Array", "Offset"])
            .describe("Transform operation to perform"),
          data: z
            .object({
              vector: z
                .array(z.string())
                .length(3)
                .optional()
                .describe("Translation/direction vector [X, Y, Z] in FEET. Required for Copy, Move. Examples: ['10', '0', '0'] = 10 ft right, ['10\\'', '5\\'', '0'] = 10 ft right + 5 ft forward, ['6\\\"', '0', '0'] = 6 inches right."),
              origin: z
                .array(z.string())
                .length(3)
                .optional()
                .describe("Origin point [X, Y, Z] in FEET. Required for Rotate, Mirror. Examples: ['0', '0', '0'] = origin, ['10', '5', '3'] = 10 ft X, 5 ft Y, 3 ft Z, ['10\\'', '5\\'', '3\\''] = same."),
              axis: z
                .array(z.string())
                .length(3)
                .optional()
                .describe("Axis vector [X, Y, Z] (normalized automatically). Required for Rotate, Mirror. Examples: ['1', '0', '0'] = X-axis, ['0', '0', '1'] = Z-axis, ['1', '1', '0'] = diagonal."),
              angle: z
                .number()
                .optional()
                .describe("Rotation angle in degrees. Required for Rotate operations."),
              count: z
                .number()
                .int()
                .min(2)
                .optional()
                .describe("Number of copies for Array operations. Must be >= 2."),
              spacing: z
                .string()
                .optional()
                .describe("Distance in FEET. Required for Array spacing or Offset. Examples: '10' = 10 feet, '10\\'' = 10 feet, '6\\\"' = 0.5 feet, '10\\'-6\\\"' = 10.5 feet."),
              arrayType: z
                .enum(["Linear", "Radial"])
                .default("Linear")
                .describe("Array type for Array operations. Default is 'Linear'.")
            })
            .describe("Transform operation parameters")
        })
        .describe("Parameters for transforming Revit elements"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "transform_element",
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
              text: `Transform elements failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}