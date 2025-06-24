// Get info of GPU
const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
if (!device) throw new Error("WebGPU not supported on this browser.");

const canvas = document.getElementById("gpu-canvas");
const context = canvas.getContext("webgpu");
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
	device,
	format: presentationFormat,
	alphaMode: "opaque",
});


async function load_file(url) {
	const response = await fetch(url);
	return await response.text();
}

const shader_file = await load_file("shaders/shader.wgsl");

const module = device.createShaderModule({
	label: "our hardcoded red triangle shaders",
	code: shader_file,
});

const pipeline = device.createRenderPipeline({
	label: "our hardcoded red triangle pipeline",
	layout: "auto",
	vertex: {
		module,
		entryPoint: "vs",
	},
	fragment: {
		module,
		entryPoint: "fs",
		targets: [{ format: presentationFormat }],
	},
	primitive: {
		topology: "triangle-list",
	},
});

const renderPassDescriptor = {
	label: "our basic canvas renderPass",
	colorAttachments: [
		{
			view: undefined,
			clearValue: [0.3, 0.3, 0.3, 1],
			loadOp: "clear",
			storeOp: "store",
		},
	],
};

async function render() {
	renderPassDescriptor.colorAttachments[0].view = 
		context.getCurrentTexture().createView();

	const encoder = device.createCommandEncoder({ label: "our encoder" });
	const pass = encoder.beginRenderPass(renderPassDescriptor);
	pass.setPipeline(pipeline);
	pass.draw(3);
	pass.end();

	device.queue.submit([encoder.finish()]);
}

render();
