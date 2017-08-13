import ReactDOM from 'react-dom';
import React from 'react';

function file_info(file) {
	return file ? {
		name: file.name,
		size: file.size,
		type: file.type
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
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><code>{file.name}</code></td>
					<td><code>{file.size}</code></td>
					<td><code>{file.type}</code></td>
				</tr>
			</tbody>
		</table> : <em>N/A</em>;
	}

	render() {
		let { event } = this.props;

		var render_data = null;

		if (event) {
			render_data = {
				data_by_type: event.clipboardData.types.map(type => {
					let data = event.clipboardData.getData(type);
					return {
						type: type,
						data: data
					}
				}),
				items: event.clipboardData.items ? 
					Array.from(event.clipboardData.items).map(item => {
						return {
							kind: item.kind,
							type: item.type,
							as_file: file_info(item.getAsFile())
						};
					}) 
					:
					null,
				files: event.clipboardData.files ? 
					Array.from(event.clipboardData.files).map(file => {
						return file_info(file)
					}) 
					:
					null
			}
		}

		return render_data ? 
		
			<div className='clipboard-summary'>
				<h1>
					<a className='mdn' href='https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent/clipboardData'>event.clipboardData</a>
				</h1>

				<div className='clipboard-section'>
					<h2>
						<a className='mdn' href='https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types'>types</a>
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
									<td><code>{obj.data || <em>Empty string</em>}</code></td>
								</tr>
							) 
						}
						</tbody>
					</table>
				</div>

				<div className='clipboard-section'>
					<h2>
						<a className='mdn' href='https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/items'>items</a>
						<span className='anno'>{render_data.items ? `${render_data.items.length} item(s) available` : 'N/A'}</span>
					</h2>

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
								render_data.items ? 
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
									:
									<span>N/A</span>
							}
						</tbody>
					</table>
				</div>

				<div className='clipboard-section'>
					<h2>
						<a className='mdn' href='https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/files'>files</a>
						<span className='anno'>{render_data.files ? `${render_data.files.length} file(s) available` : 'N/A'}</span>
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

			<div>Paste something to get started</div>;
	}
}

var app_el = document.getElementById('app');

function render(e) {
	ReactDOM.render(
		<ClipboardInspector event={e}/>, 
		app_el
	);
} 

render();

document.addEventListener('paste', (e) => {
	render(e);
});