import rss from "@astrojs/rss";
import sanitizeHtml from "sanitize-html";
import { globalImageUrls } from "../components/utilities/stringformatter.mjs";
import { rfc2822, year } from "../components/utilities/DateFormat.mjs";
import site from "../data/site.json";

export function GET(context) {
  const episodeImportResult = import.meta.glob("../content/episodes/*.md", {
    eager: true,
  });
  let episodes = Object.values(episodeImportResult);
  episodes = episodes.sort(
    (a, b) =>
      new Date(b.frontmatter.date).valueOf() -
      new Date(a.frontmatter.date).valueOf(),
  );
  return rss({
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
    items: Array.from(episodes).map((episode) => ({
      title: episode.frontmatter.title,
      link: `${site.url}${episode.frontmatter.id}`,
      pubDate: rfc2822(episode.frontmatter.date),
      description: episode.frontmatter.description,
      content: globalImageUrls(
        site.url,
        sanitizeHtml(episode.compiledContent(), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
        }),
      ),
      customData: `<enclosure url="${site.episodes.audioPrefix}${episode.frontmatter.audioFile}" length="${episode.frontmatter.bytes}" type="audio/mpeg" />
      <itunes:title>${episode.frontmatter.title}</itunes:title>
      <itunes:episode>${episode.frontmatter.episode}</itunes:episode>
      <itunes:duration>${episode.frontmatter.length}</itunes:duration>
      <itunes:image href="${site.url}images/${site.rss.image}"/>
      <itunes:explicit>No</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:summary><![CDATA[${episode.frontmatter.description}]]></itunes:summary>
      <summary><![CDATA[${episode.frontmatter.description}]]></summary>`,
      ...episode.frontmatter,
    })),
  });
}
