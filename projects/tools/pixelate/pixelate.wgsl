struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> VSOutput {
  let pos = array(
    vec2f( -1.0,  -1.0),
    vec2f( -1.0,  1.0),
    vec2f( 1.0,  -1.0),

    vec2f( 1.0,  -1.0),
    vec2f( 1.0,  1.0),
    vec2f( -1.0,  1.0),
  );

  var vsOutput: VSOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy / 2 + .5;
  return vsOutput;
}

@group(0) @binding(0) var<uniform> factor: f32;
@group(0) @binding(1) var defaultSampler: sampler;
@group(0) @binding(2) var sourceTexture: texture_2d<f32>;

@fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
  let f = max(1. - (0.9 + .1 * factor), 0.01);
  let SCREEN_PIXEL_SIZE = .1;
  let screenSize = 100. / SCREEN_PIXEL_SIZE * f;
  let uv = floor(fsInput.texcoord * screenSize) / screenSize;
  return textureSample(sourceTexture, defaultSampler, uv);
}
