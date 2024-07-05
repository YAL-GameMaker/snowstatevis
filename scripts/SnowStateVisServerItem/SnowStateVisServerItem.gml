/// @param {SnowStateVisServer} server
/// @param {network_socket} socket
function SnowStateVisServerItem(_server, _socket, _is_raw) constructor {
	__server = _server /*#as SnowStateVisServer*/;
	__socket = _socket /*#as network_socket*/;
	__is_raw = _is_raw;
	static __send = function(_msg) {
		//show_debug_message("send to " + instanceof(self) + ": " + json_stringify(_msg));
		__SnowStateVis_send(__socket, _msg, __is_raw);
	}
}
