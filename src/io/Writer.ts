import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { Review } from "../domain/Review.ts";

export class Writer {
	private readonly outputDirectory: string;

	constructor(appDirectory: URL) {
		// Resolve relative to the app, regardless of the terminal's directory.
		this.outputDirectory = fileURLToPath(new URL("../reviews/", appDirectory));
	}

	async write(appId: string, reviews: readonly Review[]): Promise<string> {
		const filename = this.sanitize(appId);
		if (!filename) {
			throw new Error("A valid app ID is required.");
		}
		await mkdir(this.outputDirectory, { recursive: true });
		const filePath = join(this.outputDirectory, `${filename}.json`);
		await writeFile(filePath, JSON.stringify(reviews, null, 2) + "\n", "utf8");
		return filePath;
	}

	private sanitize(value: string): string {
		return value
			.normalize("NFC")
			.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
			.trim()
			.replace(/^[. ]+|[. ]+$/g, "")
			.slice(0, 100)
			.replace(/[. ]+$/g, "");
	}
}