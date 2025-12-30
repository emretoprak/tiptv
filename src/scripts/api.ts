/**
 * API communication module
 * Handles all IPTV API requests and URL building
 */

import type {
	Credentials,
	UserInfo,
	LiveChannel,
	Category,
	Movie,
	Series,
	SeriesInfoResponse,
	MovieInfoResponse
} from '../types';

/**
 * Build API URL for IPTV service
 * @param creds - User credentials
 * @param action - API action to perform
 * @param params - Additional query parameters
 * @returns Complete API URL
 */
export function buildApiUrl(
	creds: Credentials,
	action: string,
	params: Record<string, string> = {}
): string {
	const { protocol, host, user, pass } = creds;
	// Remove any existing protocol from host
	const cleanHost = host.replace(/^https?:\/\//i, '');
	const fullHost = `${protocol}://${cleanHost}`.replace(/\/+$/, '');
	
	const url = new URL('/player_api.php', fullHost);
	url.search = new URLSearchParams({
		username: user,
		password: pass,
		action,
		...params
	}).toString();
	
	return url.toString();
}

/**
 * Build stream URL for playback
 * @param creds - User credentials
 * @param id - Stream ID
 * @param type - Stream type (live, movie, series)
 * @returns Stream URL
 */
export function buildStreamUrl(
	creds: Credentials,
	id: number | string,
	type: 'live' | 'movie' | 'series' = 'live'
): string {
	const { protocol, host, user, pass } = creds;
	// Remove any existing protocol from host
	const cleanHost = host.replace(/^https?:\/\//i, '');
	const fullBase = `${protocol}://${cleanHost}`.replace(/\/+$/, '');
	
	const encodedUser = encodeURIComponent(user);
	const encodedPass = encodeURIComponent(pass);
	
	if (type === 'live') {
		return `${fullBase}/live/${encodedUser}/${encodedPass}/${id}.m3u8`;
	}
	if (type === 'movie') {
		return `${fullBase}/movie/${encodedUser}/${encodedPass}/${id}.m3u8`;
	}
	if (type === 'series') {
		return `${fullBase}/series/${encodedUser}/${encodedPass}/${id}.m3u8`;
	}
	
	return '';
}

/**
 * Fetch user account information
 * @param creds - User credentials
 * @returns Promise resolving to user info
 */
export async function fetchUserInfo(creds: Credentials): Promise<UserInfo> {
	const response = await fetch(buildApiUrl(creds, ''));
	const data = await response.json();
	return data.user_info || {};
}

/**
 * Fetch live TV streams
 * @param creds - User credentials
 * @returns Promise resolving to array of live channels
 */
export async function fetchLiveStreams(creds: Credentials): Promise<LiveChannel[]> {
	const response = await fetch(buildApiUrl(creds, 'get_live_streams'));
	const data = await response.json();
	return Array.isArray(data) ? data : [];
}

/**
 * Fetch live TV categories
 * @param creds - User credentials
 * @returns Promise resolving to array of categories
 */
export async function fetchLiveCategories(creds: Credentials): Promise<Category[]> {
	const response = await fetch(buildApiUrl(creds, 'get_live_categories'));
	const data = await response.json();
	return Array.isArray(data) ? data : [];
}

/**
 * Fetch VOD/movie streams
 * @param creds - User credentials
 * @returns Promise resolving to array of movies
 */
export async function fetchMovies(creds: Credentials): Promise<Movie[]> {
	const response = await fetch(buildApiUrl(creds, 'get_vod_streams'));
	const data = await response.json();
	return Array.isArray(data) ? data : [];
}

/**
 * Fetch VOD/movie categories
 * @param creds - User credentials
 * @returns Promise resolving to array of categories
 */
export async function fetchMovieCategories(creds: Credentials): Promise<Category[]> {
	const response = await fetch(buildApiUrl(creds, 'get_vod_categories'));
	const data = await response.json();
	return Array.isArray(data) ? data : [];
}

/**
 * Fetch series list
 * @param creds - User credentials
 * @returns Promise resolving to array of series
 */
export async function fetchSeries(creds: Credentials): Promise<Series[]> {
	const response = await fetch(buildApiUrl(creds, 'get_series'));
	const data = await response.json();
	return Array.isArray(data) ? data : [];
}

/**
 * Fetch series categories
 * @param creds - User credentials
 * @returns Promise resolving to array of categories
 */
export async function fetchSeriesCategories(creds: Credentials): Promise<Category[]> {
	const response = await fetch(buildApiUrl(creds, 'get_series_categories'));
	const data = await response.json();
	return Array.isArray(data) ? data : [];
}

/**
 * Fetch detailed series information including episodes
 * @param creds - User credentials
 * @param seriesId - Series ID
 * @returns Promise resolving to series info with episodes
 */
export async function fetchSeriesInfo(
	creds: Credentials,
	seriesId: number
): Promise<SeriesInfoResponse> {
	const response = await fetch(
		buildApiUrl(creds, 'get_series_info', { series_id: seriesId.toString() })
	);
	return await response.json();
}

/**
 * Fetch detailed movie information
 * @param creds - User credentials
 * @param vodId - VOD/Movie ID
 * @returns Promise resolving to movie info
 */
export async function fetchMovieInfo(
	creds: Credentials,
	vodId: number
): Promise<MovieInfoResponse> {
	const response = await fetch(
		buildApiUrl(creds, 'get_vod_info', { vod_id: vodId.toString() })
	);
	return await response.json();
}
