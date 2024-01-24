/// @param {SnowStateVisServer} server
/// @param {network_socket} socket
function SnowStateVisServerGame(_server, _socket, _is_raw) : SnowStateVisServerItem(_server, _socket, _is_raw) constructor {
	__fsm_lookup = {}; /// @is {CustomKeyStruct<string, SnowStateVisServerFSM>}
	__fsm_array = []; /// @is {SnowStateVisServerFSM[]}
	__name = "";
	static __handle_message = function(_msg) {
		show_debug_message("recv from game: " + json_stringify(_msg));
		switch (_msg.type) {
			case "game.rename":
				if (__name != "") variable_struct_remove(__server.__game_from_name, __name);
				__name = _msg.name;
				__server.__game_from_name[$ __name] = self;
				break;
			case "fsm.register":
				if (__fsm_lookup[$ _msg.name] != undefined) break;
				var _fsm = new SnowStateVisServerFSM(self, _msg.name, _msg.states, _msg.current, _msg.transit);
				__fsm_lookup[$ _msg.name] = _fsm;
				array_push(__fsm_array, _fsm);
				break;
			case "fsm.unregister":
				var _inst = __fsm_lookup[$ _msg.name];
				if (_inst == undefined) break;
				var _ind = array_get_index(__fsm_array, _inst);
				array_delete(__fsm_array, _ind, 1);
				variable_struct_remove(__fsm_lookup, _msg.name);
				break;
			case "fsm.update":
				var _inst = __fsm_lookup[$ _msg.name];
				_inst.__current = _msg.current;
				var _watchers = _inst.__watchers;
				var n = array_length(_watchers);
				if (n > 0) {
					var _nm = {
						type: "fsm_view.update",
						game: __name,
						name: _inst.__name,
						current: _msg.current,
					};
					for (var i = 0; i < n; i++) {
						_watchers[i].__send(_nm);
					}
				}
				break;
		}
	}
}