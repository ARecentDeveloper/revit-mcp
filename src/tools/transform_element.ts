import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerTransformElementTool(server: McpServer) {
  server.tool(
    "transform_element",
    "Transform Revit elements (copy, move, rotate, mirror, array, offset). All coordinate and distance values in imperial units (feet, inches, fractions). Supported formats: \"2'\", \"30\\\"\", \"2' 6\\\"\", \"1/4\\\"\", \"3.5'\", plain numbers (assumed inches).",
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
                .describe("Translation/direction vector [X, Y, Z] in imperial units. Required for Copy, Move operations. For Linear array, used as direction. Examples: ['10\\'', '5\\'', '0'], ['30\\\"', '24\\\"', '6\\\"']."),
              origin: z
                .array(z.string())
                .length(3)
                .optional()
                .describe("Origin point [X, Y, Z] in imperial units. Required for Rotate, Mirror operations. For Radial array, used as center point. Examples: ['0', '0', '0'], ['10\'', '5\'', '3\'']."),
              axis: z
                .array(z.string())
                .length(3)
                .optional()
                .describe("Axis vector [X, Y, Z]. Required for Rotate, Mirror operations. For Radial array, used as rotation axis. Examples: ['1', '0', '0'], ['1', '1', '0']."),
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
                .describe("Distance in imperial units. Required for Array spacing or Offset operations. Examples: '10\\'', '24\\\"', '2\\' 6\\\"', '1/4\\\"'."),
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