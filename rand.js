// A random number between [min and max)
// With 1 argument it will be [0 to min)
// With no arguments it will be [0 to 1)
export function rand(min, max) {
	if (min === undefined) {
		min = 0;
		max = 1;
	} else if (max === undefined) {
		max = min;
		min = 0;
	}
	return min + Math.random() * (max - min);
};
