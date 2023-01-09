declare module 'astro:content' {
	export { z } from 'astro/zod';
	export type CollectionEntry<C extends keyof typeof entryMap> =
		typeof entryMap[C][keyof typeof entryMap[C]] & Render;

	type BaseCollectionConfig<S extends import('astro/zod').ZodRawShape> = {
		schema?: S;
		slug?: (entry: {
			id: CollectionEntry<keyof typeof entryMap>['id'];
			defaultSlug: string;
			collection: string;
			body: string;
			data: import('astro/zod').infer<import('astro/zod').ZodObject<S>>;
		}) => string | Promise<string>;
	};
	export function defineCollection<S extends import('astro/zod').ZodRawShape>(
		input: BaseCollectionConfig<S>
	): BaseCollectionConfig<S>;

	export function getEntry<C extends keyof typeof entryMap, E extends keyof typeof entryMap[C]>(
		collection: C,
		entryKey: E
	): Promise<typeof entryMap[C][E] & Render>;
	export function getCollection<
		C extends keyof typeof entryMap,
		E extends keyof typeof entryMap[C]
	>(
		collection: C,
		filter?: (data: typeof entryMap[C][E]) => boolean
	): Promise<(typeof entryMap[C][E] & Render)[]>;

	type InferEntrySchema<C extends keyof typeof entryMap> = import('astro/zod').infer<
		import('astro/zod').ZodObject<Required<ContentConfig['collections'][C]>['schema']>
	>;

	type Render = {
		render(): Promise<{
			Content: import('astro').MarkdownInstance<{}>['Content'];
			headings: import('astro').MarkdownHeading[];
			injectedFrontmatter: Record<string, any>;
		}>;
	};

	const entryMap: {
		"episodes": {
"1.md": {
  id: "1.md",
  slug: "1",
  body: string,
  collection: "episodes",
  data: any
},
"10.md": {
  id: "10.md",
  slug: "10",
  body: string,
  collection: "episodes",
  data: any
},
"11.md": {
  id: "11.md",
  slug: "11",
  body: string,
  collection: "episodes",
  data: any
},
"12.md": {
  id: "12.md",
  slug: "12",
  body: string,
  collection: "episodes",
  data: any
},
"13.md": {
  id: "13.md",
  slug: "13",
  body: string,
  collection: "episodes",
  data: any
},
"14.md": {
  id: "14.md",
  slug: "14",
  body: string,
  collection: "episodes",
  data: any
},
"15.md": {
  id: "15.md",
  slug: "15",
  body: string,
  collection: "episodes",
  data: any
},
"16.md": {
  id: "16.md",
  slug: "16",
  body: string,
  collection: "episodes",
  data: any
},
"17.md": {
  id: "17.md",
  slug: "17",
  body: string,
  collection: "episodes",
  data: any
},
"18.md": {
  id: "18.md",
  slug: "18",
  body: string,
  collection: "episodes",
  data: any
},
"19.md": {
  id: "19.md",
  slug: "19",
  body: string,
  collection: "episodes",
  data: any
},
"2.md": {
  id: "2.md",
  slug: "2",
  body: string,
  collection: "episodes",
  data: any
},
"20.md": {
  id: "20.md",
  slug: "20",
  body: string,
  collection: "episodes",
  data: any
},
"21.md": {
  id: "21.md",
  slug: "21",
  body: string,
  collection: "episodes",
  data: any
},
"3.md": {
  id: "3.md",
  slug: "3",
  body: string,
  collection: "episodes",
  data: any
},
"4.md": {
  id: "4.md",
  slug: "4",
  body: string,
  collection: "episodes",
  data: any
},
"5.md": {
  id: "5.md",
  slug: "5",
  body: string,
  collection: "episodes",
  data: any
},
"6.md": {
  id: "6.md",
  slug: "6",
  body: string,
  collection: "episodes",
  data: any
},
"7.md": {
  id: "7.md",
  slug: "7",
  body: string,
  collection: "episodes",
  data: any
},
"8.md": {
  id: "8.md",
  slug: "8",
  body: string,
  collection: "episodes",
  data: any
},
"9.md": {
  id: "9.md",
  slug: "9",
  body: string,
  collection: "episodes",
  data: any
},
},

	};

	type ContentConfig = never;
}
