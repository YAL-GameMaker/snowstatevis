function SnowStateVisServerFSM(_game, _name, _states, _current, _trans) constructor {
	__game = _game; /// @is {SnowStateVisServerGame}
	__name = _name;
	__watchers = []; /// @is {SnowStateVisServerWeb[]}
	__states = _states;
	__current = _current;
	__transit = _trans;
}