import { getRssString } from "@astrojs/rss";
import sanitizeHtml from "sanitize-html";
import { globalImageUrls } from "../components/utilities/stringformatter.mjs";
import { rfc2822, year } from "../components/utilities/DateFormat.mjs";
import site from "../data/site.json";

export async function GET(context) {
  const episodeImportResult = import.meta.glob("../content/episodes/*.md", {
    eager: true,
  });
  let episodes = Object.values(episodeImportResult);
  episodes = episodes.sort(
    (a, b) =>
      new Date(b.frontmatter.date).valueOf() -
      new Date(a.frontmatter.date).valueOf(),
  );

  // Build a map of episode descriptions for post-processing
  const descriptionMap = {};
  episodes.forEach((episode, index) => {
    const desc = (
      episode.frontmatter.descriptionRSS || episode.frontmatter.description
    ).replace(/\\"/g, '"');
    descriptionMap[`__CDATA_DESC_${index}__`] = `<![CDATA[${desc}]]>`;
  });

  const rssString = await getRssString({
    title: site.title,
    description: site.description,
    site: site.url,
    xmlns: {
      atom: "http://www.w3.org/2005/Atom/",
      dc: "http://purl.org/dc/elements/1.1/",
      content: "http://purl.org/rss/1.0/modules/content/",
      itunes: "http://www.itunes.com/dtds/podcast-1.0.dtd",
    },
    customData: `
    <language>en-us</language>
    <itunes:title>${site.title}</itunes:title>
    <itunes:author>Beeping Machine</itunes:author>
    <itunes:owner>
      <itunes:name>${site.name}</itunes:name>
      <itunes:email>${site.email}</itunes:email>
    </itunes:owner>
    <itunes:type>episodic</itunes:type>
    <itunes:category text="Technology">
      <itunes:category text="Society &amp; Culture"/>
    </itunes:category>
    <itunes:keywords>Technology, Fitness, Beer</itunes:keywords>
    <itunes:image href="${site.url}/images/${site.rss.image}" />
    <itunes:explicit>No</itunes:explicit>
    <itunes:new-feed-url>${site.url}${site.rss.fileName}</itunes:new-feed-url>
    <image>
    <url>${site.url}images/${site.rss.image}</url>
    <title>${site.title}</title>
    <link>${site.url}</link>
    </image>
    <copyright>©${year()} ${site.name}</copyright>`,
    items: Array.from(episodes).map((episode, index) => {
      const { description, descriptionRSS, ...rest } = episode.frontmatter;
      const contentEncoded = globalImageUrls(
        site.url,
        sanitizeHtml(episode.compiledContent(), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
        }),
      );
      return {
        title: episode.frontmatter.title,
        link: `${site.url}${episode.frontmatter.id}`,
        pubDate: rfc2822(episode.frontmatter.date),
        description: `__CDATA_DESC_${index}__`,
        customData: `<enclosure url="${site.episodes.audioPrefix}${episode.frontmatter.audioFile}" length="${episode.frontmatter.bytes}" type="audio/mpeg" />
        <content:encoded><![CDATA[${contentEncoded}]]></content:encoded>
        <itunes:title>${episode.frontmatter.title}</itunes:title>
        <itunes:episode>${episode.frontmatter.episode}</itunes:episode>
        <itunes:duration>${episode.frontmatter.length}</itunes:duration>
        <itunes:image href="${site.url}images/${site.rss.image}"/>
        <itunes:explicit>No</itunes:explicit>
        <itunes:episodeType>full</itunes:episodeType>
        <itunes:summary><![CDATA[${description}]]></itunes:summary>
        <summary><![CDATA[${description}]]></summary>`,
        ...rest,
      };
    }),
  });

  // Replace placeholders with actual CDATA-wrapped descriptions
  let finalRss = rssString;
  for (const [placeholder, cdataContent] of Object.entries(descriptionMap)) {
    finalRss = finalRss.replace(placeholder, cdataContent);
  }

  return new Response(finalRss, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
