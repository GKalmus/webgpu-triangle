import { load_file } from "./load-file.js";
import { rand } from "./rand.js";
import { createCircleVertices } from "./vertices.js";

const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
if (!device) {
	fail("need a browser that supports WebGPU");
}

// Get a WebGPU context from the canvas and configure it
const canvas = document.querySelector("canvas");
const context = canvas.getContext("webgpu");
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
	device,
	format: presentationFormat,
});

const shader_file = await load_file("shaders/rgb-triangle.wgsl");

const module = device.createShaderModule({
	code: shader_file,
});

const pipeline = device.createRenderPipeline({
	label: "flat colors",
	layout: "auto",
	vertex: {
		module,
		buffers: [
			{
				arrayStride: 2 * 4 + 4, // 2 floats, 4 bytes each + 4 bytes
				attributes: [
					{ shaderLocation: 0, offset: 0, format: "float32x2" }, // position
					{ shaderLocation: 4, offset: 8, format: "unorm8x4" }, // perVertexColor
				],
			},
			{
				arrayStride: 4 + 2 * 4, // 6 floats, 4 bytes each
				stepMode: "instance",
				attributes: [
					{ shaderLocation: 1, offset: 0, format: "unorm8x4" }, // color
					{ shaderLocation: 2, offset: 4, format: "float32x2" }, // offset
				],
			},
			{
				arrayStride: 2 * 4, // 2 floats, 4 bytes each
				stepMode: "instance",
				attributes: [
					{ shaderLocation: 3, offset: 0, format: "float32x2" }, // scale
				],
			},
		],
	},
	fragment: {
		module,
		targets: [{ format: presentationFormat }],
	},
});

const kNumObjects = 100;
const objectInfos = [];

// create 2 storage buffers
const staticUnitSize =
	4 + // color is 4 bytes
	2 * 4; // offset is 2 32bit floats (4bytes each)

const changingUnitSize = 2 * 4; // scale is 2 32bit floats (4bytes each)

const staticVertexBufferSize = staticUnitSize * kNumObjects;
const changingVertexBufferSize = changingUnitSize * kNumObjects;

const staticVertexBuffer = device.createBuffer({
	label: "static vertex for objects",
	size: staticVertexBufferSize,
	usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});

const changingVertexBuffer = device.createBuffer({
	label: "changing vertex for objects",
	size: changingVertexBufferSize,
	usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});

// offsets to the various uniform values in float32 indices
const kColorOffset = 0;
const kOffsetOffset = 1;

const kScaleOffset = 0;

{
	const staticVertexValuesU8 = new Uint8Array(staticVertexBufferSize);
	const staticVertexValuesF32 = new Float32Array(staticVertexValuesU8.buffer);

	for (let i = 0; i < kNumObjects; ++i) {
		const staticOffsetU8 = i * staticUnitSize;
		const staticOffsetF32 = staticOffsetU8 / 4;

		staticVertexValuesU8.set(
			// set the color
			[rand() * 255, rand() * 255, rand() * 255, 255],
			staticOffsetU8 + kColorOffset,
		);

		staticVertexValuesF32.set(
			// set the offset
			[rand(-0.9, 0.9), rand(-0.9, 0.9)],
			staticOffsetF32 + kOffsetOffset,
		);
		objectInfos.push({
			scale: rand(0.2, 0.5),
		});
	}
	device.queue.writeBuffer(staticVertexBuffer, 0, staticVertexValuesF32);
}

// a typed array we can use to update the changingStorageBuffer
const vertexValues = new Float32Array(changingVertexBufferSize / 4);

const { vertexData, indexData, numVertices } = createCircleVertices({
	radius: 0.5,
	innerRadius: 0.25,
});
const vertexBuffer = device.createBuffer({
	label: "vertex buffer vertices",
	size: vertexData.byteLength,
	usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, vertexData);

const indexBuffer = device.createBuffer({
	label: "index buffer",
	size: indexData.byteLength,
	usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(indexBuffer, 0, indexData);

const renderPassDescriptor = {
	label: "our basic canvas renderPass",
	colorAttachments: [
		{
			// view: <- to be filled out when we render
			clearValue: [0.3, 0.3, 0.3, 1],
			loadOp: "clear",
			storeOp: "store",
		},
	],
};

function render() {
	// Get the current texture from the canvas context and
	// set it as the texture to render to.
	renderPassDescriptor.colorAttachments[0].view = context
		.getCurrentTexture()
		.createView();

	const encoder = device.createCommandEncoder();
	const pass = encoder.beginRenderPass(renderPassDescriptor);
	pass.setPipeline(pipeline);
	pass.setVertexBuffer(0, vertexBuffer);
	pass.setVertexBuffer(1, staticVertexBuffer);
	pass.setVertexBuffer(2, changingVertexBuffer);
	pass.setIndexBuffer(indexBuffer, "uint32");

	// Set the uniform values in our JavaScript side Float32Array
	const aspect = canvas.width / canvas.height;

	// set the scales for each object
	objectInfos.forEach(({ scale }, ndx) => {
		const offset = ndx * (changingUnitSize / 4);
		vertexValues.set([scale / aspect, scale], offset + kScaleOffset); // set the scale
	});
	// upload all scales at once
	device.queue.writeBuffer(changingVertexBuffer, 0, vertexValues);

	pass.drawIndexed(numVertices, kNumObjects);

	pass.end();

	const commandBuffer = encoder.finish();
	device.queue.submit([commandBuffer]);
}

const observer = new ResizeObserver((entries) => {
	for (const entry of entries) {
		const canvas = entry.target;
		const width = entry.contentBoxSize[0].inlineSize;
		const height = entry.contentBoxSize[0].blockSize;
		canvas.width = Math.max(
			1,
			Math.min(width, device.limits.maxTextureDimension2D),
		);
		canvas.height = Math.max(
			1,
			Math.min(height, device.limits.maxTextureDimension2D),
		);
		// re-render
		render();
	}
});
observer.observe(canvas);

function fail(msg) {
	alert(msg);
}
