(function() {
	const socket = new WebSocket("ws://localhost:2002");
	const viewsElement = document.getElementById("views");
	const listElement = document.getElementById("list");
	const fsmToggles = [];
	const fsmViews = [];
	function arrFind(arr, game, name) {
		return arr.filter(q => q.game == game && q.name == name)[0];
	}
	function arrRemove(arr, value) {
		var i = arr.indexOf(value);
		if (i >= 0) arr.splice(i, 1);
	}
	// Connection opened
	console.log("Connecting...");
	var ready = false;
	function send(obj) {
		if (ready) socket.send(JSON.stringify(obj));
	}
	socket.addEventListener("open", (event) => {
		ready = true;
		console.log("Connected!");
		send({ type: "hello" });
	});
	socket.addEventListener("close", (event) => {
		let label = document.createElement("label");
		label.appendChild(document.createTextNode(ready ? "Disconnected!" : "Failed to connect!"));
		listElement.appendChild(label);
		ready = false;
	});
	socket.addEventListener("error", (event) => {
		console.error(event);
		ready = false;
		let label = document.createElement("label");
		label.appendChild(document.createTextNode("Error!"));
		listElement.appendChild(label);
	});
	
	let sendFsmChangeOnCheckbox = true;
	function sendFsmChange(game, name, newState) {
		send({
			type: "fsm.change",
			game, name,
			current: newState,
		})
	}
	function createSvg(name, attrs) {
		let node = document.createElementNS("http://www.w3.org/2000/svg", name);
		for (let key of Object.keys(attrs)) {
			node.setAttribute(key, attrs[key]);
		}
		return node;
	}
	function lerp(a, b, f) {
		return a * (1 - f) + b * f;
	}
	
	const edgeSep = "\x1B";
	function handleMessage(msg) {
		switch (msg.type) {
			case "fsm_list.add":
				for (let pair of msg.array) {
					pair.label = document.createElement("label");
					let cb = document.createElement("input");
					cb.type = "checkbox";
					cb.onchange = () => {
						let want = cb.checked;
						send({
							type: want ? "fsm.watch" : "fsm.unwatch",
							game: pair.game,
							name: pair.name
						});
						if (!want) {
							let view = arrFind(fsmViews, pair.game, pair.name);
							if (view) {
								view.element.remove();
								fsmViews.splice(fsmViews.indexOf(view), 1);
							}
						}
					};
					pair.label.appendChild(cb);
					pair.label.appendChild(document.createTextNode(pair.game + " · " + pair.name));
					fsmToggles.push(pair);
					listElement.appendChild(pair.label);
				}
			break;
			case "fsm_view.add":
				let viewCtr = document.createElement("div");
				viewCtr.classList.add("view");
				
				let header = document.createElement("h2");
				header.appendChild(document.createTextNode(msg.name));
				viewCtr.appendChild(header);
				
				viewsElement.appendChild(viewCtr);
				
				var g = new dagre.graphlib.Graph();
				g.setGraph({});
				g.setDefaultEdgeLabel(function() { return {}; });
				
				let graphCtr = document.createElement("div");
				graphCtr.classList.add("graph");
				viewCtr.appendChild(graphCtr);
				
				graphCtr.innerHTML = `
<svg
   version="1.1"
   id="arrows"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg"
   stroke="black"
>
  <defs
     id="defs2">
    <marker
       style="overflow:visible"
       id="TriangleStart"
       refX="2"
       refY="0"
       orient="auto-start-reverse"
       inkscape:stockid="TriangleStart"
       markerWidth="3.3239999"
       markerHeight="3.8427744"
       viewBox="0 0 5.3244081 6.1553851"
       inkscape:isstock="true"
       inkscape:collect="always"
       preserveAspectRatio="xMidYMid">
      <path
         transform="scale(0.5)"
         style="fill:context-stroke;fill-rule:evenodd;stroke:context-stroke;stroke-width:1pt"
         d="M 5.77,0 -2.88,5 V -5 Z"
         id="path135" />
    </marker>
  </defs>
  <g
     inkscape:label="Layer 1"
     inkscape:groupmode="layer"
     id="arrows">
  </g>
</svg>`
				
				let svg = graphCtr.querySelector("svg#arrows");
				let svgArrows = svg.querySelector("g#arrows");
				let svgNodes = Object.create(null);
				let svgEdges = Object.create(null);
				
				for (let state of msg.states) {
					let stateBox = document.createElement("span");
					stateBox.classList.add("state");
					if (state == msg.current) stateBox.classList.add("current");
					stateBox.innerText = state;
					stateBox.onclick = function() {
						sendFsmChange(msg.game, msg.name, state);
					}
					graphCtr.insertBefore(stateBox, svg);
					svgNodes[state] = stateBox;
					
					g.setNode(state, {
						label: state,
						width: stateBox.offsetWidth,
						height: stateBox.offsetHeight,
						_node: stateBox,
					});
				}
				
				for (let from of Object.keys(msg.transit)) {
					let tol = msg.transit[from];
					if (Array.isArray(tol)) {
						for (let to of tol) {
							g.setEdge(from, to);
						}
					} else if (typeof(tol) == "string") {
						g.setEdge(from, tol);
					} else {
						console.error("Unknown `to` value", tol, "in", msg);
					}
				}
				dagre.layout(g);
				
				let graphWidth = 0, graphHeight = 0, graphX = Infinity, graphY = Infinity;
				for (let state of g.nodes()) {
					let inf = g.node(state);
					//console.log(state, inf);
					let label = inf._node;
					label.style.left = (inf.x | 0) + "px";
					label.style.top = (inf.y | 0) + "px";
					graphWidth = Math.max(graphWidth, inf.x + inf.width);
					graphHeight = Math.max(graphHeight, inf.y + inf.height);
					graphX = Math.min(graphX, inf.x);
					graphY = Math.min(graphY, inf.y);
				}
				
				for (let edge_id of g.edges()) {
					let edge = g.edge(edge_id);
					
					let edgeArrowData = "m";
					let lastPoint = { x: -graphX, y: -graphY };
					if (edge.points.length == 3) {
						let p0 = edge.points[0];
						let p0x = p0.x - lastPoint.x;
						let p0y = p0.y - lastPoint.y;
						
						let p1 = edge.points[1];
						let p1x = p1.x - p0.x;
						let p1y = p1.y - p0.y;
						
						let p2 = edge.points[2];
						let p2x = p2.x - p0.x;
						let p2y = p2.y - p0.y;
						
						edgeArrowData += ` ${p0x},${p0y} q ${p1x},${p1y} ${p2x},${p2y}`;
					} else for (let point of edge.points) {
						edgeArrowData += " " + (point.x - lastPoint.x) + "," + (point.y - lastPoint.y);
						lastPoint = point;
					}
					
					let edgeArrow = createSvg("path", {
						d: edgeArrowData,
						"data-from": edge_id.v,
						"data-to": edge_id.w,
						style: [
							"fill: none",
							"stroke-width: 2",
							"stroke-linecap: round",
							"stroke-linejoin: round",
							"marker-end:url(#TriangleStart)",
						].join(";"),
					});
					svgArrows.appendChild(edgeArrow);
					svgEdges[edge_id.v + edgeSep + edge_id.w] = edgeArrow;
				}
				graphWidth = Math.ceil(graphWidth);
				graphHeight = Math.ceil(graphHeight);
				
				svg.setAttribute("viewBox", `0 0 ${graphWidth} ${graphHeight}`);
				//svg.setAttribute("width", graphWidth + "px");
				//svg.setAttribute("height", graphHeight + "px");
				graphCtr.style.width = graphWidth + "px";
				graphCtr.style.height = graphHeight + "px";
				
				
				fsmViews.push({
					game: msg.game,
					name: msg.name,
					element: viewCtr,
					nodes: svgNodes,
					edges: svgEdges,
					current: msg.current,
					currentNode: svgNodes[msg.current],
				});
			break;
			case "fsm_view.update":
				let view = arrFind(fsmViews, msg.game, msg.name);
				if (!view) break;
				if (view.currentNode) {
					view.currentNode.classList.remove("current");
					let edge = view.edges[view.current + edgeSep + msg.current];
					if (edge) {
						console.log(edge);
						edge.classList.add("instant");
						edge.classList.add("active");
						setTimeout(function() {
							edge.classList.remove("instant");
							edge.classList.remove("active");
						}, 300);
					}
				}
				let node = view.nodes[msg.current];
				if (node) {
					node.classList.add("current");
				}
				view.current = msg.current;
				view.currentNode = node;
			break;
		}
	}

	// Listen for messages
	const nul = String.fromCharCode(0);
	socket.addEventListener("message", async (event) => {
		let text = await event.data.text();
		if (nul.endsWith(nul)) text = text.substring(0, text.length - 1);
		console.log("Server says:", text);
		try {
			handleMessage(JSON.parse(text));
		} catch (e) {
			console.error(e);
		}
	});
	
	//
	/*// Create a new directed graph 
	var g = new dagre.graphlib.Graph();

	// Set an object for the graph label
	g.setGraph({});

	// Default to assigning a new object as a label for each new edge.
	g.setDefaultEdgeLabel(function() { return {}; });

	// Add nodes to the graph. The first argument is the node id. The second is
	// metadata about the node. In this case we're going to add labels to each of
	// our nodes.
	g.setNode("kspacey",    { label: "Kevin Spacey",  width: 144, height: 100 });
	g.setNode("swilliams",  { label: "Saul Williams", width: 160, height: 100 });
	g.setNode("bpitt",      { label: "Brad Pitt",     width: 108, height: 100 });
	g.setNode("hford",      { label: "Harrison Ford", width: 168, height: 100 });
	g.setNode("lwilson",    { label: "Luke Wilson",   width: 144, height: 100 });
	g.setNode("kbacon",     { label: "Kevin Bacon",   width: 121, height: 100 });

	// Add edges to the graph.
	g.setEdge("kspacey",   "swilliams");
	g.setEdge("swilliams", "kbacon");
	g.setEdge("bpitt",     "kbacon");
	g.setEdge("hford",     "lwilson");
	g.setEdge("lwilson",   "kbacon");
	
	dagre.layout(g);
	g.nodes().forEach(function(v) {
		console.log("Node " + v + ": " + JSON.stringify(g.node(v)));
   });
   g.edges().forEach(function(e) {
	   console.log("Edge " + e.v + " -> " + e.w + ": " + JSON.stringify(g.edge(e)));
   });*/
})();