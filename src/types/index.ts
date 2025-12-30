/**
 * IPTV Application Type Definitions
 */

/**
 * User credentials for IPTV service
 */
export interface Credentials {
	/** Protocol (http or https) */
	protocol?: string;
	/** IPTV server host (with optional port, e.g., example.com:8080) */
	host: string;
	/** Port number (optional, can be included in host) */
	port?: string;
	/** Username for authentication */
	user: string;
	/** Password for authentication */
	pass: string;
}

/**
 * IPTV Profile with name and credentials
 */
export interface IPTVProfile {
	/** Unique profile ID */
	id: string;
	/** Profile name */
	name: string;
	/** Profile credentials */
	credentials: Credentials;
}

/**
 * Watch history item
 */
export interface WatchHistoryItem {
	/** Item ID */
	id: string;
	/** Item name */
	name: string;
	/** Item type (live, movie, series) */
	type: 'live' | 'movie' | 'series';
	/** Stream icon/poster URL */
	icon?: string;
	/** Timestamp when watched */
	timestamp: number;
}

/**
 * Favorite item
 */
export interface FavoriteItem {
	/** Item ID */
	id: string;
	/** Item name */
	name: string;
	/** Item type (live, movie, series) */
	type: 'live' | 'movie' | 'series';
	/** Stream icon/poster URL */
	icon?: string;
	/** Timestamp when added to favorites */
	timestamp: number;
}

/**
 * User account information from IPTV service
 */
export interface UserInfo {
	/** Username */
	username?: string;
	/** Password */
	password?: string;
	/** Account status (Active, Banned, etc.) */
	status?: string;
	/** Account expiration date (Unix timestamp) */
	exp_date?: string;
	/** Is trial account */
	is_trial?: string;
	/** Active connections count */
	active_cons?: string;
	/** Created at timestamp */
	created_at?: string;
	/** Maximum connections allowed */
	max_connections?: string;
	/** Allowed output formats */
	allowed_output_formats?: string[];
}

/**
 * Live TV channel information
 */
export interface LiveChannel {
	/** Unique stream ID */
	stream_id: number;
	/** Channel number */
	num: number;
	/** Channel name */
	name: string;
	/** Stream type */
	stream_type: string;
	/** Stream icon URL */
	stream_icon?: string;
	/** EPG channel ID */
	epg_channel_id?: string;
	/** Added timestamp */
	added?: string;
	/** Category ID */
	category_id: string;
	/** Custom SID */
	custom_sid?: string;
	/** TV archive flag */
	tv_archive?: number;
	/** Direct source */
	direct_source?: string;
	/** TV archive duration */
	tv_archive_duration?: number;
}

/**
 * Category information
 */
export interface Category {
	/** Category ID */
	category_id: string;
	/** Category name */
	category_name: string;
	/** Parent category ID */
	parent_id?: number;
}

/**
 * Movie/VOD stream information
 */
export interface Movie {
	/** Unique stream ID */
	stream_id: number;
	/** Movie name */
	name: string;
	/** Stream icon/poster URL */
	stream_icon?: string;
	/** Cover image URL */
	cover?: string;
	/** Stream type */
	stream_type?: string;
	/** Category ID */
	category_id: string;
	/** Container extension (mp4, mkv, etc.) */
	container_extension?: string;
	/** Added timestamp */
	added?: string;
	/** Rating */
	rating?: string;
	/** Rating 5 based */
	rating_5based?: number;
}

/**
 * Series information
 */
export interface Series {
	/** Unique series ID */
	series_id: number;
	/** Series name */
	name: string;
	/** Cover image URL */
	cover?: string;
	/** Plot/description */
	plot?: string;
	/** Cast */
	cast?: string;
	/** Director */
	director?: string;
	/** Genre */
	genre?: string;
	/** Release date */
	releaseDate?: string;
	/** Last modified timestamp */
	last_modified?: string;
	/** Rating */
	rating?: string;
	/** Rating 5 based */
	rating_5based?: number;
	/** Backdrop path */
	backdrop_path?: string[];
	/** YouTube trailer */
	youtube_trailer?: string;
	/** Episode run time */
	episode_run_time?: string;
	/** Category ID */
	category_id: string;
}

/**
 * Episode information
 */
export interface Episode {
	/** Episode ID */
	id: string;
	/** Stream ID */
	stream_id?: string;
	/** Episode number */
	episode_num: number;
	/** Episode title */
	title?: string;
	/** Container extension */
	container_extension: string;
	/** Episode info */
	info?: {
		/** Episode name */
		name?: string;
		/** Duration */
		duration?: string;
		/** Plot */
		plot?: string;
		/** Release date */
		releasedate?: string;
		/** Rating */
		rating?: string;
	};
	/** Custom SID */
	custom_sid?: string;
	/** Added timestamp */
	added?: string;
	/** Season number */
	season?: number;
	/** Direct source */
	direct_source?: string;
}

/**
 * Series episodes grouped by season
 */
export interface SeriesEpisodes {
	[season: string]: Episode[];
}

/**
 * Series info response from API
 */
export interface SeriesInfoResponse {
	/** Series seasons */
	seasons?: any[];
	/** Series info */
	info?: Series;
	/** Episodes grouped by season */
	episodes?: SeriesEpisodes;
}

/**
 * Movie info response from API
 */
export interface MovieInfoResponse {
	/** Movie info */
	info?: Movie & {
		/** Container extension */
		container_extension?: string;
		/** Duration */
		duration?: string;
		/** Plot */
		plot?: string;
	};
	/** Movie data */
	movie_data?: any;
}

/**
 * Cache data structure
 */
export interface CacheData {
	/** User information */
	userInfo: UserInfo;
	/** Live channels */
	liveChannels: LiveChannel[];
	/** Live categories */
	liveCategories: Category[];
	/** Movies */
	movies: Movie[];
	/** Movie categories */
	movieCategories: Category[];
	/** Series */
	series: Series[];
	/** Series categories */
	seriesCategories: Category[];
	/** Cache timestamp */
	timestamp: string;
}

/**
 * Virtual scroll state
 */
export interface VirtualScrollState {
	/** Items to render */
	items: any[];
	/** Number of items already rendered */
	rendered: number;
	/** Batch size for rendering */
	batchSize: number;
}

/**
 * Screen elements collection
 */
export interface ScreenElements {
	/** Loading screen element */
	loadingScreen: HTMLElement | null;
	/** Login screen element */
	loginScreen: HTMLElement | null;
	/** Main screen element */
	mainScreen: HTMLElement | null;
	/** Live TV screen element */
	livetvScreen: HTMLElement | null;
	/** Movies screen element */
	moviesScreen: HTMLElement | null;
	/** Series screen element */
	seriesScreen: HTMLElement | null;
	/** Episodes screen element */
	episodesScreen: HTMLElement | null;
	/** Player screen element */
	playerScreen: HTMLElement | null;
	/** Settings modal element */
	settingsModal: HTMLElement | null;
}

/**
 * Screen names
 */
export type ScreenName = 
	| 'loading' 
	| 'login' 
	| 'main' 
	| 'livetv' 
	| 'movies' 
	| 'series' 
	| 'episodes' 
	| 'player';

/**
 * Focus direction for spatial navigation
 * Represents the four cardinal directions for focus movement
 */
export type FocusDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Navigation context types
 * Defines the different UI contexts that affect navigation behavior
 */
export type NavigationContext = 'main' | 'modal' | 'sidebar' | 'grid';

/**
 * Element geometry information for spatial calculations
 */
export interface ElementGeometry {
	/** Element reference */
	element: HTMLElement;
	/** Bounding rectangle */
	rect: DOMRect;
	/** Center point X coordinate */
	centerX: number;
	/** Center point Y coordinate */
	centerY: number;
}

/**
 * Scored candidate for focus movement
 * Contains scoring information used to select the best navigation target
 */
export interface ScoredCandidate {
	/** Candidate element */
	element: HTMLElement;
	/** Element geometry */
	geometry: ElementGeometry;
	/** Euclidean distance from current element */
	distance: number;
	/** Angle difference from desired direction (0-180 degrees) */
	angleDiff: number;
	/** Combined score (lower is better) */
	score: number;
}

/**
 * Focus state tracking
 * Maintains the current focus state and history for navigation
 */
export interface FocusState {
	/** Currently focused element */
	current: HTMLElement | null;
	/** Previously focused element (for immediate back navigation) */
	previous: HTMLElement | null;
	/** Focus history stack for complex navigation flows */
	history: HTMLElement[];
	/** Current navigation context */
	context: NavigationContext;
}

/**
 * Navigation system configuration
 * Defines behavior parameters for spatial navigation
 */
export interface NavigationConfig {
	/** Minimum displacement threshold for direction detection (pixels) */
	directionThreshold: number;
	/** Weight multiplier for angle difference in scoring */
	angleWeight: number;
	/** Weight multiplier for distance in scoring */
	distanceWeight: number;
	/** Enable horizontal wrapping in grids */
	enableHorizontalWrap: boolean;
	/** Enable vertical wrapping in grids */
	enableVerticalWrap: boolean;
	/** Scroll behavior when focusing elements */
	scrollBehavior: ScrollBehavior;
	/** Scroll block alignment */
	scrollBlock: ScrollLogicalPosition;
}

/**
 * Performance metrics for navigation operations
 * Tracks timing and performance statistics
 */
export interface PerformanceMetrics {
	/** Total number of navigation operations */
	operationCount: number;
	/** Total time spent in navigation operations (ms) */
	totalTime: number;
	/** Average time per operation (ms) */
	averageTime: number;
	/** Maximum operation time (ms) */
	maxTime: number;
	/** Minimum operation time (ms) */
	minTime: number;
	/** Time of last operation (ms) */
	lastOperationTime: number;
}
