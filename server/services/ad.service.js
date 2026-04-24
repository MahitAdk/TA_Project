import ffmpeg from "fluent-ffmpeg";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const firstExistingPath = (...candidates) =>
  candidates.filter(Boolean).find((candidate) => fs.existsSync(candidate));

const resolvedFfmpegPath = firstExistingPath(
  process.env.FFMPEG_PATH,
  "C:/ffmpeg-2026-04-22-git-162ad61486-full_build/ffmpeg-2026-04-22-git-162ad61486-full_build/bin/ffmpeg.exe",
  "C:/ffmpeg/bin/ffmpeg.exe"
);

const resolvedFfprobePath = firstExistingPath(
  process.env.FFPROBE_PATH,
  "C:/ffmpeg-2026-04-22-git-162ad61486-full_build/ffmpeg-2026-04-22-git-162ad61486-full_build/bin/ffprobe.exe",
  "C:/ffmpeg/bin/ffprobe.exe"
);

const resolvedFontPath = firstExistingPath(
  process.env.AD_FONT_PATH,
  "C:/temp/fonts/arialbd.ttf",
  "C:/temp/fonts/arial.ttf",
  "C:/Windows/Fonts/arialbd.ttf",
  "C:/Windows/Fonts/arial.ttf"
);

if (resolvedFfmpegPath) {
  ffmpeg.setFfmpegPath(resolvedFfmpegPath);
}

if (resolvedFfprobePath) {
  ffmpeg.setFfprobePath(resolvedFfprobePath);
}

const winPath = (targetPath) => targetPath.replace(/\\/g, "/");
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const normalizeText = (value, fallback = "", maxLength = 90) =>
  (value || fallback)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const wrapText = (value, maxCharsPerLine = 24, maxLines = 3) => {
  const words = normalizeText(value).split(" ").filter(Boolean);

  if (words.length === 0) {
    return "";
  }

  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxCharsPerLine) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;

    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines.join("\n");
};

const escapeDrawtext = (value) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

const escapeFontPath = (targetPath) => winPath(targetPath).replace(/:/g, "\\:");

const renderVideo = (command) =>
  new Promise((resolve, reject) => {
    command
      .on("start", (cmd) => console.log("[FFmpeg render]", cmd))
      .on("end", resolve)
      .on("error", (err) => {
        console.error("[FFmpeg render error]:", err.message);
        reject(err);
      })
      .run();
  });

/* ================================
   GEMINI ANALYSIS
================================ */
export async function analyzeProductImage(imageBuffer, mimeType) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this product image and return ONLY JSON:
{
  "productName": string,
  "headline": string,
  "adCopy": string,
  "cta": string,
  "platform": string,
  "hashtags": string[],
  "tone": string,
  "keyFeatures": string,
  "targetAudience": string,
  "usp": string
}`,
            },
            {
              inlineData: {
                mimeType,
                data: imageBuffer.toString("base64"),
              },
            },
          ],
        },
      ],
    });

    let text = result.response.text().trim();
    text = text.replace(/```json|```/g, "").trim();

    return JSON.parse(text);
  } catch (err) {
    console.log("[Gemini fallback]:", err.message);

    return {
      productName: "Product",
      headline: "Premium Quality, Made Simple",
      adCopy: "Upgrade your lifestyle today.",
      cta: "Shop Now",
      platform: "Instagram",
      hashtags: ["sale", "premium"],
      tone: "Modern",
      keyFeatures: "High quality",
      targetAudience: "Everyone",
      usp: "Affordable premium feel",
    };
  }
}

/* ================================
   VIDEO GENERATION (PRO LEVEL)
================================ */
export async function generateVideoFromImage(inputPath, outputPath, analysis) {
  if (!resolvedFfmpegPath || !fs.existsSync(resolvedFfmpegPath)) {
    throw new Error("FFmpeg binary not found. Set FFMPEG_PATH to a valid ffmpeg.exe.");
  }

  if (!resolvedFontPath || !fs.existsSync(resolvedFontPath)) {
    throw new Error("No usable font found for drawtext. Set AD_FONT_PATH to a valid .ttf file.");
  }

  ensureDir(path.dirname(outputPath));
  ensureDir(path.join(__dirname, "..", "tmp"));
  ensureDir(path.join(os.tmpdir(), "ta-project-ad-renders"));

  const safeOutput = winPath(outputPath);
  const fontPath = escapeFontPath(resolvedFontPath);
  const duration = 10;
  const fps = 30;
  const totalFrames = duration * fps;
  const halfwayFrame = Math.floor(totalFrames / 2);

  const headline = escapeDrawtext(
    wrapText(
      normalizeText(analysis?.headline, analysis?.productName || "Premium product", 72),
      20,
      2
    )
  );
  const bodyCopy = escapeDrawtext(
    wrapText(
      normalizeText(
        analysis?.adCopy,
        analysis?.keyFeatures || "Crafted for daily use with a refined premium finish.",
        120
      ),
      30,
      3
    )
  );
  const cta = escapeDrawtext(
    normalizeText(analysis?.cta, "Shop Now", 20).toUpperCase()
  );
  const brandLine = escapeDrawtext(
    normalizeText(
      analysis?.productName,
      analysis?.platform ? `${analysis.platform} Ad` : "Featured Product",
      38
    ).toUpperCase()
  );

  const filterGraph = [
    `[0:v]split=2[bgsrc][herosrc]`,
    `[bgsrc]scale=1600:-1,zoompan=z='if(lte(on,${halfwayFrame}),1.08+0.00035*on,1.185-0.00018*(on-${halfwayFrame}))':x='iw/2-(iw/zoom/2)+40*sin(on/17)':y='ih/2-(ih/zoom/2)+28*cos(on/19)':d=${totalFrames}:s=1080x1080:fps=${fps},boxblur=18:8,eq=contrast=1.10:brightness=0.02:saturation=1.18,setsar=1[bg]`,
    `[herosrc]scale=1080:-1,zoompan=z='1.0+0.0005*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=780x780:fps=${fps},eq=contrast=1.04:brightness=0.01:saturation=1.12,setsar=1[hero]`,
    `[bg]drawbox=x=0:y=0:w=iw:h=ih:color=black@0.18:t=fill[bgdim]`,
    `[bgdim]drawbox=x=74:y=78:w=932:h=936:color=white@0.10:t=3[panel]`,
    `[panel][hero]overlay=x='(W-w)/2+14*sin(t*0.9)':y='120+10*sin(t*1.4)':eval=frame[base]`,
    `[base]drawbox=x=0:y=700:w=iw:h=300:color=black@0.34:t=fill[textbg]`,
    `[textbg]drawtext=fontfile='${fontPath}':text='${brandLine}':fontsize=28:fontcolor=white@0.72:x=92:y=742:enable='between(t,0,10)'[brand]`,
    `[brand]drawtext=fontfile='${fontPath}':text='${headline}':fontsize=62:line_spacing=10:fontcolor=white:x='(w-text_w)/2':y='770-20*cos(t*1.5)':alpha='if(lt(t,0.35),0,if(lt(t,0.9),(t-0.35)/0.55,if(lt(t,3.2),1,if(lt(t,3.8),(3.8-t)/0.6,0))))':enable='between(t,0.35,3.8)'[headline]`,
    `[headline]drawtext=fontfile='${fontPath}':text='${bodyCopy}':fontsize=38:line_spacing=12:fontcolor=white@0.96:x='(w-text_w)/2':y='788+8*sin(t*1.2)':alpha='if(lt(t,3.2),0,if(lt(t,3.8),(t-3.2)/0.6,if(lt(t,6.8),1,if(lt(t,7.4),(7.4-t)/0.6,0))))':enable='between(t,3.2,7.4)'[copy]`,
    `[copy]drawbox=x=340:y=850:w=400:h=96:color=white@0.92:t=fill:enable='between(t,7.0,10)'[ctabox]`,
    `[ctabox]drawtext=fontfile='${fontPath}':text='${cta}':fontsize=34:fontcolor=black:x='(w-text_w)/2+6*sin(t*3.2)':y='881+2*sin(t*4)':alpha='if(lt(t,7.0),0,if(lt(t,7.5),(t-7.0)/0.5,1))':enable='between(t,7.0,10)',fade=t=in:st=0:d=0.5,fade=t=out:st=9.35:d=0.65,format=yuv420p[vout]`,
  ].join(";");

  try {
    await renderVideo(
      ffmpeg()
        .input(winPath(inputPath))
        .inputOptions(["-loop 1"])
        .duration(duration)
        .complexFilter(filterGraph)
        .outputOptions([
          "-map [vout]",
          "-r 30",
          "-c:v libx264",
          "-preset slow",
          "-crf 17",
          "-profile:v high",
          "-level 4.2",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
        ])
        .noAudio()
        .output(safeOutput)
    );

    console.log("[FFmpeg] Final video created:", safeOutput);
    return safeOutput;
  } catch (err) {
    console.error("Video generation failed:", err);
    throw err;
  }
}
