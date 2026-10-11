import { mergeReports as mergeDocuments } from "./methods/merge-reports.js";
import fs from "node:fs";
import path from "node:path";

export async function mergeReports(
	directory: string,
	output: string,
	outputDir: string,
	keepReports: boolean,
) {
	try {
		const directoryPath = path.resolve(directory);
		const outputFileName = output;
		const resolvedOutputDir = outputDir
			? path.resolve(outputDir)
			: directoryPath;
		const outputPath = path.join(resolvedOutputDir, outputFileName);

		console.log("Merging CTRF reports...");

		const files = fs.readdirSync(directoryPath);

		files.forEach((file) => {
			console.log("Found file:", file);
		});

		const ctrfReportFiles = files.filter((file) => {
			try {
				if (path.extname(file) !== ".json") {
					console.log(`Skipping non-CTRF file: ${file}`);
					return false;
				}
				const filePath = path.join(directoryPath, file);
				const fileContent = fs.readFileSync(filePath, "utf8");
				const jsonData = JSON.parse(fileContent);
				if (!("results" in jsonData)) {
					console.log(`Skipping non-CTRF file: ${file}`);
					return false;
				}
				return true;
			} catch (error) {
				console.error(`Error reading JSON file '${file}':`, error);
				return false;
			}
		});

		if (ctrfReportFiles.length === 0) {
			console.log("No CTRF reports found in the specified directory.");
			return;
		}

		if (!fs.existsSync(resolvedOutputDir)) {
			fs.mkdirSync(resolvedOutputDir, { recursive: true });
			console.log(`Created output directory: ${resolvedOutputDir}`);
		}

		const mergedReport = mergeDocuments(
			ctrfReportFiles.map((file) =>
				JSON.parse(fs.readFileSync(path.join(directoryPath, file), "utf8")),
			),
		);

		fs.writeFileSync(outputPath, JSON.stringify(mergedReport, null, 2));

		if (!keepReports) {
			ctrfReportFiles.forEach((file) => {
				const filePath = path.join(directoryPath, file);
				if (file !== outputFileName) {
					fs.unlinkSync(filePath);
				}
			});
		}

		console.log("CTRF reports merged successfully.");
		console.log(`Merged report saved to: ${outputPath}`);
	} catch (error) {
		console.error("Error merging CTRF reports:", error);
	}
}
