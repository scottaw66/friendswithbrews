import { getRssString } from "@astrojs/rss";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { getCollection, render } from "astro:content";
import { transform, walk } from "ultrahtml";
import sanitize from "ultrahtml/transformers/sanitize";
import { rfc2822, year } from "../components/utilities/DateFormat.mjs";
import site from "../data/site.json";

export async function GET(context) {
  let baseUrl = site.url;
  if (baseUrl.at(-1) === "/") baseUrl = baseUrl.slice(0, -1);

  const container = await AstroContainer.create();

  const episodes = (await getCollection("episodes")).sort(
    (a, b) =>
      new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf(),
  );

  // Build a map of episode descriptions for post-processing
  const descriptionMap = {};

  const items = [];
  for (const [index, episode] of episodes.entries()) {
    const { Content } = await render(episode);
    const rawContent = await container.renderToString(Content);
    const contentEncoded = await transform(
      rawContent.replace(/^<!DOCTYPE html>/, ""),
      [
        async (node) => {
          await walk(node, (node) => {
            if (node.name === "a" && node.attributes.href?.startsWith("/")) {
              node.attributes.href = baseUrl + node.attributes.href;
            }
            if (node.name === "img" && node.attributes.src?.startsWith("/")) {
              node.attributes.src = baseUrl + node.attributes.src;
            }
          });
          return node;
        },
        sanitize({
          dropElements: ["script", "style"],
          allowElements: [
            "a",
            "abbr",
            "b",
            "blockquote",
            "br",
            "code",
            "div",
            "em",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "hr",
            "i",
            "img",
            "li",
            "ol",
            "p",
            "pre",
            "span",
            "strong",
            "table",
            "tbody",
            "td",
            "th",
            "thead",
            "tr",
            "ul",
          ],
        }),
      ],
    );

    const desc = (
      episode.data.descriptionRSS || episode.data.description
    ).replace(/\\"/g, '"');
    descriptionMap[`__CDATA_DESC_${index}__`] = `<![CDATA[${desc}]]>`;

    items.push({
      title: episode.data.title,
      link: `${baseUrl}/${episode.id}`,
      pubDate: rfc2822(episode.data.date),
      description: `__CDATA_DESC_${index}__`,
      customData: `<enclosure url="${site.episodes.audioPrefix}${episode.data.audioFile}" length="${episode.data.bytes}" type="audio/mpeg" />
        <content:encoded><![CDATA[${contentEncoded}]]></content:encoded>
        <itunes:title>${episode.data.title}</itunes:title>
        <itunes:episode>${episode.data.episode}</itunes:episode>
        <itunes:duration>${episode.data.length}</itunes:duration>
        <itunes:image href="${baseUrl}/images/${site.rss.image}"/>
        <itunes:explicit>No</itunes:explicit>
        <itunes:episodeType>full</itunes:episodeType>
        <itunes:summary><![CDATA[${episode.data.description}]]></itunes:summary>
        <summary><![CDATA[${episode.data.description}]]></summary>`,
    });
  }

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
    <itunes:image href="${baseUrl}/images/${site.rss.image}" />
    <itunes:explicit>No</itunes:explicit>
    <itunes:new-feed-url>${baseUrl}/${site.rss.fileName}</itunes:new-feed-url>
    <image>
    <url>${baseUrl}/images/${site.rss.image}</url>
    <title>${site.title}</title>
    <link>${baseUrl}/</link>
    </image>
    <copyright>\u00a9${year()} ${site.name}</copyright>`,
    items,
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
