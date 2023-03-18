declare module 'astro:content' {
	interface Render {
		'.md': Promise<{
			Content: import('astro').MarkdownInstance<{}>['Content'];
			headings: import('astro').MarkdownHeading[];
			remarkPluginFrontmatter: Record<string, any>;
		}>;
	}
}

declare module 'astro:content' {
	export { z } from 'astro/zod';
	export type CollectionEntry<C extends keyof typeof entryMap> =
		(typeof entryMap)[C][keyof (typeof entryMap)[C]];

	export const image: () => import('astro/zod').ZodObject<{
		src: import('astro/zod').ZodString;
		width: import('astro/zod').ZodNumber;
		height: import('astro/zod').ZodNumber;
		format: import('astro/zod').ZodString;
	}>;

	type BaseSchemaWithoutEffects =
		| import('astro/zod').AnyZodObject
		| import('astro/zod').ZodUnion<import('astro/zod').AnyZodObject[]>
		| import('astro/zod').ZodDiscriminatedUnion<string, import('astro/zod').AnyZodObject[]>
		| import('astro/zod').ZodIntersection<
				import('astro/zod').AnyZodObject,
				import('astro/zod').AnyZodObject
		  >;

	type BaseSchema =
		| BaseSchemaWithoutEffects
		| import('astro/zod').ZodEffects<BaseSchemaWithoutEffects>;

	type BaseCollectionConfig<S extends BaseSchema> = {
		schema?: S;
		slug?: (entry: {
			id: CollectionEntry<keyof typeof entryMap>['id'];
			defaultSlug: string;
			collection: string;
			body: string;
			data: import('astro/zod').infer<S>;
		}) => string | Promise<string>;
	};
	export function defineCollection<S extends BaseSchema>(
		input: BaseCollectionConfig<S>
	): BaseCollectionConfig<S>;

	type EntryMapKeys = keyof typeof entryMap;
	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidEntrySlug<C extends EntryMapKeys> = AllValuesOf<(typeof entryMap)[C]>['slug'];

	export function getEntryBySlug<
		C extends keyof typeof entryMap,
		E extends ValidEntrySlug<C> | (string & {})
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E
	): E extends ValidEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getCollection<C extends keyof typeof entryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E
	): Promise<E[]>;
	export function getCollection<C extends keyof typeof entryMap>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => unknown
	): Promise<CollectionEntry<C>[]>;

	type InferEntrySchema<C extends keyof typeof entryMap> = import('astro/zod').infer<
		Required<ContentConfig['collections'][C]>['schema']
	>;

	const entryMap: {
		"episodes": {
"1.md": {
  id: "1.md",
  slug: "1",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"10.md": {
  id: "10.md",
  slug: "10",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"11.md": {
  id: "11.md",
  slug: "11",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"12.md": {
  id: "12.md",
  slug: "12",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"13.md": {
  id: "13.md",
  slug: "13",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"14.md": {
  id: "14.md",
  slug: "14",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"15.md": {
  id: "15.md",
  slug: "15",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"16.md": {
  id: "16.md",
  slug: "16",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"17.md": {
  id: "17.md",
  slug: "17",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"18.md": {
  id: "18.md",
  slug: "18",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"19.md": {
  id: "19.md",
  slug: "19",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"2.md": {
  id: "2.md",
  slug: "2",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"20.md": {
  id: "20.md",
  slug: "20",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"21.md": {
  id: "21.md",
  slug: "21",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"22.md": {
  id: "22.md",
  slug: "22",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"23.md": {
  id: "23.md",
  slug: "23",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"24.md": {
  id: "24.md",
  slug: "24",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"25.md": {
  id: "25.md",
  slug: "25",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"26.md": {
  id: "26.md",
  slug: "26",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"27.md": {
  id: "27.md",
  slug: "27",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"3.md": {
  id: "3.md",
  slug: "3",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"4.md": {
  id: "4.md",
  slug: "4",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"5.md": {
  id: "5.md",
  slug: "5",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"6.md": {
  id: "6.md",
  slug: "6",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"7.md": {
  id: "7.md",
  slug: "7",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"8.md": {
  id: "8.md",
  slug: "8",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
"9.md": {
  id: "9.md",
  slug: "9",
  body: string,
  collection: "episodes",
  data: InferEntrySchema<"episodes">
} & { render(): Render[".md"] },
},
"transcripts": {
"1.md": {
  id: "1.md",
  slug: "T1",
  body: string,
  collection: "transcripts",
  data: InferEntrySchema<"transcripts">
} & { render(): Render[".md"] },
"22.md": {
  id: "22.md",
  slug: "T22",
  body: string,
  collection: "transcripts",
  data: InferEntrySchema<"transcripts">
} & { render(): Render[".md"] },
"24.md": {
  id: "24.md",
  slug: "T24",
  body: string,
  collection: "transcripts",
  data: InferEntrySchema<"transcripts">
} & { render(): Render[".md"] },
"25.md": {
  id: "25.md",
  slug: "T25",
  body: string,
  collection: "transcripts",
  data: InferEntrySchema<"transcripts">
} & { render(): Render[".md"] },
"26.md": {
  id: "26.md",
  slug: "T26",
  body: string,
  collection: "transcripts",
  data: InferEntrySchema<"transcripts">
} & { render(): Render[".md"] },
"27.md": {
  id: "27.md",
  slug: "T27",
  body: string,
  collection: "transcripts",
  data: InferEntrySchema<"transcripts">
} & { render(): Render[".md"] },
},

	};

	type ContentConfig = typeof import("../src/content/config");
}
