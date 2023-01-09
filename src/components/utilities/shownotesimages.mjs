import config from "config";
import Image from "@11ty/eleventy-img";
import path from "path";
import { readdir } from "fs/promises"; // node helper for reading folders
import { parse } from "path"; // node helper for grabbing file names

(async () => {
  const inputDir = path.resolve(config.get("episodes.imagesInput"));
  const outputDir = path.resolve(config.get("episodes.imagesOutput"));

  const files = await readdir(inputDir);
  for (const file of files) {
    const stats = await Image(inputDir + "/" + file, {
      widths: ["auto", 600, 1000, 1400],
      formats: ["webp", "jpeg", "avif"],
      filenameFormat: (id, src, width, format) => {
        return `${parse(file).name}-${width}.${format}`;
      },
      outputDir: outputDir,
    });
    console.log(stats); // remove this if you don't want the logs
  }
})();
