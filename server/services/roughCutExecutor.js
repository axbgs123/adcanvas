import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const resolveVideoPath = (videosDirectory, url) => {
    if (typeof url !== 'string' || !url.startsWith('/library/videos/')) {
        throw new Error(`Unsupported source video URL: ${url}`);
    }
    const filename = path.basename(url);
    const resolved = path.join(videosDirectory, filename);
    if (!fs.existsSync(resolved)) throw new Error(`Source video does not exist: ${filename}`);
    return resolved;
};

const parseDuration = (value, fallback = 15) => {
    const parsed = Number.parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 120) : fallback;
};

const runFfmpeg = (ffmpegPath, args) => new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    process.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        if (stderr.length > 12000) stderr = stderr.slice(-12000);
    });
    process.on('error', reject);
    process.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-1200)}`));
    });
});

export const executeRoughCut = async ({
    sourceVideos,
    targetDuration,
    videosDirectory,
    ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg',
    taskId
}) => {
    if (!Array.isArray(sourceVideos) || sourceVideos.length === 0) {
        const error = new Error('No successful video assets are available for the rough cut');
        error.code = 'ROUGH_CUT_NO_INPUTS';
        throw error;
    }

    fs.mkdirSync(videosDirectory, { recursive: true });
    const inputs = sourceVideos.map((url) => resolveVideoPath(videosDirectory, url));
    const duration = parseDuration(targetDuration);
    const outputId = `rough_cut_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const outputFilename = `${outputId}.mp4`;
    const outputPath = path.join(videosDirectory, outputFilename);

    const inputArgs = inputs.flatMap((input) => ['-i', input]);
    const normalizedFilters = inputs.map((_, index) => (
        `[${index}:v]scale=1280:720:force_original_aspect_ratio=decrease,` +
        `pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30,setpts=PTS-STARTPTS[v${index}]`
    ));
    const outputLabel = inputs.length === 1 ? 'v0' : 'outv';
    if (inputs.length > 1) {
        normalizedFilters.push(`${inputs.map((_, index) => `[v${index}]`).join('')}concat=n=${inputs.length}:v=1:a=0[outv]`);
    }

    await runFfmpeg(ffmpegPath, [
        '-y',
        ...inputArgs,
        '-filter_complex', normalizedFilters.join(';'),
        '-map', `[${outputLabel}]`,
        '-t', String(duration),
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        outputPath
    ]);

    const metadata = {
        id: outputId,
        taskId,
        filename: outputFilename,
        sourceVideos,
        targetDuration: duration,
        createdAt: new Date().toISOString(),
        type: 'videos',
        purpose: 'advertising-rough-cut'
    };
    fs.writeFileSync(path.join(videosDirectory, `${outputId}.json`), JSON.stringify(metadata, null, 2));

    return {
        resultUrl: `/library/videos/${outputFilename}`,
        assetId: outputId,
        duration,
        sourceCount: sourceVideos.length
    };
};
