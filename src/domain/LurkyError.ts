export class InputError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InputError";
    }
}

export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NetworkError";
    }
}

export class ParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ParseError";
    }
}
