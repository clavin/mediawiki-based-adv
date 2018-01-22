import axios, { AxiosInstance } from 'axios';

/**
 * Interacts with a given MediaWiki's API.
 */
export default class MediaWikiAPI {
	/**
	 * The instance of Axios that handles making HTTP requests to the API.
	 */
	private _transport: AxiosInstance;

	/**
	 * Creates an API wrapper for a MediaWiki wiki.
	 * @param apiEndpoint The URL to the MediaWiki API endpoint.
	 */
	public constructor(apiEndpoint: string) {
		this._transport = axios.create({
			baseURL: apiEndpoint,
			headers: {
				'User-Agent': 'WikipediaBasedAdventure/1.0 (clavin@users.noreply.github.com)'
			}
		});
	}

	/**
	 * Makes an API request to perform a given action.
	 * @param action The action to perform.
	 * @param params The parameters for the action.
	 */
	public async request(action: string, params: { [key: string]: any }): Promise<any> {
		params.action = action;
		params.format = 'json';

		const resp = await this._transport.get('', {
			params: params
		});

		return resp.data;
	}
}