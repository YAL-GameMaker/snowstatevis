var _kind = "async";
switch (async_load[?"type"]) {
	case network_type_connect: _kind = "connect"; break;
	case network_type_disconnect: _kind = "disconnect"; break;
	case network_type_data: _kind = "data"; break;
	case network_type_non_blocking_connect: _kind = "out-connect"; break;
}
show_debug_message(_kind + ": " + json_encode(async_load));
if (async_load[?"type"] == network_type_data) {
	var _buf = async_load[?"buffer"];
	var _pos = buffer_tell(_buf);
	var _str = buffer_read(_buf, buffer_string);
	buffer_seek(_buf, buffer_seek_start, 0);
	show_debug_message("content: <<<" + _str + ">>>");
}
if (server != undefined) server.async_network();
if (client != undefined) client.async_network();