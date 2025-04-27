import demoSourceUrl from "./yue.png";
import pixelateShader from "./pixelate.wgsl?raw";

export async function pixelate(canvas: HTMLCanvasElement) {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    throw new Error("need a browser that supports WebGPU");
  }

  device.lost.then((info) => {
    console.error(`WebGPU device was lost: ${info.message}`);
    if (info.reason !== "destroyed") {
      pixelate(canvas);
    }
  });

  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("failed to get webgpu context");
  }
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });

  const module = device.createShaderModule({
    label: "pixelate shader",
    code: pixelateShader,
  });

  const source = await loadImageBitmap(demoSourceUrl);
  const demoTexture = device.createTexture({
    label: demoSourceUrl,
    format: "rgba8unorm",
    size: [source.width, source.height],
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  device.queue.copyExternalImageToTexture(
    { source, flipY: true },
    { texture: demoTexture },
    { width: source.width, height: source.height }
  );

  const uniformBufferSize = 4;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const pipeline = device.createRenderPipeline({
    label: "our hardcoded red triangle pipeline",
    layout: "auto",
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
  });

  const uniforms = { factor: new Float32Array(1) };

  const linearSampler = device.createSampler({
    magFilter: "linear",
  });
  const nearestSampler = device.createSampler({
    magFilter: "nearest",
  });

  let textureCache: WeakMap<File, GPUTexture> = new WeakMap();

  const render = async ({
    factor,
    filterMode,
    sourceFile,
  }: {
    factor: number;
    filterMode: GPUFilterMode;
    sourceFile: File | null;
  }) => {
    uniforms.factor.set([factor]);

    let texture = sourceFile && textureCache.get(sourceFile);
    if (sourceFile && !texture) {
      const source = await createImageBitmap(sourceFile);
      const sourceTexture = device.createTexture({
        label: sourceFile.name,
        format: "rgba8unorm",
        size: [source.width, source.height],
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      console.log(source);
      textureCache.set(sourceFile, sourceTexture);

      device.queue.copyExternalImageToTexture(
        { source, flipY: true },
        { texture: sourceTexture },
        { width: source.width, height: source.height }
      );
    }

    const sourceTexture = texture ?? demoTexture;

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        {
          binding: 1,
          resource: filterMode === "linear" ? linearSampler : nearestSampler,
        },
        { binding: 2, resource: sourceTexture.createView() },
      ],
    });

    const encoder = device.createCommandEncoder({ label: "our encoder" });
    device.queue.writeBuffer(uniformBuffer, 0, uniforms.factor);

    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "our renderPass",
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };

  return { device, uniforms, render };
}

async function loadImageBitmap(url: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  return createImageBitmap(blob, { colorSpaceConversion: "none" });
}
