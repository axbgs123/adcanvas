import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { executeRoughCut } from './roughCutExecutor.js';

const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
const hasFfmpeg = spawnSync(ffmpegPath, ['-version'], { stdio: 'ignore' }).status === 0;

const createColorVideo = (target, color) => {
    const result = spawnSync(ffmpegPath, [
        '-y',
        '-f', 'lavfi',
        '-i', `color=c=${color}:s=320x180:d=0.35`,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        target
    ], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr);
};

test('renders multiple project videos into a normalized rough cut', { skip: !hasFfmpeg }, async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adcanvas-rough-cut-'));
    try {
        createColorVideo(path.join(directory, 'red.mp4'), 'red');
        createColorVideo(path.join(directory, 'blue.mp4'), 'blue');
        const result = await executeRoughCut({
            sourceVideos: ['/library/videos/red.mp4', '/library/videos/blue.mp4'],
            targetDuration: '0.7s',
            videosDirectory: directory,
            ffmpegPath,
            taskId: 'rough-cut-test'
        });

        assert.equal(result.sourceCount, 2);
        assert.equal(result.duration, 0.7);
        assert.equal(fs.existsSync(path.join(directory, path.basename(result.resultUrl))), true);
        assert.equal(fs.existsSync(path.join(directory, `${result.assetId}.json`)), true);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test('fails clearly when no source videos are available', async () => {
    await assert.rejects(
        executeRoughCut({ sourceVideos: [], videosDirectory: os.tmpdir(), taskId: 'empty' }),
        (error) => error.code === 'ROUGH_CUT_NO_INPUTS'
    );
});
