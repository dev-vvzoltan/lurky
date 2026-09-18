export interface Review {
    id: string;
    appId: string;
    rating: number;
    title: string;
    text: string;
    author: string;
    version: string | null;
    updatedAt: string;
}