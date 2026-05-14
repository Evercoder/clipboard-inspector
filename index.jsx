import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';

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

const TEXT_COPY_MIME_OPTIONS = [
	{ value: 'text/plain', label: 'Plain text' },
	{ value: 'text/html', label: 'HTML' }
];

function CopyAsMime({ text }) {
	const [mimeType, setMimeType] = useState('text/plain');

	const writeAsMime = useCallback(async () => {
		if (!navigator.clipboard) {
			return;
		}

		if (navigator.clipboard.write && window.ClipboardItem) {
			try {
				const items = {
					'text/plain': new Blob([text], {
						type: 'text/plain'
					})
				};

				if (mimeType !== 'text/plain') {
					items[mimeType] = new Blob([text], {
						type: mimeType
					});
				}

				await navigator.clipboard.write([new ClipboardItem(items)]);
			} catch (error) {
				console.warn(
					'ClipboardItem write failed, falling back to writeText',
					error
				);
			}
		} else if (navigator.clipboard.writeText) {
			await navigator.clipboard.writeText(text);
		}
	}, [mimeType, text]);

	return (
		<div className="cb-copy-as-dropdown">
			<button type="button" onClick={writeAsMime}>
				Copy as
			</button>
			<select
				value={mimeType}
				onChange={e => setMimeType(e.target.value)}
			>
				{TEXT_COPY_MIME_OPTIONS.map(option => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
}

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

function ClipboardInspector(props) {
	const { data, label } = props;
	const has_async_clipboard =
		!navigator.clipboard || !navigator.clipboard.read;
	const paste = useCallback(e => {
		navigator.clipboard.read().then(data => {
			render(data, 'ClipboardItems');
		});
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

	return (
		<div>
			<button type="button" onClick={e => render()}>
				← Go back
			</button>
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
															<CopyAsMime
																text={obj.data}
															/>
														)}
												</td>
												<td>
													<pre className="cb-entry">
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
																<pre className="cb-entry">
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
