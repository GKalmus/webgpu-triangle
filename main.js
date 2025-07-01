const canvas = document.querySelector("canvas");

// WebGPU device initialization
if (!navigator.gpu) {
	throw new Error("WebGPU not supported on this browser.");
}
const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
	throw new Error("No appropriate GPUAdapter found");
}

const device = await adapter.requestDevice();

const context = canvas.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
	device: device,
	format: canvasFormat,
});

async function load_file(url) {
	const response = await fetch(url);
	return await response.text();
}

const shader_file = await load_file("shaders/red-triangle.wgsl");

const vertices = new Float32Array([-0.8, -0.8, 0.8, -0.8, 0, 0.8]);

const vertexBuffer = device.createBuffer({
	label: "Cell vertices",
	size: vertices.byteLength,
	usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});

device.queue.writeBuffer(vertexBuffer, 0, vertices);

const vertexBufferLayout = {
	arrayStride: 8,
	attributes: [
		{
			format: "float32x2",
			offset: 0,
			shaderLocation: 0,
		},
	],
};

const cellShaderModule = device.createShaderModule({
	label: "our hardcoded red triangle shaders",
	code: shader_file,
});

const cellPipeline = device.createRenderPipeline({
	label: "Cell pipeline",
	layout: "auto",
	vertex: {
		module: cellShaderModule,
		entryPoint: "vertexMain",
		buffers: [vertexBufferLayout],
	},
	fragment: {
		module: cellShaderModule,
		entryPoint: "fragmentMain",
		targets: [
			{
				format: canvasFormat,
			},
		],
	},
});

// Clear the canvas
const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass({
	colorAttachments: [
		{
			view: context.getCurrentTexture().createView(),
			loadOp: "clear",
			clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1 },
			storeOp: "store",
		},
	],
});
pass.setPipeline(cellPipeline);
pass.setVertexBuffer(0, vertexBuffer);
pass.draw(vertices.length / 2);

pass.end();

device.queue.submit([encoder.finish()]);
