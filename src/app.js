import ReactDOM from 'react-dom';
import React from 'react';

function file_info(file) {
	return file ? {
		name: file.name,
		size: file.size,
		type: file.type
	} : null
}

class ClipboardExplorer extends React.Component {

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
					<td>{file.name}</td>
					<td>{file.size}</td>
					<td>{file.type}</td>
				</tr>
			</tbody>
		</table> : null;
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
		
			<div>
				<h1><code>event.clipboardData</code></h1>
				<h2><code>.types</code> — {render_data.data_by_type.length} type(s)</h2>
				{ 
					render_data.data_by_type.map((obj,idx) => 
						<div key={idx}>
							<h3><code>{obj.type}</code></h3>
							<div><code>{obj.data || <em>Empty string</em>}</code></div>
						</div>
					) 
				}
				<h2>
					<code>.items</code> — 
					{render_data.items ? `${render_data.items.length} item(s)` : ''}
				</h2>

				{ 
					render_data.items ? 
						render_data.items.map(
							(item, idx) => 
								<div key={idx}>
									<h3><code>{item.kind} ({item.type})</code></h3>
									<div>
										<strong>As file:</strong> 
										{this.render_file(item.as_file)}
									</div>
								</div>
						)
						:
						<span>N/A</span>
				}

				<h2>
					<code>.files</code> — 
					{render_data.files ? `${render_data.files.length} file(s)` : ''}
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

			: 

			<div>No paste event yet</div>;
	}
}

var app_el = document.getElementById('app');

function render(e) {
	ReactDOM.render(
		<ClipboardExplorer event={e}/>, 
		app_el
	);
} 

render();

document.addEventListener('paste', (e) => {
	render(e);
});