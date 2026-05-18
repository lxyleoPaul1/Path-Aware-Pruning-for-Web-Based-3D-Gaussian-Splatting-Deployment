import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFile as fsReadFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Column, readPly, processDataTable } from '../../src/lib/index.js';
import { createDevice } from '../../src/cli/node-device.js';

class BufferReadSource {
    data: Uint8Array;
    size: number;
    seekable: boolean;

    constructor(data: Uint8Array) {
        this.data = data;
        this.size = data.length;
        this.seekable = true;
    }

    read(start = 0, end = this.size) {
        return new BufferReadStream(this.data, start, end);
    }
}

class BufferReadStream {
    data: Uint8Array;
    offset: number;
    end: number;
    size: number;
    bytesRead: number;

    constructor(data: Uint8Array, start: number, end: number) {
        this.data = data;
        this.offset = start;
        this.end = end;
        this.size = end - start;
        this.bytesRead = 0;
    }

    async pull(target: Uint8Array) {
        const remaining = this.end - this.offset;
        if (remaining <= 0) return 0;
        const count = Math.min(target.length, remaining);
        target.set(this.data.subarray(this.offset, this.offset + count));
        this.offset += count;
        this.bytesRead += count;
        return count;
    }

    async readAll() {
        const out = this.data.subarray(this.offset, this.end);
        this.bytesRead += out.length;
        this.offset = this.end;
        return out;
    }
}

const sigmoid = (x: number): number => {
    if (x >= 0) return 1 / (1 + Math.exp(-x));
    const ex = Math.exp(x);
    return ex / (1 + ex);
};

const computePlanes = (pose: any, near: number, far: number, aspect: number): number[][] => {
    const [px, py, pz] = pose.position as [number, number, number];
    const [rxDeg, ryDeg, rzDeg] = pose.rotation as [number, number, number];
    const fovDeg = pose.fovDegrees as number;
    const rx = rxDeg * Math.PI / 180;
    const ry = ryDeg * Math.PI / 180;
    const rz = rzDeg * Math.PI / 180;

    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);

    const r00 = cz * cy;
    const r01 = cz * sy * sx - sz * cx;
    const r02 = cz * sy * cx + sz * sx;
    const r10 = sz * cy;
    const r11 = sz * sy * sx + cz * cx;
    const r12 = sz * sy * cx - cz * sx;
    const r20 = -sy;
    const r21 = cy * sx;
    const r22 = cy * cx;

    const right = [r00, r10, r20];
    const up = [r01, r11, r21];
    const forward = [r02, r12, r22];

    const normalizePlane = (nx: number, ny: number, nz: number, x: number, y: number, z: number) => {
        const len = Math.hypot(nx, ny, nz) + 1e-12;
        const inv = 1 / len;
        const nnx = nx * inv;
        const nny = ny * inv;
        const nnz = nz * inv;
        const d = -(nnx * x + nny * y + nnz * z);
        return [nnx, nny, nnz, d];
    };

    const tanY = Math.tan(fovDeg * Math.PI / 360);
    const tanX = tanY * aspect;
    const toWorld = (lx: number, ly: number, lz: number) => [
        right[0] * lx + up[0] * ly + forward[0] * lz,
        right[1] * lx + up[1] * ly + forward[1] * lz,
        right[2] * lx + up[2] * ly + forward[2] * lz
    ];

    const nearPlane = normalizePlane(
        forward[0], forward[1], forward[2],
        px + forward[0] * near, py + forward[1] * near, pz + forward[2] * near
    );
    const farPlane = normalizePlane(
        -forward[0], -forward[1], -forward[2],
        px + forward[0] * far, py + forward[1] * far, pz + forward[2] * far
    );
    const left = toWorld(1, 0, tanX);
    const rightN = toWorld(-1, 0, tanX);
    const bottom = toWorld(0, 1, tanY);
    const top = toWorld(0, -1, tanY);

    return [
        nearPlane,
        farPlane,
        normalizePlane(left[0], left[1], left[2], px, py, pz),
        normalizePlane(rightN[0], rightN[1], rightN[2], px, py, pz),
        normalizePlane(bottom[0], bottom[1], bottom[2], px, py, pz),
        normalizePlane(top[0], top[1], top[2], px, py, pz)
    ];
};

const scorePathAware = (table: any, poses: any[], keepRatio: number, near: number, far: number, aspect: number) => {
    const n = table.numRows;
    const x = table.getColumnByName('x').data;
    const y = table.getColumnByName('y').data;
    const z = table.getColumnByName('z').data;
    const s0 = table.getColumnByName('scale_0').data;
    const s1 = table.getColumnByName('scale_1').data;
    const s2 = table.getColumnByName('scale_2').data;
    const op = table.getColumnByName('opacity').data;
    const scores = new Float64Array(n);

    const planes = poses.map(p => computePlanes(p, near, far, aspect));
    for (let i = 0; i < n; i++) {
        const sigma = Math.cbrt(Math.exp(s0[i]) * Math.exp(s1[i]) * Math.exp(s2[i]));
        const alpha = sigmoid(op[i]);
        const px = x[i], py = y[i], pz = z[i];
        let acc = 0;
        for (let p = 0; p < poses.length; p++) {
            let inside = true;
            for (const pl of planes[p]) {
                if (pl[0] * px + pl[1] * py + pl[2] * pz + pl[3] < 0) {
                    inside = false;
                    break;
                }
            }
            if (!inside) continue;
            const cx = poses[p].position[0], cy = poses[p].position[1], cz = poses[p].position[2];
            const d = Math.hypot(px - cx, py - cy, pz - cz);
            const w = d > 0 ? Math.min(1, sigma / d) : 1;
            acc += w * alpha;
        }
        scores[i] = acc;
    }

    const k = Math.ceil(keepRatio * n);
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => scores[b] - scores[a]);
    const retained = order.slice(0, k).sort((a, b) => a - b);
    return { scores, retained };
};

describe('crossref py-ts fixture', () => {
    it('writes TS retained indices and scores', async () => {
        const fixturesDir = join(process.cwd(), 'test', 'fixtures');
        const plyPath = join(fixturesDir, 'crossref-1k.ply');
        const posesPath = join(fixturesDir, 'crossref-10poses.json');
        const tsOutPath = join(fixturesDir, 'crossref-ts-output.txt');
        const tsScorePath = join(fixturesDir, 'crossref-ts-scores.json');

        const plyBytes = await fsReadFile(plyPath);
        const posesPayload = JSON.parse((await fsReadFile(posesPath, 'utf-8')));
        const poses = posesPayload.poses;
        const near = Number(posesPayload.nearPlane);
        const far = Number(posesPayload.farPlane);
        const aspect = Number(posesPayload.aspectRatio);
        const keepRatio = 0.5;

        const table = await readPly(new BufferReadSource(plyBytes));
        const idxCol = new Float32Array(table.numRows);
        for (let i = 0; i < idxCol.length; i++) idxCol[i] = i;
        table.addColumn(new Column('_cross_idx', idxCol));

        const filtered = await processDataTable(table, [{
            kind: 'filterByPath',
            poses,
            nearPlane: near,
            farPlane: far,
            aspectRatio: aspect,
            keepRatio,
            safeguardRatio: 0,
            formulaVariant: 'v5_linear',
            useGPU: false
        }]);
        assert.strictEqual(filtered.numRows, Math.ceil(keepRatio * table.numRows));

        const retained = Array.from(filtered.getColumnByName('_cross_idx').data).map(v => Math.trunc(v)).sort((a, b) => a - b);
        const { scores, retained: recomputed } = scorePathAware(table, poses, keepRatio, near, far, aspect);
        assert.deepStrictEqual(retained, recomputed);

        await mkdir(fixturesDir, { recursive: true });
        await writeFile(tsOutPath, retained.map(v => String(v)).join('\n') + '\n', 'utf-8');
        await writeFile(tsScorePath, JSON.stringify(Array.from(scores)), 'utf-8');
    });

    it('gpu path agrees with cpu within 0.5% of rows', async (t) => {
        const fixturesDir = join(process.cwd(), 'test', 'fixtures');
        const plyPath = join(fixturesDir, 'crossref-1k.ply');
        const posesPath = join(fixturesDir, 'crossref-10poses.json');
        const plyBytes = await fsReadFile(plyPath);
        const posesPayload = JSON.parse((await fsReadFile(posesPath, 'utf-8')));
        const poses = posesPayload.poses;
        const near = Number(posesPayload.nearPlane);
        const far = Number(posesPayload.farPlane);
        const aspect = Number(posesPayload.aspectRatio);
        const keepRatio = 0.5;

        const loadTableWithIndex = async () => {
            const table = await readPly(new BufferReadSource(plyBytes));
            const idxCol = new Float32Array(table.numRows);
            for (let i = 0; i < idxCol.length; i++) idxCol[i] = i;
            table.addColumn(new Column('_cross_idx', idxCol));
            return table;
        };

        const cpuTable = await loadTableWithIndex();
        const cpuFiltered = await processDataTable(cpuTable, [{
            kind: 'filterByPath',
            poses,
            nearPlane: near,
            farPlane: far,
            aspectRatio: aspect,
            keepRatio,
            safeguardRatio: 0,
            formulaVariant: 'v5_linear',
            useGPU: false
        }]);
        const cpuSet = new Set(Array.from(cpuFiltered.getColumnByName('_cross_idx').data).map(v => Math.trunc(v)));

        let gpuDevice: Awaited<ReturnType<typeof createDevice>> | null = null;
        try {
            gpuDevice = await createDevice();
        } catch (e) {
            t.skip(`WebGPU unavailable, skip GPU cross-check: ${e instanceof Error ? e.message : String(e)}`);
            return;
        }

        const gpuTable = await loadTableWithIndex();
        const gpuFiltered = await processDataTable(gpuTable, [{
            kind: 'filterByPath',
            poses,
            nearPlane: near,
            farPlane: far,
            aspectRatio: aspect,
            keepRatio,
            safeguardRatio: 0,
            formulaVariant: 'v5_linear',
            useGPU: true
        }], {
            createDevice: async () => gpuDevice!
        });
        const gpuSet = new Set(Array.from(gpuFiltered.getColumnByName('_cross_idx').data).map(v => Math.trunc(v)));
        gpuDevice.destroy();

        let disagree = 0;
        for (const idx of cpuSet) {
            if (!gpuSet.has(idx)) disagree++;
        }
        for (const idx of gpuSet) {
            if (!cpuSet.has(idx)) disagree++;
        }
        const maxDisagree = Math.floor(cpuTable.numRows * 0.005);
        assert.ok(disagree <= maxDisagree, `gpu/cpu disagree=${disagree}, limit=${maxDisagree}`);
    });
});
