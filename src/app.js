import ReactDOM from 'react-dom';
import React from 'react';

function file_info(file) {
	return file ? {
		name: file.name,
		size: file.size,
		type: file.type,
		url: URL.createObjectURL(file)
	} : null
}

class ClipboardInspector extends React.Component {

	render_file(file) {
		return file ? <table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Size</th>
					<th>Type</th>
					<th><a className='mdn' href='https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL'>URL.createObjectURL(file)</a></th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><code>{file.name}</code></td>
					<td><code>{file.size}</code></td>
					<td><code>{file.type}</code></td>
					<td><code><a href={file.url}><img src={file.url}/></a></code></td>
				</tr>
			</tbody>
		</table> : <em>N/A</em>;
	}

	render() {
		let { data_transfer, label } = this.props;

		var render_data = null;

		if (event) {
			render_data = {
				data_by_type: Array.from(data_transfer.types).map(type => {
					let data = data_transfer.getData(type);
					return {
						type: type,
						data: data
					}
				}),
				items: data_transfer.items ? 
					Array.from(data_transfer.items).map(item => {
						return {
							kind: item.kind,
							type: item.type,
							as_file: file_info(item.getAsFile())
						};
					}) 
					:
					null,
				files: data_transfer.files ? 
					Array.from(data_transfer.files).map(file => {
						return file_info(file)
					}) 
					:
					null
			}
		}

		return render_data ? 
		
			<div className='clipboard-summary'>
				<h1>
					<a className='mdn' href='https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer'>event.{ label }</a> contains:
				</h1>

				<div className='clipboard-section'>
					<h2>
						<a className='mdn' href='https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types'>.types</a>
						<span className='anno'>{render_data.data_by_type.length} type(s) available</span>
					</h2>
					<table>
						<thead>
							<tr>
								<th>type</th>
								<th>
									<a className='mdn' href='https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/getData'>getData(type)</a>
								</th>
							</tr>
						</thead>
						<tbody>
						{ 
							render_data.data_by_type.map((obj,idx) => 
								<tr key={idx}>
									<td><code>{obj.type}</code></td>
									<td><pre><code>{obj.data || <em>Empty string</em>}</code></pre></td>
								</tr>
							) 
						}
						</tbody>
					</table>
				</div>

				<div className='clipboard-section'>
					<h2>
						<a className='mdn' href='https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/items'>.items</a>
						<span className='anno'>{render_data.items ? `${render_data.items.length} item(s) available` : <em>Undefined</em>}</span>
					</h2>

					{ 
						render_data.items ? 
							<table>
								<thead>
									<tr>
										<th>kind</th>
										<th>type</th>
										<th>
											<a className='mdn' href='https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/getAsFile'>getAsFile()</a>
										</th>
									</tr>
								</thead>
								<tbody>
									{ 
										render_data.items.map(
											(item, idx) => 
												<tr key={idx}>
													<td><code>{item.kind}</code></td>
													<td><code>{item.type}</code></td>
													<td>
														{this.render_file(item.as_file)}
													</td>
												</tr>
										)
									}
								</tbody>
							</table>
							:
							null
					}

				</div>

				<div className='clipboard-section'>
					<h2>
						<a className='mdn' href='https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/files'>.files</a>
						<span className='anno'>{render_data.files ? `${render_data.files.length} file(s) available` : '<em>Undefined</em>'}</span>
					</h2>
					{ 
						render_data.files ? 
							render_data.files.map(
								(file, idx) => 
									<div key={idx}>
										{this.render_file(file)}
									</div>
							)
							:
							<span>N/A</span>
					}
				</div>
			</div> 

			: 

			<div className='intro-msg'>Paste (<kbd>Ctrl+V</kbd>, <kbd>⌘V</kbd>) or <kbd>drop↓</kbd> something here.</div>;
	}
}

var app_el = document.getElementById('app');

function render(data, label) {
	ReactDOM.render(
		<ClipboardInspector data_transfer={data} label={label}/>, 
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
	console.log(e);
	render(e.dataTransfer, 'dataTransfer');
	e.preventDefault();
});