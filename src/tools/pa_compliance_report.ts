import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerPAComplianceReportTool(server: McpServer) {
  server.tool(
    "pa_compliance_report",
    "Generate a comprehensive PA (Port Authority) compliance report that exports to Excel. This tool analyzes Revit projects for naming convention and model integrity issues, creating an Excel file with multiple sheets covering annotation families, model families, worksets, sheets, and model integrity. Each sheet includes current names and AI-suggested corrections following PA naming conventions. Supports step-by-step execution for processing different compliance areas incrementally.",
    {
      data: z.object({
        outputPath: z
          .string()
          .optional()
          .describe("Full path where the Excel compliance report should be saved (e.g., 'C:\\Reports\\PA_Compliance_Report.xlsx'). If not specified, the file will be saved to the user's Documents folder with a timestamp."),
        step: z
          .enum(["families", "worksets", "sheets", "integrity", "all"])
          .default("all")
          .describe("Execution step for incremental processing: 'families' = annotation and model families only, 'worksets' = workset naming only, 'sheets' = sheet naming only, 'integrity' = model integrity issues only, 'all' = complete report with all compliance areas."),
        includeAnnotationFamilies: z
          .boolean()
          .default(true)
          .describe("Include annotation family naming analysis in the report. When true, generates a sheet with annotation families and PA-CATEGORY-DESCRIPTION naming suggestions."),
        includeModelFamilies: z
          .boolean()
          .default(true)
          .describe("Include model family naming analysis in the report. When true, generates a sheet with model families and CATEGORY-MANUFACTURER-DESCRIPTION naming suggestions."),
        includeWorksets: z
          .boolean()
          .default(true)
          .describe("Include workset naming analysis in the report. When true, generates a sheet with workset names and PA naming convention suggestions."),
        includeSheets: z
          .boolean()
          .default(true)
          .describe("Include sheet naming analysis in the report. When true, generates a sheet with sheet names and PA naming convention suggestions."),
        includeModelIntegrity: z
          .boolean()
          .default(true)
          .describe("Include model integrity analysis in the report. When true, generates a sheet identifying Generic category elements that should be recategorized."),
      })
        .describe("Configuration parameters for PA compliance report generation. The tool analyzes the current Revit project and creates an Excel file with multiple sheets containing current element names and AI-suggested corrections following PA naming conventions."),
    },
    async (args, extra) => {
      const params = args.data;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "pa_compliance_report",
            params
          );
        });

        if (response.success) {
          let resultText = `PA Compliance Report generated successfully!\n\n`;
          
          if (response.outputPath) {
            resultText += `Report saved to: ${response.outputPath}\n\n`;
          }

          if (response.summary) {
            resultText += "Report Summary:\n";
            
            if (response.summary.annotationFamilies !== undefined) {
              resultText += `- Annotation Families: ${response.summary.annotationFamilies} analyzed\n`;
            }
            
            if (response.summary.modelFamilies !== undefined) {
              resultText += `- Model Families: ${response.summary.modelFamilies} analyzed\n`;
            }
            
            if (response.summary.worksets !== undefined) {
              resultText += `- Worksets: ${response.summary.worksets} analyzed\n`;
            }
            
            if (response.summary.sheets !== undefined) {
              resultText += `- Sheets: ${response.summary.sheets} analyzed\n`;
            }
            
            if (response.summary.integrityIssues !== undefined) {
              resultText += `- Model Integrity Issues: ${response.summary.integrityIssues} found\n`;
            }
          }

          if (response.step && response.step !== "all") {
            resultText += `\nStep executed: ${response.step}\n`;
            resultText += "Use the pa_compliance_action tool to apply corrections after reviewing the Excel file.\n";
          } else {
            resultText += "\nComplete compliance report generated.\n";
            resultText += "Review the Excel file and modify suggested names as needed, then use the pa_compliance_action tool to apply corrections.\n";
          }

          if (response.warnings && response.warnings.length > 0) {
            resultText += "\nWarnings:\n";
            response.warnings.forEach((warning: string) => {
              resultText += `- ${warning}\n`;
            });
          }

          return {
            content: [
              {
                type: "text",
                text: resultText,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `PA compliance report generation failed: ${response.message || 'Unknown error occurred'}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `PA compliance report generation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}