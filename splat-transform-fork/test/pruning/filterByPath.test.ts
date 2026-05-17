import { describe, it } from 'node:test';
import assert from 'node:assert';

import { Column, DataTable, processDataTable } from '../../src/lib/index.js';

const logit = (p: number) => Math.log(p / (1 - p));

const lcg = (seed: number) => {
    let s = seed >>> 0;
    return () => {
        s = (1664525 * s + 1013904223) >>> 0;
        return s / 0x100000000;
    };
};

const buildRandomTable = (count: number, seed = 1): DataTable => {
    const rnd = lcg(seed);
    const x = new Float32Array(count);
    const y = new Float32Array(count);
    const z = new Float32Array(count);
    const opacity = new Float32Array(count);
    const s0 = new Float32Array(count);
    const s1 = new Float32Array(count);
    const s2 = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        x[i] = (rnd() - 0.5) * 10;
        y[i] = (rnd() - 0.5) * 10;
        z[i] = (rnd() - 0.5) * 10;
        opacity[i] = logit(0.2 + 0.2 * rnd());
        s0[i] = Math.log(0.05 + 0.05 * rnd());
        s1[i] = Math.log(0.05 + 0.05 * rnd());
        s2[i] = Math.log(0.05 + 0.05 * rnd());
    }

    return new DataTable([
        new Column('x', x),
        new Column('y', y),
        new Column('z', z),
        new Column('opacity', opacity),
        new Column('scale_0', s0),
        new Column('scale_1', s1),
        new Column('scale_2', s2)
    ]);
};

describe('filterByPath', () => {
    it('single pose retains prominent gaussian', async () => {
        // 999 random + 1 prominent -> keepRatio=0.001 => ceil(1000*0.001)=1
        const base = buildRandomTable(999, 42);
        const x = new Float32Array(1000);
        const y = new Float32Array(1000);
        const z = new Float32Array(1000);
        const opacity = new Float32Array(1000);
        const s0 = new Float32Array(1000);
        const s1 = new Float32Array(1000);
        const s2 = new Float32Array(1000);

        x.set(base.getColumnByName('x')!.data as Float32Array, 0);
        y.set(base.getColumnByName('y')!.data as Float32Array, 0);
        z.set(base.getColumnByName('z')!.data as Float32Array, 0);
        opacity.set(base.getColumnByName('opacity')!.data as Float32Array, 0);
        s0.set(base.getColumnByName('scale_0')!.data as Float32Array, 0);
        s1.set(base.getColumnByName('scale_1')!.data as Float32Array, 0);
        s2.set(base.getColumnByName('scale_2')!.data as Float32Array, 0);

        x[999] = 0;
        y[999] = 0;
        z[999] = 5;
        opacity[999] = logit(0.99);
        s0[999] = Math.log(0.5);
        s1[999] = Math.log(0.5);
        s2[999] = Math.log(0.5);

        const table = new DataTable([
            new Column('x', x),
            new Column('y', y),
            new Column('z', z),
            new Column('opacity', opacity),
            new Column('scale_0', s0),
            new Column('scale_1', s1),
            new Column('scale_2', s2)
        ]);

        const result = await processDataTable(table, [{
            kind: 'filterByPath',
            poses: [{ position: [0, 0, 0], rotation: [0, 0, 0], fovDegrees: 60 }],
            nearPlane: 0.1,
            farPlane: 10,
            aspectRatio: 16 / 9,
            keepRatio: 0.001,
            formulaVariant: 'v5_linear',
            useGPU: false
        }]);

        assert.strictEqual(result.numRows, 1);
        assert.strictEqual(result.getColumnByName('x')!.data[0], 0);
        assert.strictEqual(result.getColumnByName('y')!.data[0], 0);
        assert.strictEqual(result.getColumnByName('z')!.data[0], 5);
    });

    it('multi-pose keeps union across disjoint frusta', async () => {
        const n = 100;
        const x = new Float32Array(n);
        const y = new Float32Array(n);
        const z = new Float32Array(n);
        const opacity = new Float32Array(n);
        const s0 = new Float32Array(n);
        const s1 = new Float32Array(n);
        const s2 = new Float32Array(n);

        for (let i = 0; i < n; i++) {
            x[i] = (10 * i) / (n - 1);
            y[i] = 0;
            z[i] = 5;
            opacity[i] = logit(0.9);
            s0[i] = Math.log(0.3);
            s1[i] = Math.log(0.3);
            s2[i] = Math.log(0.3);
        }

        const table = new DataTable([
            new Column('x', x),
            new Column('y', y),
            new Column('z', z),
            new Column('opacity', opacity),
            new Column('scale_0', s0),
            new Column('scale_1', s1),
            new Column('scale_2', s2)
        ]);

        const result = await processDataTable(table, [{
            kind: 'filterByPath',
            poses: [
                { position: [2.5, 0, 0], rotation: [0, 0, 0], fovDegrees: 40 },
                { position: [7.5, 0, 0], rotation: [0, 0, 0], fovDegrees: 40 }
            ],
            nearPlane: 0.1,
            farPlane: 20,
            aspectRatio: 1,
            keepRatio: 0.5,
            formulaVariant: 'v5_linear',
            useGPU: false
        }]);

        let leftHalf = 0;
        let rightHalf = 0;
        const xr = result.getColumnByName('x')!.data;
        for (let i = 0; i < result.numRows; i++) {
            if (xr[i] < 5) leftHalf++;
            else rightHalf++;
        }

        assert(leftHalf >= 20, `leftHalf=${leftHalf} expected >= 20`);
        assert(rightHalf >= 20, `rightHalf=${rightHalf} expected >= 20`);
    });

    it('keepRatio size is exact within +/-1', async () => {
        const n = 10000;
        const table = buildRandomTable(n, 7);
        const poses = Array.from({ length: 10 }, (_, i) => ({
            position: [Math.cos(i) * 3, 0, Math.sin(i) * 3] as [number, number, number],
            rotation: [0, i * 12, 0] as [number, number, number],
            fovDegrees: 70
        }));

        for (const keepRatio of [0.1, 0.3, 0.5, 0.9]) {
            const result = await processDataTable(table.clone(), [{
                kind: 'filterByPath',
                poses,
                nearPlane: 0.1,
                farPlane: 150,
                aspectRatio: 16 / 9,
                keepRatio,
                formulaVariant: 'v5_linear',
                useGPU: false
            }]);
            const target = Math.ceil(keepRatio * n);
            assert(
                Math.abs(result.numRows - target) <= 1,
                `keepRatio=${keepRatio} result=${result.numRows} target=${target}`
            );
        }
    });
});
