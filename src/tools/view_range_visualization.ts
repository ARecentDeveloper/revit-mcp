import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerViewRangeVisualizationTool(server: McpServer) {
  server.tool(
    "view_range_visualization",
    "WORKFLOW: Interactive view range editor for Revit plan views. FIRST RUN: Creates colored 3D visualization planes (Top=Red, Cut=Green, Bottom=Blue, View Depth=Orange) in the model. Users can then move these planes up/down in a 3D view to adjust elevations. SECOND RUN: Automatically detects moved planes, updates the actual view range accordingly, and removes the visualization planes. Even if no planes are moved, running twice will clean up the visualization. AI INSTRUCTION: When users request view range visualization, explain they can move the colored planes in 3D view and call you again to apply the changes.",
    {
      data: z.object({
        action: z.enum(["visualize", "update", "preview"])
          .optional()
          .default("visualize")
          .describe("Action to perform: 'visualize' (FIRST RUN) creates colored 3D planes for user to move, 'update' (SECOND RUN) applies plane movements to actual view range and removes visualization, 'preview' shows planned changes without applying"),
        
        viewId: z.string()
          .optional()
          .describe("ID of the specific plan view to visualize. If not provided, will use available plan views"),
        
        viewName: z.string()
          .optional()
          .describe("Name of the plan view to visualize (alternative to viewId)"),
        
        removeExisting: z.boolean()
          .optional()
          .default(false)
          .describe("Remove existing visualization planes without updating view range"),
        
        validateOnly: z.boolean()
          .optional()
          .default(false)
          .describe("Only validate the current view range configuration without creating visualization")
      })
    },
    async (args, extra) => {
      const params = args;
      
      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("view_range_visualization", params);
        });

        if (!response.success) {
          return {
            content: [
              {
                type: "text",
                text: `❌ View Range Visualization Failed\n\nError: ${response.error || response.message || "Unknown error occurred"}`
              }
            ]
          };
        }

        // Format the response based on the action performed
        let responseText = "";
        
        if (response.action === "visualize") {
          responseText = `✅ View Range Visualization Created\n\n`;
          responseText += `📋 View: ${response.viewName}\n\n`;
          
          if (response.planesCreated && response.planesCreated.length > 0) {
            responseText += `🎨 Visualization Planes Created:\n`;
            response.planesCreated.forEach((plane: any) => {
              responseText += `• ${plane.planeName} plane (${plane.color}) at elevation ${plane.elevation.toFixed(2)}'\n`;
            });
            responseText += `\n`;
          }
          
          if (response.planesSkipped && response.planesSkipped.length > 0) {
            responseText += `⏭️ Skipped Planes:\n`;
            response.planesSkipped.forEach((skipped: string) => {
              responseText += `• ${skipped}\n`;
            });
            responseText += `\n`;
          }
          
          responseText += `📝 Instructions:\n`;
          responseText += `1. Switch to a 3D view to see the colored planes\n`;
          responseText += `2. Move the planes vertically to adjust view range\n`;
          responseText += `3. Run this tool again to apply changes to the view range\n`;
          
        } else if (response.action === "update") {
          responseText = `✅ View Range Updated Successfully\n\n`;
          responseText += `📋 View: ${response.viewName}\n\n`;
          
          if (response.movementInfo && response.movementInfo.length > 0) {
            const movedPlanes = response.movementInfo.filter((m: any) => Math.abs(m.distance) > 0.001);
            if (movedPlanes.length > 0) {
              responseText += `📏 Plane Movements:\n`;
              movedPlanes.forEach((movement: any) => {
                responseText += `• ${movement.planeName} moved ${movement.direction} ${Math.abs(movement.distance).toFixed(2)}'\n`;
              });
            } else {
              responseText += `📏 No planes were moved\n`;
            }
          }
          
          responseText += `\n🗑️ Visualization planes have been removed\n`;
          
        } else if (response.action === "preview") {
          responseText = `🔍 View Range Update Preview\n\n`;
          responseText += `📋 View: ${response.viewName}\n\n`;
          
          if (response.movementInfo && response.movementInfo.length > 0) {
            responseText += `📏 Planned Movements:\n`;
            response.movementInfo.forEach((movement: any) => {
              if (Math.abs(movement.distance) > 0.001) {
                responseText += `• ${movement.planeName} would move ${movement.direction} ${Math.abs(movement.distance).toFixed(2)}'\n`;
              }
            });
          }
          
          responseText += `\n✅ Update validation successful - ready to apply changes\n`;
        }
        
        if (response.message) {
          responseText += `\n📄 Details:\n${response.message}`;
        }

        return {
          content: [
            {
              type: "text",
              text: responseText
            }
          ]
        };

      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ View Range Visualization Error\n\nFailed to execute command: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}