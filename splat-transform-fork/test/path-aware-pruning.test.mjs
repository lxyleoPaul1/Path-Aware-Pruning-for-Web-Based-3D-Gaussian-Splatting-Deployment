import { describe, it } from 'node:test';
import assert from 'node:assert';

import { Column, DataTable, processDataTable } from '../src/lib/index.js';

const logit = (p) => Math.log(p / (1 - p));

describe('path-aware pruning smoke', () => {
    it('keeps requested count and writes pruning metadata', async () => {
        const n = 10;
        const table = new DataTable([
            new Column('x', new Float32Array([0, 0, 0, 0, 0, 1, 2, 3, 4, 5])),
            new Column('y', new Float32Array(n).fill(0)),
            new Column('z', new Float32Array([5, 6, 7, 8, 9, 5, 6, 7, 8, 9])),
            new Column('opacity', new Float32Array(n).fill(logit(0.9))),
            new Column('scale_0', new Float32Array(n).fill(Math.log(0.3))),
            new Column('scale_1', new Float32Array(n).fill(Math.log(0.3))),
            new Column('scale_2', new Float32Array(n).fill(Math.log(0.3)))
        ]);

        const result = await processDataTable(table, [{
            kind: 'filterByPath',
            poses: [{ position: [0, 0, 0], rotation: [0, 0, 0], fovDegrees: 60 }],
            nearPlane: 0.1,
            farPlane: 150,
            aspectRatio: 16 / 9,
            keepRatio: 0.5,
            safeguardRatio: 0,
            formulaVariant: 'v5_linear',
            useGPU: false
        }]);

        assert.strictEqual(result.numRows, 5);
        assert.strictEqual(result.pipelineMetadata.pruning?.method, 'path-aware-v5');
        assert.strictEqual(result.pipelineMetadata.pruning?.numPoses, 1);
        assert.strictEqual(result.pipelineMetadata.pruning?.keepRatio, 0.5);
    });

    it('adds deterministic safeguard samples from discarded splats', async () => {
        const n = 10;
        const table = new DataTable([
            new Column('x', new Float32Array([0, 0, 0, 0, 0, 1, 2, 3, 4, 5])),
            new Column('y', new Float32Array(n).fill(0)),
            new Column('z', new Float32Array([5, 6, 7, 8, 9, 5, 6, 7, 8, 9])),
            new Column('opacity', new Float32Array(n).fill(logit(0.9))),
            new Column('scale_0', new Float32Array(n).fill(Math.log(0.3))),
            new Column('scale_1', new Float32Array(n).fill(Math.log(0.3))),
            new Column('scale_2', new Float32Array(n).fill(Math.log(0.3)))
        ]);

        const result = await processDataTable(table, [{
            kind: 'filterByPath',
            poses: [{ position: [0, 0, 0], rotation: [0, 0, 0], fovDegrees: 60 }],
            nearPlane: 0.1,
            farPlane: 150,
            aspectRatio: 16 / 9,
            keepRatio: 0.5,
            safeguardRatio: 0.05,
            safeguardSeed: 123,
            formulaVariant: 'v5_linear',
            useGPU: false
        }]);

        assert.strictEqual(result.numRows, 6);
        assert.strictEqual(result.pipelineMetadata.pruning?.safeguardRatio, 0.05);
        assert.strictEqual(result.pipelineMetadata.pruning?.safeguardSeed, 123);
    });
});
