declare module 'sbd' {
    interface ISBDOptions {
        newline_boundaries?: boolean,
        html_boundaries?: boolean,
        sanitize?: boolean,
        allowed_tags?: boolean,
        abbreviations?: string[]
    }

    export function sentences(text: string, options?: ISBDOptions): string[];
}