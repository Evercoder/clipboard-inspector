import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import JSZip from 'jszip';

const MDN_BASE = `https://developer.mozilla.org/en-US/docs/Web/API`;

const MDN_URLS = {
	DataTransfer: {
		ctr: {
			url: 'DataTransfer',
			label: label => `event.${label}`
		},
		getData: {
			url: 'DataTransfer/getData',
			label: 'getData(type)'
		}
	},
	ClipboardItem: {
		ctr: {
			url: 'ClipboardItem',
			label: () => 'ClipboardItem'
		},
		getData: {
			url: 'ClipboardItem/getType',
			label: 'getType(type)'
		}
	}
};

async function extractData(data) {
	if (!data) {
		return undefined;
	}

	const file_info = file =>
		file
			? {
					name: file.name,
					size: file.size,
					type: file.type,
					url: URL.createObjectURL(file)
			  }
			: null;

	if (data instanceof DataTransfer) {
		return {
			type: 'DataTransfer',
			types: Array.from(data.types).map(type => ({
				type,
				data: data.getData(type)
			})),
			items: data.items
				? await Promise.all(
						Array.from(data.items).map(async item => ({
							kind: item.kind,
							type: item.type,
							as_string_or_file:
								item.kind === 'string'
									? await new Promise(r =>
											item.getAsString(r)
									  )
									: file_info(item.getAsFile())
						}))
				  )
				: null,
			files: data.files ? Array.from(data.files).map(file_info) : null
		};
	}

	if (data instanceof ClipboardItem) {
		return {
			type: 'ClipboardItem',
			types: await Promise.all(
				Array.from(data.types).map(async type => {
					const blob = await data.getType(type);
					return {
						type: type,
						data: blob.type.match(/(^text\/)|(image\/svg\+xml$)/)
							? await blob.text()
							: file_info(blob)
					};
				})
			)
		};
	}
	return undefined;
}

// Utility functions for ZIP generation
function sanitizeFilename(str) {
	if (!str) return 'unknown';
	return str
		.replace(/\//g, '-')
		.replace(/[<>:"|?*\\]/g, '')
		.replace(/\s+/g, '-')
		.toLowerCase();
}

function isTextMimeType(mimeType) {
	if (!mimeType) return false;
	return (
		mimeType.startsWith('text/') ||
		mimeType === 'application/json' ||
		mimeType === 'application/xml' ||
		mimeType === 'application/javascript' ||
		mimeType === 'application/xhtml+xml' ||
		mimeType.includes('+xml') ||
		mimeType.includes('+json')
	);
}

function getFileExtension(mimeType, defaultExt = '.bin') {
	const mimeToExt = {
		'image/png': '.png',
		'image/jpeg': '.jpg',
		'image/jpg': '.jpg',
		'image/gif': '.gif',
		'image/webp': '.webp',
		'image/svg+xml': '.svg',
		'image/bmp': '.bmp',
		'application/pdf': '.pdf',
		'application/zip': '.zip',
		'application/x-zip-compressed': '.zip',
		'video/mp4': '.mp4',
		'video/webm': '.webm',
		'audio/mpeg': '.mp3',
		'audio/wav': '.wav',
		'text/plain': '.txt',
		'text/html': '.html',
		'text/css': '.css',
		'application/json': '.json',
		'application/javascript': '.js'
	};
	return mimeToExt[mimeType] || defaultExt;
}

async function fetchBlobFromObjectURL(url) {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error(`Failed to fetch blob from ${url}`);
			return null;
		}
		return await response.blob();
	} catch (error) {
		console.error(`Error fetching blob from ${url}:`, error);
		return null;
	}
}

function generateReadme(data, label) {
	const timestamp = new Date().toISOString();
	return `Clipboard Data Export
=====================

Export Date: ${timestamp}
Source: ${label || 'clipboard'}

This archive contains clipboard content exported from the Clipboard Inspector tool.

Structure:
----------
- README.txt (this file): Overview of the export
- metadata.json: Overall structure information
- types/: Text and binary content from different MIME types
- items/: String items and files from clipboard (with manifest.json for details)
- files/: Binary files from clipboard (with manifest.json for details)

Content:
--------
This export includes all clipboard content:
- Text data in .txt files
- Binary files (images, PDFs, etc.) with their original filenames or type-based names
- Structured metadata in manifest.json files

For support inquiries, please send this entire ZIP file.
`;
}

function generateMetadata(data, label) {
	const typesCount = data
		.map(d => d.types?.length || 0)
		.reduce((a, b) => a + b, 0);
	const itemsCount = data
		.map(d => d.items?.length || 0)
		.reduce((a, b) => a + b, 0);
	const filesCount = data
		.map(d => d.files?.length || 0)
		.reduce((a, b) => a + b, 0);

	return {
		version: '1.0',
		timestamp: new Date().toISOString(),
		source: label || 'clipboard',
		summary: {
			totalTypes: typesCount,
			totalItems: itemsCount,
			totalFiles: filesCount,
			dataCount: data.length
		},
		note: 'All clipboard content included: text data and binary files (images, PDFs, etc.)'
	};
}

// Variant processing functions
async function addTypesToZip(zip, typesData) {
	if (!typesData || typesData.length === 0) return;

	const typesFolder = zip.folder('types');

	for (const obj of typesData) {
		if (typeof obj.data === 'string') {
			// Text content
			const filename = sanitizeFilename(obj.type) + '.txt';
			typesFolder.file(filename, obj.data || '(Empty string)');
		} else if (typeof obj.data === 'object' && obj.data !== null) {
			// Binary file (has url property from file_info)
			if (obj.data.url) {
				const blob = await fetchBlobFromObjectURL(obj.data.url);
				if (blob) {
					const ext = getFileExtension(obj.type);
					const filename =
						obj.data.name || `${sanitizeFilename(obj.type)}${ext}`;
					typesFolder.file(filename, blob);
				}
			}
		}
	}
}

async function addItemsToZip(zip, itemsData) {
	if (!itemsData || itemsData.length === 0) return;

	const itemsFolder = zip.folder('items');
	const manifest = [];

	for (let index = 0; index < itemsData.length; index++) {
		const item = itemsData[index];

		if (
			item.kind === 'string' &&
			typeof item.as_string_or_file === 'string'
		) {
			const filename = `item-${index}-string-${sanitizeFilename(
				item.type
			)}.txt`;
			itemsFolder.file(
				filename,
				item.as_string_or_file || '(Empty string)'
			);
			manifest.push({
				index,
				kind: item.kind,
				type: item.type,
				filename,
				hasContent: true
			});
		} else if (item.kind === 'file' && item.as_string_or_file) {
			// For files, include actual binary data
			const fileInfo = item.as_string_or_file;
			if (fileInfo.url) {
				const blob = await fetchBlobFromObjectURL(fileInfo.url);
				if (blob) {
					const ext = getFileExtension(fileInfo.type || item.type);
					const filename =
						fileInfo.name ||
						`item-${index}-file-${sanitizeFilename(
							item.type
						)}${ext}`;
					itemsFolder.file(filename, blob);
					manifest.push({
						index,
						kind: item.kind,
						type: item.type,
						filename,
						fileInfo: {
							name: fileInfo.name,
							size: fileInfo.size,
							type: fileInfo.type
						}
					});
				} else {
					// Blob fetch failed, add metadata only
					manifest.push({
						index,
						kind: item.kind,
						type: item.type,
						error: 'Failed to fetch file data',
						fileInfo: {
							name: fileInfo.name,
							size: fileInfo.size,
							type: fileInfo.type,
							url: fileInfo.url
						}
					});
				}
			}
		}
	}

	if (manifest.length > 0) {
		itemsFolder.file('manifest.json', JSON.stringify(manifest, null, 2));
	}
}

async function addFilesToZip(zip, filesData) {
	if (!filesData || filesData.length === 0) return;

	const filesFolder = zip.folder('files');
	const manifest = [];
	const usedFilenames = new Set();

	for (let index = 0; index < filesData.length; index++) {
		const file = filesData[index];

		if (file.url) {
			const blob = await fetchBlobFromObjectURL(file.url);
			if (blob) {
				// Handle filename collisions
				let filename =
					file.name || `file-${index}${getFileExtension(file.type)}`;
				let finalFilename = filename;
				let counter = 1;

				while (usedFilenames.has(finalFilename)) {
					const lastDot = filename.lastIndexOf('.');
					if (lastDot > 0) {
						const name = filename.substring(0, lastDot);
						const ext = filename.substring(lastDot);
						finalFilename = `${name}-${counter}${ext}`;
					} else {
						finalFilename = `${filename}-${counter}`;
					}
					counter++;
				}

				usedFilenames.add(finalFilename);
				filesFolder.file(finalFilename, blob);

				manifest.push({
					index,
					filename: finalFilename,
					originalName: file.name,
					size: file.size,
					type: file.type
				});
			} else {
				// Blob fetch failed
				manifest.push({
					index,
					error: 'Failed to fetch file data',
					name: file.name,
					size: file.size,
					type: file.type,
					url: file.url
				});
			}
		}
	}

	if (manifest.length > 0) {
		filesFolder.file('manifest.json', JSON.stringify(manifest, null, 2));
	}
}

async function downloadAsZip(data, label) {
	try {
		const zip = new JSZip();

		// Add README
		zip.file('README.txt', generateReadme(data, label));

		// Add metadata
		zip.file(
			'metadata.json',
			JSON.stringify(generateMetadata(data, label), null, 2)
		);

		// Process each data item
		for (const item of data) {
			if (item.types) {
				await addTypesToZip(zip, item.types);
			}
			if (item.items) {
				await addItemsToZip(zip, item.items);
			}
			if (item.files) {
				await addFilesToZip(zip, item.files);
			}
		}

		// Generate ZIP blob
		const blob = await zip.generateAsync({ type: 'blob' });

		// Trigger download
		const timestamp = new Date()
			.toISOString()
			.replace(/:/g, '')
			.replace(/\..+/, '')
			.replace('T', '_');
		const filename = `clipboard-data-${timestamp}.zip`;

		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(a.href);
	} catch (error) {
		console.error('Error generating ZIP:', error);
		throw error;
	}
}

function ClipboardInspector(props) {
	const { data, label } = props;
	const has_async_clipboard =
		!navigator.clipboard || !navigator.clipboard.read;
	const [downloadState, setDownloadState] = useState('idle');

	const paste = useCallback(e => {
		navigator.clipboard.read().then(data => {
			render(data, 'ClipboardItems');
		});
	}, []);

	const handleDownloadClick = useCallback(async () => {
		setDownloadState('loading');
		try {
			await downloadAsZip(data, label);
			setDownloadState('success');
			setTimeout(() => setDownloadState('idle'), 2000);
		} catch (error) {
			console.error('Failed to generate ZIP:', error);
			alert('Failed to generate ZIP file. See console for details.');
			setDownloadState('idle');
		}
	}, [data, label]);

	const autoselect = useCallback(e => {
		const range = document.createRange();
		range.selectNodeContents(e.target);
		const selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	}, []);

	function render_file(file) {
		return file ? (
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Size</th>
						<th>Type</th>
						<th>
							<a
								className="mdn"
								href={`${MDN_BASE}/URL/createObjectURL`}
							>
								URL.createObjectURL(file)
							</a>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>{file.name}</code>
						</td>
						<td>
							<code>{file.size}</code>
						</td>
						<td>
							<code>{file.type}</code>
						</td>
						<td>
							<code>
								<a href={file.url}>
									<img src={file.url} />
								</a>
							</code>
						</td>
					</tr>
				</tbody>
			</table>
		) : (
			<em>N/A</em>
		);
	}

	if (!data.length) {
		return (
			<div className="intro-msg">
				<h2>To get started, either:</h2>
				<ul>
					<li>
						<button disabled={has_async_clipboard} onClick={paste}>
							Paste using the Clipboard API
						</button>{' '}
						if your browser supports the Asynchronous Clipboard API
					</li>
					<li>
						Paste with the <kbd>Ctrl+V</kbd> / <kbd>⌘V</kbd>{' '}
						keyboard shortcut or{' '}
						<span contentEditable onFocus={autoselect}>
							paste in here
						</span>{' '}
						if you don't have a keyboard
					</li>
					<li>Drop something on the page</li>
				</ul>
			</div>
		);
	}

	return (
		<div>
			<div className="action-buttons">
				<button type="button" onClick={e => render()}>
					← Go back
				</button>
				<button
					type="button"
					onClick={handleDownloadClick}
					disabled={downloadState === 'loading'}
					className="download-button"
				>
					{downloadState === 'loading'
						? 'Generating ZIP...'
						: downloadState === 'success'
						? 'Downloaded!'
						: 'Download as ZIP'}
				</button>
			</div>
			{data.map((render_data, idx) => {
				const URLS = MDN_URLS[render_data.type];
				return (
					<div className="clipboard-summary" key={idx}>
						<h2>
							<a
								className="mdn"
								href={`${MDN_BASE}/${URLS.ctr.url}`}
							>
								{URLS.ctr.label(label)}
							</a>{' '}
							contains:
						</h2>

						{render_data.types && (
							<div className="clipboard-section">
								<h3>
									<a
										className="mdn"
										href={`${MDN_BASE}/DataTransfer/types`}
									>
										.types
									</a>
									<span className="anno">
										{render_data.types.length} type(s)
										available
									</span>
								</h3>
								<table>
									<thead>
										<tr>
											<th>type</th>
											<th>
												<a
													className="mdn"
													href={`${MDN_BASE}/${URLS.getData.url}`}
												>
													{URLS.getData.label}
												</a>
											</th>
										</tr>
									</thead>
									<tbody>
										{render_data.types.map((obj, idx) => (
											<tr key={idx}>
												<td>
													<code>{obj.type}</code>
													{obj.type.match(
														/^text\//
													) &&
														navigator.clipboard &&
														navigator.clipboard
															.writeText && (
															<div class="cb-copy">
																<button
																	onClick={e =>
																		navigator.clipboard.writeText(
																			obj.data
																		)
																	}
																>
																	Copy as
																	plain text
																</button>
															</div>
														)}
												</td>
												<td>
													<pre class="cb-entry">
														<code>
															{typeof obj.data ===
															'object'
																? render_file(
																		obj.data
																  )
																: obj.data || (
																		<em>
																			Empty
																			string
																		</em>
																  )}
														</code>
													</pre>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						{render_data.items && (
							<div className="clipboard-section">
								<h3>
									<a
										className="mdn"
										href={`${MDN_BASE}/DataTransfer/items`}
									>
										.items
									</a>
									<span className="anno">
										{render_data.items ? (
											`${render_data.items.length} item(s) available`
										) : (
											<em>Undefined</em>
										)}
									</span>
								</h3>

								{render_data.items ? (
									<table>
										<thead>
											<tr>
												<th>kind</th>
												<th>type</th>
												<th>
													<a
														className="mdn"
														href={`${MDN_BASE}/DataTransferItem/getAsString`}
													>
														getAsString()
													</a>{' '}
													{' / '}
													<a
														className="mdn"
														href={`${MDN_BASE}/DataTransferItem/getAsFile`}
													>
														getAsFile()
													</a>
												</th>
											</tr>
										</thead>
										<tbody>
											{render_data.items.map(
												(item, idx) => (
													<tr key={idx}>
														<td>
															<code>
																{item.kind}
															</code>
														</td>
														<td>
															<code>
																{item.type}
															</code>
														</td>
														<td>
															{item.kind ===
															'string' ? (
																<pre class="cb-entry">
																	<code>
																		{item.as_string_or_file || (
																			<em>
																				Empty
																				string
																			</em>
																		)}
																	</code>
																</pre>
															) : (
																render_file(
																	item.as_string_or_file
																)
															)}
														</td>
													</tr>
												)
											)}
										</tbody>
									</table>
								) : null}
							</div>
						)}

						{render_data.files && (
							<div className="clipboard-section">
								<h3>
									<a
										className="mdn"
										href={`${MDN_BASE}/DataTransfer/files`}
									>
										.files
									</a>
									<span className="anno">
										{render_data.files
											? `${render_data.files.length} file(s) available`
											: '<em>Undefined</em>'}
									</span>
								</h3>
								{render_data.files ? (
									render_data.files.map((file, idx) => (
										<div key={idx}>{render_file(file)}</div>
									))
								) : (
									<span>N/A</span>
								)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

var app_el = document.getElementById('app');

async function render(data, label) {
	const extracted_data = data
		? await Promise.all(
				(Array.isArray(data) ? data : [data]).map(extractData)
		  )
		: [];
	ReactDOM.render(
		<ClipboardInspector data={extracted_data} label={label} />,
		app_el
	);
}

render();

document.addEventListener('paste', e => {
	render(e.clipboardData, 'clipboardData');
});

document.addEventListener('dragover', e => {
	e.preventDefault();
});

document.addEventListener('drop', e => {
	render(e.dataTransfer, 'dataTransfer');
	e.preventDefault();
});
