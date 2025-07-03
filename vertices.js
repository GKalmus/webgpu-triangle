export function createCircleVertices({
	radius = 1,
	numSubdivisions = 24,
	innerRadius = 0,
	startAngle = 0,
	endAngle = Math.PI * 2,
} = {}) {
	// 2 vertices at each subdivision, + 1 to wrap around the circle.
	const numVertices = (numSubdivisions + 1) * 2;
	// 2 32-bit values for position (xy) and 1 32-bit value for color (rgb)
	// The 32-bit color value will be written/read as 4 8-bit values
	const vertexData = new Float32Array(numVertices * (2 + 1));
	const colorData = new Uint8Array(vertexData.buffer);

	let offset = 0;
	let colorOffset = 8;
	const addVertex = (x, y, r, g, b) => {
		vertexData[offset++] = x;
		vertexData[offset++] = y;
		offset += 1; // skip the color
		colorData[colorOffset++] = r * 255;
		colorData[colorOffset++] = g * 255;
		colorData[colorOffset++] = b * 255;
		colorOffset += 9; // skip extra byte and the position
	};
	const innerColor = [1, 1, 1];
	const outerColor = [0.1, 0.1, 0.1];

	// 2 triangles per subdivision
	//
	// 0  2  4  6  8 ...
	//
	// 1  3  5  7  9 ...
	for (let i = 0; i <= numSubdivisions; ++i) {
		const angle =
			startAngle + ((i + 0) * (endAngle - startAngle)) / numSubdivisions;

		const c1 = Math.cos(angle);
		const s1 = Math.sin(angle);

		addVertex(c1 * radius, s1 * radius, ...outerColor);
		addVertex(c1 * innerRadius, s1 * innerRadius, ...innerColor);
	}

	const indexData = new Uint32Array(numSubdivisions * 6);
	let ndx = 0;

	// 1st tri  2nd tri  3rd tri  4th tri
	// 0 1 2    2 1 3    2 3 4    4 3 5
	//
	// 0--2        2     2--4        4  .....
	// | /        /|     | /        /|
	// |/        / |     |/        / |
	// 1        1--3     3        3--5  .....
	for (let i = 0; i < numSubdivisions; ++i) {
		const ndxOffset = i * 2;

		// first triangle
		indexData[ndx++] = ndxOffset;
		indexData[ndx++] = ndxOffset + 1;
		indexData[ndx++] = ndxOffset + 2;

		// second triangle
		indexData[ndx++] = ndxOffset + 2;
		indexData[ndx++] = ndxOffset + 1;
		indexData[ndx++] = ndxOffset + 3;
	}

	return {
		vertexData,
		indexData,
		numVertices: indexData.length,
	};
}
