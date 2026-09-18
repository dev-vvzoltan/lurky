import type { Review } from "../domain/Review.ts";
import { InputError } from "../domain/LurkyError.ts";
import { NetworkError } from "../domain/LurkyError.ts";
import { ParseError } from "../domain/LurkyError.ts";

interface FeedEntry {
	id?: { label: string };
	author?: { name?: { label: string } };
	title?: { label: string };
	content?: { label: string };
	updated?: { label: string };
	"im:rating"?: { label: string };
	"im:version"?: { label: string };
}

interface ReviewFeed {
	feed?: {
		entry?: FeedEntry | FeedEntry[];
	};
}

export class Reader {
	private readonly appId: string;
	private readonly minStars: number;
	private readonly maxStars: number;

	constructor(appId: string, minStars: number, maxStars: number) {
		if (!/^\d+$/.test(appId)) {
			throw new InputError(`App ID must contain only digits: ${appId}`);
		}

		if (
			!Number.isInteger(minStars) ||
			!Number.isInteger(maxStars) ||
			minStars < 1 ||
			maxStars > 5 ||
			minStars > maxStars
		) {
			throw new InputError("Star range must satisfy 1 ≤ minStars ≤ maxStars ≤ 5.");
		}

		this.appId = appId;
		this.minStars = minStars;
		this.maxStars = maxStars;
	}

	async read(): Promise<Review[]> {
		const reviews = new Map<string, Review>();

		for (let page = 1; page <= 10; page++) {
			const entries = await this.fetchPage(page);

			if (entries.length === 0) {
				break;
			}

			for (const entry of entries) {
				// Ignore entries that aren't reviews.
				if (!entry["im:rating"]) {
					continue;
				}

				try {
					const review = this.normalize(entry);
					// Deduplicate before filtering so updated ratings are respected.
					reviews.set(review.id, review);
				} catch (error) {
					if (error instanceof Error) {
						console.warn(`Warning: ${error.message}`);
					} else {
						console.warn(`Warning: unknown error while normalizing review entry: ${error}`);
					}
					continue;
				}
			}
		}

		return [...reviews.values()].filter(({ rating }) => rating >= this.minStars && rating <= this.maxStars);
	}

	private async fetchPage(page: number): Promise<FeedEntry[]> {
		const url = `https://itunes.apple.com/us/rss/customerreviews/page=${page}/id=${this.appId}/sortby=mostrecent/json`;
		const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });

		if (!response.ok) {
			throw new NetworkError(`App ${this.appId}, page ${page}: HTTP ${response.status}`);
		}

		const data = (await response.json()) as ReviewFeed;

		if (!data.feed || typeof data.feed !== "object") {
			throw new ParseError(`App ${this.appId}, page ${page}: unexpected response format.`);
		}

		const entries = data.feed.entry;

		if (!entries) {
			return [];
		}

		return Array.isArray(entries) ? entries : [entries];
	}

	private normalize(entry: FeedEntry): Review {
		const id = entry.id?.label;
		const rating = Number(entry["im:rating"]?.label);
		const title = entry.title?.label;
		const text = entry.content?.label;
		const updatedAt = entry.updated?.label;

		if (
			!id ||
			!Number.isInteger(rating) ||
			rating < 1 ||
			rating > 5 ||
			typeof title !== "string" ||
			typeof text !== "string" ||
			!updatedAt
		) {
			throw new ParseError(`App ${this.appId}: malformed review entry.`);
		}

		return {
			id,
			appId: this.appId,
			rating,
			title,
			text,
			author: entry.author?.name?.label ?? "",
			version: entry["im:version"]?.label ?? null,
			updatedAt,
		};
	}
}