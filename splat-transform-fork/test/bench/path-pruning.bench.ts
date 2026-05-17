import { performance } from 'node:perf_hooks';

import { Column, DataTable, processDataTable } from '../../src/lib/index.js';
import { createDevice } from '../../src/cli/node-device.js';

const logit = (p: number) => Math.log(p / (1 - p));

const makePoses = (count: number) => {
    const poses: Array<{ position: [number, number, number]; rotation: [number, number, number]; fovDegrees: number }> = [];
    for (let i = 0; i < count; i++) {
        const a = (2 * Math.PI * i) / count;
        poses.push({
            position: [Math.cos(a) * 8, Math.sin(a * 0.3) * 2, Math.sin(a) * 8],
            rotation: [0, (i * 360) / count, 0],
            fovDegrees: 70
        });
    }
    return poses;
};

const buildSyntheticTable = (n: number) => {
    const x = new Float32Array(n);
    const y = new Float32Array(n);
    const z = new Float32Array(n);
    const s0 = new Float32Array(n);
    const s1 = new Float32Array(n);
    const s2 = new Float32Array(n);
    const op = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const t = i * 0.0001;
        x[i] = Math.sin(t * 13.0) * 20;
        y[i] = Math.cos(t * 11.0) * 10;
        z[i] = Math.sin(t * 7.0) * 20 + 15;
        s0[i] = Math.log(0.2 + (i % 10) * 0.02);
        s1[i] = Math.log(0.25 + (i % 8) * 0.015);
        s2[i] = Math.log(0.22 + (i % 6) * 0.02);
        op[i] = logit(0.05 + ((i % 100) / 110));
    }
    return new DataTable([
        new Column('x', x),
        new Column('y', y),
        new Column('z', z),
        new Column('scale_0', s0),
        new Column('scale_1', s1),
        new Column('scale_2', s2),
        new Column('opacity', op)
    ]);
};

const run = async () => {
    const sizes = [100_000, 1_000_000, 10_000_000];
    const poses = makePoses(100);
    const keepRatio = 0.5;

    const device = await createDevice();
    try {
        for (const m of sizes) {
            const table = buildSyntheticTable(m);

            const cpuStart = performance.now();
            await processDataTable(table.clone(), [{
                kind: 'filterByPath',
                poses,
                nearPlane: 0.1,
                farPlane: 150,
                aspectRatio: 16 / 9,
                keepRatio,
                formulaVariant: 'v5_linear',
                useGPU: false
            }]);
            const cpuMs = performance.now() - cpuStart;

            const gpuStart = performance.now();
            await processDataTable(table.clone(), [{
                kind: 'filterByPath',
                poses,
                nearPlane: 0.1,
                farPlane: 150,
                aspectRatio: 16 / 9,
                keepRatio,
                formulaVariant: 'v5_linear',
                useGPU: true
            }], {
                createDevice: async () => device
            });
            const gpuMs = performance.now() - gpuStart;

            // eslint-disable-next-line no-console
            console.log(`M=${m} N=${poses.length} CPU=${cpuMs.toFixed(1)}ms GPU=${gpuMs.toFixed(1)}ms speedup=${(cpuMs / Math.max(gpuMs, 1e-6)).toFixed(2)}x`);
        }
    } finally {
        device.destroy();
    }
};

run().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
});
