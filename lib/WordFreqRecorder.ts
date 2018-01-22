import axios, { AxiosInstance } from 'axios';
import * as retry from 'retry';

/**
 * The API response for word frequencies, containing the frequency information for a word.
 */
export interface IWordFreq {
	zipf: number,
	perMillion: number,
	diversity: number
}

/**
 * A wrapper for retrieving and caching word frequency data.
 */
export default class WordFreqRecorder {
	/**
	 * The options used when retrying the fetching of word frequency data.
	 */
	private _retryOpts: retry.OperationOptions;

	/**
	 * The cache of word frequencies for words.
	 */
	private _cache: { [word: string]: IWordFreq };

	/**
	 * The Axios instance that handles making requests to the word frequency API.
	 */
	private _transport: AxiosInstance;

	/**
	 * A parameter used with the word frequency API.
	 */
	private _when: string;

	/**
	 * A parameter used with the word frequency API.
	 */
	private _encrypted: string;

	/**
	 * Constructs a wrapper for fetching and caching word frequency data.
	 * @param retryOpts Optional set of options that describe how retries should be performed.
	 */
	public constructor(retryOpts?: retry.OperationOptions) {
		this._retryOpts = retryOpts;

		this._cache = {};

		this._transport = axios.create({
			baseURL: 'https://www.wordsapi.com/mashape/words/',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0',
				'X-Requested-With': 'XMLHttpRequest'
			}
		});
	}

	/**
	 * Fetches the frequency data for a given word.
	 * @param word The word to fetch the frequency of.
	 */
	public async getFreq(word: string): Promise<IWordFreq> {
		// Edge case: word is cached.
		if (Object.prototype.hasOwnProperty.call(this._cache, word.toLowerCase())) {
			return this._cache[word.toLowerCase()];
		}

		if (this._when === undefined) {
			await this.fetchTransportInfo();
		}

		// Set up the retry operation.
		const retryOp = retry.operation(this._retryOpts);
		return new Promise<IWordFreq>((resolve, reject) => {
			// For every attempt...
			retryOp.attempt(async () => {
				try {
					const resp = await this._transport.get(`${encodeURIComponent(word)}/frequency`, {
						params: {
							when: this._when,
							encrypted: this._encrypted
						}
					});
			
					const freq: IWordFreq = resp.data.frequency as IWordFreq;
					this._cache[word.toLowerCase()] = freq;

					resolve(freq);
				} catch (err) {
					if (err.response.status === 404) {
						// 404 just means there's no data on the word.
						this._cache[word.toLowerCase()] = undefined;
						return resolve(undefined);
					}

					if (err.response.status === 401) {
						// 401 means the transport info is invalid.
						await this.fetchTransportInfo();
					}
					if (!retryOp.retry(err)) {
						reject(err);
					}
				}
			});
		});
	}

	/**
	 * Fetches the parameters required to make API requests.
	 */
	private async fetchTransportInfo(): Promise<void> {
		const resp = await axios.get('https://www.wordsapi.com');
		const paramsData = resp.data.match(/var when = "([^"]+)",\s+encrypted = "([^"]+)";/);

		this._when = paramsData[1];
		this._encrypted = paramsData[2];
	}
}
