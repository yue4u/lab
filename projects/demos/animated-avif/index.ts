import { html } from "@/site/core";
import inui from "./inui.avif?url";

const content = `
# Animated avif

## Demo

source: [https://www.youtube.com/watch?v=rVJOfnMrF_s](https://www.youtube.com/watch?v=rVJOfnMrF_s)

![](${inui})

## Convert from any video

### Local

1. \`ffmpeg -i any.{mp4,mkv,...} -o tmp.y4m\`
2. \`avifenc -j all tmp.y4m any.avif\`

### In browser // TODO

Previous art:

1. [\`@ffmpeg/wasm\`](https://github.com/ffmpegwasm/ffmpeg.wasm)
2. [\`@saschazar/wasm-avif\`](https://github.com/saschazar21/webassembly/tree/main/packages/avif)
3. [\`GoogleChromeLabs/squoosh/blob/dev/codecs/avif\`](https://github.com/GoogleChromeLabs/squoosh/blob/dev/codecs/avif/)

Existing libavif's wasm build doesn't seem to support y4m input yet.
It looks doable via adapting [GoogleChromeLabs/squoosh/blob/dev/codecs/avif/enc/avif_enc.cpp](https://github.com/GoogleChromeLabs/squoosh/blob/dev/codecs/avif/enc/avif_enc.cpp) with [AOMediaCodec/libavif/apps/avifenc.c](https://github.com/AOMediaCodec/libavif/blob/21961f41f5605e96a5a5a4bed88d899131102a7a/apps/avifenc.c) then modify \`y4mRead\` in [AOMediaCodec/libavif/apps/shared/y4m.c](https://github.com/AOMediaCodec/libavif/blob/21961f41f5605e96a5a5a4bed88d899131102a7a/apps/shared/y4m.c) to accept in-memory file. As soon as the adapted version can build successfully the job is almost done.
`;

export const template = () => html`<lab-md>${content}</lab-md>`;