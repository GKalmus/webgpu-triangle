export async function load_file(url) {
	const response = await fetch(url);
	return await response.text();
}

