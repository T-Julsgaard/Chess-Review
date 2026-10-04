// Defaults for `remotion render`; tools/render.mjs passes the same options explicitly.
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('png');
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setOverwriteOutput(true);
