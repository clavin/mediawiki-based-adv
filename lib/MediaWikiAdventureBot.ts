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
 * Returns a random number in the given range (BOTH INCLUSIVE).
 * @param min The minimum resulting value.
 * @param max The maximum resulting value.
 */
function randomBetween(min: number, max: number): number {
    if (min === max) {
        return min;
    } else {
        return Math.floor(min + (max - min + 1) * Math.random());
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
     * Gets a possibly-relevant response. The relevancy of the response depends on the frequency of the words in the
     * response.
     * @param question The input to get a response to.
     */
    public async respond(question: string): Promise<string> {
        const wordTitleCount = Math.floor(randomBetween(MIN_SENTENCES, MAX_SENTENCES));
        const wordTitles = [];

        // Edge case: empty question.
        if (question !== '') {
            const wordFreqs = await this.getWordFreqs(words(question.toLowerCase()));
            const wordsByFreq = Object.keys(wordFreqs)
                .filter(word => wordFreqs[word].perMillion < 1000)
                .sort((a, b) => wordFreqs[a].perMillion - wordFreqs[b].perMillion);

            // If there are no infrequent words, return a random response.
            if (wordsByFreq.length > 0) {
                while (wordTitles.length < wordTitleCount && wordsByFreq.length > 0) {
                    const currWordTitle = wordsByFreq.splice(0, 1)[0];

                    try {
                        const searchResult: any[] = await this._wikiAPI.request('opensearch', {
                            search: currWordTitle,
                            namespace: '0|108',
                            limit: 1
                        });
    
                        if (searchResult[1].length > 0) {
                            wordTitles.push(currWordTitle);
                        }
                    } catch (err) {
                        // Something went wrong, but oh well ¯\_(ツ)_/¯
                    }
                }
            }
        }

        if (wordTitles.length < wordTitleCount) {
            wordTitles.push.apply(wordTitles,
                await this.getRandomTitles(wordTitleCount - wordTitles.length));
        }

        return this.fillWithRandom(wordTitles, wordTitleCount);
    }

    private async fillWithRandom(titles: string[], targetCount: number): Promise<string> {
        const excerpts: string[] = [];
        let nextTitles = titles;

        do {
            if (nextTitles.length < targetCount - excerpts.length) {
                nextTitles.push.apply(
                    nextTitles,
                    await this.getRandomTitles(targetCount - excerpts.length)
                );
            }

            const newExcerpts = await this.getArticleExcerpts(nextTitles);
            excerpts.push.apply(excerpts, newExcerpts.filter(newExcerpt => newExcerpt.length > 0));
            nextTitles = [];
        } while (excerpts.length < targetCount);

        return excerpts
            .map(excerpt => excerpt[Math.floor(Math.random() * excerpt.length)])
            .map(addMissingPunctuation)
            .join(' ');
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
     * Gets a number of random wikipedia titles.
     * @param count The number of random titles to get.
     */
    private async getRandomTitles(count: number = 1) {
        const queryResp = await this._wikiAPI.request('query', {
            list: 'random',
            rnnamespace: '0|108',
            rnlimit: count
        });

        return queryResp.query.random.map((randResult: any) => randResult.title);
    }

    /**
     * Joins sentences from exceprts of the articles with the given titles.
     * @param titles The titles of the articles to join together.
     */
    private async getArticleExcerpts(titles: string[]): Promise<string[][]> {
        const queryResp = await this._wikiAPI.request('query', {
            prop: 'extracts',
            titles: titles.join('|'),
            redirects: 1,
            exlimit: 1,
            explaintext: 1,
            exsectionformat: 'plain'
        });
        const articlesSentences = [];

        for (const pageId in queryResp.query.pages) {
            articlesSentences.push(sentences(
                queryResp.query.pages[pageId].extract,
                { newline_boundaries: true }
            ));
        }

        return articlesSentences;
    }
}
