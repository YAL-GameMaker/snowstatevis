function __SnowStateVis_send(_socket, _msg, _raw) {
	static _buf = buffer_create(1024, buffer_grow, 1);
	buffer_seek(_buf, buffer_seek_start, 0);
	buffer_write(_buf, buffer_string, json_stringify(_msg));
	if (_raw) {
		network_send_raw(__socket, _buf, buffer_tell(_buf));
	} else {
		network_send_packet(__socket, _buf, buffer_tell(_buf));
	}
}
/// @param {buffer} buf
/// @returns {any}
function __SnowStateVis_read_json(_buf) {
	try {
		var _str = buffer_read(_buf, buffer_string);
		var _obj = json_parse(_str);
		return is_string(_obj.type) ? _obj : { type: "" };
	} catch (_ex) {
		show_debug_message(_ex);
		return { type: "" };
	}
}