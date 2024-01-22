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
							let view = arrFind(fsmViews, pair.name, pair.game);
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
				
				let rgName = msg.game + "/" + msg.name;
				let radios = {};
				
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
       refX="0"
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
				
				for (let state of msg.states) {
					let label = document.createElement("span");
					label.classList.add("state");
					label.innerText = state;
					graphCtr.appendChild(label);
					g.setNode(state, {
						label: state,
						width: label.offsetWidth,
						height: label.offsetHeight,
						_node: label,
					});
					/*let label = document.createElement("label");
					let rb = document.createElement("input");
					rb.type = "radio";
					rb.name = rgName;
					rb.checked = state == msg.current;
					rb.addEventListener("change", () => {
						if (sendFsmChangeOnCheckbox) sendFsmChange(msg.game, msg.name, state);
					});
					label.appendChild(rb);
					label.appendChild(document.createTextNode(state));
					viewEl.appendChild(label);
					radios[state] = rb;*/
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
				
				let graphWidth = 0, graphHeight = 0, graphX = 999, graphY = 999;
				for (let state of g.nodes()) {
					let inf = g.node(state);
					console.log(state, inf);
					let label = inf._node;
					label.style.left = (inf.x|0) + "px";
					label.style.top = (inf.y|0) + "px";
					graphWidth = Math.max(graphWidth, inf.x + inf.width);
					graphHeight = Math.max(graphHeight, inf.y + inf.height);
					graphX = Math.min(graphX, inf.x);
					graphY = Math.min(graphY, inf.y);
				}
				console.log(graphX, graphY);
				for (let edge_id of g.edges()) {
					let edge = g.edge(edge_id);
					//let svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
					//svgPath.setAttribute("style", "fill:none;stroke:#000000;stroke-width:0.79375;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;marker-end:url(#TriangleStart);stroke-dasharray:none");
					//svgArrows.appendChild(svgPath);
					let pathData = "m";
					let lastPoint = {x:-graphX, y:-graphY};
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
						
						/*svgArrows.appendChild(createSvg("circle", {
							cx: graphX + p1.x,
							cy: graphY + p1.y,
							r: 3,
						}));*/
						
						const lf = 0;
						let p1a = lerp(p1x, p0x, lf) + "," + lerp(p1y, p0y, lf);
						let p1b = lerp(p1x, p2x, lf) + "," + lerp(p1y, p2y, lf);
						pathData += ` ${p0x},${p0y} q ${p1a} ${p2x},${p2y}`;
					} else for (let point of edge.points) {
						pathData += " " + (point.x - lastPoint.x) + "," + (point.y - lastPoint.y);
						lastPoint = point;
					}
					//svgPath.setAttribute("d", pathData);
					svgArrows.appendChild(createSvg("path", {
						d: pathData,
						"data-from": edge_id.v,
						"data-to": edge_id.w,
						style: [
							"fill: none",
							"stroke: #000000",
							"stroke-width: 2",
							"marker-end:url(#TriangleStart)",
						].join(";"),
					}));
					
					let svgCir = createSvg("circle", {
						cx: edge.points[0].x,
						cy: edge.points[0].y,
						r: 5,
					})
					//svgArrows.appendChild(svgCir)
					console.log(edge_id, edge);
				}
				graphWidth = Math.ceil(graphWidth);
				graphHeight = Math.ceil(graphHeight);
				
				svg.setAttribute("viewBox", `0 0 ${graphWidth} ${graphHeight}`);
				//svg.setAttribute("width", graphWidth + "px");
				//svg.setAttribute("height", graphHeight + "px");
				graphCtr.style.width = graphWidth + "px";
				graphCtr.style.height = graphHeight + "px";
				
				
				fsmViews.push({
					element: viewCtr,
					game: msg.game,
					name: msg.name,
					radios: radios,
				});
			break;
			case "fsm_view.update":
				let view = fsmViews.filter(q => q.name == msg.name && q.game == msg.game)[0];
				if (view) {
					let radio = view.radios[msg.current];
					if (radio) {
						let _sendFsmChangeOnCheckbox = sendFsmChangeOnCheckbox;
						sendFsmChangeOnCheckbox = false;
						radio.checked = true;
						sendFsmChangeOnCheckbox = _sendFsmChangeOnCheckbox;
					}
				}
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