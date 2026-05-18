# NOTES

Workspace: `@src` / `@test` in `./splat-transform-fork`.

This file is a code map for adding new `ProcessAction`s.

## 1) `ProcessAction` discriminated union definition

Defined in `@src/lib/process.ts` line range `244:244`.

```ts
type ProcessAction = Translate | Rotate | Scale | FilterNaN | FilterByValue | FilterBands | FilterBox | FilterSphere | FilterByPath | FilterFloaters | FilterCluster | Param | Lod | Summary | MortonOrder | Decimate;
```

## 2) `processDataTable` dispatch map

Function location: `@src/lib/process.ts` line range `396:660`.

File path for all cases: `@src/lib/process.ts`.

- `case 'translate'` at `403`
- `case 'rotate'` at `406`
- `case 'scale'` at `413`
- `case 'filterNaN'` at `416`
- `case 'filterByValue'` at `438`
- `case 'filterBands'` at `477`
- `case 'filterBox'` at `508`
- `case 'filterSphere'` at `558`
- `case 'filterByPath'` at `576`
- `case 'param'` at `590`
- `case 'lod'` at `594`
- `case 'summary'` at `601`
- `case 'mortonOrder'` at `607`
- `case 'decimate'` at `616`
- `case 'filterFloaters'` at `628`
- `case 'filterCluster'` at `641`

## 3) Action behind `--filter-visibility`

There is **no** `--filter-visibility` CLI option and no `kind: 'filterVisibility'` action in current code.

Closest structural template is visibility scorer `sortByVisibility` in `@src/lib/data-table/decimate.ts` line range `550:579`:

```ts
const sortByVisibility = (dataTable: DataTable, indices: Uint32Array): void => {
    const opacityCol = dataTable.getColumnByName('opacity');
    const scale0Col = dataTable.getColumnByName('scale_0');
    const scale1Col = dataTable.getColumnByName('scale_1');
    const scale2Col = dataTable.getColumnByName('scale_2');

    if (!opacityCol || !scale0Col || !scale1Col || !scale2Col) {
        logger.debug('missing required columns for visibility sorting (opacity, scale_0, scale_1, scale_2)');
        return;
    }
    if (indices.length === 0) return;

    const opacity = opacityCol.data;
    const scale0 = scale0Col.data;
    const scale1 = scale1Col.data;
    const scale2 = scale2Col.data;

    const scores = new Float32Array(indices.length);
    for (let i = 0; i < indices.length; i++) {
        const ri = indices[i];
        scores[i] = (1 / (1 + Math.exp(-opacity[ri]))) * Math.exp(scale0[ri] + scale1[ri] + scale2[ri]);
    }

    const order = new Uint32Array(indices.length);
    for (let i = 0; i < order.length; i++) order[i] = i;
    order.sort((a, b) => scores[b] - scores[a]);

    const tmp = indices.slice();
    for (let i = 0; i < indices.length; i++) indices[i] = tmp[order[i]];
};
```

## 4) CLI parser mapping for `--filter-visibility`

Parser file: `@src/cli/index.ts`.

Result: no mapping block exists for `--filter-visibility`.

Evidence A - option table (`@src/cli/index.ts` `118:159`) has no `filter-visibility` entry:

```ts
const cliOptionsConfig = {
    // global options
    overwrite: { type: 'boolean', short: 'w', default: false },
    help: { type: 'boolean', short: 'h', default: false },
    version: { type: 'boolean', short: 'v', default: false },
    quiet: { type: 'boolean', short: 'q', default: false },
    verbose: { type: 'boolean', default: false },
    mem: { type: 'boolean', default: false },
    tty: { type: 'boolean' },
    iterations: { type: 'string', short: 'i', default: '10' },
    'list-gpus': { type: 'boolean', short: 'L', default: false },
    gpu: { type: 'string', short: 'g', default: '-1' },
    'lod-select': { type: 'string', short: 'O', default: '' },
    'viewer-settings': { type: 'string', short: 'E', default: '' },
    'lod-chunk-count': { type: 'string', short: 'C', default: '512' },
    'lod-chunk-extent': { type: 'string', short: 'X', default: '16' },
    'spz-version': { type: 'string', default: '4' },
    unbundled: { type: 'boolean', short: 'U', default: false },
    'voxel-params': { type: 'string', default: '' },
    'voxel-external-fill': { type: 'string' },
    'voxel-floor-fill': { type: 'string' },
    'voxel-carve': { type: 'string' },
    'seed-pos': { type: 'string', default: '' },
    'collision-mesh': { type: 'string', short: 'K' },

    // per-file options
    translate: { type: 'string', short: 't', multiple: true },
    rotate: { type: 'string', short: 'r', multiple: true },
    scale: { type: 'string', short: 's', multiple: true },
    'filter-nan': { type: 'boolean', short: 'N', multiple: true },
    'filter-value': { type: 'string', short: 'V', multiple: true },
    'filter-harmonics': { type: 'string', short: 'H', multiple: true },
    'filter-box': { type: 'string', short: 'B', multiple: true },
    'filter-sphere': { type: 'string', short: 'S', multiple: true },
    'decimate': { type: 'string', short: 'F', multiple: true },
    'filter-cluster': { type: 'string', short: 'D', multiple: true },
    'filter-floaters': { type: 'string', short: 'G', multiple: true },
    params: { type: 'string', short: 'p', multiple: true },
    lod: { type: 'string', short: 'l', multiple: true },
    summary: { type: 'boolean', short: 'm', multiple: true },
    'morton-order': { type: 'boolean', short: 'M', multiple: true }
} as const;
```

Evidence B - token switch (`@src/cli/index.ts` `402:587`) has no `case 'filter-visibility'`:

```ts
switch (t.name) {
    case 'translate': {
        const [x, y, z] = parseVec(t.value, 3);
        current.processActions.push({
            kind: 'translate',
            value: new Vec3(x, y, z)
        });
        break;
    }
    case 'rotate': {
        const [x, y, z] = parseVec(t.value, 3);
        current.processActions.push({
            kind: 'rotate',
            value: new Vec3(x, y, z)
        });
        break;
    }
    case 'scale':
        current.processActions.push({
            kind: 'scale',
            value: parseNumber(t.value)
        });
        break;
    case 'filter-nan':
        current.processActions.push({
            kind: 'filterNaN'
        });
        break;
    case 'filter-value': {
        const parts = t.value.split(',').map((p: string) => p.trim());
        if (parts.length !== 3) {
            throw new Error(`Invalid filter-value value: ${t.value}`);
        }
        current.processActions.push({
            kind: 'filterByValue',
            columnName: parts[0],
            comparator: parseComparator(parts[1]),
            value: parseNumber(parts[2])
        });
        break;
    }
    case 'filter-harmonics': {
        const shBands = parseInteger(t.value);
        if (![0, 1, 2, 3].includes(shBands)) {
            throw new Error(`Invalid filter-harmonics value: ${t.value}. Must be 0, 1, 2, or 3.`);
        }
        current.processActions.push({
            kind: 'filterBands',
            value: shBands as 0 | 1 | 2 | 3
        });

        break;
    }
    case 'filter-box': {
        const parts = t.value.split(',').map((p: string) => p.trim());
        if (parts.length !== 6) {
            throw new Error(`Invalid filter-box value: ${t.value}`);
        }

        const defaults = [-Infinity, -Infinity, -Infinity, Infinity, Infinity, Infinity];
        const values: number[] = [];
        for (let i = 0; i < 6; ++i) {
            if (parts[i] === '' || parts[i] === '-') {
                values[i] = defaults[i];
            } else {
                values[i] = parseNumber(parts[i]);
            }
        }

        current.processActions.push({
            kind: 'filterBox',
            min: new Vec3(values[0], values[1], values[2]),
            max: new Vec3(values[3], values[4], values[5])
        });
        break;
    }
    case 'filter-sphere': {
        const parts = t.value.split(',').map((p: string) => p.trim());
        if (parts.length !== 4) {
            throw new Error(`Invalid filter-sphere value: ${t.value}`);
        }
        const values = parts.map(parseNumber);
        current.processActions.push({
            kind: 'filterSphere',
            center: new Vec3(values[0], values[1], values[2]),
            radius: values[3]
        });
        break;
    }
    case 'params': {
        const params = t.value.split(',').map((p: string) => p.trim());
        for (const param of params) {
            const parts = param.split('=').map((p: string) => p.trim());
            current.processActions.push({
                kind: 'param',
                name: parts[0],
                value: parts[1] ?? ''
            });
        }
        break;
    }
    case 'lod': {
        const lod = parseInteger(t.value);
        if (lod < 0) {
            throw new Error(`Invalid lod value: ${t.value}. Must be a non-negative integer.`);
        }
        current.processActions.push({
            kind: 'lod',
            value: lod
        });
        break;
    }
    case 'summary':
        current.processActions.push({
            kind: 'summary'
        });
        break;
    case 'morton-order':
        current.processActions.push({
            kind: 'mortonOrder'
        });
        break;
    case 'decimate': {
        const value = t.value.trim();
        let count: number | null = null;
        let percent: number | null = null;

        if (value.endsWith('%')) {
            // Percentage mode
            percent = parseNumber(value.slice(0, -1));
            if (percent < 0 || percent > 100) {
                throw new Error(`Invalid decimate percentage: ${value}. Must be between 0% and 100%.`);
            }
        } else {
            // Count mode
            count = parseInteger(value);
            if (count < 0) {
                throw new Error(`Invalid decimate count: ${value}. Must be a non-negative integer.`);
            }
        }

        current.processActions.push({
            kind: 'decimate',
            count,
            percent
        });
        break;
    }
    case 'filter-cluster': {
        const fcAction: FilterCluster = { kind: 'filterCluster' };
        if (t.value) {
            const parts = t.value.split(',').map((p: string) => p.trim());
            if (parts.length >= 1 && parts[0] !== '') {
                fcAction.voxelResolution = parseNumber(parts[0]);
            }
            if (parts.length >= 2) {
                fcAction.opacityCutoff = parseNumber(parts[1]);
            }
            if (parts.length >= 3) {
                fcAction.minContribution = parseNumber(parts[2]);
            }
        }
        if (navSeed) {
            fcAction.seed = new Vec3(navSeed.x, navSeed.y, navSeed.z);
        }
        current.processActions.push(fcAction);
        break;
    }
    case 'filter-floaters': {
        const ffAction: FilterFloaters = { kind: 'filterFloaters' };
        if (t.value) {
            const parts = t.value.split(',').map((p: string) => p.trim());
            if (parts.length >= 1 && parts[0] !== '') {
                ffAction.voxelResolution = parseNumber(parts[0]);
            }
            if (parts.length >= 2) {
                ffAction.opacityCutoff = parseNumber(parts[1]);
            }
            if (parts.length >= 3) {
                ffAction.minContribution = parseNumber(parts[2]);
            }
        }
        current.processActions.push(ffAction);
        break;
    }
}
```

## 5) Filter-action testing template (one full file)

Template file: `@test/process.test.mjs` line range `1:158`.

```js
/**
 * Tests for processDataTable validation and edge cases.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { processDataTable, Column, DataTable } from '../src/lib/index.js';
import { createTestDataTable } from './helpers/test-utils.mjs';

describe('processDataTable', function () {
    describe('filterNaN', function () {
        it('should use current result columns, not original dataTable columns', async function () {
            const dataTable = createTestDataTable(10, { includeSH: true, shBands: 1 });

            const result = await processDataTable(dataTable, [
                { kind: 'filterBands', value: 0 },
                { kind: 'filterNaN' }
            ]);

            assert.ok(result.numRows > 0, 'Should not drop valid rows');
            assert.ok(!result.hasColumn('f_rest_0'),
                'SH columns should have been removed by filterBands');
        });

        it('should allow +Infinity on opacity column', async function () {
            const dataTable = new DataTable([
                new Column('x', new Float32Array([0, 1])),
                new Column('y', new Float32Array([0, 0])),
                new Column('z', new Float32Array([0, 0])),
                new Column('opacity', new Float32Array([Infinity, 1.0]))
            ]);

            const result = await processDataTable(dataTable, [{ kind: 'filterNaN' }]);
            assert.strictEqual(result.numRows, 2, '+Infinity opacity should be allowed');
        });

        it('should remove rows with NaN values', async function () {
            const dataTable = new DataTable([
                new Column('x', new Float32Array([0, NaN, 2])),
                new Column('y', new Float32Array([0, 0, 0])),
                new Column('z', new Float32Array([0, 0, 0]))
            ]);

            const result = await processDataTable(dataTable, [{ kind: 'filterNaN' }]);
            assert.strictEqual(result.numRows, 2, 'Should remove NaN row');
        });
    });

    describe('filterByValue', function () {
        it('should throw for non-existent column', async function () {
            const dataTable = createTestDataTable(4);

            await assert.rejects(
                processDataTable(dataTable, [{
                    kind: 'filterByValue',
                    columnName: 'nonexistent_column',
                    comparator: 'gt',
                    value: 0
                }]),
                /column 'nonexistent_column' not found/
            );
        });

        it('should throw for opacity value of 0', async function () {
            const dataTable = createTestDataTable(4);

            await assert.rejects(
                processDataTable(dataTable, [{
                    kind: 'filterByValue',
                    columnName: 'opacity',
                    comparator: 'gt',
                    value: 0
                }]),
                /opacity value must be between 0 and 1/
            );
        });

        it('should throw for opacity value of 1', async function () {
            const dataTable = createTestDataTable(4);

            await assert.rejects(
                processDataTable(dataTable, [{
                    kind: 'filterByValue',
                    columnName: 'opacity',
                    comparator: 'gt',
                    value: 1
                }]),
                /opacity value must be between 0 and 1/
            );
        });

        it('should accept valid opacity values', async function () {
            const dataTable = createTestDataTable(10);

            const result = await processDataTable(dataTable, [{
                kind: 'filterByValue',
                columnName: 'opacity',
                comparator: 'gt',
                value: 0.5
            }]);

            assert.ok(result.numRows >= 0, 'Should not throw for valid opacity');
        });

        it('should accept raw column names without opacity validation', async function () {
            const dataTable = createTestDataTable(10);

            const result = await processDataTable(dataTable, [{
                kind: 'filterByValue',
                columnName: 'opacity_raw',
                comparator: 'gt',
                value: 0
            }]);

            assert.ok(result.numRows >= 0, 'Raw column should bypass inverse transform');
        });

        it('should filter correctly with lt comparator', async function () {
            const dataTable = new DataTable([
                new Column('x', new Float32Array([1, 2, 3, 4, 5])),
                new Column('y', new Float32Array(5)),
                new Column('z', new Float32Array(5))
            ]);

            const result = await processDataTable(dataTable, [{
                kind: 'filterByValue',
                columnName: 'x',
                comparator: 'lt',
                value: 3
            }]);

            assert.strictEqual(result.numRows, 2, 'Should keep rows with x < 3');
        });
    });

    describe('filterFloaters', function () {
        it('should throw without createDevice', async function () {
            const dataTable = createTestDataTable(4);

            await assert.rejects(
                processDataTable(dataTable, [{ kind: 'filterFloaters' }]),
                /filterFloaters requires a createDevice function/
            );
        });
    });

    describe('filterCluster', function () {
        it('should throw without createDevice', async function () {
            const dataTable = createTestDataTable(4);

            await assert.rejects(
                processDataTable(dataTable, [{ kind: 'filterCluster' }]),
                /filterCluster requires a createDevice function/
            );
        });
    });
});
```

## 6) WebGPU infrastructure search (`GPUDevice` / `.wgsl` / `createComputePipeline`)

Exact-term search results across repo:

- `GPUDevice`: no source-file matches
- `.wgsl`: no source-file matches
- `createComputePipeline`: no source-file matches

Related infrastructure files (WebGPU/wgsl runtime strings and GPU pipeline code), from `@src` search:

- `@src/lib/gpu/gpu-voxelization.ts`
- `@src/lib/gpu/gpu-dilation.ts`
- `@src/lib/gpu/gpu-clustering.ts`
- `@src/cli/node-device.ts`
- `@src/cli/index.ts`

## 7) Gaussian row representation and exact TypeScript API

### 7.1 Core row/column types

From `@src/lib/data-table/data-table.ts`:

```ts
type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
```

```ts
class Column {
    name: string;
    data: TypedArray;
}
```

```ts
type Row = {
    [colName: string]: number;
};
```

### 7.2 Read API at row index `j`

From `@src/lib/data-table/data-table.ts`:

```ts
getRow(index: number, row: Row = {}, columns = this.columns): Row {
    for (const column of columns) {
        row[column.name] = column.data[index];
    }
    return row;
}
```

And direct column access:

```ts
getColumnByName(name: string): Column | null {
    return this.columns.find(column => column.name === name);
}
```

### 7.3 Exact field mapping for Gaussian attributes

Authoritative mapping example in `@src/lib/voxel/filter-pipeline.ts` (`73:88`):

```ts
const buildGaussianColumns = (ctx: VoxelFilterContext): GaussianColumns => ({
    posX: ctx.pcDataTable.getColumnByName('x').data,
    posY: ctx.pcDataTable.getColumnByName('y').data,
    posZ: ctx.pcDataTable.getColumnByName('z').data,
    rotW: ctx.pcDataTable.getColumnByName('rot_0').data,
    rotX: ctx.pcDataTable.getColumnByName('rot_1').data,
    rotY: ctx.pcDataTable.getColumnByName('rot_2').data,
    rotZ: ctx.pcDataTable.getColumnByName('rot_3').data,
    scaleX: ctx.pcDataTable.getColumnByName('scale_0').data,
    scaleY: ctx.pcDataTable.getColumnByName('scale_1').data,
    scaleZ: ctx.pcDataTable.getColumnByName('scale_2').data,
    opacity: ctx.pcDataTable.getColumnByName('opacity').data,
    extentX: ctx.extentsResult.extents.getColumnByName('extent_x').data,
    extentY: ctx.extentsResult.extents.getColumnByName('extent_y').data,
    extentZ: ctx.extentsResult.extents.getColumnByName('extent_z').data
});
```

### 7.4 Practical per-row read snippet (`j`)

```ts
const muX = table.getColumnByName('x')!.data[j];
const muY = table.getColumnByName('y')!.data[j];
const muZ = table.getColumnByName('z')!.data[j];

const scale0 = table.getColumnByName('scale_0')!.data[j];
const scale1 = table.getColumnByName('scale_1')!.data[j];
const scale2 = table.getColumnByName('scale_2')!.data[j];

const rotW = table.getColumnByName('rot_0')!.data[j];
const rotX = table.getColumnByName('rot_1')!.data[j];
const rotY = table.getColumnByName('rot_2')!.data[j];
const rotZ = table.getColumnByName('rot_3')!.data[j];

const opacityLogit = table.getColumnByName('opacity')!.data[j];

const colorDc0 = table.getColumnByName('f_dc_0')?.data[j];
const colorDc1 = table.getColumnByName('f_dc_1')?.data[j];
const colorDc2 = table.getColumnByName('f_dc_2')?.data[j];
```

Interpretation:

- `mu_j = (x, y, z)`
- scale is stored as raw log-space in `scale_0/1/2`
- quaternion is `(rot_0, rot_1, rot_2, rot_3)` = `(w, x, y, z)`
- opacity is raw logit in `opacity`
- color (if present) comes from `f_dc_0/1/2`
