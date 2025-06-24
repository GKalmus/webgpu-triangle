const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
if (!device) {
	console.error("need a browser that supports WebGPU");
}

// Get a WebGPU context from the canvas and configure it
const canvas = document.querySelector("canvas");
const context = canvas.getContext("webgpu");
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
	device,
	format: presentationFormat,
});

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
	},
	fragment: {
		module,
		targets: [{ format: presentationFormat }],
	},
});

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

async function render() {
	// Get the current texture from the canvas context and
	// set it as the texture to render to.
	renderPassDescriptor.colorAttachments[0].view = context
		.getCurrentTexture()
		.createView();

	// make a command encoder to start encoding commands
	const encoder = device.createCommandEncoder({ label: "our encoder" });

	// make a render pass encoder to encode render specific commands
	const pass = encoder.beginRenderPass(renderPassDescriptor);
	pass.setPipeline(pipeline);
	pass.draw(3); // call our vertex shader 3 times.
	pass.end();

	const commandBuffer = encoder.finish();
	device.queue.submit([commandBuffer]);
}

render();
