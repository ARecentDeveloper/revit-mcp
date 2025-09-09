import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerRelationshipElementTool(server: McpServer) {
  server.tool(
    "relationship_element",
    `Manage element relationships in Revit. Supports multiple operations:
    
    1. GROUP - Create element groups
       - Combines selected elements into a named or unnamed group
       - Automatically handles naming conflicts
    
    2. UNGROUP - Dissolve element groups
       - Ungroups selected groups or elements that are part of groups
    
    3. JOIN - Join geometry (coming soon)
       - Joins walls, beams, and other compatible elements
    
    4. UNJOIN - Unjoin geometry (coming soon)
       - Separates previously joined elements
    
    5. ATTACH - Attach elements (coming soon)
       - Attaches walls to roofs/floors
    
    6. DETACH - Detach elements (coming soon)
       - Detaches walls from roofs/floors
    
    7. SPLIT - Split linear elements (coming soon)
       - Splits walls, beams, MEP curves at specified points
    
    8. ALIGN - Align elements (coming soon)
       - Aligns elements to references or other elements
    
    All coordinates use imperial units: feet ('), inches ("), mixed (2' 6"), fractions (1/4"), decimals (3.5')`,
    {
      data: z
        .object({
          elementIds: z
            .array(z.number())
            .describe("Array of Revit element IDs to perform relationship operations on"),
          action: z
            .enum(["group", "ungroup", "join", "unjoin", "attach", "detach", "split", "align"])
            .describe("The relationship operation to perform"),
          data: z
            .object({
              targetElementId: z
                .number()
                .optional()
                .describe("Target element ID for join/attach/align operations"),
              splitPoint: z
                .array(z.string())
                .optional()
                .describe("Split point [X,Y,Z] in imperial units (e.g., [\"10'\", \"5'\", \"0\"])"),
              alignmentType: z
                .enum(["Vertical", "Horizontal", "Face"])
                .optional()
                .describe("Type of alignment"),
              groupName: z
                .string()
                .optional()
                .describe("Optional name for new groups")
            })
            .optional()
            .describe("Additional data for the operation")
        })
        .describe("Relationship element operation configuration")
    },
    async (args: any) => {
      return withRevitConnection(async (connection) => {
        try {
          const result = await connection.sendCommand("relationship_element", args.data);
          
          if (!result.success) {
            return {
              content: [
                {
                  type: "text",
                  text: `Failed to execute relationship operation: ${result.message || "Unknown error"}`,
                },
              ],
            };
          }
          
          return {
            content: [
              {
                type: "text",
                text: result.message || "Relationship operation completed successfully",
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Relationship operation failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      });
    }
  );
}