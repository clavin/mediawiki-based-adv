import { toArray, words } from 'lodash';
import { sentences } from 'sbd';

import MediaWikiAPI from './MediaWikiAPI';
import WordFreqRecorder, { IWordFreq } from './WordFreqRecorder';

/**
 * The maximum number of resulting sentences.
 */
const MAX_SENTENCES = 6;

/**
 * The minimum number of sentences, if possible.
 */
const MIN_SENTENCES = 2;

/**
 * Adds ending punctuation (a period) to a sentence if it doesn't already end in some.
 * @param str The sentence to add possibly-missing punctuation to.
 */
function addMissingPunctuation(str: string) {
    // lodash is used because they handle magical unicode magic.
    const strChars = toArray(str);
    const lastChar = strChars[strChars.length - 1];

    switch (lastChar) {
        case '.':
        case '!':
        case '?':
        case ':':
        case ';':
        case ',':
            return str;
        default:
            return str + '.';
    }
}

/**
 * Returns a random number in the given range.
 * @param min The minimum resulting value.
 * @param max The maximum resulting value.
 */
function randomBetween(min: number, max: number): number {
    if (min === max) {
        return min;
    } else {
        return min + (max - min) * Math.random();
    }
}

/**
 * The MediaWiki-based adventure bot.
 */
export default class MediaWikiAdventureBot {
    /**
     * The MediaWiki API wrapper.
     */
    private _wikiAPI: MediaWikiAPI;
    
    /**
     * The word frequency fetcher and storage.
     */
	private _freqRecorder: WordFreqRecorder;

    /**
     * Constructs a MediaWiki adventure bot.
     * @param apiEndpoint The MediaWiki endpoint this bot works off of.
     */
	public constructor(apiEndpoint: string) {
        // TODO: add more opts, like mediawiki namespaces, max sentences, frequency threshold, etc.
		this._wikiAPI = new MediaWikiAPI(apiEndpoint);
		this._freqRecorder = new WordFreqRecorder({
            retries: 4,
            factor: 1.5,
            minTimeout: 500,
            maxTimeout: 2500
        });
	}
    
    /**
     * Gets a random response from the wiki.
     */
    public async getRandomResponse(): Promise<string> {
        const queryResp = await this._wikiAPI.request('query', {
            list: 'random',
            rnnamespace: '0|108',
            rnlimit: 1
        });

        try {
            return this.getExcerptOfArticle(queryResp.query.random[0].title);
        } catch (err) {
            return this.getRandomResponse();
        }
    }

    /**
     * Gets a possibly-relevant response. The relevancy of the response depends on the frequency of the words in the
     * response.
     * @param question The input to get a response to.
     */
    public async getRelevantResponse(question: string): Promise<string> {
        // Edge case: empty question.
        if (question === '') {
            return this.getRandomResponse();
        }

        const wordFreqs = await this.getWordFreqs(words(question.toLowerCase()));

        // Edge case: none of the words have frequency data.
        if (Object.keys(wordFreqs).length === 0) {
            return this.getRandomResponse();
        }

        // Find the least-frequent word.
        let leastFreq: string = undefined;
        for (const word of Object.keys(wordFreqs)) {
            if (leastFreq === undefined || wordFreqs[word].perMillion < wordFreqs[leastFreq].perMillion) {
                leastFreq = word;
            }
        }

        // If the least-frequent word is too frequent, return a random response.
        if (wordFreqs[leastFreq].perMillion > 1.5) {
            return this.getRandomResponse();
        }

        try {
            // Search for the given least-frequent word.
            const searchResult: any[] = await this._wikiAPI.request('opensearch', {
                search: leastFreq,
                namespace: '0|108',
                limit: 1
            });

            // If nothing is found, return a random response. Otherwise, return a relevant response.
            if (searchResult[1].length === 0) {
                return this.getRandomResponse();
            } else {
                try {
                    return this.getExcerptOfArticle(searchResult[1][0]);
                } catch (err) {
                    // Backup in case the found page has more or less no usable text.
                    return this.getRandomResponse();
                }
            }
        } catch (err) {
            // Something went wrong, but who cares ¯\_(ツ)_/¯
            return this.getRandomResponse();
        }
    }

    /**
     * Gets the frequency info for each word, discarding any where there is no available frequency information.
     * @param strWords The words to get the frequencies of.
     */
    private async getWordFreqs(strWords: string[]): Promise<{ [key: string]: IWordFreq }> {
        const wordFreqs: { [key: string]: IWordFreq } = {};

        for (const strWord of strWords) {
            // Edge case: duplicate words.
            if (Object.prototype.hasOwnProperty.call(wordFreqs, strWord)) {
                continue;
            }

            // Get the frequency info for the word, discarding it if there's no available data.
            const freq = await this._freqRecorder.getFreq(strWord);
            if (freq !== undefined) {
                wordFreqs[strWord] = freq;
            }
        }

        return wordFreqs;
    }

    /**
     * Gets an excerpt of an article. The exceprt consists of multiple sentence(s) from the article.
     * @param title The title of the article.
     */
    private async getExcerptOfArticle(title: string): Promise<string> {
        // Get the plaintext on the article & break it into sentences.
        const queryResp = await this._wikiAPI.request('query', {
            prop: 'extracts',
            titles: title,
            redirects: 1,
            exlimit: 1,
            explaintext: 1,
            exsectionformat: 'plain'
        });
        const articleSentences = sentences(
            queryResp.query.pages[Object.keys(queryResp.query.pages)[0]].extract,
            { newline_boundaries: true }
        ).map(addMissingPunctuation);

        if (articleSentences.length === 0) {
            throw new Error('Empty article.');
        }

        // Reconstruct a select random number of sentences from the article.
        const targetLength = randomBetween(
            Math.min(articleSentences.length, MIN_SENTENCES),
            Math.min(articleSentences.length, MAX_SENTENCES)
        );
        const resultSentences = [];
        while (resultSentences.length < targetLength) {
            const choiceIndex = Math.floor(Math.random() * articleSentences.length);
            resultSentences.push(articleSentences[choiceIndex]);
            articleSentences.splice(choiceIndex, 1);
        }

        return resultSentences.join(' ');
    }
}
