/// @param {SnowStateVisServer} server
/// @param {network_socket} socket
function SnowStateVisServerWeb(_server, _socket) : SnowStateVisServerItem(_server, _socket) constructor {
	__watch = []; /// @is {SnowStateVisServerFSM[]}
	static __handle_message = function(_msg) {
		switch (_msg.type) {
			case "hello":
				var _games = __server.__game_array;
				var n = array_length(_games);
				var _arr = [];
				for (var i = 0; i < n; i++) {
					var _game = _games[i];
					var _fsms = _game.__fsm_array;
					var fn = array_length(_fsms);
					for (var fk = 0; fk < fn; fk++) {
						var _fsm = _fsms[fk];
						array_push(_arr, {
							game: _game.__name,
							name: _fsm.__name,
						})
					}
				}
				__send({
					type: "fsm_list.add",
					array: _arr,
				})
				break;
			case "fsm.watch":
				var _game = __server.__game_from_name[$ _msg.game];
				if (_game == undefined) break;
				var _inst = _game.__fsm_lookup[$ _msg.name];
				if (_inst == undefined) break;
				if (array_contains(_inst.__watchers, self)) break;
				array_push(_inst.__watchers, self);
				__send({
					type: "fsm_view.add",
					game: _msg.game,
					name: _msg.name,
					states: _inst.__states,
					current: _inst.__current,
					transit: _inst.__transit,
				});
				break;
			case "fsm.unwatch":
				var _game = __server.__game_from_name[$ _msg.game];
				if (_game == undefined) break;
				var _inst = _game.__fsm_lookup[$ _msg.name];
				if (_inst == undefined) break;
				var _ind = array_get_index(_inst.__watchers, self);
				if (_ind < 0) break;
				array_delete(_inst.__watchers, _ind, 1);
				break;
			case "fsm.change":
				var _game = __server.__game_from_name[$ _msg.game];
				if (_game == undefined) break;
				var _inst = _game.__fsm_lookup[$ _msg.name];
				if (_inst == undefined) break;
				_game.__send({
					type: "fsm.change",
					name: _msg.name,
					current: _msg.current
				});
				break;
		}
	}
}