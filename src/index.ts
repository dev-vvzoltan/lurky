import { Reader } from "./io/Reader.ts";
import { Writer } from "./io/Writer.ts";
import { InputError } from "./domain/LurkyError.ts";
import { NetworkError } from "./domain/LurkyError.ts";
import { ParseError } from "./domain/LurkyError.ts";

const appName: string = "Lurky";
console.log(`Ready to fetch reviews for ${appName}.`);

const args = parseInput(process.argv.slice(2));
if (!args) {
    console.error("Usage: node src/index.ts <minStars: 1–5> <maxStars: 1–5> <appId> [appId...]");
    process.exit(1);
}

const writer = new Writer(new URL("./", import.meta.url));

for (const appId of args.appIds) {
    try {
        const reader = new Reader(appId, args.minStars, args.maxStars);
        const reviews = await reader.read();
        const filePath = await writer.write(appId, reviews);
        console.log(`Saved ${reviews.length} reviews of ${appId} to ${filePath}`);
    } catch (error) {
        if (error instanceof InputError) {
            console.warn(`Warning: Skipping ${appId}: ${error.message}`);
            continue;
        }

        if (error instanceof NetworkError) {
            console.warn(`Warning: Skipping ${appId} after network error: ${error.message}`);
            continue;
        }

        if (error instanceof ParseError) {
            console.warn(`Warning: Skipping ${appId}: ${error.message}`);
            continue;
        }

        if (error instanceof Error) {
            console.warn(`Warning: Skipping ${appId} due to an unexpected error: ${error.message}`);
        } else {
            console.warn(`Warning: Skipping ${appId} due to an unexpected error: ${error}`);
        }
    }
}

function parseInput(args: string[]): { minStars: number; maxStars: number; appIds: string[] } | null {
    const [minStarsArg, maxStarsArg, ...appIds] = args;
    const minStars = Number(minStarsArg);
    const maxStars = Number(maxStarsArg);

    if (
        !Number.isInteger(minStars) ||
        !Number.isInteger(maxStars) ||
        minStars < 1 ||
        maxStars > 5 ||
        minStars > maxStars ||
        appIds.length === 0
    ) {
        return null;
    }

    return { minStars, maxStars, appIds };
}
