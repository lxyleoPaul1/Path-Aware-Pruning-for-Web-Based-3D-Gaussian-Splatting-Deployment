export const PATH_IMPORTANCE_V5_WGSL = `
struct Gaussian {
    mu: vec3<f32>,
    sigma: f32,
    alpha: f32,
    _pad: vec3<f32>,
};
struct PlaneSet {
    planes: array<vec4<f32>, 6>,
};
struct Params {
    num_poses: u32,
    num_gaussians: u32,
};
@group(0) @binding(0) var<storage,read> gaussians: array<Gaussian>;
@group(0) @binding(1) var<storage,read> poses: array<PlaneSet>;
@group(0) @binding(2) var<storage,read> pose_positions: array<vec4<f32>>;
@group(0) @binding(3) var<storage,read> params: Params;
@group(0) @binding(4) var<storage,read_write> importance: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let j = gid.x;
    if (j >= params.num_gaussians) { return; }
    let g = gaussians[j];
    var acc: f32 = 0.0;
    for (var i: u32 = 0u; i < params.num_poses; i = i + 1u) {
        let p_set = poses[i];
        var inside = true;
        for (var k: u32 = 0u; k < 6u; k = k + 1u) {
            let pl = p_set.planes[k];
            if (dot(pl.xyz, g.mu) + pl.w < 0.0) {
                inside = false; break;
            }
        }
        if (inside) {
            let d = distance(g.mu, pose_positions[i].xyz);
            let r = g.sigma / d;
            let w = min(1.0, r);   // v5 LINEAR, not squared
            acc = acc + w * g.alpha;
        }
    }
    importance[j] = acc;
}
`;
