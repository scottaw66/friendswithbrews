declare module 'astro:content' {
	interface RenderResult {
		Content: import('astro/runtime/server/index.js').AstroComponentFactory;
		headings: import('astro').MarkdownHeading[];
		remarkPluginFrontmatter: Record<string, any>;
	}
	interface Render {
		'.md': Promise<RenderResult>;
	}

	export interface RenderedContent {
		html: string;
		metadata?: {
			imagePaths: Array<string>;
			[key: string]: unknown;
		};
	}
}

declare module 'astro:content' {
	type Flatten<T> = T extends { [K: string]: infer U } ? U : never;

	export type CollectionKey = keyof AnyEntryMap;
	export type CollectionEntry<C extends CollectionKey> = Flatten<AnyEntryMap[C]>;

	export type ContentCollectionKey = keyof ContentEntryMap;
	export type DataCollectionKey = keyof DataEntryMap;

	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidContentEntrySlug<C extends keyof ContentEntryMap> = AllValuesOf<
		ContentEntryMap[C]
	>['slug'];

	/** @deprecated Use `getEntry` instead. */
	export function getEntryBySlug<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;

	/** @deprecated Use `getEntry` instead. */
	export function getDataEntryById<C extends keyof DataEntryMap, E extends keyof DataEntryMap[C]>(
		collection: C,
		entryId: E,
	): Promise<CollectionEntry<C>>;

	export function getCollection<C extends keyof AnyEntryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E,
	): Promise<E[]>;
	export function getCollection<C extends keyof AnyEntryMap>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => unknown,
	): Promise<CollectionEntry<C>[]>;

	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(entry: {
		collection: C;
		slug: E;
	}): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(entry: {
		collection: C;
		id: E;
	}): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		slug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(
		collection: C,
		id: E,
	): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;

	/** Resolve an array of entry references from the same collection */
	export function getEntries<C extends keyof ContentEntryMap>(
		entries: {
			collection: C;
			slug: ValidContentEntrySlug<C>;
		}[],
	): Promise<CollectionEntry<C>[]>;
	export function getEntries<C extends keyof DataEntryMap>(
		entries: {
			collection: C;
			id: keyof DataEntryMap[C];
		}[],
	): Promise<CollectionEntry<C>[]>;

	export function render<C extends keyof AnyEntryMap>(
		entry: AnyEntryMap[C][string],
	): Promise<RenderResult>;

	export function reference<C extends keyof AnyEntryMap>(
		collection: C,
	): import('astro/zod').ZodEffects<
		import('astro/zod').ZodString,
		C extends keyof ContentEntryMap
			? {
					collection: C;
					slug: ValidContentEntrySlug<C>;
				}
			: {
					collection: C;
					id: keyof DataEntryMap[C];
				}
	>;
	// Allow generic `string` to avoid excessive type errors in the config
	// if `dev` is not running to update as you edit.
	// Invalid collection names will be caught at build time.
	export function reference<C extends string>(
		collection: C,
	): import('astro/zod').ZodEffects<import('astro/zod').ZodString, never>;

	type ReturnTypeOrOriginal<T> = T extends (...args: any[]) => infer R ? R : T;
	type InferEntrySchema<C extends keyof AnyEntryMap> = import('astro/zod').infer<
		ReturnTypeOrOriginal<Required<ContentConfig['collections'][C]>['schema']>
	>;

	type ContentEntryMap = {
		"episodes": {
"1.md": {
	id: "1.md";
  slug: "1";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"10.md": {
	id: "10.md";
  slug: "10";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"11.md": {
	id: "11.md";
  slug: "11";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"12.md": {
	id: "12.md";
  slug: "12";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"13.md": {
	id: "13.md";
  slug: "13";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"14.md": {
	id: "14.md";
  slug: "14";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"15.md": {
	id: "15.md";
  slug: "15";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"16.md": {
	id: "16.md";
  slug: "16";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"17.md": {
	id: "17.md";
  slug: "17";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"18.md": {
	id: "18.md";
  slug: "18";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"19.md": {
	id: "19.md";
  slug: "19";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"2.md": {
	id: "2.md";
  slug: "2";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"20.md": {
	id: "20.md";
  slug: "20";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"21.md": {
	id: "21.md";
  slug: "21";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"22.md": {
	id: "22.md";
  slug: "22";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"23.md": {
	id: "23.md";
  slug: "23";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"24.md": {
	id: "24.md";
  slug: "24";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"25.md": {
	id: "25.md";
  slug: "25";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"26.md": {
	id: "26.md";
  slug: "26";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"27.md": {
	id: "27.md";
  slug: "27";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"28.md": {
	id: "28.md";
  slug: "28";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"29.md": {
	id: "29.md";
  slug: "29";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"3.md": {
	id: "3.md";
  slug: "3";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"30.md": {
	id: "30.md";
  slug: "30";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"31.md": {
	id: "31.md";
  slug: "31";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"32.md": {
	id: "32.md";
  slug: "32";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"33.md": {
	id: "33.md";
  slug: "33";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"34.md": {
	id: "34.md";
  slug: "34";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"35.md": {
	id: "35.md";
  slug: "35";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"36.md": {
	id: "36.md";
  slug: "36";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"37.md": {
	id: "37.md";
  slug: "37";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"38.md": {
	id: "38.md";
  slug: "38";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"39.md": {
	id: "39.md";
  slug: "39";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"4.md": {
	id: "4.md";
  slug: "4";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"40.md": {
	id: "40.md";
  slug: "40";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"41.md": {
	id: "41.md";
  slug: "41";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"42.md": {
	id: "42.md";
  slug: "42";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"43.md": {
	id: "43.md";
  slug: "43";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"44.md": {
	id: "44.md";
  slug: "44";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"45.md": {
	id: "45.md";
  slug: "45";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"46.md": {
	id: "46.md";
  slug: "46";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"47.md": {
	id: "47.md";
  slug: "47";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"48.md": {
	id: "48.md";
  slug: "48";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"49.md": {
	id: "49.md";
  slug: "49";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"5.md": {
	id: "5.md";
  slug: "5";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"50.md": {
	id: "50.md";
  slug: "50";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"51.md": {
	id: "51.md";
  slug: "51";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"52.md": {
	id: "52.md";
  slug: "52";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"53.md": {
	id: "53.md";
  slug: "53";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"54.md": {
	id: "54.md";
  slug: "54";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"55.md": {
	id: "55.md";
  slug: "55";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"56.md": {
	id: "56.md";
  slug: "56";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"57.md": {
	id: "57.md";
  slug: "57";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"58.md": {
	id: "58.md";
  slug: "58";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"59.md": {
	id: "59.md";
  slug: "59";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"6.md": {
	id: "6.md";
  slug: "6";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"60.md": {
	id: "60.md";
  slug: "60";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"61.md": {
	id: "61.md";
  slug: "61";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"62.md": {
	id: "62.md";
  slug: "62";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"63.md": {
	id: "63.md";
  slug: "63";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"64.md": {
	id: "64.md";
  slug: "64";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"65.md": {
	id: "65.md";
  slug: "65";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"66.md": {
	id: "66.md";
  slug: "66";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"67.md": {
	id: "67.md";
  slug: "67";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"68.md": {
	id: "68.md";
  slug: "68";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"69.md": {
	id: "69.md";
  slug: "69";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"7.md": {
	id: "7.md";
  slug: "7";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"70.md": {
	id: "70.md";
  slug: "70";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"71.md": {
	id: "71.md";
  slug: "71";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"72.md": {
	id: "72.md";
  slug: "72";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"8.md": {
	id: "8.md";
  slug: "8";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
"9.md": {
	id: "9.md";
  slug: "9";
  body: string;
  collection: "episodes";
  data: any
} & { render(): Render[".md"] };
};
"transcripts": {
"1.md": {
	id: "1.md";
  slug: "T1";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"10.md": {
	id: "10.md";
  slug: "10";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"11.md": {
	id: "11.md";
  slug: "11";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"12.md": {
	id: "12.md";
  slug: "12";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"13.md": {
	id: "13.md";
  slug: "13";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"14.md": {
	id: "14.md";
  slug: "14";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"15.md": {
	id: "15.md";
  slug: "15";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"16.md": {
	id: "16.md";
  slug: "16";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"17.md": {
	id: "17.md";
  slug: "T17";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"18.md": {
	id: "18.md";
  slug: "T18";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"19.md": {
	id: "19.md";
  slug: "T19";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"2.md": {
	id: "2.md";
  slug: "T2";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"20.md": {
	id: "20.md";
  slug: "T20";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"21.md": {
	id: "21.md";
  slug: "T21";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"22.md": {
	id: "22.md";
  slug: "T22";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"23.md": {
	id: "23.md";
  slug: "T23";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"24.md": {
	id: "24.md";
  slug: "T24";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"25.md": {
	id: "25.md";
  slug: "T25";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"26.md": {
	id: "26.md";
  slug: "T26";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"27.md": {
	id: "27.md";
  slug: "T27";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"28.md": {
	id: "28.md";
  slug: "T28";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"29.md": {
	id: "29.md";
  slug: "T29";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"3.md": {
	id: "3.md";
  slug: "T3";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"30.md": {
	id: "30.md";
  slug: "T30";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"31.md": {
	id: "31.md";
  slug: "T31";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"32.md": {
	id: "32.md";
  slug: "T32";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"33.md": {
	id: "33.md";
  slug: "T33";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"34.md": {
	id: "34.md";
  slug: "T34";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"35.md": {
	id: "35.md";
  slug: "T35";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"36.md": {
	id: "36.md";
  slug: "T36";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"37.md": {
	id: "37.md";
  slug: "T37";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"38.md": {
	id: "38.md";
  slug: "T38";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"39.md": {
	id: "39.md";
  slug: "T39";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"4.md": {
	id: "4.md";
  slug: "T4";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"40.md": {
	id: "40.md";
  slug: "T40";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"41.md": {
	id: "41.md";
  slug: "T41";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"42.md": {
	id: "42.md";
  slug: "T42";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"43.md": {
	id: "43.md";
  slug: "T43";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"44.md": {
	id: "44.md";
  slug: "T44";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"45.md": {
	id: "45.md";
  slug: "T45";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"46.md": {
	id: "46.md";
  slug: "T46";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"47.md": {
	id: "47.md";
  slug: "T47";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"48.md": {
	id: "48.md";
  slug: "48";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"49.md": {
	id: "49.md";
  slug: "49";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"5.md": {
	id: "5.md";
  slug: "5";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"50.md": {
	id: "50.md";
  slug: "50";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"51.md": {
	id: "51.md";
  slug: "51";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"52.md": {
	id: "52.md";
  slug: "52";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"54.md": {
	id: "54.md";
  slug: "54";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"55.md": {
	id: "55.md";
  slug: "55";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"56.md": {
	id: "56.md";
  slug: "56";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"57.md": {
	id: "57.md";
  slug: "57";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"58.md": {
	id: "58.md";
  slug: "58";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"59.md": {
	id: "59.md";
  slug: "59";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"6.md": {
	id: "6.md";
  slug: "6";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"60.md": {
	id: "60.md";
  slug: "60";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"61.md": {
	id: "61.md";
  slug: "61";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"62.md": {
	id: "62.md";
  slug: "62";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"63.md": {
	id: "63.md";
  slug: "63";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"64.md": {
	id: "64.md";
  slug: "64";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"65.md": {
	id: "65.md";
  slug: "65";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"66.md": {
	id: "66.md";
  slug: "66";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"67.md": {
	id: "67.md";
  slug: "67";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"68.md": {
	id: "68.md";
  slug: "68";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"69.md": {
	id: "69.md";
  slug: "69";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"7.md": {
	id: "7.md";
  slug: "7";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"70.md": {
	id: "70.md";
  slug: "70";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"71.md": {
	id: "71.md";
  slug: "71";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"8.md": {
	id: "8.md";
  slug: "8";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
"9.md": {
	id: "9.md";
  slug: "9";
  body: string;
  collection: "transcripts";
  data: any
} & { render(): Render[".md"] };
};

	};

	type DataEntryMap = {
		"srt": Record<string, {
  id: string;
  collection: "srt";
  data: any;
}>;

	};

	type AnyEntryMap = ContentEntryMap & DataEntryMap;

	export type ContentConfig = never;
}
