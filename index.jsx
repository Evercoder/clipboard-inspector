import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';

// ---------- share encoding helpers ----------

async function blobUrlToDataUrl(url) {
	if (!url || typeof url !== 'string' || !url.startsWith('blob:')) return url;
	const resp = await fetch(url);
	const blob = await resp.blob();
	return await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

async function inlineBlobUrls(extracted) {
	// Walk a deep copy of extracted data, replacing blob: URLs with data: URLs
	// so the payload can survive in a static share URL.
	const data = JSON.parse(JSON.stringify(extracted));
	const convertFile = async file => {
		if (file && file.url) {
			file.url = await blobUrlToDataUrl(file.url);
		}
	};
	for (const rd of data) {
		if (rd && rd.types) {
			for (const t of rd.types) {
				if (t && typeof t.data === 'object' && t.data) {
					await convertFile(t.data);
				}
			}
		}
		if (rd && rd.items) {
			for (const it of rd.items) {
				if (it && it.kind !== 'string' && it.as_string_or_file) {
					await convertFile(it.as_string_or_file);
				}
			}
		}
		if (rd && rd.files) {
			for (const f of rd.files) await convertFile(f);
		}
	}
	return data;
}

function bytesToBase64Url(bytes) {
	let bin = '';
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
	}
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64) {
	let s = b64.replace(/-/g, '+').replace(/_/g, '/');
	while (s.length % 4) s += '=';
	const bin = atob(s);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

async function encodeShare(extracted, label) {
	const inlined = await inlineBlobUrls(extracted);
	const json = JSON.stringify({ v: 1, label, data: inlined });
	const input = new TextEncoder().encode(json);
	const compressed = await new Response(
		new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'))
	).arrayBuffer();
	return bytesToBase64Url(new Uint8Array(compressed));
}

async function decodeShare(b64) {
	const bytes = base64UrlToBytes(b64);
	const decompressed = await new Response(
		new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
	).arrayBuffer();
	const json = new TextDecoder().decode(decompressed);
	return JSON.parse(json);
}

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

async function buildClipboardItemFromRenderData(render_data) {
	const map = {};
	const addBlob = async (type, value) => {
		if (!type || map[type]) return;
		if (typeof value === 'string') {
			map[type] = new Blob([value], { type });
		} else if (value && value.url) {
			const resp = await fetch(value.url);
			const blob = await resp.blob();
			map[type] = blob.type
				? blob
				: new Blob([await blob.arrayBuffer()], { type });
		}
	};
	if (render_data.types) {
		for (const t of render_data.types) await addBlob(t.type, t.data);
	}
	if (render_data.items) {
		for (const it of render_data.items) {
			if (it.kind === 'string') {
				await addBlob(it.type, it.as_string_or_file);
			} else {
				await addBlob(it.type, it.as_string_or_file);
			}
		}
	}
	if (render_data.files) {
		for (const f of render_data.files) {
			if (f && f.type) await addBlob(f.type, f);
		}
	}
	return map;
}

function ClipboardInspector(props) {
	const { data, label, fromShare } = props;
	const [shareUrl, setShareUrl] = useState(null);
	const [shareError, setShareError] = useState(null);
	const [shareBusy, setShareBusy] = useState(false);
	const [copied, setCopied] = useState(false);
	const [copyBackStatus, setCopyBackStatus] = useState({});
	const has_async_clipboard =
		!navigator.clipboard || !navigator.clipboard.read;
	const paste = useCallback(e => {
		navigator.clipboard.read().then(data => {
			render(data, 'ClipboardItems');
		});
	}, []);

	const share = useCallback(async () => {
		setShareBusy(true);
		setShareError(null);
		setCopied(false);
		try {
			const encoded = await encodeShare(data, label);
			const url = `${location.origin}${location.pathname}#s=${encoded}`;
			setShareUrl(url);
			history.replaceState(null, '', `#s=${encoded}`);
			if (url.length > 2_000_000) {
				setShareError(
					`Heads up: URL is ${url.length.toLocaleString()} chars, may exceed browser limits.`
				);
			}
		} catch (err) {
			setShareError(String(err && err.message ? err.message : err));
		} finally {
			setShareBusy(false);
		}
	}, [data, label]);

	const copyBackToClipboard = useCallback(async (render_data, idx) => {
		setCopyBackStatus(s => ({ ...s, [idx]: { busy: true } }));
		try {
			const map = await buildClipboardItemFromRenderData(render_data);
			const types = Object.keys(map);
			if (!types.length) throw new Error('No data to copy');
			if (
				!navigator.clipboard ||
				!navigator.clipboard.write ||
				typeof ClipboardItem === 'undefined'
			) {
				const textType =
					types.find(t => t === 'text/plain') ||
					types.find(t => t.startsWith('text/'));
				if (
					textType &&
					navigator.clipboard &&
					navigator.clipboard.writeText
				) {
					await navigator.clipboard.writeText(
						await map[textType].text()
					);
					setCopyBackStatus(s => ({
						...s,
						[idx]: { ok: `Copied as ${textType} (fallback)` }
					}));
					return;
				}
				throw new Error('Clipboard write API unavailable');
			}
			try {
				await navigator.clipboard.write([new ClipboardItem(map)]);
				setCopyBackStatus(s => ({
					...s,
					[idx]: { ok: `Copied ${types.length} type(s)` }
				}));
			} catch (err) {
				// Some browsers restrict allowed MIME types. Retry with a
				// reduced set (text/plain, text/html, image/png) before
				// falling back to plain text only.
				const safeTypes = types.filter(t =>
					/^(text\/(plain|html)|image\/png)$/.test(t)
				);
				if (safeTypes.length && safeTypes.length < types.length) {
					const safeMap = {};
					for (const t of safeTypes) safeMap[t] = map[t];
					try {
						await navigator.clipboard.write([
							new ClipboardItem(safeMap)
						]);
						setCopyBackStatus(s => ({
							...s,
							[idx]: {
								ok: `Copied ${
									safeTypes.length
								} type(s) (browser rejected: ${types
									.filter(t => !safeTypes.includes(t))
									.join(', ')})`
							}
						}));
						return;
					} catch (_) {
						/* fall through */
					}
				}
				const textType =
					types.find(t => t === 'text/plain') ||
					types.find(t => t.startsWith('text/'));
				if (textType) {
					await navigator.clipboard.writeText(
						await map[textType].text()
					);
					setCopyBackStatus(s => ({
						...s,
						[idx]: {
							ok: `Copied as ${textType} (browser rejected richer types)`
						}
					}));
					return;
				}
				throw err;
			}
		} catch (err) {
			setCopyBackStatus(s => ({
				...s,
				[idx]: { error: String(err && err.message ? err.message : err) }
			}));
		}
	}, []);

	const copyShareUrl = useCallback(async () => {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch (_) {
			// fall through, user can copy manually
		}
	}, [shareUrl]);

	const goBack = useCallback(() => {
		if (location.hash) {
			history.replaceState(null, '', location.pathname);
		}
		setShareUrl(null);
		setShareError(null);
		render();
	}, []);

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

	const canWriteClipboard =
		navigator.clipboard &&
		(navigator.clipboard.write || navigator.clipboard.writeText);

	return (
		<div>
			<div className="toolbar">
				<button type="button" onClick={goBack}>
					← Go back
				</button>
				<button
					type="button"
					onClick={share}
					disabled={shareBusy}
					title="Encode the inspection results into a shareable URL (no server)"
				>
					{shareBusy ? 'Encoding…' : '🔗 Share as URL'}
				</button>
				{fromShare &&
					canWriteClipboard &&
					data.map((render_data, idx) => {
						const cbStatus = copyBackStatus[idx] || {};
						const multi = data.length > 1;
						return (
							<button
								key={idx}
								type="button"
								onClick={() =>
									copyBackToClipboard(render_data, idx)
								}
								disabled={cbStatus.busy}
								title="Write all available types back to your clipboard so you can paste them elsewhere"
							>
								{cbStatus.busy
									? 'Copying…'
									: cbStatus.ok
									? `✓ ${
											multi
												? `Copied #${idx + 1}`
												: 'Copied to clipboard'
									  }`
									: `📋 Copy${
											multi ? ` #${idx + 1}` : ''
									  } to clipboard`}
							</button>
						);
					})}
				{fromShare &&
					data.map((render_data, idx) => {
						const cbStatus = copyBackStatus[idx] || {};
						if (!cbStatus.error) return null;
						return (
							<div className="copy-back-error" key={`err-${idx}`}>
								✗ {cbStatus.error}
							</div>
						);
					})}
				{shareUrl && (
					<div className="share-box">
						<div className="share-row">
							<input
								type="text"
								readOnly
								value={shareUrl}
								onFocus={e => e.target.select()}
							/>
							<button type="button" onClick={copyShareUrl}>
								{copied ? 'Copied!' : 'Copy'}
							</button>
						</div>
						<div className="share-note">
							All data is encoded directly in the URL. Nothing is
							uploaded to any server.
						</div>
					</div>
				)}
				{shareError && <div className="share-error">{shareError}</div>}
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

function renderExtracted(extracted_data, label, fromShare) {
	ReactDOM.render(
		<ClipboardInspector
			data={extracted_data}
			label={label}
			fromShare={!!fromShare}
		/>,
		app_el
	);
}

async function render(data, label) {
	const extracted_data = data
		? await Promise.all(
				(Array.isArray(data) ? data : [data]).map(extractData)
		  )
		: [];
	renderExtracted(extracted_data, label, false);
}

async function bootstrap() {
	const m = location.hash.match(/^#s=([A-Za-z0-9_-]+)/);
	if (m) {
		try {
			const payload = await decodeShare(m[1]);
			renderExtracted(payload.data || [], payload.label, true);
			return;
		} catch (err) {
			console.error('Failed to decode shared clipboard data:', err);
			app_el.textContent =
				'Failed to decode shared clipboard data: ' +
				(err && err.message ? err.message : err);
			return;
		}
	}
	render();
}

bootstrap();

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
