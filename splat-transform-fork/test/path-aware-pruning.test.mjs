import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, readFile as fsReadFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import { Column, DataTable, computeFrustumPlanes, pointInFrustumBatch, computePathAwareImportanceV5, filterByPath, processDataTable, readPly } from '../src/lib/index.js';
import { quickselect } from '../src/lib/utils/quickselect.js';
import { createTestDataTable, encodePlyBinary } from './helpers/test-utils.mjs';

class BufferReadSource {
    constructor(data) {
        this.data = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
        this.size = this.data.length;
        this.seekable = true;
        this.closed = false;
    }

    read(start = 0, end = this.size) {
        const clampedStart = Math.max(0, Math.min(start, this.size));
        const clampedEnd = Math.max(clampedStart, Math.min(end, this.size));
        return new BufferReadStream(this.data, clampedStart, clampedEnd);
    }
}

class BufferReadStream {
    constructor(data, start, end) {
        this.data = data;
        this.offset = start;
        this.end = end;
        this.size = end - start;
        this.bytesRead = 0;
    }

    async pull(target) {
        const remaining = this.end - this.offset;
        if (remaining <= 0) return 0;
        const bytesToCopy = Math.min(target.length, remaining);
        target.set(this.data.subarray(this.offset, this.offset + bytesToCopy));
        this.offset += bytesToCopy;
        this.bytesRead += bytesToCopy;
        return bytesToCopy;
    }

    async readAll() {
        const result = this.data.subarray(this.offset, this.end);
        this.bytesRead += result.length;
        this.offset = this.end;
        return result;
    }
}

const logit = (p) => Math.log(p / (1 - p));

const topKIndices = (scores, keepCount) => {
    const n = scores.length;
    const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    if (keepCount <= 0) return new Uint32Array(0);
    if (keepCount >= n) return idx;
    quickselect(scores, idx, n - keepCount);
    return idx.subarray(n - keepCount).slice();
};

describe('path-aware v5 geometry', () => {
    it('pointInFrustumBatch basic case', () => {
        const planes = computeFrustumPlanes(
            [0, 0, 0],
            [0, 0, 0],
            90,
            1,
            0.1,
            10
        );
        const points = new Float64Array([
            0, 0, 2,
            0, 0, -2,
            3, 0, 2,
            0.5, 0.5, 2
        ]);
        const inside = pointInFrustumBatch(points, planes);
        assert.deepStrictEqual(Array.from(inside), [1, 0, 0, 1]);
    });

    it('importance doubles with opacity for visible gaussian', () => {
        const makeTable = (alpha) => new DataTable([
            new Column('x', new Float32Array([0])),
            new Column('y', new Float32Array([0])),
            new Column('z', new Float32Array([3])),
            new Column('opacity', new Float32Array([logit(alpha)])),
            new Column('scale_0', new Float32Array([0])),
            new Column('scale_1', new Float32Array([0])),
            new Column('scale_2', new Float32Array([0]))
        ]);
        const poses = [{
            position: [0, 0, 0],
            rotation_euler_deg: [0, 0, 0],
            fov_deg: 60
        }];

        const impA = computePathAwareImportanceV5(makeTable(0.25), poses, 0.1, 150, 16 / 9);
        const impB = computePathAwareImportanceV5(makeTable(0.5), poses, 0.1, 150, 16 / 9);
        assert(Math.abs(impB[0] - (2 * impA[0])) < 1e-6);
    });
});

describe('path-aware v5 keep ratio', () => {
    it('keep ratio target count for pruning masks', async () => {
        const m = 17;
        const keepRatio = 0.3;
        const target = Math.ceil(keepRatio * m);
        const table = createTestDataTable(m);

        const randomMask = new Uint8Array(m);
        for (let i = 0; i < target; i++) randomMask[i] = 1;

        const visIndices = new Uint32Array(m);
        for (let i = 0; i < m; i++) visIndices[i] = i;
        const opacity = table.getColumnByName('opacity').data;
        const scale0 = table.getColumnByName('scale_0').data;
        const scale1 = table.getColumnByName('scale_1').data;
        const scale2 = table.getColumnByName('scale_2').data;
        const visScores = new Float64Array(m);
        for (let i = 0; i < m; i++) {
            visScores[i] = (1 / (1 + Math.exp(-opacity[i]))) * Math.exp(scale0[i] + scale1[i] + scale2[i]);
        }
        const visTop = topKIndices(visScores, target);

        const poses = [{
            position: [0, 0, 0],
            rotation_euler_deg: [0, 0, 0],
            fov_deg: 70
        }];
        const pathResult = filterByPath(table, poses, keepRatio);

        assert.strictEqual(randomMask.reduce((a, b) => a + b, 0), target);
        assert.strictEqual(visTop.length, target);
        assert.strictEqual(pathResult.numRows, target);
        assert.strictEqual(pathResult.pipelineMetadata.pruning, 'path-aware-v5');
    });
});

describe('path-aware v5 cross validation', () => {
    it('python and typescript retained index sets agree >= 99%', async (t) => {
        const fixture = createTestDataTable(256);
        const tmp = await mkdtemp(join(tmpdir(), 'path-aware-v5-'));
        const plyPath = join(tmp, 'fixture.ply');
        const plyBytes = encodePlyBinary(fixture);
        await writeFile(plyPath, plyBytes);

        try {
            const raw = await fsReadFile(plyPath);
            const table = await readPly(new BufferReadSource(raw));
            const poses = [
                { position: [0, 0, 0], rotation_euler_deg: [0, 0, 0], fov_deg: 70 },
                { position: [0.5, 0, 0.5], rotation_euler_deg: [0, 15, 0], fov_deg: 65 },
                { position: [-0.5, 0, 1.0], rotation_euler_deg: [0, -10, 0], fov_deg: 75 }
            ];
            const keepRatio = 0.5;
            const keepCount = Math.ceil(table.numRows * keepRatio);

            const tsScores = computePathAwareImportanceV5(table, poses, 0.1, 150, 16 / 9);
            const tsRetained = new Set(Array.from(topKIndices(tsScores, keepCount)));

            const filtered = await processDataTable(table, [{
                kind: 'filterByPath',
                keepRatio,
                poses
            }]);
            assert.strictEqual(filtered.numRows, keepCount);
            assert.strictEqual(filtered.pipelineMetadata.pruning, 'path-aware-v5');

            const pyScript = `
import json, math, sys
import numpy as np
sys.path.insert(0, '/home/lixiuyuan/Workspace/splattransform/experiments/effect-size-prestudy')
from src.io import load_ply
from src.pruning import path_aware_v5_linear_falloff

ply_path = sys.argv[1]
keep_ratio = float(sys.argv[2])
poses = json.loads(sys.argv[3])
d = load_ply(ply_path)
scores = path_aware_v5_linear_falloff(
    positions=d['positions'],
    scales=d['scales'],
    opacities=d['opacities'],
    rotations=d['rotations'],
    poses=poses,
    near=0.1,
    far=150.0,
    aspect=16/9
)
k = int(math.ceil(keep_ratio * scores.shape[0]))
idx = np.argsort(scores)[::-1][:k]
print(json.dumps([int(v) for v in idx.tolist()]))
`.trim();

            const pyCheck = spawnSync('python3', ['-c', 'import numpy'], { encoding: 'utf-8' });
            if (pyCheck.status !== 0) {
                t.skip('python cross-validation skipped: numpy is not available');
                return;
            }

            const py = spawnSync(
                'python3',
                ['-c', pyScript, plyPath, String(keepRatio), JSON.stringify(poses)],
                { encoding: 'utf-8' }
            );
            if (py.status !== 0) {
                throw new Error(`python cross-validation failed: ${py.stderr || py.stdout}`);
            }

            const pyIndices = JSON.parse(py.stdout.trim());
            const pyRetained = new Set(pyIndices);

            let overlap = 0;
            for (const idx of tsRetained) {
                if (pyRetained.has(idx)) overlap++;
            }
            const agreement = overlap / Math.max(1, keepCount);
            assert(agreement >= 0.99, `agreement=${agreement} expected >= 0.99`);
        } finally {
            await rm(tmp, { recursive: true, force: true });
        }
    });
});
