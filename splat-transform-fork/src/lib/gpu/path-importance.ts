import {
    BUFFERUSAGE_COPY_DST,
    BUFFERUSAGE_COPY_SRC,
    SHADERLANGUAGE_WGSL,
    SHADERSTAGE_COMPUTE,
    BindGroupFormat,
    BindStorageBufferFormat,
    Compute,
    GraphicsDevice,
    Shader,
    StorageBuffer
} from 'playcanvas';

import { PATH_IMPORTANCE_V5_WGSL } from '../../wgsl/pathImportanceV5';

type GpuPathImportanceInput = {
    gaussiansPacked: Float32Array;
    planesPacked: Float32Array;
    posePositionsPacked: Float32Array;
    numGaussians: number;
    numPoses: number;
};

const FLOATS_PER_GAUSSIAN = 8;
const FLOATS_PER_POSE_PLANES = 24;
const FLOATS_PER_POSE_POSITION = 4;

const computePathImportanceV5Gpu = async (
    device: GraphicsDevice,
    input: GpuPathImportanceInput
): Promise<Float64Array> => {
    const bindGroupFormat = new BindGroupFormat(device, [
        new BindStorageBufferFormat('gaussians', SHADERSTAGE_COMPUTE, true),
        new BindStorageBufferFormat('poses', SHADERSTAGE_COMPUTE, true),
        new BindStorageBufferFormat('pose_positions', SHADERSTAGE_COMPUTE, true),
        new BindStorageBufferFormat('params', SHADERSTAGE_COMPUTE, true),
        new BindStorageBufferFormat('importance', SHADERSTAGE_COMPUTE)
    ]);

    const shader = new Shader(device, {
        name: 'path-importance-v5',
        shaderLanguage: SHADERLANGUAGE_WGSL,
        cshader: PATH_IMPORTANCE_V5_WGSL,
        // @ts-ignore - computeBindGroupFormat exists at runtime
        computeBindGroupFormat: bindGroupFormat
    });

    const gaussiansBuffer = new StorageBuffer(
        device,
        input.numGaussians * FLOATS_PER_GAUSSIAN * 4,
        BUFFERUSAGE_COPY_DST
    );
    const posesBuffer = new StorageBuffer(
        device,
        Math.max(1, input.numPoses) * FLOATS_PER_POSE_PLANES * 4,
        BUFFERUSAGE_COPY_DST
    );
    const posePositionsBuffer = new StorageBuffer(
        device,
        Math.max(1, input.numPoses) * FLOATS_PER_POSE_POSITION * 4,
        BUFFERUSAGE_COPY_DST
    );
    const paramsBuffer = new StorageBuffer(device, 16, BUFFERUSAGE_COPY_DST);
    const importanceBuffer = new StorageBuffer(
        device,
        input.numGaussians * 4,
        BUFFERUSAGE_COPY_SRC | BUFFERUSAGE_COPY_DST
    );

    try {
        gaussiansBuffer.write(0, input.gaussiansPacked, 0, input.gaussiansPacked.length);
        posesBuffer.write(0, input.planesPacked, 0, input.planesPacked.length);
        posePositionsBuffer.write(0, input.posePositionsPacked, 0, input.posePositionsPacked.length);

        const params = new Uint32Array(4);
        params[0] = input.numPoses;
        params[1] = input.numGaussians;
        paramsBuffer.write(0, params, 0, params.length);

        const compute = new Compute(device, shader, 'path-importance-v5');
        compute.setParameter('gaussians', gaussiansBuffer);
        compute.setParameter('poses', posesBuffer);
        compute.setParameter('pose_positions', posePositionsBuffer);
        compute.setParameter('params', paramsBuffer);
        compute.setParameter('importance', importanceBuffer);

        const groups = Math.ceil(input.numGaussians / 256);
        compute.setupDispatch(groups);
        device.computeDispatch([compute], 'path-importance-v5-dispatch');

        const readBytes = await importanceBuffer.read(0, input.numGaussians * 4, null, true);
        const scoresF32 = new Float32Array(readBytes.buffer, readBytes.byteOffset, input.numGaussians);
        const scores = new Float64Array(input.numGaussians);
        for (let i = 0; i < scores.length; i++) scores[i] = scoresF32[i];
        compute.destroy();
        return scores;
    } finally {
        gaussiansBuffer.destroy();
        posesBuffer.destroy();
        posePositionsBuffer.destroy();
        paramsBuffer.destroy();
        importanceBuffer.destroy();
        shader.destroy();
        bindGroupFormat.destroy();
    }
};

export { computePathImportanceV5Gpu };
