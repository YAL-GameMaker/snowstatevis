show_debug_message($"connect={network_type_connect}")
show_debug_message($"disconnect={network_type_disconnect}")
show_debug_message($"data={network_type_data}")
show_debug_message($"data={network_type_non_blocking_connect}")
server = new SnowStateVisServer(2000, 2001, 2002);
server.start();

client = new SnowStateVisClient("game");
client.connect("127.0.0.1", 2001);