import rss from "@astrojs/rss";
import sanitizeHtml from "sanitize-html";
import config from "config";
import { rfc2822, year } from "../components/utilities/DateFormat";

const episodeImportResult = import.meta.glob("../content/episodes/*.md", {
  eager: true,
});
let episodes = Object.values(episodeImportResult);
episodes = episodes.sort(
  (a, b) =>
    new Date(b.frontmatter.date).valueOf() -
    new Date(a.frontmatter.date).valueOf()
);

export const get = () =>
  rss({
    title: config.get("title"),
    description: config.get("description"),
    site: config.get("url"),
    xmlns: {
      atom: "http://www.w3.org/2005/Atom/",
      dc: "http://purl.org/dc/elements/1.1/",
      content: "http://purl.org/rss/1.0/modules/content/",
      itunes: "http://www.itunes.com/dtds/podcast-1.0.dtd",
    },
    customData: `
    <language>en-us</language>
    <itunes:title>${config.get("title")}</itunes:title>
    <itunes:author>Beeping Machine</itunes:author>
    <itunes:owner>
      <itunes:name>${config.get("name")}</itunes:name>
      <itunes:email>${config.get("email")}</itunes:email>
    </itunes:owner>
    <itunes:type>episodic</itunes:type>
    <itunes:category text="Technology">
      <itunes:category text="Society &amp; Culture"/>
    </itunes:category>
    <itunes:keywords>Technology, Fitness, Beer</itunes:keywords>
    <itunes:image href="${
      config.get("url") + "images/" + config.get("rss.image")
    }"/>
    <itunes:explicit>No</itunes:explicit>
    <itunes:new-feed-url>${
      config.get("url") + config.get("rss.fileName")
    }</itunes:new-feed-url>
    <image>
    <url>${config.get("url") + "images/" + config.get("rss.image")}</url>
    <title>${config.get("title")}</title>
    <link>${config.get("url")}</link>
    </image>
    <copyright>©${year()} ${config.get("name")}</copyright>`,
    items: Array.from(episodes).map((episode) => ({
      title: episode.frontmatter.title,
      link: `${config.get("url")}${episode.frontmatter.slug}`,
      pubDate: rfc2822(episode.frontmatter.date),
      description: episode.frontmatter.description,
      content: sanitizeHtml(episode.compiledContent()),
      customData: `<enclosure url="${config.get("episodes.audioPrefix")}${
        episode.frontmatter.audioFile
      }" length="${episode.frontmatter.bytes}" type="audio/mpeg" />
      <itunes:title>${episode.frontmatter.title}</itunes:title>
      <itunes:episode>${episode.frontmatter.episode}</itunes:episode>
      <itunes:duration>${episode.frontmatter.length}</itunes:duration>
      <itunes:image href="${config.get("url")}images/${config.get(
        "rss.image"
      )}"/>
      <itunes:explicit>No</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:summary><![CDATA[${
        episode.frontmatter.description
      }]]></itunes:summary>`,
    })),
  });
